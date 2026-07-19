import { expect, test } from 'bun:test';
import type { FaepRecord } from '@fresharena/faep-schema';
import type { AepEvidenceBundle } from './index.js';
import {
  exportAsAepBundle,
  exportAsAepBundles,
  serializeBundle,
  serializeBundles,
} from './index.js';

function makeFaepRecord(overrides?: Partial<FaepRecord>): FaepRecord {
  const zeros = '0'.repeat(64);
  const ones = '1'.repeat(64);
  const twos = '2'.repeat(64);
  const threes = '3'.repeat(64);
  const fours = '4'.repeat(64);
  const fives = '5'.repeat(64);
  const sixes = '6'.repeat(64);
  const sevens = '7'.repeat(64);

  return {
    schema_version: '0.1.0',
    run_id: 'run-test-1',
    task: {
      id: 'json_transform.normalize.v0|seed-1',
      family: 'json_transform.normalize.v0',
      family_version: '0.1.0',
      seed_hash: zeros,
      spec_hash: ones,
    },
    solver: {
      id: 'reference',
      track: 'non_llm',
      model_metadata_hash: twos,
      workflow_hash: threes,
      artifact_hash: fours,
    },
    generator: {
      id: 'random-baseline',
      version: '0.1.0',
      seed_hash: zeros,
    },
    tester: {
      id: 'closed-semantics',
      version: '0.1.0',
      tests_hash: fives,
    },
    verifier: {
      package: 'json_transform_verifier',
      version: '0.1.0',
      result_hash: sixes,
    },
    environment: {
      os: 'linux',
      runtime: 'bun-1.3.14',
      container_hash: sevens,
    },
    score: {
      canonical_pass: true,
      hidden_pass: true,
      adversarial_pass: true,
      immunity_pass: true,
      cost: {},
      score_vector: {},
    },
    replay: {
      command: 'bun run fresharena replay --run-id run-test-1',
      log_hash: zeros,
    },
    ...overrides,
  } as FaepRecord;
}

test('exportAsAepBundle produces a valid AEP evidence envelope', () => {
  const record = makeFaepRecord();
  const bundle = exportAsAepBundle(record);

  expect(bundle.aep_version).toBe('0.1.0');
  expect(bundle.source.system).toBe('fresharena');
  expect(bundle.source.component).toBe('aep-export');
  expect(bundle.source.version).toBe('0.1.0');
  expect(bundle.evidence).toEqual(record);
  expect(bundle.produced_at).toBeTruthy();
  expect(bundle.evidence_hash).toBeTruthy();
  expect(bundle.evidence_hash).toHaveLength(64);
});

test('exportAsAepBundle accepts a custom version string', () => {
  const record = makeFaepRecord();
  const bundle = exportAsAepBundle(record, '2.0.0');

  expect(bundle.source.version).toBe('2.0.0');
});

test('exportAsAepBundles converts multiple records', () => {
  const records = [makeFaepRecord(), makeFaepRecord({ run_id: 'run-test-2' })];
  const bundles = exportAsAepBundles(records);

  expect(bundles).toHaveLength(2);
  expect(bundles[0].evidence.run_id).toBe('run-test-1');
  expect(bundles[1].evidence.run_id).toBe('run-test-2');
  // Each bundle gets a unique evidence_hash based on its content.
  expect(bundles[0].evidence_hash).not.toBe(bundles[1].evidence_hash);
});

test('serializeBundle produces valid JSON', () => {
  const record = makeFaepRecord();
  const bundle = exportAsAepBundle(record);
  const json = serializeBundle(bundle);

  const parsed = JSON.parse(json) as AepEvidenceBundle;
  expect(parsed.aep_version).toBe('0.1.0');
  expect(parsed.source.system).toBe('fresharena');
  expect(parsed.evidence.run_id).toBe('run-test-1');
});

test('serializeBundles produces JSONL (one JSON object per line)', () => {
  const records = [makeFaepRecord(), makeFaepRecord({ run_id: 'run-test-2' })];
  const bundles = exportAsAepBundles(records);
  const jsonl = serializeBundles(bundles);

  const lines = jsonl.split('\n');
  expect(lines).toHaveLength(2);

  for (const line of lines) {
    const parsed = JSON.parse(line) as AepEvidenceBundle;
    expect(parsed.aep_version).toBe('0.1.0');
  }
});

test('exportAsAepBundle preserves failure_diff annotation when present', () => {
  const record = makeFaepRecord({
    failure_diff: { added: true, removed: false },
    failure_diff_hash: 'a'.repeat(64),
  });
  const bundle = exportAsAepBundle(record);

  expect(bundle.evidence.failure_diff).toEqual({ added: true, removed: false });
  expect(bundle.evidence.failure_diff_hash).toBe('a'.repeat(64));
});
