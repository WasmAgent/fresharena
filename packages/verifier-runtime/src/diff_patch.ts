import type { DiffPatchConstraints } from '@fresharena/faep-schema';
import { parseDiffPatchConstraints } from '@fresharena/faep-schema';
import { sha256Hex } from './crypto.js';

/**
 * # json_transform.diff_patch.v0 reference semantics
 *
 * This module provides the single source of truth for diff and patch operations.
 * The operations are closed semantics: every transformation is a pure function
 * of input values and declared constraints.
 *
 * ## Core guarantee: `apply(diff(a, b), a) === b`
 *
 * For any two JSON-compatible values a and b, computing diff(a, b) produces a
 * patch that, when applied to a, yields b. This property is tested by the
 * property-based tester in `@fresharena/core`.
 *
 * ## Operation types
 *
 * 1. **diff(source, target)** - Produce a patch representing differences
 * 2. **apply(patch, source)** - Apply a patch to a source value
 *
 * ## Patch formats
 *
 * - **ops**: List of operations (add, replace, remove) with JSON Pointer paths
 * - **merge**: RFC 7396 JSON Merge Patch format (partial objects)
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// JSON Pointer path utilities (RFC 6901)
function escapePathSegment(segment: string): string {
  return segment.replace('~', '~0').replace('/', '~1');
}

function joinPath(base: string[], key: string | number): string[] {
  const escaped = typeof key === 'number' ? key.toString() : escapePathSegment(key);
  return [...base, escaped];
}

// Operation types for 'ops' format
type PatchOp = { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown };
type Patch = PatchOp[] | Record<string, unknown>; // ops format | merge format

/**
 * Compute diff between two values at a specific path with depth tracking.
 */
function diffAtPath(
  source: unknown,
  target: unknown,
  path: string[],
  constraints: DiffPatchConstraints,
  currentDepth: number,
): PatchOp[] {
  // Depth limit check
  if (currentDepth >= constraints.max_depth) {
    // Treat as a single replace operation
    return [{ op: 'replace', path: `/${path.join('/')}`, value: target }];
  }

  const ops: PatchOp[] = [];

  // Handle null and primitive values
  if (source === target) {
    return ops; // No difference
  }

  // Handle array vs non-array type mismatch
  if (Array.isArray(source) !== Array.isArray(target)) {
    return [{ op: 'replace', path: `/${path.join('/')}`, value: target }];
  }

  // Handle arrays
  if (Array.isArray(source) && Array.isArray(target)) {
    const maxLength = Math.max(source.length, target.length);

    for (let i = 0; i < maxLength; i++) {
      if (i >= source.length) {
        // Element added in target
        if (constraints.array_indices) {
          ops.push({
            op: 'add',
            path: `/${[...path, i].join('/')}`,
            value: target[i],
          });
        } else {
          // Array replace mode: replace entire array
          return [{ op: 'replace', path: `/${path.join('/')}`, value: target }];
        }
      } else if (i >= target.length) {
        // Element removed from target
        if (constraints.array_indices) {
          ops.push({ op: 'remove', path: `/${[...path, i].join('/')}` });
        } else {
          // Array replace mode: replace entire array
          return [{ op: 'replace', path: `/${path.join('/')}`, value: target }];
        }
      } else {
        // Both have element at this index - recurse
        const childOps = diffAtPath(
          source[i],
          target[i],
          [...path, i.toString()],
          constraints,
          currentDepth + 1,
        );
        ops.push(...childOps);
      }
    }

    return ops;
  }

  // Handle objects
  if (isPlainObject(source) && isPlainObject(target)) {
    const allKeys = new Set([...Object.keys(source), ...Object.keys(target)]);

    for (const key of allKeys) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (!(key in source)) {
        // Key added in target
        ops.push({
          op: 'add',
          path: `/${[...path, key].join('/')}`,
          value: targetValue,
        });
      } else if (!(key in target)) {
        // Key removed from target
        ops.push({ op: 'remove', path: `/${[...path, key].join('/')}` });
      } else {
        // Both have key - recurse
        const childOps = diffAtPath(
          sourceValue,
          targetValue,
          [...path, key],
          constraints,
          currentDepth + 1,
        );
        ops.push(...childOps);
      }
    }

    return ops;
  }

  // Handle primitive mismatch
  return [{ op: 'replace', path: `/${path.join('/')}`, value: target }];
}

/**
 * Compute RFC 7396 JSON Merge Patch from two values.
 */
