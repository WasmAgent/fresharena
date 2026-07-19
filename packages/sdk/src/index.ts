import type {
  AdmissibilityResult,
  Counterexample,
  EvalTrack,
  SolverMetadata,
  TaskFamily,
  TaskSpec,
} from '@fresharena/faep-schema';

export type JsonObject = Record<string, unknown>;
export type MaybePromise<T> = T | Promise<T>;

export interface SolverContext {
  readonly task: TaskSpec;
  readonly metadata?: SolverMetadata;
  readonly signal?: AbortSignal;
}

export interface SolverResult<Output = unknown> {
  readonly output: Output;
  readonly metadata?: JsonObject;
}

export interface Solver<Input = unknown, Output = unknown> {
  readonly id: string;
  readonly track: EvalTrack;
  solve(input: Input, context: SolverContext): MaybePromise<Output | SolverResult<Output>>;
}

export interface GeneratorContext {
  readonly rootSeed: string;
  readonly family: TaskFamily;
  readonly signal?: AbortSignal;
}

export interface GeneratedTask {
  readonly task: TaskSpec;
  readonly seed: string;
  readonly admissibility: AdmissibilityResult;
  readonly metadata?: JsonObject;
}

export interface Generator {
  readonly id: string;
  readonly version: string;
  generate(context: GeneratorContext): MaybePromise<GeneratedTask | readonly GeneratedTask[]>;
}

export interface TesterContext {
  readonly task: TaskSpec;
  readonly seed?: string;
  readonly signal?: AbortSignal;
}

export interface TesterResult {
  readonly passed: boolean;
  readonly testsRun: number;
  readonly counterexamples: readonly Counterexample[];
  readonly metadata?: JsonObject;
}

export interface Tester<Input = unknown, Output = unknown> {
  readonly id: string;
  readonly version: string;
  test(solver: Solver<Input, Output>, context: TesterContext): MaybePromise<TesterResult>;
}

export type {
  AdmissibilityResult,
  Counterexample,
  EvalTrack,
  SolverMetadata,
  TaskFamily,
  TaskSpec,
} from '@fresharena/faep-schema';
