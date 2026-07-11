import { expect, test } from 'bun:test';
import { verify } from './verify.js';

test('verify returns passed=true when output matches expected', () => {
  const result = verify({
    taskId: 'normalize_simple',
    input: { a: 1, b: null },
    output: { a: 1, b: null },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
    operationType: 'normalize',
  });
  expect(result.passed).toBe(true);
  expect(result.expected_hash).toBe(result.actual_hash);
  expect(result.failure_reason).toBeUndefined();
  expect(result.failure_diff).toBeUndefined();
});

test('verify returns passed=false with failure_diff when output differs', () => {
  const result = verify({
    taskId: 'normalize_simple',
    input: { a: 1, b: 2 },
    output: { a: 1, b: 3 },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
    operationType: 'normalize',
  });
  expect(result.passed).toBe(false);
  expect(result.expected_hash).not.toBe(result.actual_hash);
  expect(result.failure_reason).toBeDefined();
  expect(result.failure_diff).toBeDefined();
  // failure_diff should be an array of ops
  expect(Array.isArray(result.failure_diff)).toBe(true);
  if (Array.isArray(result.failure_diff)) {
    expect(result.failure_diff.length).toBeGreaterThan(0);
    // Should contain a replace operation for /b
    expect(result.failure_diff[0].op).toBe('replace');
    expect(result.failure_diff[0].path).toBe('/b');
  }
});

test('verify returns failure_diff for deeply nested object mismatch', () => {
  const result = verify({
    taskId: 'normalize_deep',
    input: { nested: { deep: { value: 1, extra: 'x' } } },
    output: { nested: { deep: { value: 2, extra: 'x' } } },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
    operationType: 'normalize',
  });
  expect(result.passed).toBe(false);
  expect(result.failure_diff).toBeDefined();
  if (Array.isArray(result.failure_diff)) {
    expect(result.failure_diff[0].path).toBe('/nested/deep/value');
  }
});

test('verify returns failure_diff for array element mismatch', () => {
  const result = verify({
    taskId: 'normalize_array',
    input: { list: [1, 2, 3] },
    output: { list: [1, 4, 3] },
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
    operationType: 'normalize',
  });
  expect(result.passed).toBe(false);
  expect(result.failure_diff).toBeDefined();
  if (Array.isArray(result.failure_diff)) {
    expect(result.failure_diff[0].path).toBe('/list/1');
  }
});

test('verify returns failure_diff for diff operation', () => {
  const result = verify({
    taskId: 'diff_test',
    input: { source: { a: 1, b: 2 }, target: { a: 1, b: 3 } },
    output: [{ op: 'replace', path: '/b', value: 3 }],
    constraints: { format: 'ops', array_indices: true, max_depth: 10 },
    operationType: 'diff',
  });
  expect(result.passed).toBe(false);
  expect(result.failure_diff).toBeDefined();
});

test('verify on diff operation passes for correct output', () => {
  const result = verify({
    taskId: 'diff_test',
    input: { source: { a: 1, b: 2 }, target: { a: 1, b: 3 } },
    output: [{ op: 'replace', path: '/b', value: 3 }],
    constraints: { format: 'ops', array_indices: true, max_depth: 10 },
    operationType: 'diff',
  });
  expect(result.passed).toBe(true);
  expect(result.failure_diff).toBeUndefined();
});
