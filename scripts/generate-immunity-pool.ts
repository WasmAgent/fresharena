#!/usr/bin/env bun
/**
 * generate-immunity-pool.ts
 *
 * Generates confirmed counterexamples for the immunity pool by running baseline
 * solvers against the reference implementation.
 *
 * Output: worlds/json-transform/immunity-pool-v0.json
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import from built dist directories since workspace resolution requires build
import { normalize, sha256Hex, shortHash, stableStringify } from '../packages/verifier-runtime/src/index.ts';
import type { TaskSpec } from '../packages/faep-schema/src/index.ts';

// Inline the solvers since we can't import from @fresharena/core easily
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reference implementation wrapper */
function reference(input: unknown, task: TaskSpec): unknown {
  const c = task.operation_spec.constraints as {
    sort_keys: boolean;
    strip_nulls: boolean;
    flatten: { delimiter: string } | null;
  };
  return normalize(input, c);
}

/** Weak floor baseline: returns the input unchanged. */
function weak(input: unknown): unknown {
  return input;
}

/** Buggy A: drops nested object contents beyond depth 1. */
function buggyA(input: unknown): unknown {
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = isPlainObject(value) ? {} : value;
    }
    return out;
  }
  return input;
}

function stableCompare(a: unknown, b: unknown): number {
  const sa = typeof a === 'number' ? `n:${a}` : `s:${String(a)}`;
  const sb = typeof b === 'number' ? `n:${b}` : `s:${String(b)}`;
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

/** Buggy B: lexicographically sorts every array's elements (corrupts order/types). */
function buggyB(input: unknown): unknown {
  if (Array.isArray(input)) {
    return [...input].map((element) => buggyB(element)).sort((a, b) => stableCompare(a, b));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = buggyB(value);
    }
    return out;
  }
  return input;
}

/** Buggy C: strips null entries unconditionally (violates null-preserving specs). */
function buggyC(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((element) => buggyC(element));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === null) continue;
      out[key] = buggyC(value);
    }
    return out;
  }
  return input;
}

type SolverFn = (input: unknown, task: TaskSpec) => unknown;

const BASELINE_SOLVERS: { id: string; fn: SolverFn }[] = [
  { id: 'weak', fn: weak as SolverFn },
  { id: 'buggy-A', fn: buggyA as SolverFn },
  { id: 'buggy-B', fn: buggyB as SolverFn },
  { id: 'buggy-C', fn: buggyC as SolverFn },
];

// ── Deterministic RNG ──────────────────────────────────────────────────────────

interface MiniRng {
  state: number;
  next(): number;
  bool(): boolean;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
}

function createRng(seed: string): MiniRng {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return {
    state: Math.abs(h) || 1,
    next() {
      this.state ^= this.state << 13;
      this.state ^= this.state >> 17;
      this.state ^= this.state << 5;
      return (Math.abs(this.state) % 10000) / 10000;
    },
    bool() { return this.next() < 0.5; },
    int(min: number, max: number) { return min + Math.floor(this.next() * (max - min + 1)); },
    pick<T>(arr: readonly T[]): T { return arr[this.int(0, arr.length - 1)]; },
  };
}

type NormalizeConstraints = {
  sort_keys: boolean;
  strip_nulls: boolean;
  flatten: { delimiter: string } | null;
};

const KEY_POOL = [
  'id', 'name', 'value', 'config', 'items', 'meta', 'version',
  'enabled', 'tags', 'data', 'nested', 'ts', 'port', 'host', 'rules',
];
const STRING_POOL = [
  'alpha', 'beta', 'gamma', 'prod', 'staging', 'dev',
  'us-east', 'v1', 'v2', 'primary', 'replica', 'cached',
];
const FLATTEN_DELIMITERS = ['.', '_', '/'] as const;

function randomConstraints(rng: MiniRng): NormalizeConstraints {
  return {
    sort_keys: rng.bool(),
    strip_nulls: rng.bool(),
    flatten: rng.bool() ? { delimiter: rng.pick(FLATTEN_DELIMITERS) } : null,
  };
}

