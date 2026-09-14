#!/usr/bin/env bun
/**
 * Validates a workflow-supplied world ID against the registered worlds.
 *
 * Security boundary (ORG-FA-01/02): free-text workflow inputs must never
 * reach a shell command or a filesystem path unvalidated. A world ID is
 * valid only if it is a directory under worlds/ that contains a world.json.
 *
 * Usage: bun scripts/validate-world-id.mjs <world-id>
 * Exits 0 and prints the validated id on success; exits 1 with a denial
 * reason on failure.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");
const WORLDS_DIR = join(REPO_ROOT, "worlds");

const worldId = process.argv[2];

if (!worldId || worldId.includes("\0")) {
  console.error("DENY: world id is empty or contains a NUL byte");
  process.exit(1);
}

// Structural allow-list: registered world IDs are simple directory names.
if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(worldId)) {
  console.error(`DENY: world id "${worldId}" is not a registered world id`);
  process.exit(1);
}

const worldDir = resolve(WORLDS_DIR, worldId);
if (!worldDir.startsWith(WORLDS_DIR + "/")) {
  console.error(`DENY: world id "${worldId}" escapes the worlds directory`);
  process.exit(1);
}

if (!existsSync(join(worldDir, "world.json"))) {
  const registered = existsSync(WORLDS_DIR)
    ? (await import("node:fs")).readdirSync(WORLDS_DIR).join(", ")
    : "(worlds directory missing)";
  console.error(
    `DENY: world "${worldId}" is not a registered world (registered: ${registered})`,
  );
  process.exit(1);
}

console.log(worldId);
