import type { FaepRecord } from '@fresharena/faep-schema';
import type { ScorerResult } from '@fresharena/core/scorer';

export interface ReportOptions {
  records: FaepRecord[];
  scores: ScorerResult;
  outputDir: string;
  title?: string;
}

export interface ReportResult {
  htmlPath: string;
  jsonPath: string;
}

export async function generateReport(_opts: ReportOptions): Promise<ReportResult> {
  throw new Error('generateReport: not yet implemented');
}
