#!/usr/bin/env bun
/**
 * verify-lockfiles.ts — Enforces reproducibility by verifying that solver
 * workspace dependencies align with the root lockfile (Source of Truth).
 *
 * Strategy:
 *   1. Parse the root bun.lock for workspace entries and resolved packages.
 *   2. For each solvers/llm/* workspace, compare its package.json declarations
 *      against the lockfile's workspace entry.
 *   3. For each non-workspace dependency, verify the resolved package has
 *      an integrity hash in the lockfile's packages section.
 *   4. If a workspace-local lockfile exists, perform structural diffing against
 *      the root lockfile for the packages scoped to that workspace.
 *
 * Exit codes:
 *   0 — All dependencies match (clean)
 *   1 — Dependency mismatch detected (drift)
 *   2 — Verification failure (missing lockfile, parse errors, etc.)
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

// --- Types ---

/** A single resolved package entry in bun.lock (stored as a tuple). */
interface BunPackageEntry {
  /** e.g. "openai@6.45.0" */
  resolved: string;
  /** Resolved URL (often empty for registry packages) */
  url: string;
  /** Transitive dependency map */
  dependencies: Record<string, string>;
  /** SHA-512 integrity hash */
  integrity: string;
}

/** Parsed bun.lock structure. */
interface BunLockfile {
  lockfileVersion: number;
  workspaces: Record<string, WorkspaceEntry>;
  packages: Record<string, unknown[]>;
}

/** A workspace entry in the lockfile. */
interface WorkspaceEntry {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** A structured mismatch report. */
interface Mismatch {
  workspace: string;
  package: string;
  field: string;
  expected: string;
  actual: string;
}

// --- Constants ---

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const LOCKFILE = join(ROOT, "bun.lock");
const SOLVERS_DIR = join(ROOT, "solvers", "llm");

// --- Utilities ---

function fatal(msg: string): never {
  console.error(`VERIFICATION FAILURE: ${msg}`);
  process.exit(2);
}

function parseLockfile(path: string): BunLockfile {
  if (!existsSync(path)) {
    fatal(`Lockfile not found: ${path}`);
  }
  try {
    const raw = readFileSync(path, "utf8");
    // Bun's lockfile format permits trailing commas; strip them for JSON.parse
    const clean = raw.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(clean) as BunLockfile;
  } catch (e) {
    fatal(`Cannot parse lockfile: ${(e as Error).message}`);
  }
}

/**
 * Bun stores each package as a tuple:
 *   [name@version, url, deps, integrity]
 */
function parsePackageTuple(tuple: unknown[]): BunPackageEntry | null {
  if (tuple.length < 4 || typeof tuple[0] !== "string") {
    return null;
  }
  return {
    resolved: tuple[0] as string,
    url: (tuple[1] as string) ?? "",
    dependencies: (tuple[2] as Record<string, string>) ?? {},
    integrity: (tuple[3] as string) ?? "",
  };
}

/** Extract version from a resolved string like "openai@6.45.0"
 *  or "@anthropic-ai/sdk@0.107.0". */
function extractVersion(resolved: string): string {
  if (!resolved.startsWith("@")) {
    const at = resolved.indexOf("@");
    return at === -1 ? resolved : resolved.slice(at + 1);
  }
  const slash = resolved.indexOf("/");
  if (slash === -1) return resolved;
  const at = resolved.indexOf("@", slash + 1);
  return at === -1 ? resolved : resolved.slice(at + 1);
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => {
    return statSync(join(dir, name)).isDirectory();
  });
}

// --- Verification logic ---

/**
 * Check that a workspace's package.json declarations match the lockfile
 * and that all non-workspace dependencies have resolved packages with
 * integrity hashes.
 */
