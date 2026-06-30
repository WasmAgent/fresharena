import type { Counterexample } from '@fresharena/faep-schema';

export type TesterStrategy =
  | 'property-based'
  | 'fuzzing'
  | 'boundary'
  | 'metamorphic'
  | 'differential';

export interface TesterOutput {
  counterexamples: Counterexample[];
  testsRun: number;
  strategy: TesterStrategy;
  durationMs: number;
}

export interface TesterPlugin {
  id: string;
  strategy: TesterStrategy;
  version: string;
  test(
    taskId: string,
    solverId: string,
    solverFn: (input: unknown) => Promise<unknown>,
  ): Promise<TesterOutput>;
}
