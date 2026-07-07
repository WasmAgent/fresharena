import type { Counterexample } from '@fresharena/faep-schema';
import type { TaskSpec } from '@fresharena/faep-schema';
import { normalize, sha256Hex, shortHash, stableStringify } from '@fresharena/verifier-runtime';
import type { SolverFn } from '../solvers/index.js';

export interface MinimizerOptions {
  maxIterations?: number;
  timeoutMs?: number;
  verbose?: boolean;
}

export interface MinimizerResult {
  minimized: Counterexample;
  iterations: number;
  durationMs: number;
  reductionRatio: number; // (original size - minimized size) / original size
}

/**
 * Estimates the size of a value for reduction ratio calculation.
 * Counts object keys + array elements + primitive string lengths as a heuristic.
 */
function estimateSize(value: unknown): number {
  if (value === null || value === undefined) return 1;
  if (typeof value === 'boolean') return 1;
  if (typeof value === 'number') return 1;
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + estimateSize(item), 0);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).reduce((sum, key) => sum + key.length + estimateSize(obj[key]), 0);
  }
  return 1;
}

/**
 * Checks if two values are functionally equivalent by comparing their SHA256 hashes.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  return sha256Hex(a) === sha256Hex(b);
}

/**
 * Tests if a given input still produces a failure when run through the solver vs reference.
 * Returns true if the failure is reproduced (solver output differs from reference).
 */
function isStillFailing(
  input: unknown,
  constraints: unknown,
  referenceFn: (input: unknown, constraints: unknown) => unknown,
  solverFn: SolverFn,
  taskSpec: TaskSpec,
): boolean {
  try {
    const expected = referenceFn(input, constraints);
    const actual = solverFn(input, taskSpec);
    return !valuesEqual(expected, actual);
  } catch {
    // If either throws, consider it a different kind of failure - still failing
    return true;
  }
}

/**
 * Minimizes a plain object input by attempting to remove each key.
 * Returns the smallest object that still reproduces the failure.
 */
function minimizeObject(
  obj: Record<string, unknown>,
  constraints: unknown,
  referenceFn: (input: unknown, constraints: unknown) => unknown,
  solverFn: SolverFn,
  taskSpec: TaskSpec,
  maxDepth: number,
): Record<string, unknown> {
  if (maxDepth <= 0) return obj;

  const keys = Object.keys(obj);
  const result: Record<string, unknown> = {};

  // Try removing each key one by one
  for (const key of keys) {
    const withoutKey = { ...obj };
    delete withoutKey[key];

    // If removing this key stops the failure, keep it
    if (!isStillFailing(withoutKey, constraints, referenceFn, solverFn, taskSpec)) {
      result[key] = obj[key];
    } else {
      // Key was removed, now try to minimize its value recursively if it's complex
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const minimizedValue = minimizeObject(
          value as Record<string, unknown>,
          constraints,
          referenceFn,
          solverFn,
          taskSpec,
          maxDepth - 1,
        );
        // If recursive minimization worked, use the minimized value
        const withMinimizedValue = { ...obj, [key]: minimizedValue };
        if (isStillFailing(withMinimizedValue, constraints, referenceFn, solverFn, taskSpec)) {
          result[key] = minimizedValue;
        }
      }
      // Keep the failure state after removal
    }
  }

  // If result is empty, return minimal non-empty object that still fails
  if (Object.keys(result).length === 0) {
    return obj;
  }

  return result;
}

/**
 * Minimizes an array input by trying to remove elements and binary search.
 * Returns the smallest array that still reproduces the failure.
 */
