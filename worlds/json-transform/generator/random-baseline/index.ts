/**
 * Random-baseline generator for json_transform world.
 *
 * Generates tasks for all four operation types:
 * - normalize: Normalize JSON according to constraints
 * - diff: Generate patch from source to target
 * - patch: Apply patch to source
 * - merge: Merge two JSON values
 *
 * Each task is a pure function of the seed, ensuring reproducibility.
 */

import type {
  DiffPatchConstraints,
  FailureDiff,
  MergeConstraints,
  NormalizeConstraints,
  TaskFamily,
  TaskSpec,
} from '@fresharena/faep-schema';
import {
  apply,
  diff,
  merge,
  normalize,
  sha256Hex,
  sha256OfString,
  shortHash,
} from '@fresharena/verifier-runtime';
import { Rng } from '../../shared/rng.js';

const VERIFIER_REF = { package: 'json_transform_verifier', version: '0.1.0' };
const DEFAULT_LIMITS = { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 20000 };

const KEY_POOL = [
  'id',
  'name',
  'value',
  'config',
  'items',
  'meta',
  'version',
  'enabled',
  'tags',
  'data',
  'nested',
  'timestamp',
  'port',
  'host',
  'rules',
  'status',
  'type',
  'priority',
  'label',
  'count',
] as const;

const STRING_POOL = [
  'alpha',
  'beta',
  'gamma',
  'prod',
  'staging',
  'dev',
  'us-east',
  'v1',
  'v2',
  'primary',
  'replica',
  'cached',
  'active',
  'inactive',
  'pending',
  'completed',
  'failed',
  'success',
] as const;

const FLATTEN_DELIMITERS = ['.', '_', '/'] as const;

function randomPrimitive(rng: Rng): unknown {
  const branch = rng.int(0, 3);
  if (branch === 0) return rng.pick(STRING_POOL);
  if (branch === 1) return rng.int(0, 1000);
  if (branch === 2) return rng.bool();
  return null;
}

function randomValue(rng: Rng, depth: number, maxDepth: number): unknown {
  if (depth >= maxDepth) {
    return randomPrimitive(rng);
  }
  const branch = rng.next();
  if (branch < 0.35) {
    return randomObject(rng, depth + 1, maxDepth, 1, 3);
  }
  if (branch < 0.6) {
    const length = rng.int(1, 4);
    const arr: unknown[] = [];
    for (let i = 0; i < length; i++) {
      arr.push(randomValue(rng, depth + 1, maxDepth));
    }
    return arr;
  }
  if (branch < 0.75) {
    return null;
  }
  return randomPrimitive(rng);
}

function randomObject(
  rng: Rng,
  depth: number,
  maxDepth: number,
  minKeys: number,
  maxKeys: number,
): Record<string, unknown> {
  const keyCount = rng.int(minKeys, maxKeys);
  const available = [...KEY_POOL];
  const out: Record<string, unknown> = {};
  for (let i = 0; i < keyCount && available.length > 0; i++) {
    const idx = rng.int(0, available.length - 1);
    const key = available.splice(idx, 1)[0] as string;
    out[key] = randomValue(rng, depth, maxDepth);
  }
  return out;
}

// Constraint generators for each operation type
function randomNormalizeConstraints(rng: Rng): NormalizeConstraints {
  return {
    sort_keys: rng.bool(),
    strip_nulls: rng.bool(),
    flatten: rng.bool() ? { delimiter: rng.pick(FLATTEN_DELIMITERS) } : null,
  };
}

function randomDiffPatchConstraints(rng: Rng): DiffPatchConstraints {
  return {
    max_depth: rng.int(3, 10),
    array_indices: rng.bool(),
    format: rng.bool() ? 'ops' : 'merge',
  };
}

function randomMergeConstraints(rng: Rng): MergeConstraints {
  return {
    policy: rng.pick(['left', 'right', 'deep', 'error']),
    merge_arrays: rng.bool(),
    array_dedup: rng.bool(),
  };
}

