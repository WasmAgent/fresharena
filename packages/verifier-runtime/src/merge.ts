import type { MergeConstraints } from '@fresharena/faep-schema';
import { parseMergeConstraints } from '@fresharena/faep-schema';
import { sha256Hex } from './crypto.js';

/**
 * # json_transform.merge.v0 reference semantics
 *
 * This module provides the single source of truth for merge operations.
 * The operation has closed semantics: all conflict resolution is explicitly
 * declared in the constraints object.
 *
 * ## Conflict policies
 *
 * - **left**: On key conflict, use the value from the left (first) object
 * - **right**: On key conflict, use the value from the right (second) object
 * - **deep**: Recursively merge nested objects on conflict
 * - **error**: Fail with an error on key conflict
 *
 * ## Array handling
 *
 * When merge_arrays is true, arrays are concatenated (with optional deduplication).
 * When false, arrays are replaced (right wins).
 *
 * ## Core property: associativity (for specific policies)
 *
 * For left/right policies, merge is associative:
 * merge(merge(a, b), c) === merge(a, merge(b, c))
 *
 * For error and deep policies, associativity depends on input structure.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if two values are structurally equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Merge two arrays with optional deduplication.
 */
function mergeArrays(left: unknown[], right: unknown[], dedup: boolean): unknown[] {
  if (dedup) {
    const result = [...left];
    for (const item of right) {
      // Check if item already exists in result
      const exists = result.some((existing) => deepEqual(existing, item));
      if (!exists) {
        result.push(item);
      }
    }
    return result;
  }
  return [...left, ...right];
}

/**
 * Recursively merge two objects with deep policy.
 */
function mergeDeep(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  constraints: MergeConstraints,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...left };
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of allKeys) {
    const leftValue = left[key];
    const rightValue = right[key];

    if (!(key in left)) {
      // Key only in right
      result[key] = rightValue;
    } else if (!(key in right)) {
      // Key only in left
      result[key] = leftValue;
    } else {
      // Key in both - resolve conflict
      if (isPlainObject(leftValue) && isPlainObject(rightValue) && constraints.policy === 'deep') {
        // Recurse into nested objects
        result[key] = mergeDeep(
          leftValue as Record<string, unknown>,
          rightValue as Record<string, unknown>,
          constraints,
        );
      } else if (
        Array.isArray(leftValue) &&
        Array.isArray(rightValue) &&
        constraints.merge_arrays
      ) {
        // Merge arrays
        result[key] = mergeArrays(leftValue, rightValue, constraints.array_dedup);
      } else {
        // Use resolution policy
        if (constraints.policy === 'left') {
          result[key] = leftValue;
        } else if (constraints.policy === 'right') {
          result[key] = rightValue;
        } else if (constraints.policy === 'deep') {
          // Can't recurse - use right
          result[key] = rightValue;
        } else if (constraints.policy === 'error') {
          throw new Error(`Key conflict on "${key}" with error policy`);
        }
      }
    }
  }

  return result;
}

/**
 * Merge two JSON values according to the declared constraints.
 *
 * @param left - First JSON value (left priority for left policy)
 * @param right - Second JSON value (right priority for right policy)
 * @param rawConstraints - Raw constraints object
 * @returns Merged JSON value
 * @throws Error if conflict and policy is 'error'
 */
export function merge(left: unknown, right: unknown, rawConstraints: unknown): unknown {
  const constraints = parseMergeConstraints(rawConstraints);

  // Handle non-object inputs
  if (!isPlainObject(left) || !isPlainObject(right)) {
    // If either is not an object, right wins (simple behavior)
    return right;
  }

  // Both are objects - merge them
  return mergeDeep(left as Record<string, unknown>, right as Record<string, unknown>, constraints);
}

/**
 * Hash function for merge outputs.
 */
export function hashMerge(left: unknown, right: unknown, constraints: unknown): string {
  const result = merge(left, right, constraints);
  return sha256Hex(result);
}
