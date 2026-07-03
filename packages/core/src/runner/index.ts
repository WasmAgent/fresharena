import type { EvalTrack, FaepRecord, SolverMetadata, TaskSpec } from '@fresharena/faep-schema';

export interface EvalRunOptions {
  taskSpec: TaskSpec;
  solver: SolverMetadata;
  track: EvalTrack;
  worldDir: string;
  outputPath: string;
  runAdversarialTester?: boolean;
  immunityPoolPath?: string;
}

export interface EvalRunResult {
  record: FaepRecord;
  passed: boolean;
  durationMs: number;
}

// Placeholder — concrete implementation in Phase 0
export async function runEval(_opts: EvalRunOptions): Promise<EvalRunResult> {
  throw new Error('runEval: not yet implemented');
}
