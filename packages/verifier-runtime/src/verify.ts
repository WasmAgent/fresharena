import {
  parseDiffPatchConstraints,
  parseMergeConstraints,
  parseNormalizeConstraints,
  parseSchemaMigrationConstraints,
} from '@fresharena/faep-schema';
import { sha256Hex } from './crypto.js';
import { apply, diff } from './diff_patch.js';
import { merge } from './merge.js';
import { normalize } from './normalize.js';
import { migrate } from './schema_migration.js';

export interface VerifyInput {
  taskId: string;
  input: unknown;
  output: unknown;
  /** Raw `operation_spec.constraints` value from the task spec. */
  constraints: unknown;
  /** Operation type: 'normalize', 'diff', 'patch', 'merge', or 'migrate' */
  operationType?: 'normalize' | 'diff' | 'patch' | 'merge' | 'migrate';
}

export interface VerifyResult {
  passed: boolean;
  expected_hash: string;
  actual_hash: string;
  failure_reason?: string;
}

/**
 * Deterministic verifier oracle for all json_transform operations.
 *
 * For normalize, diff, patch, merge, and migrate operations, a submission passes
 * iff its structural hash equals the reference implementation's structural hash.
 * Object key order is irrelevant (see `stableStringify`); array order is significant.
 */
export function verify(input: VerifyInput): VerifyResult {
  const operationType = input.operationType || inferOperationType(input.taskId);

  let expected: unknown;
  let failureReason: string;

  switch (operationType) {
    case 'normalize':
      expected = verifyNormalize(input);
      failureReason = 'output does not match reference normalize output';
      break;

    case 'diff':
      expected = verifyDiff(input);
      failureReason = 'output does not match reference diff output';
      break;

    case 'patch':
      expected = verifyPatch(input);
      failureReason = 'output does not match reference patch output';
      break;

    case 'merge':
      expected = verifyMerge(input);
      failureReason = 'output does not match reference merge output';
      break;

    case 'migrate':
      expected = verifyMigrate(input);
      failureReason = 'output does not match reference migrate output';
      break;

    default:
      throw new Error(`Unknown operation type: ${operationType}`);
  }

  const expectedHash = sha256Hex(expected);
  const actualHash = sha256Hex(input.output);
  const passed = expectedHash === actualHash;
  const base = {
    passed,
    expected_hash: expectedHash,
    actual_hash: actualHash,
  };

  return passed ? base : { ...base, failure_reason: failureReason };
}

/**
 * Infer operation type from task ID.
 */
function inferOperationType(taskId: string): 'normalize' | 'diff' | 'patch' | 'merge' | 'migrate' {
  if (taskId.includes('normalize')) return 'normalize';
  if (taskId.includes('diff')) return 'diff';
  if (taskId.includes('patch')) return 'patch';
  if (taskId.includes('merge')) return 'merge';
  if (taskId.includes('migrate')) return 'migrate';
  throw new Error(`Cannot infer operation type from task ID: ${taskId}`);
}

/**
 * Verify normalize operation.
 */
function verifyNormalize(input: VerifyInput): unknown {
  const constraints = parseNormalizeConstraints(input.constraints);
  return normalize(input.input, constraints);
}

/**
 * Verify diff operation.
 * Input should be { source, target } and output should be the patch.
 */
function verifyDiff(input: VerifyInput): unknown {
  if (!isPlainObject(input.input)) {
    throw new Error('Diff input must be an object with source and target');
  }
  const { source, target } = input.input as { source?: unknown; target?: unknown };
  if (source === undefined || target === undefined) {
    throw new Error('Diff input requires both source and target');
  }
  const constraints = parseDiffPatchConstraints(input.constraints);
  return diff(source, target, constraints);
}

/**
 * Verify patch operation.
 * Input should be { patch, source } and output should be the patched result.
 */
function verifyPatch(input: VerifyInput): unknown {
  if (!isPlainObject(input.input)) {
    throw new Error('Patch input must be an object with patch and source');
  }
  const { patch, source } = input.input as { patch?: unknown; source?: unknown };
  if (patch === undefined || source === undefined) {
    throw new Error('Patch input requires both patch and source');
  }
  const constraints = parseDiffPatchConstraints(input.constraints);
  return apply(patch as Parameters<typeof apply>[0], source, constraints);
}

/**
 * Verify merge operation.
 * Input should be { left, right } and output should be the merged result.
 */
function verifyMerge(input: VerifyInput): unknown {
  if (!isPlainObject(input.input)) {
    throw new Error('Merge input must be an object with left and right');
  }
  const { left, right } = input.input as { left?: unknown; right?: unknown };
  if (left === undefined || right === undefined) {
    throw new Error('Merge input requires both left and right');
  }
  const constraints = parseMergeConstraints(input.constraints);
  return merge(left, right, constraints);
}

/**
 * Verify migrate operation.
 * Input should be the source object and output should be the migrated result.
 */
function verifyMigrate(input: VerifyInput): unknown {
  const constraints = parseSchemaMigrationConstraints(input.constraints);
  return migrate(input.input, constraints);
}

/**
 * Helper to check if a value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Compute expected hash for a given input and constraints.
 * This is a convenience function that determines the operation type from the task ID.
 */
export function expectedHashFor(input: unknown, constraints: unknown, taskId?: string): string {
  if (!taskId) {
    // Default to normalize for backwards compatibility
    const normalizeConstraints = parseNormalizeConstraints(constraints);
    return sha256Hex(normalize(input, normalizeConstraints));
  }

  const operationType = inferOperationType(taskId);

  switch (operationType) {
    case 'normalize': {
      const normalizeConstraints = parseNormalizeConstraints(constraints);
      return sha256Hex(normalize(input, normalizeConstraints));
    }

    case 'diff': {
      if (!isPlainObject(input)) {
        throw new Error('Diff input must be an object with source and target');
      }
      const { source, target } = input as { source?: unknown; target?: unknown };
      if (source === undefined || target === undefined) {
        throw new Error('Diff input requires both source and target');
      }
      const diffConstraints = parseDiffPatchConstraints(constraints);
      return sha256Hex(diff(source, target, diffConstraints));
    }

    case 'patch': {
      if (!isPlainObject(input)) {
        throw new Error('Patch input must be an object with patch and source');
      }
      const { patch, source: patchSource } = input as { patch?: unknown; source?: unknown };
      if (patch === undefined || patchSource === undefined) {
        throw new Error('Patch input requires both patch and source');
      }
      const patchConstraints = parseDiffPatchConstraints(constraints);
      return sha256Hex(apply(patch as Parameters<typeof apply>[0], patchSource, patchConstraints));
    }

    case 'merge': {
      if (!isPlainObject(input)) {
        throw new Error('Merge input must be an object with left and right');
      }
      const { left, right } = input as { left?: unknown; right?: unknown };
      if (left === undefined || right === undefined) {
        throw new Error('Merge input requires both left and right');
      }
      const mergeConstraints = parseMergeConstraints(constraints);
      return sha256Hex(merge(left, right, mergeConstraints));
    }

    case 'migrate': {
      const migrateConstraints = parseSchemaMigrationConstraints(constraints);
      return sha256Hex(migrate(input, migrateConstraints));
    }

    default:
      throw new Error(`Unknown operation type: ${operationType}`);
  }
}
