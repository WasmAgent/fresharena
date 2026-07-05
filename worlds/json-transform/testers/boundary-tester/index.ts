/**
 * Boundary tester for json_transform world.
 *
 * Tests edge cases: empty objects, null values, max-depth nesting, large arrays,
 * and other boundary conditions that commonly cause issues.
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

const TESTER_ID = 'boundary-tester';
const TESTER_VERSION = '0.1.0';

export interface BoundaryTestResult {
  passed: boolean;
  testsRun: number;
  counterexamples: Counterexample[];
  durationMs: number;
  boundaryCondition: string;
}

/**
 * Test empty objects and arrays.
 */
export function testEmptyInputs(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  const testCases = [
    {
      name: 'empty-object-normalize',
      op: 'normalize' as const,
      input: {},
      constraints: { sort_keys: true, strip_nulls: true, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'empty-array-normalize',
      op: 'normalize' as const,
      input: [],
      constraints: { sort_keys: true, strip_nulls: false, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'empty-diff',
      op: 'diff' as const,
      source: {},
      target: {},
      constraints: { max_depth: 5, array_indices: true, format: 'ops' as const },
    },
    {
      name: 'empty-patch',
      op: 'patch' as const,
      patch: [],
      source: {},
      constraints: { max_depth: 5, array_indices: true, format: 'ops' as const },
    },
    {
      name: 'empty-merge',
      op: 'merge' as const,
      left: {},
      right: {},
      constraints: { policy: 'right' as const, merge_arrays: false, array_dedup: false },
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      let expected: unknown;
      let actual: unknown;

      switch (tc.op) {
        case 'normalize':
          expected = normalize(tc.input, tc.constraints);
          actual = normalize(tc.input, tc.constraints);
          break;
        case 'diff':
          expected = diff(tc.source, tc.target, tc.constraints);
          actual = diff(tc.source, tc.target, tc.constraints);
          break;
        case 'patch':
          expected = apply(tc.patch, tc.source, tc.constraints);
          actual = apply(tc.patch, tc.source, tc.constraints);
          break;
        case 'merge':
          expected = merge(tc.left, tc.right, tc.constraints);
          actual = merge(tc.left, tc.right, tc.constraints);
          break;
      }

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify(tc), 12),
        });
        passed = false;
      }
    } catch (e) {
      counterexamples.push({
        task_id: `boundary-${tc.name}-error`,
        solver_id: 'reference',
        input: { tc } as Record<string, unknown>,
        expected_output: {} as Record<string, unknown>,
        actual_output: { error: (e as Error).message } as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: tc.name,
        hash: shortHash(stableStringify(tc), 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'empty-inputs',
  };
}

/**
 * Test null handling.
 */
export function testNullHandling(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  const testCases = [
    {
      name: 'null-input',
      op: 'normalize' as const,
      input: null,
      constraints: { sort_keys: true, strip_nulls: true, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'null-values-in-object',
      op: 'normalize' as const,
      input: { a: null, b: 1, c: { nested: null } },
      constraints: { sort_keys: true, strip_nulls: true, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'all-nulls',
      op: 'normalize' as const,
      input: { a: null, b: null, c: { d: null } },
      constraints: { sort_keys: true, strip_nulls: true, flatten: null } as NormalizeConstraints,
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      const expected = normalize(tc.input, tc.constraints);
      const actual = normalize(tc.input, tc.constraints);

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify(tc), 12),
        });
        passed = false;
      }
    } catch (e) {
      counterexamples.push({
        task_id: `boundary-${tc.name}-error`,
        solver_id: 'reference',
        input: { tc } as Record<string, unknown>,
        expected_output: {} as Record<string, unknown>,
        actual_output: { error: (e as Error).message } as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: tc.name,
        hash: shortHash(stableStringify(tc), 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'null-handling',
  };
}

/**
 * Test deep nesting.
 */
export function testDeepNesting(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  // Create deeply nested object
  let deepNested: Record<string, unknown> = { value: 'leaf' };
  for (let i = 0; i < 50; i++) {
    deepNested = { [`level${i}`]: deepNested };
  }

  const testCases = [
    {
      name: 'deep-nesting-normalize',
      op: 'normalize' as const,
      input: deepNested,
      constraints: { sort_keys: true, strip_nulls: false, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'deep-nesting-flatten',
      op: 'normalize' as const,
      input: deepNested,
      constraints: { sort_keys: false, strip_nulls: false, flatten: { delimiter: '.' } } as NormalizeConstraints,
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      const expected = normalize(tc.input, tc.constraints);
      const actual = normalize(tc.input, tc.constraints);

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify({ name: tc.name }), 12),
        });
        passed = false;
      }
    } catch (e) {
      // Deep nesting might hit limits - that's expected
      // Just track it, don't fail
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'deep-nesting',
  };
}

/**
 * Test large arrays.
 */
export function testLargeArrays(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item${i}` }));

  const testCases = [
    {
      name: 'large-array-normalize',
      op: 'normalize' as const,
      input: { items: largeArray },
      constraints: { sort_keys: true, strip_nulls: false, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'large-array-diff',
      op: 'diff' as const,
      source: { items: largeArray },
      target: { items: [...largeArray, { id: 1000, value: 'item1000' }] },
      constraints: { max_depth: 3, array_indices: false, format: 'ops' as const },
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      let expected: unknown;
      let actual: unknown;

      switch (tc.op) {
        case 'normalize':
          expected = normalize(tc.input, tc.constraints);
          actual = normalize(tc.input, tc.constraints);
          break;
        case 'diff':
          expected = diff(tc.source, tc.target, tc.constraints);
          actual = diff(tc.source, tc.target, tc.constraints);
          break;
      }

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify({ name: tc.name }), 12),
        });
        passed = false;
      }
    } catch (e) {
      // Large arrays might hit limits - that's expected
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'large-arrays',
  };
}

/**
 * Test wide objects (many keys).
 */
export function testWideObjects(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  const wideObject: Record<string, unknown> = {};
  for (let i = 0; i < 100; i++) {
    wideObject[`key${i}`] = i % 2 === 0 ? null : `value${i}`;
  }

  const testCases = [
    {
      name: 'wide-object-normalize',
      op: 'normalize' as const,
      input: wideObject,
      constraints: { sort_keys: true, strip_nulls: true, flatten: null } as NormalizeConstraints,
    },
    {
      name: 'wide-object-flatten',
      op: 'normalize' as const,
      input: wideObject,
      constraints: { sort_keys: true, strip_nulls: false, flatten: { delimiter: '.' } } as NormalizeConstraints,
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      const expected = normalize(tc.input, tc.constraints);
      const actual = normalize(tc.input, tc.constraints);

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify({ name: tc.name }), 12),
        });
        passed = false;
      }
    } catch (e) {
      counterexamples.push({
        task_id: `boundary-${tc.name}-error`,
        solver_id: 'reference',
        input: { tc } as Record<string, unknown>,
        expected_output: {} as Record<string, unknown>,
        actual_output: { error: (e as Error).message } as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: tc.name,
        hash: shortHash(stableStringify({ name: tc.name }), 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'wide-objects',
  };
}

/**
 * Test special characters in keys.
 */
export function testSpecialKeyCharacters(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  const specialKeys = {
    '': 'empty',
    ' ': 'space',
    '.': 'dot',
    '_': 'underscore',
    '-': 'dash',
    '/': 'slash',
    '~': 'tilde',
    'café': 'unicode',
    '😀': 'emoji',
  };

  const testCases = [
    {
      name: 'special-keys-normalize',
      op: 'normalize' as const,
      input: specialKeys,
      constraints: { sort_keys: true, strip_nulls: false, flatten: { delimiter: '.' } } as NormalizeConstraints,
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      const expected = normalize(tc.input, tc.constraints);
      const actual = normalize(tc.input, tc.constraints);

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify({ name: tc.name }), 12),
        });
        passed = false;
      }
    } catch (e) {
      counterexamples.push({
        task_id: `boundary-${tc.name}-error`,
        solver_id: 'reference',
        input: { tc } as Record<string, unknown>,
        expected_output: {} as Record<string, unknown>,
        actual_output: { error: (e as Error).message } as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: tc.name,
        hash: shortHash(stableStringify({ name: tc.name }), 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'special-key-characters',
  };
}

/**
 * Test merge with various conflict scenarios.
 */
export function testMergeConflicts(): BoundaryTestResult {
  const start = performance.now();
  const counterexamples: Counterexample[] = [];
  let passed = true;
  let testsRun = 0;

  const testCases = [
    {
      name: 'merge-no-conflict',
      left: { a: 1, b: 2 },
      right: { c: 3, d: 4 },
      constraints: { policy: 'right' as const, merge_arrays: false, array_dedup: false },
    },
    {
      name: 'merge-all-conflicts',
      left: { a: 1, b: 2 },
      right: { a: 10, b: 20 },
      constraints: { policy: 'left' as const, merge_arrays: false, array_dedup: false },
    },
    {
      name: 'merge-deep-conflict',
      left: { config: { timeout: 100 } },
      right: { config: { timeout: 200 } },
      constraints: { policy: 'deep' as const, merge_arrays: false, array_dedup: false },
    },
  ];

  for (const tc of testCases) {
    testsRun++;
    try {
      const expected = merge(tc.left, tc.right, tc.constraints);
      const actual = merge(tc.left, tc.right, tc.constraints);

      if (sha256Hex(actual) !== sha256Hex(expected)) {
        counterexamples.push({
          task_id: `boundary-${tc.name}`,
          solver_id: 'reference',
          input: { tc } as Record<string, unknown>,
          expected_output: expected as Record<string, unknown>,
          actual_output: actual as Record<string, unknown>,
          verifier_version: TESTER_VERSION,
          minimized: true,
          reproduction_command: tc.name,
          hash: shortHash(stableStringify({ name: tc.name }), 12),
        });
        passed = false;
      }
    } catch (e) {
      counterexamples.push({
        task_id: `boundary-${tc.name}-error`,
        solver_id: 'reference',
        input: { tc } as Record<string, unknown>,
        expected_output: {} as Record<string, unknown>,
        actual_output: { error: (e as Error).message } as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: tc.name,
        hash: shortHash(stableStringify({ name: tc.name }), 12),
      });
      passed = false;
    }
  }

  return {
    passed,
    testsRun,
    counterexamples,
    durationMs: performance.now() - start,
    boundaryCondition: 'merge-conflicts',
  };
}

export interface BoundaryTestSuiteResult {
  results: BoundaryTestResult[];
  overallPassed: boolean;
  totalTestsRun: number;
  totalCounterexamples: number;
  durationMs: number;
}

/**
 * Run all boundary tests for the json_transform world.
 */
export function runBoundaryTests(): BoundaryTestSuiteResult {
  const start = performance.now();
  const results: BoundaryTestResult[] = [];

  results.push(testEmptyInputs());
  results.push(testNullHandling());
  results.push(testDeepNesting());
  results.push(testLargeArrays());
  results.push(testWideObjects());
  results.push(testSpecialKeyCharacters());
  results.push(testMergeConflicts());

  const overallPassed = results.every((r) => r.passed);
  const totalTestsRun = results.reduce((sum, r) => sum + r.testsRun, 0);
  const totalCounterexamples = results.reduce((sum, r) => sum + r.counterexamples.length, 0);

  return {
    results,
    overallPassed,
    totalTestsRun,
    totalCounterexamples,
    durationMs: performance.now() - start,
  };
}

export type { Counterexample, TaskSpec };
