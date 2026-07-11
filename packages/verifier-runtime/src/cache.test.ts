import { expect, test } from 'bun:test';
import { VerifyResultCache, verifierCache } from './cache.js';
import type { VerifyInput } from './verify.js';

test('VerifyResultCache constructor creates an empty cache', () => {
  const cache = new VerifyResultCache();
  expect(cache.size).toBe(0);
});

test('VerifyResultCache.set and .get round-trip', () => {
  const cache = new VerifyResultCache();
  const result = { passed: true, expected_hash: 'abc', actual_hash: 'abc' };
  const input: VerifyInput = {
    taskId: 'test-normalize-1',
    input: { a: 1 },
    output: { a: 1 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  };
  const key = VerifyResultCache.key(input);
  cache.set(key, result);
  expect(cache.get(key)).toEqual(result);
  expect(cache.size).toBe(1);
});

test('VerifyResultCache returns undefined for cache miss', () => {
  const cache = new VerifyResultCache();
  expect(cache.get('nonexistent')).toBeUndefined();
});

test('VerifyResultCache.key is deterministic for same input', () => {
  const input1: VerifyInput = {
    taskId: 'test-normalize-1',
    input: { a: 1, b: 2 },
    output: { a: 1, b: 2 },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
  };
  const input2: VerifyInput = {
    taskId: 'test-normalize-1',
    input: { a: 1, b: 2 },
    output: { a: 1, b: 2 },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
  };
  expect(VerifyResultCache.key(input1)).toBe(VerifyResultCache.key(input2));
});

test('VerifyResultCache.key differs for different outputs', () => {
  const input1: VerifyInput = {
    taskId: 'test-normalize-1',
    input: { a: 1 },
    output: { a: 1 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  };
  const input2: VerifyInput = {
    taskId: 'test-normalize-1',
    input: { a: 1 },
    output: { a: 2 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  };
  expect(VerifyResultCache.key(input1)).not.toBe(VerifyResultCache.key(input2));
});

test('VerifyResultCache evicts oldest entry when over max size', () => {
  const cache = new VerifyResultCache(3);
  const results = [
    { passed: true, expected_hash: '1', actual_hash: '1' },
    { passed: true, expected_hash: '2', actual_hash: '2' },
    { passed: true, expected_hash: '3', actual_hash: '3' },
    { passed: true, expected_hash: '4', actual_hash: '4' },
  ];
  for (let i = 0; i < results.length; i++) {
    const input: VerifyInput = {
      taskId: `test-${i}`,
      input: { n: i },
      output: { n: i },
      constraints: { sort_keys: false, strip_nulls: false, flatten: null },
    };
    cache.set(VerifyResultCache.key(input), results[i]);
  }
  // Fourth insert should evict the first entry.
  const firstInput: VerifyInput = {
    taskId: 'test-0',
    input: { n: 0 },
    output: { n: 0 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  };
  expect(cache.get(VerifyResultCache.key(firstInput))).toBeUndefined();
  expect(cache.size).toBe(3);
});

test('VerifyResultCache.clear empties the cache', () => {
  const cache = new VerifyResultCache();
  const input: VerifyInput = {
    taskId: 'test-clear',
    input: { x: 1 },
    output: { x: 1 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  };
  cache.set(VerifyResultCache.key(input), {
    passed: true,
    expected_hash: 'h',
    actual_hash: 'h',
  });
  expect(cache.size).toBe(1);
  cache.clear();
  expect(cache.size).toBe(0);
});

test('global verifierCache singleton exists', () => {
  expect(verifierCache).toBeDefined();
  expect(verifierCache).toBeInstanceOf(VerifyResultCache);
});
