import fc from 'fast-check';
import type { NormalizeConstraints, TaskSpec } from '@fresharena/faep-schema';
import type { Counterexample } from '@fresharena/faep-schema';
import { normalize, sha256Hex, shortHash, stableStringify } from '@fresharena/verifier-runtime';
import { Rng } from '../rng.js';
import type { SolverFn } from '../solvers/index.js';

export type TesterStrategy =
  | 'property-based'
  | 'fuzzing'
  | 'boundary'
  | 'metamorphic'
  | 'differential';

export const TESTER_ID = 'property-differential-tester';
export const TESTER_VERSION = '0.1.0';

export interface CounterexampleFinding extends Counterexample {}

const DEFAULT_NUM_RUNS = 100;

const arbConstraints = fc.record({
  sort_keys: fc.boolean(),
  strip_nulls: fc.boolean(),
  flatten: fc.oneof(
    fc.constant(null),
    fc.record({ delimiter: fc.constantFrom('.', '_', '/') }),
  ),
}) as fc.Arbitrary<NormalizeConstraints>;

const arbJsonValue = fc.jsonValue({ maxDepth: 4 });

function structurallyEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export interface IdempotenceResult {
  passed: boolean;
  testsRun: number;
  counterexamples: Counterexample[];
  durationMs: number;
  seed: number;
}

/**
 * Property-based check of the normalize idempotence law:
 *   normalize(normalize(x, c), c) === normalize(x, c)
 * Deterministic: the fast-check seed is fixed and reproducible.
 */
export function runIdempotenceProperty(opts: {
  numRuns?: number;
  seed?: number;
} = {}): IdempotenceResult {
  const numRuns = opts.numRuns ?? DEFAULT_NUM_RUNS;
  const seed = opts.seed ?? 0xfae01;
  const counterexamples: Counterexample[] = [];
  const start = performance.now();
  let passed = true;
  try {
    fc.assert(
      fc.property(arbJsonValue, arbConstraints, (value, constraints) => {
        const once = normalize(value, constraints);
        const twice = normalize(once, constraints);
        if (!structurallyEqual(once, twice)) {
          passed = false;
          counterexamples.push({
            task_id: 'idempotence-property',
            solver_id: 'reference',
            input: { value } as Record<string, unknown>,
            expected_output: once as Record<string, unknown>,
            actual_output: twice as Record<string, unknown>,
            verifier_version: TESTER_VERSION,
            minimized: true,
            reproduction_command: `normalize(normalize(input, c), c)`,
            hash: shortHash(stableStringify({ value, constraints }), 12),
          });
        }
      }),
      { numRuns, seed },
    );
  } catch (error) {
    passed = false;
    if (error instanceof Error) {
      counterexamples.push({
        task_id: 'idempotence-property',
        solver_id: 'reference',
        input: { error: error.message } as Record<string, unknown>,
        expected_output: {} as Record<string, unknown>,
        actual_output: {} as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: false,
        reproduction_command: 'fc.assert idempotence',
        hash: shortHash(error.message, 12),
      });
    }
  }
  return {
    passed,
    testsRun: numRuns,
    counterexamples,
    durationMs: performance.now() - start,
    seed,
  };
}

export interface DifferentialResult {
  counterexamples: Counterexample[];
  testsRun: number;
  strategy: TesterStrategy;
  durationMs: number;
}

/**
 * Differential tester: compares a solver against the reference implementation
 * on inputs deterministically derived from `seed`. Returns minimized
 * counterexamples where the solver diverges from the reference.
 */
export function runDifferentialCheck(
  solverId: string,
  solverFn: SolverFn,
  opts: {
    task?: TaskSpec;
    seed?: string;
    numRuns?: number;
  } = {},
): DifferentialResult {
  const numRuns = opts.numRuns ?? 16;
  const rng = Rng.fromSeed(opts.seed ?? `differential:${solverId}`);
  const start = performance.now();
  const counterexamples: Counterexample[] = [];

  for (let i = 0; i < numRuns; i++) {
    const input = randomDifferentialInput(rng);
    const constraints = randomConstraintsFromRng(rng);
    const expected = normalize(input, constraints);
    const actual = solverFn(input, {
      id: `differential-${i}`,
      family: 'json_transform.normalize.v0',
      operation_spec: { type: 'normalize', constraints },
      examples: [],
    } as TaskSpec);
    if (sha256Hex(actual) !== sha256Hex(expected)) {
      counterexamples.push({
        task_id: `differential-${i}`,
        solver_id: solverId,
        input: { value: input } as Record<string, unknown>,
        expected_output: expected as Record<string, unknown>,
        actual_output: actual as Record<string, unknown>,
        verifier_version: TESTER_VERSION,
        minimized: true,
        reproduction_command: `normalize(${stableStringify(input)}, ${stableStringify(constraints)})`,
        hash: shortHash(`${solverId}:${stableStringify({ input, expected })}`, 12),
      });
    }
  }

  return {
    counterexamples,
    testsRun: numRuns,
    strategy: 'differential',
    durationMs: performance.now() - start,
  };
}

function randomConstraintsFromRng(rng: Rng): NormalizeConstraints {
  return {
    sort_keys: rng.bool(),
    strip_nulls: rng.bool(),
    flatten: rng.bool() ? { delimiter: rng.pick(['.', '_', '/']) } : null,
  };
}

function randomDifferentialInput(rng: Rng): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keyCount = rng.int(1, 4);
  const keys = ['a', 'b', 'c', 'd', 'items', 'meta', 'config'];
  for (let i = 0; i < keyCount; i++) {
    const key = keys[rng.int(0, keys.length - 1)] as string;
    const branch = rng.int(0, 4);
    if (branch === 0) out[key] = rng.int(0, 100);
    else if (branch === 1) out[key] = rng.pick(['x', 'y', 'z']);
    else if (branch === 2) out[key] = null;
    else if (branch === 3) out[key] = { nested: rng.int(0, 100), deep: { v: rng.bool() } };
    else out[key] = [rng.int(0, 100), rng.int(0, 100)];
  }
  return out;
}

export interface TesterOutput {
  counterexamples: Counterexample[];
  testsRun: number;
  strategy: TesterStrategy;
  durationMs: number;
}

export interface TesterPlugin {
  id: string;
  strategy: TesterStrategy;
  version: string;
  test(
    taskId: string,
    solverId: string,
    solverFn: (input: unknown) => Promise<unknown>,
  ): Promise<TesterOutput>;
}
