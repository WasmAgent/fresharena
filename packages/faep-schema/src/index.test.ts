import { expect, test } from 'bun:test';
import { FaepRecordSchema, FailureDiffSchema } from './index.js';

// Schema tests for the `failure_diff` annotation added in issue #60 (sub-issue
// #69 — Schema Evolution slice). These pin the permissive union shape the runner
// (#68) writes when a verifier check fails, and confirm existing records that
// predate the field still parse (backward compatibility / no regression).

// A complete, valid FAEP record with no failure annotation. Used as the base
// for every FaepRecordSchema case below.
function validRecord(): Record<string, unknown> {
  return {
    schema_version: '0.1.0',
    run_id: 'run-1',
    task: {
      id: 'json_transform.normalize.v0|seed-1',
      family: 'json_transform.normalize.v0',
      family_version: '0.1.0',
      seed_hash: '0'.repeat(64),
      spec_hash: '1'.repeat(64),
    },
    solver: {
      id: 'reference',
      track: 'non_llm',
      model_metadata_hash: 'a'.repeat(64),
      workflow_hash: 'b'.repeat(64),
      artifact_hash: 'c'.repeat(64),
    },
    generator: { id: 'random-baseline', version: '0.1.0', seed_hash: '0'.repeat(64) },
    tester: { id: 'closed-semantics', version: '0.1.0', tests_hash: 'd'.repeat(64) },
    verifier: {
      package: '@fresharena/verifier-runtime',
      version: '0.1.0',
      result_hash: 'e'.repeat(64),
    },
    environment: { os: 'linux', runtime: 'bun-1.3', container_hash: 'f'.repeat(64) },
    score: {
      canonical_pass: false,
      hidden_pass: true,
      adversarial_pass: true,
      immunity_pass: true,
      cost: { tokens: 0 },
      score_vector: { canonical_pass: false },
    },
    replay: { command: 'fresharena replay run-1', log_hash: '2'.repeat(64) },
  };
}

test('FailureDiffSchema accepts a jsondiffpatch-style delta object', () => {
  const delta = { b: [3], _t: 'a', nested: { c: [null, 0, 0] } };
  expect(FailureDiffSchema.parse(delta)).toEqual(delta);
});

test('FailureDiffSchema accepts a "structure clash" sentinel object', () => {
  const sentinel = { __structure_clash__: true, reason: 'expected object, got array' };
  expect(FailureDiffSchema.parse(sentinel)).toEqual(sentinel);
});

test('FailureDiffSchema accepts the "too large" and "unavailable" sentinel strings', () => {
  expect(FailureDiffSchema.parse('<diff_too_large>')).toBe('<diff_too_large>');
  expect(FailureDiffSchema.parse('__DIFF_UNAVAILABLE__')).toBe('__DIFF_UNAVAILABLE__');
});

test('FailureDiffSchema accepts null', () => {
  expect(FailureDiffSchema.parse(null)).toBeNull();
});

test('FailureDiffSchema rejects non-JSON-able scalars', () => {
  expect(() => FailureDiffSchema.parse(42)).toThrow();
  expect(() => FailureDiffSchema.parse(true)).toThrow();
});

test('FaepRecordSchema parses a record without failure_diff (backward compatible)', () => {
  const parsed = FaepRecordSchema.parse(validRecord());
  expect(parsed.failure_diff).toBeUndefined();
  expect(parsed.failure_diff_hash).toBeUndefined();
});

test('FaepRecordSchema parses a failing record carrying a delta + hash', () => {
  const delta = { count: [3, 2] };
  const record = {
    ...validRecord(),
    failure_diff: delta,
    failure_diff_hash: '3'.repeat(64),
  };
  const parsed = FaepRecordSchema.parse(record);
  expect(parsed.failure_diff).toEqual(delta);
  expect(parsed.failure_diff_hash).toBe('3'.repeat(64));
});

test('FaepRecordSchema accepts the sentinel-string form of failure_diff', () => {
  const record = { ...validRecord(), failure_diff: '<diff_too_large>' };
  expect(FaepRecordSchema.parse(record).failure_diff).toBe('<diff_too_large>');
});

test('FaepRecordSchema rejects an invalid failure_diff value', () => {
  const record = { ...validRecord(), failure_diff: 99 };
  expect(() => FaepRecordSchema.parse(record)).toThrow();
});
