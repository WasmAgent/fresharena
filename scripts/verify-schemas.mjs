#!/usr/bin/env node
/**
 * Verifies that FAEP schema JSON files are present and structurally valid.
 */

import { readFileSync, existsSync } from 'fs';

const REQUIRED_SCHEMAS = [
  'worlds/json-transform/world.json',
  'worlds/json-transform/verifier/verifier-package.json',
  'worlds/json-transform/generator/generators.json',
  'worlds/json-transform/testers/testers.json',
  'worlds/json-transform/immunity-pool/pool.json',
  'worlds/data-structure/world.json',
  'worlds/data-structure/verifier/verifier-package.json',
  'worlds/data-structure/generator/generators.json',
  'worlds/data-structure/static/tasks.json',
  'worlds/data-structure/immunity-pool/pool.json',
  'records/samples/.gitkeep',
];

const root = new URL('..', import.meta.url).pathname;
let failures = 0;

for (const rel of REQUIRED_SCHEMAS) {
  const full = `${root}/${rel}`;
  if (!existsSync(full)) {
    console.error(`MISSING: ${rel}`);
    failures++;
    continue;
  }
  if (rel.endsWith('.json')) {
    try {
      JSON.parse(readFileSync(full, 'utf8'));
    } catch (e) {
      console.error(`INVALID JSON: ${rel} — ${e.message}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} schema check(s) failed.`);
  process.exit(1);
} else {
  console.log('OK: all schemas present and valid.');
}
