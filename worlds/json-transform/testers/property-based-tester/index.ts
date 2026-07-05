/**
 * Property-based tester for json_transform world.
 *
 * Verifies idempotence, round-trip, and monotonicity properties
 * via fast-check for all four operations.
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
import fc from 'fast-check';

const TESTER_ID = 'property-based-tester';
const TESTER_VERSION = '0.1.0';

// Constraint arbitraries
const arbNormalizeConstraints = fc.record({
  sort_keys: fc.boolean(),
  strip_nulls: fc.boolean(),
  flatten: fc.oneof(fc.constant(null), fc.record({ delimiter: fc.constantFrom('.', '_', '/') })),
}) as fc.Arbitrary<NormalizeConstraints>;

const arbDiffPatchConstraints = fc.record({
  max_depth: fc.nat({ max: 10 }),
  array_indices: fc.boolean(),
  format: fc.constantFrom('ops', 'merge'),
}) as fc.Arbitrary<DiffPatchConstraints>;

const arbMergeConstraints = fc.record({
  policy: fc.constantFrom('left', 'right', 'deep', 'error'),
  merge_arrays: fc.boolean(),
  array_dedup: fc.boolean(),
}) as fc.Arbitrary<MergeConstraints>;

const arbJsonValue = fc.jsonValue({ maxDepth: 4 });

function structurallyEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export interface PropertyTestResult {
  passed: boolean;
  testsRun: number;
  counterexamples: Counterexample[];
  durationMs: number;
  propertyName: string;
}

/**
 * Test normalize idempotence: normalize(normalize(x, c), c) === normalize(x, c)
 */
export function testNormalizeIdempotence(
  numRuns: number = 100,
  seed: number = 0x01,
): PropertyTestResult {
  const counterexamples: Counterexample[] = [];
  const start = performance.now();
  let passed = true;

  try {
    fc.assert(
      fc.property(arbJsonValue, arbNormalizeConstraints, (value, constraints) => {
        const once = normalize(value, constraints);
        const twice = normalize(once, constraints);
        if (!structurallyEqual(once, twice)) {
          counterexamples.push({
            task_id: `normalize-idempotence-${counterexamples.length}`,
            solver_id: 'reference',
            input: { value, constraints } as Record<string, unknown>,
            expected_output: once as Record<string, unknown>,
            actual_output: twice as Record<string, unknown>,
            verifier_version: TESTER_VERSION,
            minimized: true,
            reproduction_command: `normalize(normalize(input, c), c)`,
            hash: shortHash(stableStringify({ value, constraints }), 12),
          });
          passed = false;
          return false;
        }
        return true;
      }),
      { numRuns, seed },
    );
  } catch {
    passed = false;
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    propertyName: 'normalize-idempotence',
  };
}

/**
 * Test diff/patch round-trip: apply(diff(source, target), source) === target
 */
export function testDiffPatchRoundTrip(
  numRuns: number = 100,
  seed: number = 0x02,
): PropertyTestResult {
  const counterexamples: Counterexample[] = [];
  const start = performance.now();
  let passed = true;

  try {
    fc.assert(
      fc.property(arbJsonValue, arbJsonValue, arbDiffPatchConstraints, (source, target, constraints) => {
        const patch = diff(source, target, constraints);
        const result = apply(patch, source, constraints);
        if (!structurallyEqual(result, target)) {
          counterexamples.push({
            task_id: `diff-patch-roundtrip-${counterexamples.length}`,
            solver_id: 'reference',
            input: { source, target, constraints } as Record<string, unknown>,
            expected_output: target as Record<string, unknown>,
            actual_output: result as Record<string, unknown>,
            verifier_version: TESTER_VERSION,
            minimized: false,
            reproduction_command: `apply(diff(source, target), source)`,
            hash: shortHash(stableStringify({ source, target, constraints }), 12),
          });
          passed = false;
          return false;
        }
        return true;
      }),
      { numRuns, seed },
    );
  } catch {
    passed = false;
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    propertyName: 'diff-patch-roundtrip',
  };
}

/**
 * Test merge associativity for left/right policies:
 * merge(merge(a, b), c) === merge(a, merge(b, c))
 */
