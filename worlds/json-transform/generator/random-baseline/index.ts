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
  sha256OfString,
  shortHash,
} from '@fresharena/verifier-runtime';

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

// Simple deterministic RNG for reproducible generation
class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  static fromSeed(seedStr: string): Rng {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      const char = seedStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return new Rng(Math.abs(hash));
  }

  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  bool(): boolean {
    return this.next() < 0.5;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

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

export { type NormalizeConstraints, type DiffPatchConstraints, type MergeConstraints };
