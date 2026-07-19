/**
 * @fresharena/aep-export
 *
 * Exports FreshArena FAEP evaluation records as AEP (Audit Evidence Protocol)
 * evidence bundles compatible with the open-agent-audit integration.
 *
 * The AEP envelope wraps each FAEP record with provenance metadata so that
 * downstream audit pipelines (trace-pipeline, open-agent-audit) can ingest
 * FreshArena evaluations without coupling to FAEP internals.
 */

import { createHash } from 'node:crypto';
import type { FaepRecord } from '@fresharena/faep-schema';

// ─── AEP envelope schema ────────────────────────────────────────────────────
//
// Minimal envelope that open-agent-audit expects. New fields are additive —
// existing consumers must ignore unknown keys.

export interface AepEvidenceBundle {
  /** AEP schema version this envelope targets. */
  readonly aep_version: '0.1.0';
  /** Provenance: which system produced this evidence. */
  readonly source: {
    readonly system: 'fresharena';
    readonly component: 'aep-export';
    readonly version: string;
  };
  /** The original FAEP record, embedded verbatim. */
  readonly evidence: FaepRecord;
  /** ISO-8601 timestamp when this bundle was produced. */
  readonly produced_at: string;
  /** SHA-256 of the canonical JSON serialization of `evidence`. */
  readonly evidence_hash: string;
}

// ─── Export function ──────────────────────────────────────────────────────────

/**
 * Convert a single FAEP record into an AEP evidence bundle.
 *
 * @param record  A validated FAEP v0.1 evaluation record.
 * @param version Optional exporter version string (defaults to package version).
 * @returns An `AepEvidenceBundle` ready for JSON serialization.
 */
export function exportAsAepBundle(record: FaepRecord, version = '0.1.0'): AepEvidenceBundle {
  const evidenceJson = JSON.stringify(record);
  const evidence_hash = sha256Hex(evidenceJson);

  return {
    aep_version: '0.1.0',
    source: {
      system: 'fresharena',
      component: 'aep-export',
      version,
    },
    evidence: record,
    produced_at: new Date().toISOString(),
    evidence_hash,
  };
}

/**
 * Convert an array of FAEP records into AEP evidence bundles.
 *
 * @param records Array of validated FAEP v0.1 evaluation records.
 * @param version Optional exporter version string.
 * @returns Array of `AepEvidenceBundle` objects.
 */
export function exportAsAepBundles(
  records: readonly FaepRecord[],
  version = '0.1.0',
): AepEvidenceBundle[] {
  return records.map((record) => exportAsAepBundle(record, version));
}

/**
 * Serialize an AEP evidence bundle to a JSONL line (no trailing newline).
 * Suitable for streaming writes to `.jsonl` audit logs.
 */
export function serializeBundle(bundle: AepEvidenceBundle): string {
  return JSON.stringify(bundle);
}

/**
 * Serialize multiple bundles as a JSONL string (one JSON object per line).
 */
export function serializeBundles(bundles: readonly AepEvidenceBundle[]): string {
  return bundles.map(serializeBundle).join('\n');
}

// ─── SHA-256 helper ─────────────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ─── Re-exports for convenience ────────────────────────────────────────────────

export type { FaepRecord } from '@fresharena/faep-schema';
