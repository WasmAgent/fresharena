import { readFileSync } from 'node:fs';
import type { FaepRecord } from '@fresharena/faep-schema';
import { FaepRecordSchema } from '@fresharena/faep-schema';
import { rerunFromRecord } from '../runner/index.js';

export interface ReplayOptions {
  recordPath: string;
  /** Root seed. Optional: when omitted it is recovered from the recorded
   * `replay.command` (which embeds it as `--root-seed <seed>`). */
  rootSeed?: string;
  strict?: boolean;
}

export interface ReplayResult {
  record: FaepRecord;
  replayedScore: FaepRecord['score'];
  matches: boolean;
  divergences: string[];
}

/**
 * Deterministic replay (issue #133): regenerate the task from the root seed,
 * re-run the solver, and compare every score component against the record.
 * FAEP records are pure functions of (root_seed, solver_id) in this slice —
 * no wall-clock or environment value participates in the comparison.
 */
export async function replay(opts: ReplayOptions): Promise<ReplayResult> {
  const raw = readFileSync(opts.recordPath, 'utf-8');
  const line = raw.split('\n').find((l) => l.trim().length > 0);
  if (line === undefined) {
    throw new Error(`replay: ${opts.recordPath} contains no records`);
  }
  const record = FaepRecordSchema.parse(JSON.parse(line));

  // The root seed is recoverable from the recorded replay command
  // (`fresharena replay --root-seed <seed> <path>`); an explicit
  // --root-seed on the CLI takes precedence.
  const fromCommand = /--root-seed (\S+)/.exec(record.replay.command)?.[1];
  const rootSeed = opts.rootSeed ?? fromCommand;
  if (rootSeed === undefined) {
    throw new Error('replay: no root seed available (pass --root-seed)');
  }

  const rerun = await rerunFromRecord(rootSeed, record.solver.id);

  const divergences: string[] = [];
  const a = record.score;
  const b = rerun.record.score;
  if (a.canonical_pass !== b.canonical_pass) {
    divergences.push(`canonical_pass: ${a.canonical_pass} -> ${b.canonical_pass}`);
  }
  if (a.hidden_pass !== b.hidden_pass) {
    divergences.push(`hidden_pass: ${a.hidden_pass} -> ${b.hidden_pass}`);
  }
  if (a.adversarial_pass !== b.adversarial_pass) {
    divergences.push(`adversarial_pass: ${a.adversarial_pass} -> ${b.adversarial_pass}`);
  }
  if (a.immunity_pass !== b.immunity_pass) {
    divergences.push(`immunity_pass: ${a.immunity_pass} -> ${b.immunity_pass}`);
  }
  if (JSON.stringify(a.score_vector) !== JSON.stringify(b.score_vector)) {
    divergences.push('score_vector divergence');
  }

  const matches = divergences.length === 0;
  if (!matches && opts.strict === true) {
    throw new Error(`replay: score divergence in strict mode — ${divergences.join('; ')}`);
  }

  return { record, replayedScore: rerun.record.score, matches, divergences };
}