function verifyWorkspaceAgainstRoot(
  dir: string,
  wsKey: string,
  lockfile: BunLockfile,
): Mismatch[] {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    fatal(`Missing package.json in ${dir}`);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const ws = lockfile.workspaces[wsKey];
  const mismatches: Mismatch[] = [];

  if (!ws) {
    fatal(`Workspace ${wsKey} not registered in root lockfile`);
  }

  // Collect all declared deps (excluding peer deps — they are consumer-provided)
  const deps: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  for (const [name, declared] of Object.entries(deps)) {
    const lockDeclared = ws.dependencies?.[name];

    // Check that the lockfile workspace entry mentions this dependency
    if (!lockDeclared && !ws.devDependencies?.[name]) {
      mismatches.push({
        workspace: wsKey,
        package: name,
        field: "dependency",
        expected: String(declared),
        actual: "(absent from lockfile workspace entry)",
      });
      continue;
    }

    // Skip workspace:* references — they are internal links
    const range = lockDeclared ?? ws.devDependencies?.[name];
    if (range === "workspace:*") continue;

    // For versioned deps, verify the package is resolved in lockfile.packages
    const tuple = lockfile.packages[name];
    if (!tuple) {
      mismatches.push({
        workspace: wsKey,
        package: name,
        field: "resolution",
        expected: "resolved entry in packages",
        actual: "(not found)",
      });
      continue;
    }

    const entry = parsePackageTuple(tuple);
    if (!entry) {
      mismatches.push({
        workspace: wsKey,
        package: name,
        field: "resolution",
        expected: "valid package tuple",
        actual: "(malformed)",
      });
      continue;
    }

    // Verify integrity hash exists
    if (!entry.integrity) {
      mismatches.push({
        workspace: wsKey,
        package: name,
        field: "integrity",
        expected: "SHA-512 hash",
        actual: "(missing)",
      });
    }
  }

  // Verify peerDependencies are accurately reflected in the lockfile
  const peers = pkg.peerDependencies ?? {};
  for (const [name, range] of Object.entries(peers)) {
    const lockPeer = ws.peerDependencies?.[name];
    if (lockPeer !== String(range)) {
      mismatches.push({
        workspace: wsKey,
        package: `peer:${name}`,
        field: "peerDependency",
        expected: String(range),
        actual: lockPeer ?? "(absent)",
      });
    }
  }

  // Check for a workspace-local lockfile and diff against root
  const localLock = join(dir, "bun.lock");
  if (existsSync(localLock)) {
    const localMismatches = verifyLocalLockfile(
      localLock,
      wsKey,
      lockfile,
    );
    mismatches.push(...localMismatches);
  }

  return mismatches;
}

/**
 * If a workspace has its own bun.lock, perform structural comparison
 * against the root lockfile for packages scoped to that workspace.
 */
function verifyLocalLockfile(
  localPath: string,
  wsKey: string,
  rootLockfile: BunLockfile,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  const ws = rootLockfile.workspaces[wsKey];
  const depNames = Object.keys(ws.dependencies ?? {});

  let localLockfile: BunLockfile;
  try {
    const raw = readFileSync(localPath, "utf8");
    const clean = raw.replace(/,\s*([}\]])/g, "$1");
    localLockfile = JSON.parse(clean) as BunLockfile;
  } catch (e) {
    fatal(`Cannot parse local lockfile ${localPath}: ${(e as Error).message}`);
  }

  for (const name of depNames) {
    // Skip workspace:* references
    const rootRange = ws.dependencies?.[name];
    if (rootRange === "workspace:*") continue;

    const rootTuple = rootLockfile.packages[name];
    const localTuple = localLockfile.packages?.[name];

    const rootEntry = rootTuple ? parsePackageTuple(rootTuple) : null;
    const localEntry = localTuple ? parsePackageTuple(localTuple) : null;

    // Only compare packages present in both lockfiles
    if (!rootEntry || !localEntry) continue;

    if (rootEntry.resolved !== localEntry.resolved) {
      mismatches.push({
        workspace: wsKey,
        package: name,
        field: "version",
        expected: extractVersion(rootEntry.resolved),
        actual: extractVersion(localEntry.resolved),
      });
    }

    if (rootEntry.integrity !== localEntry.integrity) {
      mismatches.push({
        workspace: wsKey,
        package: name,
        field: "integrity",
        expected: rootEntry.integrity.length > 0
          ? `${rootEntry.integrity.slice(0, 16)}…`
          : "(none)",
        actual: localEntry.integrity.length > 0
          ? `${localEntry.integrity.slice(0, 16)}…`
          : "(none)",
      });
    }
  }

  return mismatches;
}

// --- Main ---

function main(): void {
  const lockfile = parseLockfile(LOCKFILE);
  const solverDirs = listSubdirs(SOLVERS_DIR);
  const allMismatches: Mismatch[] = [];

  for (const dir of solverDirs) {
    const wsKey = `solvers/llm/${dir}`;
    const wsMismatches = verifyWorkspaceAgainstRoot(
      join(SOLVERS_DIR, dir),
      wsKey,
      lockfile,
    );
    allMismatches.push(...wsMismatches);
  }

  if (allMismatches.length > 0) {
    console.error(
      `DEPENDENCY DRIFT DETECTED (${allMismatches.length} issue(s)):`,
    );
    for (const m of allMismatches) {
      console.error(
        `  [${m.workspace}] ${m.package} (${m.field}): expected ${m.expected}, got ${m.actual}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `OK: ${solverDirs.length} solver workspace(s) verified against root lockfile.`,
  );
}

main();