// Task generators for each operation type
function generateNormalizeTask(seed: string, index: number): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const constraints = randomNormalizeConstraints(rng);
  const input = randomObject(rng, 1, 3, 2, 5);
  const output = normalize(input, constraints);

  return {
    id: `normalize-v0-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.normalize.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'normalize', constraints },
    examples: [{ input: input as Record<string, unknown>, output: output as Record<string, unknown> }],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 8 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateDiffTask(seed: string, index: number): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const constraints = randomDiffPatchConstraints(rng);
  const source = randomObject(rng, 1, 3, 2, 4);
  const target = randomObject(rng, 1, 3, 2, 4);
  const output = diff(source, target, constraints);

  return {
    id: `diff-v0-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.diff_patch.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'diff', constraints },
    examples: [
      {
        input: { source, target } as Record<string, unknown>,
        output: output as Record<string, unknown>,
      },
    ],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 8 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generatePatchTask(seed: string, index: number): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const constraints = randomDiffPatchConstraints(rng);
  const source = randomObject(rng, 1, 3, 2, 4);
  const target = randomObject(rng, 1, 3, 2, 4);
  const patch = diff(source, target, constraints);
  const output = apply(patch, source, constraints);

  return {
    id: `patch-v0-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.diff_patch.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'patch', constraints },
    examples: [
      {
        input: { patch, source } as Record<string, unknown>,
        output: output as Record<string, unknown>,
      },
    ],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 8 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateMergeTask(seed: string, index: number): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const constraints = randomMergeConstraints(rng);
  const left = randomObject(rng, 1, 3, 2, 4);
  const right = randomObject(rng, 1, 3, 2, 4);

  let output: unknown;
  try {
    output = merge(left, right, constraints);
  } catch {
    // If error policy and there's a conflict, use right as fallback
    output = right;
  }

  return {
    id: `merge-v0-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.merge.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'merge', constraints },
    examples: [
      {
        input: { left, right } as Record<string, unknown>,
        output: output as Record<string, unknown>,
      },
    ],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 8 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

// ─── Failure diff annotation ──────────────────────────────────────────────────
//
// Computes a minimal structural diff between expected and actual solver output
// for use in FAEP records when a verifier check fails (issue #60).  The diff is
// redacted, size-capped, and timed-out so failure records are safe to ship.

const SENSITIVE_KEY_RE = /_(secret|password|token|key)$/i;
const DIFF_SIZE_CAP_BYTES = 4096;
const DIFF_TIMEOUT_MS = 50;
const DIFF_CONSTRAINTS = { max_depth: 10, array_indices: true, format: 'merge' as const };

/** Recursively replace values under keys matching the sensitive-key pattern. */
function redactSensitiveKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveKeys);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      out[key] = SENSITIVE_KEY_RE.test(key)
        ? '[REDACTED]'
        : redactSensitiveKeys(obj[key]);
    }
    return out;
  }
  return value;
}

/** Result of annotating an adversarial failure with a minimal structural diff. */
export interface FailureAnnotation {
  /** Minimal structural diff between actual and expected output. */
  failure_diff: FailureDiff;
  /** SHA-256 hash of the serialized diff.  Null when diff is a sentinel string. */
  failure_diff_hash: string | null;
}

/**
 * Annotate an adversarial failure with a minimal structural diff.
 *
 * Computes a merge-patch style diff between the solver's actual output and the
 * verifier's expected output.  Sensitive keys matching
 * `/_(secret|password|token|key)$/i` are redacted before diffing.  The result
 * is size-capped at 4 KB and timed out at 50 ms.
 *
 * Possible return values for `failure_diff`:
 * - An object: merge-patch delta or a `{ __structure_clash__ }` sentinel
 *   when the two values are not mutually comparable JSON types.
 * - A string: `"<diff_too_large>"` or `"__DIFF_UNAVAILABLE__"` sentinel.
 * - `null` when the values are identical (no diff needed).
 */