function randomValue(rng: MiniRng, depth: number, maxDepth: number): unknown {
  if (depth >= maxDepth) {
    const branch = rng.int(0, 3);
    if (branch === 0) return rng.pick(STRING_POOL);
    if (branch === 1) return rng.int(0, 1000);
    if (branch === 2) return rng.bool();
    return null;
  }
  const branch = rng.next();
  if (branch < 0.3) return randomObject(rng, depth + 1, maxDepth, 1, 3);
  if (branch < 0.55) {
    const length = rng.int(1, 4);
    const arr: unknown[] = [];
    for (let i = 0; i < length; i++) arr.push(randomValue(rng, depth + 1, maxDepth));
    return arr;
  }
  if (branch < 0.7) return null;
  return randomPrimitive(rng);
}

function randomPrimitive(rng: MiniRng): unknown {
  const branch = rng.int(0, 3);
  if (branch === 0) return rng.pick(STRING_POOL);
  if (branch === 1) return rng.int(0, 1000);
  if (branch === 2) return rng.bool();
  return null;
}

function randomObject(rng: MiniRng, depth: number, maxDepth: number, minKeys: number, maxKeys: number): Record<string, unknown> {
  const keyCount = rng.int(minKeys, maxKeys);
  const available = [...KEY_POOL];
  const out: Record<string, unknown> = {};
  for (let i = 0; i < keyCount && available.length > 0; i++) {
    const idx = rng.int(0, available.length - 1);
    const key = available.splice(idx, 1)[0]!;
    out[key] = randomValue(rng, depth, maxDepth);
  }
  return out;
}

// ── Counterexample generation ──────────────────────────────────────────────────

interface Counterexample {
  task_id: string;
  solver_id: string;
  input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  actual_output: Record<string, unknown>;
  verifier_version: string;
  minimized: boolean;
  reproduction_command: string;
  hash: string;
}

function generateCounterexamples(
  solverId: string,
  solverFn: SolverFn,
  seed: string,
  numRuns: number,
): Counterexample[] {
  const rng = createRng(seed);
  const examples: Counterexample[] = [];

  for (let i = 0; i < numRuns; i++) {
    const input = randomObject(rng, 1, 3, 2, 5);
    const constraints = randomConstraints(rng);
    const task: TaskSpec = {
      id: `immunity-${i}`,
      family: 'json_transform.normalize.v0',
      operation_spec: { type: 'normalize', constraints },
      examples: [],
      input_schema: {},
      output_schema: {},
      hidden_tests: { seed_hash: '', count: 0 },
      verifier: { package: 'json_transform_verifier', version: '0.1.0' },
      limits: { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 20000 },
    };
    const expected = normalize(input, constraints);
    const actual = solverFn(input, task);

    if (sha256Hex(actual) !== sha256Hex(expected)) {
      examples.push({
        task_id: `normalize-v0-${i.toString().padStart(4, '0')}-${shortHash(`${seed}:${i}`, 8)}`,
        solver_id: solverId,
        input: { value: input } as Record<string, unknown>,
        expected_output: expected as Record<string, unknown>,
        actual_output: actual as Record<string, unknown>,
        verifier_version: '0.1.0',
        minimized: true,
        reproduction_command: `normalize(${stableStringify(input)}, ${stableStringify(constraints)})`,
        hash: shortHash(`${solverId}:${i}:${stableStringify({ input, expected })}`, 12),
      });
    }
  }

  return examples;
}

// ── Main ────────────────────────────────────────────────────────────────────────

const ROOT_SEED = 'fresharena-immunity-pool-v0';
const VERIFIER_VERSION = '0.1.0';

const allExamples: Counterexample[] = [];

for (const solver of BASELINE_SOLVERS) {
  const solverSeed = `${ROOT_SEED}:${solver.id}`;
  const examples = generateCounterexamples(solver.id, solver.fn, solverSeed, 50);
  console.log(`${solver.id}: ${examples.length} counterexamples from 50 runs`);
  allExamples.push(...examples);
}

console.log(`\nTotal confirmed counterexamples: ${allExamples.length}`);

if (allExamples.length < 20) {
  console.error(`ERROR: Only ${allExamples.length} counterexamples generated, need 20+`);
  process.exit(1);
}

const pool = {
  schema_version: '0.1.0',
  pool_version: '0.1.0',
  description: 'Public Immunity Pool v0 — confirmed counterexamples across baseline solvers',
  generated_at: new Date().toISOString(),
  root_seed: ROOT_SEED,
  solver_ids: BASELINE_SOLVERS.map(s => s.id),
  counterexamples: allExamples,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'worlds', 'json-transform', 'immunity-pool-v0.json');
writeFileSync(outPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
console.log(`\nWrote ${allExamples.length} counterexamples to ${outPath}`);