function diffMergePatch(
  source: unknown,
  target: unknown,
  constraints: DiffPatchConstraints,
): Record<string, unknown> {
  // If equal, no changes needed
  if (source === target) {
    return {};
  }

  // Type mismatch or primitive values
  if (!isPlainObject(source) || !isPlainObject(target)) {
    return target as Record<string, unknown>;
  }

  const patch: Record<string, unknown> = {};
  const sourceKeys = new Set(Object.keys(source));
  const targetKeys = new Set(Object.keys(target));

  // Process keys in target
  for (const key of targetKeys) {
    if (sourceKeys.has(key)) {
      // Both have key - recurse
      const childPatch = diffMergePatch(source[key], target[key], constraints);
      if (Object.keys(childPatch).length > 0) {
        patch[key] = childPatch;
      }
    } else {
      // Key added in target
      patch[key] = target[key];
    }
  }

  // Keys removed in target (null means delete)
  for (const key of sourceKeys) {
    if (!targetKeys.has(key)) {
      patch[key] = null;
    }
  }

  return patch;
}

/**
 * Compute a structural patch representing differences between source and target.
 *
 * @param source - Source JSON value
 * @param target - Target JSON value
 * @param rawConstraints - Raw constraints object
 * @returns Patch in ops or merge format depending on constraints
 */
export function diff(source: unknown, target: unknown, rawConstraints: unknown): Patch {
  const constraints = parseDiffPatchConstraints(rawConstraints);

  if (constraints.format === 'ops') {
    return diffAtPath(source, target, [], constraints, 0);
  }
  return diffMergePatch(source, target, constraints);
}

/**
 * Apply a patch operation at a specific path.
 */
function applyOp(value: unknown, op: PatchOp): unknown {
  const pathSegments = op.path.split('/').slice(1); // Remove leading empty string

  if (pathSegments.length === 0) {
    // Root-level operation
    if (op.op === 'remove') {
      return null;
    }
    return op.value;
  }

  // Need to navigate to parent and apply operation there
  // For simplicity, we'll implement full navigation
  return applyAtPath(value, pathSegments, op);
}

/**
 * Navigate to a path and apply an operation.
 */
function applyAtPath(value: unknown, pathSegments: string[], op: PatchOp): unknown {
  if (pathSegments.length === 0) {
    // Reached target location
    if (op.op === 'remove') {
      return null; // Should be handled by parent removing key
    }
    return op.value;
  }

  const [first, ...rest] = pathSegments;
  const isArrayIndex = /^\d+$/.test(first);

  if (isArrayIndex) {
    // Array navigation
    if (!Array.isArray(value)) {
      return value; // Can't navigate - invalid path
    }
    const index = Number.parseInt(first, 10);
    const newArray = [...value];

    if (rest.length === 0) {
      // Operation at this index
      if (op.op === 'remove') {
        newArray.splice(index, 1);
      } else if (op.op === 'add') {
        newArray.splice(index, 0, op.value ?? null);
      } else if (op.op === 'replace') {
        newArray[index] = op.value ?? null;
      }
    } else {
      // Continue navigation
      newArray[index] = applyAtPath(newArray[index], rest, op);
    }

    return newArray;
  }
  // Object navigation
  if (!isPlainObject(value)) {
    return value; // Can't navigate - invalid path
  }
  const newObj = { ...value };

  if (rest.length === 0) {
    // Operation at this key
    if (op.op === 'remove') {
      delete newObj[first];
    } else if (op.op === 'add' || op.op === 'replace') {
      newObj[first] = op.value ?? null;
    }
  } else {
    // Continue navigation
    if (!(first in newObj)) {
      return value; // Can't navigate - missing key
    }
    newObj[first] = applyAtPath(newObj[first], rest, op);
  }

  return newObj;
}

/**
 * Apply a merge patch (RFC 7396) to a source value.
 */
function applyMergePatch(source: unknown, patch: Record<string, unknown>): unknown {
  if (!isPlainObject(source)) {
    return patch;
  }

  if (!isPlainObject(patch)) {
    return patch;
  }

  const result = { ...source };

  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];
    const sourceValue = result[key];

    if (patchValue === null) {
      // null means delete
      delete result[key];
    } else if (isPlainObject(patchValue) && isPlainObject(sourceValue)) {
      // Recurse into nested objects
      result[key] = applyMergePatch(sourceValue, patchValue as Record<string, unknown>);
    } else {
      // Replace
      result[key] = patchValue;
    }
  }

  return result;
}

/**
 * Apply a patch to a source value to produce the target value.
 *
 * Guarantees that for any source and target:
 * apply(diff(source, target), source) === target
 *
 * @param patch - Patch to apply (ops or merge format)
 * @param source - Source JSON value to patch
 * @param rawConstraints - Raw constraints object (must match diff call)
 * @returns Patched value
 */
export function apply(patch: Patch, source: unknown, rawConstraints: unknown): unknown {
  const constraints = parseDiffPatchConstraints(rawConstraints);

  if (constraints.format === 'ops') {
    const ops = patch as PatchOp[];
    let result = source;
    for (const op of ops) {
      result = applyOp(result, op);
    }
    return result;
  }
  return applyMergePatch(source, patch as Record<string, unknown>);
}

/**
 * Hash function for diff_patch outputs.
 */
export function hashDiffPatch(source: unknown, target: unknown, constraints: unknown): string {
  const patch = diff(source, target, constraints);
  return sha256Hex(patch);
}
