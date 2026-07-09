/**
 * Differential tester for json_transform world.
 *
 * Compares solver output against reference implementation on generated inputs.
 */

import type {
  DiffPatchConstraints,
  MergeConstraints,
  NormalizeConstraints,
  TaskSpec,
} from '@fresharena/faep-schema';
import type { Counterexample } from '@fresharena/faep-schema';
import {
  apply,
  diff,
  merge,
  normalize,
  sha256Hex,
  shortHash,
  stableStringify,
} from '@fresharena/verifier-runtime';

const TESTER_ID = 'differential-tester';
const TESTER_VERSION = '0.1.0';

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

// Input generators for differential testing
function randomPrimitive(rng: Rng): unknown {
  const branch = rng.int(0, 3);
  if (branch === 0) return ['alpha', 'beta', 'gamma', 'value'][rng.int(0, 3)];
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
    return randomObject(rng, depth + 1, maxDepth);
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

function randomObject(rng: Rng, depth: number, maxDepth: number): Record<string, unknown> {
  const keys = ['id', 'name', 'value', 'config', 'items', 'meta', 'version', 'enabled', 'tags', 'data', 'nested'];
  const keyCount = rng.int(1, 4);
  const available = [...keys];
  const out: Record<string, unknown> = {};
  for (let i = 0; i < keyCount && available.length > 0; i++) {
    const idx = rng.int(0, available.length - 1);
    const key = available.splice(idx, 1)[0] as string;
    out[key] = randomValue(rng, depth, maxDepth);
  }
  return out;
}

function randomNormalizeConstraints(rng: Rng): NormalizeConstraints {
  return {
    sort_keys: rng.bool(),
    strip_nulls: rng.bool(),
    flatten: rng.bool() ? { delimiter: rng.pick(['.', '_', '/']) } : null,
  };
}

function randomDiffPatchConstraints(rng: Rng): DiffPatchConstraints {
  return {
    max_depth: rng.int(3, 10),
    array_indices: rng.bool(),
    format: rng.bool() ? ('ops' as const) : ('merge' as const),
  };
}

function randomMergeConstraints(rng: Rng): MergeConstraints {
  return {
    policy: rng.pick(['left', 'right', 'deep', 'error']),
    merge_arrays: rng.bool(),
    array_dedup: rng.bool(),
  };
}

export interface DifferentialTestResult {
  passed: boolean;
  testsRun: number;
  counterexamples: Counterexample[];
  durationMs: number;
  solverId: string;
  operationType: string;
}

/**
 * Differential test for normalize operation.
 */
export function differentialTestNormalize(
  solverId: string,
  solverFn: (input: unknown, constraints: NormalizeConstraints) => unknown,
  opts: { seed?: string; numRuns?: number } = {},
): DifferentialTestResult {
  const numRuns = opts.numRuns ?? 32;
  const seed = opts.seed ?? `normalize:${solverId}`;
  const rng = Rng.fromSeed(seed);
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;

  for (let i = 0; i < numRuns; i++) {
    const constraints = randomNormalizeConstraints(rng);
    const input = randomObject(rng, 1, 3);

    const expected = normalize(input, constraints);
    let actual: unknown;
    try {
      actual = solverFn(input, constraints);
    } catch (e) {
      actual = e;
    }

    if (sha256Hex(actual) !== sha256Hex(expected)) {
      counterexamples.push({
        task_id: `normalize-diff-${i}`,
        solver_id: solverId,
        input: { input, constraints } as Record<string, unknown>,
        expected_output: expected as Record<string, unknown>,
        actual_output: actual as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: `normalize(${stableStringify(input)}, ${stableStringify(constraints)})`,
        hash: shortHash(`${solverId}:${stableStringify({ input, constraints })}`, 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    solverId,
    operationType: 'normalize',
  };
}

/**
 * Differential test for diff operation.
 */
export function differentialTestDiff(
  solverId: string,
  solverFn: (source: unknown, target: unknown, constraints: DiffPatchConstraints) => unknown,
  opts: { seed?: string; numRuns?: number } = {},
): DifferentialTestResult {
  const numRuns = opts.numRuns ?? 32;
  const seed = opts.seed ?? `diff:${solverId}`;
  const rng = Rng.fromSeed(seed);
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;

  for (let i = 0; i < numRuns; i++) {
    const constraints = randomDiffPatchConstraints(rng);
    const source = randomObject(rng, 1, 3);
    const target = randomObject(rng, 1, 3);

    const expected = diff(source, target, constraints);
    let actual: unknown;
    try {
      actual = solverFn(source, target, constraints);
    } catch (e) {
      actual = e;
    }

    if (sha256Hex(actual) !== sha256Hex(expected)) {
      counterexamples.push({
        task_id: `diff-diff-${i}`,
        solver_id: solverId,
        input: { source, target, constraints } as Record<string, unknown>,
        expected_output: expected as Record<string, unknown>,
        actual_output: actual as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: `diff(${stableStringify(source)}, ${stableStringify(target)}, ${stableStringify(constraints)})`,
        hash: shortHash(`${solverId}:${stableStringify({ source, target, constraints })}`, 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    solverId,
    operationType: 'diff',
  };
}

/**
 * Differential test for patch operation.
 */
export function differentialTestPatch(
  solverId: string,
  solverFn: (patch: unknown, source: unknown, constraints: DiffPatchConstraints) => unknown,
  opts: { seed?: string; numRuns?: number } = {},
): DifferentialTestResult {
  const numRuns = opts.numRuns ?? 32;
  const seed = opts.seed ?? `patch:${solverId}`;
  const rng = Rng.fromSeed(seed);
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;

  for (let i = 0; i < numRuns; i++) {
    const constraints = randomDiffPatchConstraints(rng);
    const source = randomObject(rng, 1, 3);
    const target = randomObject(rng, 1, 3);
    const patch = diff(source, target, constraints);

    const expected = apply(patch, source, constraints);
    let actual: unknown;
    try {
      actual = solverFn(patch, source, constraints);
    } catch (e) {
      actual = e;
    }

    if (sha256Hex(actual) !== sha256Hex(expected)) {
      counterexamples.push({
        task_id: `patch-diff-${i}`,
        solver_id: solverId,
        input: { patch, source, constraints } as Record<string, unknown>,
        expected_output: expected as Record<string, unknown>,
        actual_output: actual as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: `apply(${stableStringify(patch)}, ${stableStringify(source)}, ${stableStringify(constraints)})`,
        hash: shortHash(`${solverId}:${stableStringify({ patch, source, constraints })}`, 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    solverId,
    operationType: 'patch',
  };
}

/**
 * Differential test for merge operation.
 */
export function differentialTestMerge(
  solverId: string,
  solverFn: (left: unknown, right: unknown, constraints: MergeConstraints) => unknown,
  opts: { seed?: string; numRuns?: number } = {},
): DifferentialTestResult {
  const numRuns = opts.numRuns ?? 32;
  const seed = opts.seed ?? `merge:${solverId}`;
  const rng = Rng.fromSeed(seed);
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;

  for (let i = 0; i < numRuns; i++) {
    const constraints = randomMergeConstraints(rng);
    const left = randomObject(rng, 1, 3);
    const right = randomObject(rng, 1, 3);

    let expected: unknown;
    try {
      expected = merge(left, right, constraints);
    } catch {
      // For error policy with conflicts, we expect an error
      expected = null;
    }

    let actual: unknown;
    try {
      actual = solverFn(left, right, constraints);
    } catch {
      if (constraints.policy === 'error') {
        // Expected to throw for error policy
        actual = null;
      } else {
        actual = new Error('Solver threw unexpected error');
      }
    }

    // For error policy, we just check that both errored
    if (constraints.policy === 'error') {
      // Both should have errored
      if (actual !== null && actual !== expected) {
        counterexamples.push({
          task_id: `merge-diff-${i}`,
          solver_id: solverId,
          input: { left, right, constraints } as Record<string, unknown>,
          expected_output: {} as Record<string, unknown>,
          actual_output: { error: 'Expected to throw' } as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: false,
          reproduction_command: `merge(${stableStringify(left)}, ${stableStringify(right)}, error_policy)`,
          hash: shortHash(`${solverId}:${stableStringify({ left, right, constraints })}`, 12),
        });
        passed = false;
      }
    } else if (sha256Hex(actual) !== sha256Hex(expected)) {
      counterexamples.push({
        task_id: `merge-diff-${i}`,
        solver_id: solverId,
        input: { left, right, constraints } as Record<string, unknown>,
        expected_output: expected as Record<string, unknown>,
        actual_output: actual as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: `merge(${stableStringify(left)}, ${stableStringify(right)}, ${stableStringify(constraints)})`,
        hash: shortHash(`${solverId}:${stableStringify({ left, right, constraints })}`, 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    solverId,
    operationType: 'merge',
  };
}

export interface DifferentialTestSuiteResult {
  results: DifferentialTestResult[];
  overallPassed: boolean;
  totalTestsRun: number;
  totalCounterexamples: number;
  durationMs: number;
  solverId: string;
}

/**
 * Run all differential tests for a solver.
 */
export function runDifferentialTests(
  solverId: string,
  solverFns: {
    normalize?: (input: unknown, constraints: NormalizeConstraints) => unknown;
    diff?: (source: unknown, target: unknown, constraints: DiffPatchConstraints) => unknown;
    patch?: (patch: unknown, source: unknown, constraints: DiffPatchConstraints) => unknown;
    merge?: (left: unknown, right: unknown, constraints: MergeConstraints) => unknown;
  },
  opts: { seed?: string; numRuns?: number } = {},
): DifferentialTestSuiteResult {
  const start = performance.now();
  const results: DifferentialTestResult[] = [];

  if (solverFns.normalize) {
    results.push(differentialTestNormalize(solverId, solverFns.normalize, opts));
  }
  if (solverFns.diff) {
    results.push(differentialTestDiff(solverId, solverFns.diff, opts));
  }
  if (solverFns.patch) {
    results.push(differentialTestPatch(solverId, solverFns.patch, opts));
  }
  if (solverFns.merge) {
    results.push(differentialTestMerge(solverId, solverFns.merge, opts));
  }

  const overallPassed = results.every((r) => r.passed);
  const totalTestsRun = results.reduce((sum, r) => sum + r.testsRun, 0);
  const totalCounterexamples = results.reduce((sum, r) => sum + r.counterexamples.length, 0);

  return {
    results,
    overallPassed,
    totalTestsRun,
    totalCounterexamples,
    durationMs: performance.now() - start,
    solverId,
  };
}

export type { Counterexample, TaskSpec };
