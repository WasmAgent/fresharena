import type { NormalizeConstraints } from '@fresharena/faep-schema';

/**
 * # json_transform.normalize.v0 reference semantics
 *
 * This module is the single source of truth for the normalize.v0 operation.
 * The semantics are fully closed: every transformation is a pure function of
 * the input value and the declared constraint object. There is no fallback
 * path, no heuristic branch, and no field whose meaning depends on external
 * context.
 *
 * The transformation applies three independent passes in a fixed order:
 *
 *   1. `strip_nulls` — recursively remove object entries whose value is the
 *      JSON `null` literal. Arrays and primitive values are left untouched.
 *   2. `flatten` — when enabled, collapse every nested plain object into a
 *      single level using the declared delimiter. Arrays are opaque leaves and
 *      are never entered by this pass.
 *   3. `sort_keys` — recursively sort object keys ascending by UTF-16 code unit
 *      comparison. Array element order is always preserved.
 *
 * Each pass is individually idempotent, and the composed operation is
 * idempotent: `normalize(normalize(x, c), c) === normalize(x, c)` for every
 * input `x` and every valid constraint `c`. This property is checked by the
 * property-based tester in `@fresharena/core`.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripNullsDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((element) => stripNullsDeep(element));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === null) continue;
      out[key] = stripNullsDeep(child);
    }
    return out;
  }
  return value;
}

function flattenObject(value: Record<string, unknown>, delimiter: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isPlainObject(child)) {
      const collapsed = flattenObject(child, delimiter);
      for (const [subKey, subValue] of Object.entries(collapsed)) {
        out[`${key}${delimiter}${subKey}`] = subValue;
      }
    } else {
      // Arrays and primitives are opaque leaves for flattening.
      out[key] = child;
    }
  }
  return out;
}

function flattenDeep(value: unknown, delimiter: string): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (isPlainObject(value)) {
    return flattenObject(value, delimiter);
  }
  return value;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((element) => sortKeysDeep(element));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

export function normalize(value: unknown, constraints: NormalizeConstraints): unknown {
  let result = value;
  if (constraints.strip_nulls) {
    result = stripNullsDeep(result);
  }
  if (constraints.flatten !== null) {
    result = flattenDeep(result, constraints.flatten.delimiter);
  }
  if (constraints.sort_keys) {
    result = sortKeysDeep(result);
  }
  return result;
}