export function annotateFailureDiff(
  expectedOutput: unknown,
  actualOutput: unknown,
): FailureAnnotation {
  // Identical values → no diff needed.
  if (JSON.stringify(expectedOutput) === JSON.stringify(actualOutput)) {
    return { failure_diff: null, failure_diff_hash: null };
  }

  // Detect structure clash (type mismatch between top-level JSON kinds).
  const expectedIsArray = Array.isArray(expectedOutput);
  const actualIsArray = Array.isArray(actualOutput);
  const expectedIsPlainObj =
    !expectedIsArray && expectedOutput !== null && typeof expectedOutput === 'object';
  const actualIsPlainObj =
    !actualIsArray && actualOutput !== null && typeof actualOutput === 'object';

  if (expectedIsArray !== actualIsArray || expectedIsPlainObj !== actualIsPlainObj) {
    const expectedType = expectedIsArray ? 'array' : expectedIsPlainObj ? 'object' : typeof expectedOutput;
    const actualType = actualIsArray ? 'array' : actualIsPlainObj ? 'object' : typeof actualOutput;
    const sentinel = {
      __structure_clash__: true,
      reason: `expected ${expectedType}, got ${actualType}`,
    };
    return { failure_diff: sentinel, failure_diff_hash: sha256Hex(sentinel) };
  }

  // Redact sensitive keys in both sides *before* diffing so secrets never
  // appear in the delta.
  const redactedExpected = redactSensitiveKeys(expectedOutput);
  const redactedActual = redactSensitiveKeys(actualOutput);

  const start = Date.now();
  try {
    const patch = diff(redactedActual, redactedExpected, DIFF_CONSTRAINTS);

    // Timeout guard — synchronous diff should be fast but we bound it.
    if (Date.now() - start > DIFF_TIMEOUT_MS) {
      return { failure_diff: '__DIFF_UNAVAILABLE__', failure_diff_hash: null };
    }

    // Size-cap check on the serialized diff.
    if (JSON.stringify(patch).length > DIFF_SIZE_CAP_BYTES) {
      return { failure_diff: '<diff_too_large>', failure_diff_hash: null };
    }

    return { failure_diff: patch as FailureDiff, failure_diff_hash: sha256Hex(patch) };
  } catch {
    return { failure_diff: '__DIFF_UNAVAILABLE__', failure_diff_hash: null };
  }
}

// Map operation family to task generator
const FAMILY_GENERATORS: Record<
  TaskFamily,
  (seed: string, index: number) => TaskSpec
> = {
  'json_transform.normalize.v0': generateNormalizeTask,
  'json_transform.diff_patch.v0': (seed: string, index: number) => {
    // Randomly choose diff or patch
    const rng = Rng.fromSeed(seed);
    return rng.bool() ? generateDiffTask(seed, index) : generatePatchTask(seed, index);
  },
  'json_transform.merge.v0': generateMergeTask,
  'json_transform.schema_migration.v0': () => {
    throw new Error('Schema migration not implemented in this generator');
  },
};

export interface GenerateOptions {
  family: TaskFamily;
  count: number;
  rootSeed: string;
}

export interface GenerateOutput {
  tasks: TaskSpec[];
  seeds: string[];
}

/**
 * Generate random baseline tasks for the json_transform world.
 *
 * @param opts - Generation options including family, count, and root seed
 * @returns Generated tasks and their seeds
 */
export function generate(opts: GenerateOptions): GenerateOutput {
  const tasks: TaskSpec[] = [];
  const seeds: string[] = [];

  const generator = FAMILY_GENERATORS[opts.family];
  if (!generator) {
    throw new Error(`Unsupported family: ${opts.family}`);
  }

  for (let i = 0; i < opts.count; i++) {
    const seed = `${opts.rootSeed}:${i}`;
    const task = generator(seed, i);
    tasks.push(task);
    seeds.push(seed);
  }

  return { tasks, seeds };
}

export { type NormalizeConstraints, type DiffPatchConstraints, type MergeConstraints, type FailureDiff };
export { type FailureAnnotation, annotateFailureDiff };
