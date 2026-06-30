import type { TaskSpec } from '@fresharena/faep-schema';

export type GeneratorType = 'random-baseline' | 'curriculum-baseline' | 'adversarial-baseline';

export interface GeneratorOutput {
  tasks: TaskSpec[];
  seedHash: string;
  generatorVersion: string;
  admissibilityReport: AdmissibilityReport;
}

export interface AdmissibilityReport {
  total: number;
  passed: number;
  rejected: number;
  reasons: Record<string, number>;
}

export interface GeneratorPlugin {
  id: string;
  type: GeneratorType;
  version: string;
  generate(count: number, options?: Record<string, unknown>): Promise<GeneratorOutput>;
}