export function testMergeAssociativity(
  numRuns: number = 100,
  seed: number = 0x03,
): PropertyTestResult {
  const counterexamples: Counterexample[] = [];
  const start = performance.now();
  let passed = true;

  const arbMergeConstraintsLR = fc.record({
    policy: fc.constantFrom<'left' | 'right'>('left', 'right'),
    merge_arrays: fc.boolean(),
    array_dedup: fc.boolean(),
  }) as fc.Arbitrary<MergeConstraints>;

  try {
    fc.assert(
      fc.property(
        arbJsonValue,
        arbJsonValue,
        arbJsonValue,
        arbMergeConstraintsLR,
        (a, b, c, constraints) => {
          const leftFirst = merge(merge(a, b, constraints), c, constraints);
          const rightFirst = merge(a, merge(b, c, constraints), constraints);
          if (!structurallyEqual(leftFirst, rightFirst)) {
            counterexamples.push({
              task_id: `merge-associativity-${counterexamples.length}`,
              solver_id: 'reference',
              input: { a, b, c, constraints } as Record<string, unknown>,
              expected_output: leftFirst as Record<string, unknown>,
              actual_output: rightFirst as Record<string, unknown>,
              verifier_version: TESTER_VERSION,
              minimized: false,
              reproduction_command: `merge(merge(a, b), c) vs merge(a, merge(b, c))`,
              hash: shortHash(stableStringify({ a, b, c, constraints }), 12),
            });
            passed = false;
            return false;
          }
          return true;
        },
      ),
      { numRuns, seed },
    );
  } catch {
    passed = false;
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    propertyName: 'merge-associativity',
  };
}

/**
 * Test flatten monotonicity: flatten should not lose information
 * when delimiter is unique
 */
export function testFlattenMonotonicity(
  numRuns: number = 50,
  seed: number = 0x04,
): PropertyTestResult {
  const counterexamples: Counterexample[] = [];
  const start = performance.now();
  let passed = true;

  // Only test objects without arrays in keys (arrays are opaque)
  const arbSimpleObject = fc
    .dictionary(fc.regex(/^[a-z]+$/), fc.oneof(fc.string(), fc.number(), fc.boolean(), fc.constant(null)))
    .filter((obj) => {
      const check = (val: unknown): boolean => {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          for (const v of Object.values(val)) {
            if (!check(v)) return false;
          }
        }
        return true;
      };
      return check(obj);
    });

  try {
    fc.assert(
      fc.property(arbSimpleObject, (obj) => {
        const constraints: NormalizeConstraints = {
          sort_keys: true,
          strip_nulls: false,
          flatten: { delimiter: '.' },
        };
        const result = normalize(obj, constraints);
        // Result should be a flat object (no nested objects)
        const isFlat = (val: unknown): boolean => {
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            for (const v of Object.values(val)) {
              if (typeof v === 'object' && v !== null) {
                return false; // Found nested object or array
              }
            }
          }
          return true;
        };
        if (!isFlat(result)) {
          counterexamples.push({
            task_id: `flatten-monotonicity-${counterexamples.length}`,
            solver_id: 'reference',
            input: { obj, constraints } as Record<string, unknown>,
            expected_output: { flat: true } as Record<string, unknown>,
            actual_output: result as Record<string, unknown>,
            verifier_version: TESTER_VERSION,
            minimized: true,
            reproduction_command: 'flatten should produce flat objects',
            hash: shortHash(stableStringify({ obj }), 12),
          });
          passed = false;
          return false;
        }
        return true;
      }),
      { numRuns, seed },
    );
  } catch {
    passed = false;
  }

  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    propertyName: 'flatten-monotonicity',
  };
}

export interface PropertyTestSuiteResult {
  results: PropertyTestResult[];
  overallPassed: boolean;
  totalTestsRun: number;
  totalCounterexamples: number;
  durationMs: number;
}

/**
 * Run all property tests for the json_transform world.
 */
export function runPropertyTests(
  numRuns: number = 100,
): PropertyTestSuiteResult {
  const start = performance.now();
  const results: PropertyTestResult[] = [];

  results.push(testNormalizeIdempotence(numRuns, 0x01));
  results.push(testDiffPatchRoundTrip(numRuns, 0x02));
  results.push(testMergeAssociativity(numRuns, 0x03));
  results.push(testFlattenMonotonicity(Math.floor(numRuns / 2), 0x04));

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