function minimizeArray(
  arr: unknown[],
  constraints: unknown,
  referenceFn: (input: unknown, constraints: unknown) => unknown,
  solverFn: SolverFn,
  taskSpec: TaskSpec,
  maxDepth: number,
): unknown[] {
  if (maxDepth <= 0 || arr.length <= 1) return arr;

  // Binary search for minimal failing subset
  let left = 1;
  let right = arr.length;
  let minimalLength = arr.length;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const subset = arr.slice(0, mid);

    if (isStillFailing(subset, constraints, referenceFn, solverFn, taskSpec)) {
      minimalLength = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return arr.slice(0, minimalLength);
}

/**
 * Minimizes a primitive value by trying simpler alternatives.
 */
function minimizePrimitive(
  value: string | number | boolean | null,
  constraints: unknown,
  referenceFn: (input: unknown, constraints: unknown) => unknown,
  solverFn: SolverFn,
  taskSpec: TaskSpec,
): unknown {
  // Order to try: null -> 0 -> "" -> false
  const simplerValues: unknown[] = [null, 0, '', false];

  for (const simpler of simplerValues) {
    if (typeof simpler === typeof value || simpler === null) {
      if (isStillFailing(simpler, constraints, referenceFn, solverFn, taskSpec)) {
        return simpler;
      }
    }
  }

  return value;
}

/**
 * Main minimization function that dispatches based on input type.
 */
function minimizeInput(
  input: unknown,
  constraints: unknown,
  referenceFn: (input: unknown, constraints: unknown) => unknown,
  solverFn: SolverFn,
  taskSpec: TaskSpec,
  maxDepth = 10,
): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return minimizeArray(input, constraints, referenceFn, solverFn, taskSpec, maxDepth);
  }

  if (typeof input === 'object') {
    return minimizeObject(
      input as Record<string, unknown>,
      constraints,
      referenceFn,
      solverFn,
      taskSpec,
      maxDepth,
    );
  }

  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return minimizePrimitive(input, constraints, referenceFn, solverFn, taskSpec);
  }

  return input;
}

/**
 * Minimizes a counterexample by reducing its input to the smallest form
 * that still reproduces the failure.
 *
 * Strategy:
 * - For objects: tries removing each key recursively, keeping only essential ones
 * - For arrays: uses binary search to find minimal failing subset
 * - For primitives: tries simpler values (null, 0, empty string, false)
 * - Recursive: minimizes nested structures depth-first
 *
 * @param original - The original counterexample to minimize
 * @param referenceFn - Reference implementation function (e.g., normalize from verifier-runtime)
 * @param solverFn - Solver function being tested
 * @param taskSpec - Task specification for the solver
 * @param opts - Minimization options
 * @returns Minimization result with minimized counterexample and metrics
 */
export function minimizeCounterexample(
  original: Counterexample,
  referenceFn: (input: unknown, constraints: unknown) => unknown,
  solverFn: SolverFn,
  taskSpec: TaskSpec,
  opts: MinimizerOptions = {},
): MinimizerResult {
  const maxIterations = opts.maxIterations ?? 100;
  const timeoutMs = opts.timeoutMs ?? 5000;
  const startTime = performance.now();
  let iterations = 0;

  // Extract input and constraints from the counterexample
  const input = original.input;
  const constraints = (taskSpec.operation_spec as { constraints?: unknown })?.constraints ?? {};

  const originalSize = estimateSize(input);
  let currentInput = input;
  let minimizedInput = input;

  // Iterative minimization with timeout and iteration limits
  while (iterations < maxIterations && performance.now() - startTime < timeoutMs) {
    iterations++;

    const previousInput = currentInput;
    currentInput = minimizeInput(
      currentInput,
      constraints,
      referenceFn,
      solverFn,
      taskSpec,
      10, // maxDepth
    ) as Record<string, unknown>;

    // Check if we made progress
    if (valuesEqual(previousInput, currentInput)) {
      // No progress made, use the best we found
      break;
    }

    // Verify the minimized input still fails
    if (!isStillFailing(currentInput, constraints, referenceFn, solverFn, taskSpec)) {
      // Minimization went too far, rollback
      break;
    }

    minimizedInput = currentInput;

    // Early exit if we can't reduce further
    if (estimateSize(minimizedInput) === 0) {
      break;
    }
  }

  const minimizedSize = estimateSize(minimizedInput);
  const reductionRatio = originalSize > 0 ? (originalSize - minimizedSize) / originalSize : 0;

  // Compute expected and actual outputs for the minimized input
  const expectedOutput = referenceFn(minimizedInput, constraints) as Record<string, unknown>;
  const actualOutput = solverFn(minimizedInput, taskSpec) as Record<string, unknown>;

  const minimizedCounterexample: Counterexample = {
    task_id: original.task_id,
    solver_id: original.solver_id,
    input: minimizedInput as Record<string, unknown>,
    expected_output: expectedOutput,
    actual_output: actualOutput,
    verifier_version: original.verifier_version,
    minimized: true,
    reproduction_command: `normalize(${stableStringify(minimizedInput)}, ${stableStringify(constraints)})`,
    hash: shortHash(stableStringify({ minimizedInput, constraints }), 12),
  };

  return {
    minimized: minimizedCounterexample,
    iterations,
    durationMs: performance.now() - startTime,
    reductionRatio,
  };
}
