import { expect, test } from 'bun:test';
import type { NormalizeConstraints } from '@fresharena/faep-schema';
import { normalize } from './normalize.js';

// Reference-semantics tests for `json_transform.normalize.v0`.
//
// The `normalize` function in `./normalize.ts` is the single source of truth
// for this operation. These tests pin its three independent passes
// (strip_nulls -> flatten -> sort_keys), their fixed composition order, and
// the idempotence guarantee documented on the module.

const ALL_OFF: NormalizeConstraints = { sort_keys: false, strip_nulls: false, flatten: null };

test('strip_nulls removes null object entries recursively but leaves array elements in place', () => {
  const input = {
    a: 1,
    b: null,
    c: { d: null, e: 2 },
    arr: [null, 1, { x: null, y: 2 }],
  };
  const constraints: NormalizeConstraints = { sort_keys: false, strip_nulls: true, flatten: null };
  expect(normalize(input, constraints)).toEqual({
    a: 1,
    c: { e: 2 },
    // Array elements are never dropped, even when they are `null`; only the
    // object entries nested inside array elements are processed.
    arr: [null, 1, { y: 2 }],
  });
});

test('flatten collapses nested plain objects with the delimiter and treats arrays as opaque leaves', () => {
  const input = { a: { b: { c: 1 } }, d: [1, 2], e: 'x' };
  const constraints: NormalizeConstraints = {
    sort_keys: false,
    strip_nulls: false,
    flatten: { delimiter: '.' },
  };
  expect(normalize(input, constraints)).toEqual({ 'a.b.c': 1, d: [1, 2], e: 'x' });
});

test('flatten disabled (null) leaves nested object structure intact', () => {
  const input = { a: { b: { c: 1 } } };
  const constraints: NormalizeConstraints = { sort_keys: false, strip_nulls: false, flatten: null };
  expect(normalize(input, constraints)).toEqual({ a: { b: { c: 1 } } });
});

test('sort_keys orders object keys ascending by UTF-16 code unit and preserves array order', () => {
  const input = { b: 1, a: 2, arr: [3, 1, 2], nested: { z: 9, a: 1 } };
  const constraints: NormalizeConstraints = { sort_keys: true, strip_nulls: false, flatten: null };
  const result = normalize(input, constraints) as Record<string, unknown>;
  expect(Object.keys(result)).toEqual(['a', 'arr', 'b', 'nested']);
  expect(result.arr).toEqual([3, 1, 2]);
  expect(Object.keys(result.nested as Record<string, unknown>)).toEqual(['a', 'z']);
});

test('passes apply in fixed order: strip_nulls, then flatten, then sort_keys', () => {
  const input = { b: { y: null, x: 1 }, a: 2 };
  const constraints: NormalizeConstraints = {
    sort_keys: true,
    strip_nulls: true,
    flatten: { delimiter: '_' },
  };
  expect(normalize(input, constraints)).toEqual({ a: 2, b_x: 1 });
});

test('arrays containing objects are recursed into but their element order is never changed', () => {
  const input = { list: [3, 1, 2, { b: 1, a: 0 }] };
  const constraints: NormalizeConstraints = {
    sort_keys: true,
    strip_nulls: true,
    flatten: { delimiter: '.' },
  };
  // Flatten must not enter the array; sort_keys must reach the object inside
  // it while leaving the surrounding element order untouched.
  expect(normalize(input, constraints)).toEqual({ list: [3, 1, 2, { a: 0, b: 1 }] });
});

test('no-op when every pass is disabled returns the value structurally unchanged', () => {
  const input = { z: 1, a: [2, 1] };
  expect(normalize(input, ALL_OFF)).toEqual({ z: 1, a: [2, 1] });
});

test('normalize is idempotent: normalize(normalize(x, c), c) === normalize(x, c)', () => {
  const constraintSets: NormalizeConstraints[] = [
    ALL_OFF,
    { sort_keys: true, strip_nulls: false, flatten: null },
    { sort_keys: false, strip_nulls: true, flatten: null },
    { sort_keys: false, strip_nulls: false, flatten: { delimiter: '.' } },
    { sort_keys: true, strip_nulls: true, flatten: { delimiter: '_' } },
  ];
  const samples: unknown[] = [
    { b: { y: null, x: 1 }, a: 2, list: [3, 1, { d: null, c: 4 }] },
    { nested: { deep: { deeper: { v: null } } } },
    [1, null, { k: null, j: 2 }],
    { a: null, b: { c: null, d: { e: 1 } } },
  ];

  for (const constraints of constraintSets) {
    for (const sample of samples) {
      const once = normalize(sample, constraints);
      const twice = normalize(once, constraints);
      expect(twice).toEqual(once);
    }
  }
});
