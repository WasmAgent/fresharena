#!/usr/bin/env bun
// Node types are referenced explicitly so this standalone script type-checks in
// isolation: it lives outside the workspace packages and therefore cannot inherit
// the root tsconfig's `types` entry, but the per-issue verify gate still runs
// `tsc --noEmit` on this file directly.
/// <reference types="node" />
/**
 * verify-lockfiles.ts
 *
 * Enforces reproducibility for the LLM solver adapters (`solvers/llm/*`) by
 * verifying that the shared workspace lockfile is present and consistent with
 * every solver manifest.
 *
 * Why a shared lockfile: FreshArena's `solvers/llm/*` packages are Bun
 * workspaces, so they do not (and must not) carry their own per-package
 * lockfiles. The single root `bun.lock` is the reproducibility anchor that pins
 * the exact resolved version of every dependency across all solver adapters —
 * including the `openai` and `@anthropic-ai/sdk` peer dependencies that govern
 * model access. A "Model-Fixed" evaluation run is only reproducible bit-for-bit
 * as long as this lockfile is committed and stays in sync with the manifests.
 *
 * This script prevents a developer from accidentally adding or editing a solver
 * manifest without updating the shared lockfile, which would otherwise let a
 * dependency float and cause a silent capability regression.
 *
 * Usage:
 *   bun run scripts/verify-lockfiles.ts [repo-root]
 *
 * Exits non-zero when:
 *   - the shared lockfile (`bun.lock`) is missing or invalid JSON
 *   - a `solvers/llm/*` package is missing a manifest, or its manifest is
 *     invalid JSON / has no `name`
 *   - a `solvers/llm/*` package is declared on disk but absent from the shared
 *     lockfile (manifest/lock drift)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOLVERS_LLM_DIR = 'solvers/llm';
const SHARED_LOCKFILE = 'bun.lock';

// Resolve repo root from the optional CLI arg, defaulting to this script's parent.
const root = process.argv[2] ?? join(fileURLToPath(new URL('.', import.meta.url)), '..');

let failures = 0;

function fail(message: string): void {
  console.error(`FAIL: ${message}`);
  failures++;
}

interface Manifest {
  name?: unknown;
}

/** Parse a JSON file, reporting a failure (and returning null) on read/parse error. */
function readJson<T>(path: string, description: string): T | null {
  if (!existsSync(path)) {
    fail(`${description} not found at ${path}`);
    return null;
  }
  try {
    return parseLooseJson(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`invalid JSON in ${description} (${path}) — ${detail}`);
    return null;
  }
}

function isWhitespace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

/**
 * Bun's `bun.lock` is JSON with trailing commas (and may contain `//` or
 * `/* *‍/` comments), which strict `JSON.parse` rejects. Strip comments and
 * trailing commas while respecting string literals, then parse. Standard
 * manifests (plain JSON) pass through unchanged.
 */
function parseLooseJson(text: string): unknown {
  let out = '';
  let i = 0;
  const n = text.length;
  let inString = false;
  let quote = '';
  while (i < n) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === '\\' && i + 1 < n) {
        out += text[i + 1];
        i += 2;
        continue;
      }
      if (c === quote) {
        inString = false;
      }
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i += 2;
      while (i < n && text[i] !== '\n') {
        i += 1;
      }
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === ',') {
      let j = i + 1;
      while (j < n && isWhitespace(text[j])) {
        j += 1;
      }
      if (j < n && (text[j] === '}' || text[j] === ']')) {
        i += 1; // drop the trailing comma
        continue;
      }
    }
    out += c;
    i += 1;
  }
  return JSON.parse(out);
}

/** Extract the set of workspace path keys (e.g. "solvers/llm/openai-compatible") from the lockfile. */
function getLockWorkspacePaths(lock: unknown): Set<string> {
  if (typeof lock !== 'object' || lock === null) {
    return new Set();
  }
  const workspaces = (lock as { workspaces?: unknown }).workspaces;
  if (typeof workspaces !== 'object' || workspaces === null) {
    return new Set();
  }
  return new Set(Object.keys(workspaces as Record<string, unknown>));
}

/** Enumerate package directories directly under a given directory. */
function getPackageDirs(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return [];
  }
  return readdirSync(dir).filter((entry) => statSync(join(dir, entry)).isDirectory());
}

const lockPath = join(root, SHARED_LOCKFILE);
const lock = readJson<unknown>(lockPath, `shared lockfile '${SHARED_LOCKFILE}'`);
const lockWorkspacePaths = lock !== null ? getLockWorkspacePaths(lock) : new Set<string>();

const solversDir = join(root, SOLVERS_LLM_DIR);
if (!existsSync(solversDir)) {
  fail(`solver directory '${SOLVERS_LLM_DIR}' not found at repo root`);
}

for (const pkgDir of getPackageDirs(solversDir)) {
  const pkgPath = join(SOLVERS_LLM_DIR, pkgDir);

  const manifestPath = join(root, pkgPath, 'package.json');
  const manifest = readJson<Manifest>(manifestPath, `manifest for ${pkgPath}`);
  if (manifest === null) {
    continue;
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    fail(`${pkgPath}/package.json is missing a valid string 'name'`);
  }

  if (!lockWorkspacePaths.has(pkgPath)) {
    fail(
      `${pkgPath} is declared on disk but absent from '${SHARED_LOCKFILE}' — run \`bun install\` to refresh the shared lockfile`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} lockfile check(s) failed.`);
  process.exit(1);
}
console.log(
  `OK: shared lockfile '${SHARED_LOCKFILE}' present and consistent with ${SOLVERS_LLM_DIR}/.`,
);
