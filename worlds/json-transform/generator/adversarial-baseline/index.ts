/**
 * Adversarial-baseline generator for json_transform world.
 *
 * Generates tasks targeting historical solver failure patterns.
 * Focuses on edge cases, boundary conditions, and common implementation pitfalls.
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

// Simple deterministic RNG
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
      hash |= 0;
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

// Adversarial input generators targeting edge cases

function createDeepNesting(rng: Rng, depth: number): Record<string, unknown> {
  let obj: Record<string, unknown> = { value: 'leaf' };
  for (let i = 0; i < depth; i++) {
    obj = { [`level${i}`]: obj };
  }
  return obj;
}

function createWideObject(rng: Rng): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < 50; i++) {
    obj[`key${i}`] = rng.bool() ? null : `value${i}`;
  }
  return obj;
}

function createArrayHeavy(rng: Rng): Record<string, unknown> {
  return {
    items: Array.from({ length: 20 }, () => ({
      id: rng.int(0, 1000),
      value: rng.bool() ? null : `item`,
    })),
  };
}

function createMixedNulls(rng: Rng): Record<string, unknown> {
  return {
    a: null,
    b: { x: null, y: null, z: 'value' },
    c: [null, 1, null, 2],
    d: 'keep',
    e: { deep: { null: null, value: 'test' } },
  };
}

function createUnicodeKeys(rng: Rng): Record<string, unknown> {
  return {
    normal: 'value',
    'café': 'unicode',
    '日本語': 'japanese',
    '😀': 'emoji',
    'under_score': 'test',
    'with-dash': 'test',
    'with.dot': 'test',
  };
}

function createSparseArray(rng: Rng): Record<string, unknown> {
  const arr: (unknown)[] = [];
  arr[5] = 'far';
  arr[10] = 'farther';
  arr[100] = 'very far';
  return { sparse: arr };
}

// Adversarial task generators

function generateAdversarialNormalizeTask(
  seed: string,
  index: number,
  scenario: string,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  let input: Record<string, unknown>;
  let constraints: NormalizeConstraints;

  // Choose adversarial scenario based on index
  const scenarios = [
    () => ({ input: createDeepNesting(rng, 10), constraints: { sort_keys: true, strip_nulls: false, flatten: null } }),
    () => ({ input: createWideObject(rng), constraints: { sort_keys: true, strip_nulls: true, flatten: null } }),
    () => ({ input: createMixedNulls(rng), constraints: { sort_keys: false, strip_nulls: true, flatten: { delimiter: '.' } } }),
    () => ({ input: createUnicodeKeys(rng), constraints: { sort_keys: true, strip_nulls: false, flatten: null } }),
    () => ({ input: { nested: { deeply: { nested: { array: [1, 2, 3] } } } }, constraints: { sort_keys: true, strip_nulls: false, flatten: { delimiter: '_' } } }),
    () => ({ input: createSparseArray(rng), constraints: { sort_keys: true, strip_nulls: false, flatten: null } }),
  ];

  const scenarioFn = scenarios[index % scenarios.length];
  const result = scenarioFn();
  input = result.input;
  constraints = result.constraints;

  const output = normalize(input, constraints);

  return {
    id: `normalize-adversarial-${scenario}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.normalize.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'normalize', constraints },
    examples: [{ input: input as Record<string, unknown>, output: output as Record<string, unknown> }],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 4 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateAdversarialDiffTask(
  seed: string,
  index: number,
  scenario: string,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  let source: Record<string, unknown>;
  let target: Record<string, unknown>;
  let constraints: DiffPatchConstraints;

  const scenarios = [
    // Array indices scenario
    () => ({
      source: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      target: { items: [{ id: 1 }, { id: 4 }, { id: 3 }] },
      constraints: { max_depth: 5, array_indices: true, format: 'ops' },
    }),
    // Array replace scenario
    () => ({
      source: { items: [{ id: 1 }, { id: 2 }] },
      target: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      constraints: { max_depth: 5, array_indices: false, format: 'ops' },
    }),
    // Deep nesting diff
    () => ({
      source: createDeepNesting(rng, 5),
      target: { ...createDeepNesting(rng, 5), changed: 'value' },
      constraints: { max_depth: 3, array_indices: true, format: 'ops' },
    }),
    // Merge format with nulls
    () => ({
      source: { a: 'keep', b: 'delete', c: 'change' },
      target: { a: 'keep', b: null, c: 'changed' },
      constraints: { max_depth: 5, array_indices: true, format: 'merge' },
    }),
    // Wide object diff
    () => ({
      source: createWideObject(rng),
      target: { ...createWideObject(rng), newKey: 'newValue' },
      constraints: { max_depth: 5, array_indices: true, format: 'ops' },
    }),
  ];

  const scenarioFn = scenarios[index % scenarios.length];
  const result = scenarioFn();
  source = result.source;
  target = result.target;
  constraints = result.constraints;

  const output = diff(source, target, constraints);

  return {
    id: `diff-adversarial-${scenario}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
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
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 4 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateAdversarialPatchTask(
  seed: string,
  index: number,
  scenario: string,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  let patch: Parameters<typeof apply>[0];
  let source: Record<string, unknown>;
  let constraints: DiffPatchConstraints;

  const scenarios = [
    // Ops format patch
    () => {
      const src = { items: [{ id: 1 }, { id: 2 }] };
      const tgt = { items: [{ id: 1 }, { id: 3 }] };
      const constr = { max_depth: 5, array_indices: true, format: 'ops' as const };
      return { patch: diff(src, tgt, constr), source: src, constraints: constr };
    },
    // Merge format patch
    () => {
      const src = { a: '1', b: '2', c: '3' };
      const tgt = { a: '1', b: '4', c: '3' };
      const constr = { max_depth: 5, array_indices: true, format: 'merge' as const };
      return { patch: diff(src, tgt, constr), source: src, constraints: constr };
    },
    // Deep patch application
    () => {
      const src = createDeepNesting(rng, 4);
      const tgt = { ...src, newKey: 'newValue' };
      const constr = { max_depth: 5, array_indices: true, format: 'merge' as const };
      return { patch: diff(src, tgt, constr), source: src, constraints: constr };
    },
    // Array patch
    () => {
      const src = { arr: [1, 2, 3] };
      const tgt = { arr: [1, 4, 3] };
      const constr = { max_depth: 5, array_indices: true, format: 'ops' as const };
      return { patch: diff(src, tgt, constr), source: src, constraints: constr };
    },
  ];

  const scenarioFn = scenarios[index % scenarios.length];
  const result = scenarioFn();
  patch = result.patch;
  source = result.source;
  constraints = result.constraints;

  const output = apply(patch, source, constraints);

  return {
    id: `patch-adversarial-${scenario}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
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
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 4 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateAdversarialMergeTask(
  seed: string,
  index: number,
  scenario: string,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  let left: Record<string, unknown>;
  let right: Record<string, unknown>;
  let constraints: MergeConstraints;

  const scenarios = [
    // Left policy merge
    () => ({
      left: { a: 'left', b: 'left-b', shared: 'from-left' },
      right: { a: 'right', c: 'right-c', shared: 'from-right' },
      constraints: { policy: 'left' as const, merge_arrays: false, array_dedup: false },
    }),
    // Right policy merge
    () => ({
      left: { a: 'left', b: 'left-b', shared: 'from-left' },
      right: { a: 'right', c: 'right-c', shared: 'from-right' },
      constraints: { policy: 'right' as const, merge_arrays: false, array_dedup: false },
    }),
    // Deep merge with nested conflicts
    () => ({
      left: { config: { timeout: 100, retries: 3 }, items: [1, 2] },
      right: { config: { timeout: 200, enabled: true }, items: [3, 4] },
      constraints: { policy: 'deep' as const, merge_arrays: true, array_dedup: true },
    }),
    // Error policy with conflict
    () => ({
      left: { shared: 'left-value', unique: 'left-only' },
      right: { shared: 'right-value', unique2: 'right-only' },
      constraints: { policy: 'error' as const, merge_arrays: false, array_dedup: false },
    }),
    // Array merge scenarios
    () => ({
      left: { tags: ['a', 'b', 'c'], other: 'keep' },
      right: { tags: ['c', 'd', 'e'], other2: 'keep2' },
      constraints: { policy: 'right' as const, merge_arrays: true, array_dedup: true },
    }),
    // Wide object merge
    () => ({
      left: createWideObject(rng),
      right: createWideObject(rng),
      constraints: { policy: 'deep' as const, merge_arrays: false, array_dedup: false },
    }),
  ];

  const scenarioFn = scenarios[index % scenarios.length];
  const result = scenarioFn();
  left = result.left;
  right = result.right;
  constraints = result.constraints;

  let output: unknown;
  try {
    output = merge(left, right, constraints);
  } catch {
    // For error policy with conflicts, output is undefined/error state
    output = right;
  }

  return {
    id: `merge-adversarial-${scenario}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
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
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 4 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

export interface GenerateOptions {
  family: TaskFamily;
  count: number;
  rootSeed: string;
  scenario?: string;
}

export interface GenerateOutput {
  tasks: TaskSpec[];
  seeds: string[];
}

/**
 * Generate adversarial tasks targeting edge cases and common pitfalls.
 *
 * @param opts - Generation options including family, count, root seed, and scenario type
 * @returns Generated tasks and their seeds
 */
export function generate(opts: GenerateOptions): GenerateOutput {
  const tasks: TaskSpec[] = [];
  const seeds: string[] = [];
  const scenario = opts.scenario ?? 'edge';

  for (let i = 0; i < opts.count; i++) {
    const seed = `${opts.rootSeed}:${scenario}:${i}`;
    let task: TaskSpec;

    switch (opts.family) {
      case 'json_transform.normalize.v0':
        task = generateAdversarialNormalizeTask(seed, i, scenario);
        break;
      case 'json_transform.diff_patch.v0':
        // Alternate between diff and patch
        task = i % 2 === 0
          ? generateAdversarialDiffTask(seed, i, scenario)
          : generateAdversarialPatchTask(seed, i, scenario);
        break;
      case 'json_transform.merge.v0':
        task = generateAdversarialMergeTask(seed, i, scenario);
        break;
      case 'json_transform.schema_migration.v0':
        throw new Error('Schema migration not implemented in adversarial generator');
      default:
        throw new Error(`Unsupported family: ${opts.family}`);
    }

    tasks.push(task);
    seeds.push(seed);
  }

  return { tasks, seeds };
}

export { type NormalizeConstraints, type DiffPatchConstraints, type MergeConstraints };
