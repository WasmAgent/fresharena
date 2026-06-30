import type { FaepRecord } from '@fresharena/faep-schema';

export interface ReplayOptions {
  recordPath: string;
  strict?: boolean;
}

export interface ReplayResult {
  record: FaepRecord;
  replayedScore: FaepRecord['score'];
  matches: boolean;
  divergences: string[];
}

export async function replay(_opts: ReplayOptions): Promise<ReplayResult> {
  throw new Error('replay: not yet implemented');
}
