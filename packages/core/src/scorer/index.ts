import type { FaepRecord } from '@fresharena/faep-schema';

export interface FreshGeneralizationGap {
  solverId: string;
  fixedPassRate: number;
  freshPassRate: number;
  gap: number;
}

export interface ScorerResult {
  freshGeneralizationGaps: FreshGeneralizationGap[];
  rankInstability: number;
  adversarialFragility: number;
  generatorDiscriminativePower: number;
  solvabilityBand: { min: number; max: number; mean: number };
  replayReliability: number;
}

export function computeScores(_records: FaepRecord[]): ScorerResult {
  throw new Error('computeScores: not yet implemented');
}
