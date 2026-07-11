import { expect, test } from 'bun:test';
import { verify, expectedHashFor } from './verify.js';
import { VerifyResultCache } from './cache.js';

test('verify returns passed=true for correct normalize output', () => {
  const result = verify({
    taskId: 'test-normalize-1',
    input: { b: 1, a: 2 },
    output: { a: 2, b: 1 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  });
  expect(result.passed).toBe(true);
});

test('verify returns passed=false for incorrect output', () => {
  const result = verify({
    taskId: 'test-normalize-1',
    input: { a: 1 },
    output: { a: 2 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  });
  expect(result.passed).toBe(false);
  expect(result.failure_reason).toBeDefined();
});

test('verify uses cache when provided', () => {
  const cache = new VerifyResultCache(10);
  const input = {
    taskId: 'test-normalize-cache',
    input: { x: 10 },
    output: { x: 10 },
    constraints: { sort_keys: false, strip_nulls: false, flatten: null },
  };

  // First call computes and caches.
  const first = verify(input, cache);
  expect(first.passed).toBe(true);
  expect(cache.size).toBe(1);

  // Second call should return cached result.
  const second = verify(input, cache);
  expect(second).toEqual(first);
  // Size should not increase.
  expect(cache.size).toBe(1);
});

test('verify caching works with the global singleton', () => {
  // Use the global cache by omitting the cache argument.
  const input = {
    taskId: 'test-global-cache',
    input: { z: 99 },
    output: { z: 99 },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
  };

  const result = verify(input);
  expect(result.passed).toBe(true);
  // The global cache now has this result.
});

test('expectedHashFor returns a deterministic string', () => {
  const hash1 = expectedHashFor({ a: 1 }, { sort_keys: false, strip_nulls: false, flatten: null });
  const hash2 = expectedHashFor({ a: 1 }, { sort_keys: false, strip_nulls: false, flatten: null });
  expect(hash1).toBe(hash2);
  expect(typeof hash1).toBe('string');
  expect(hash1.length).toBe(64); // SHA-256 hex
});

test('expectedHashFor with taskId infers operation', () => {
  const hash = expectedHashFor(
    { source: { a: 1 }, target: { a: 2 } },
    { max_depth: 10, array_indices: true, format: 'ops' },
    'test-diff-operation',
  );
  expect(typeof hash).toBe('string');
  expect(hash.length).toBe(64);
});
