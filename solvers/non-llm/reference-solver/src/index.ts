import type { SolverMetadata } from '@fresharena/faep-schema';

export const metadata: SolverMetadata = {
  id: 'reference-solver',
  track: 'non_llm',
  workflow: {
    prompt_hash: 'n/a',
    tool_policy_hash: 'n/a',
    retry_policy: {},
  },
  budget: {
    max_tokens: 0,
    max_wall_time_sec: 30,
    max_attempts: 1,
  },
  artifact: {
    source_hash: 'TODO',
    logs_hash: 'TODO',
  },
};

// Reference implementation — always correct by definition.
// Concrete logic implemented in Phase 0.
export async function solve(_input: unknown): Promise<unknown> {
  throw new Error('reference-solver: not yet implemented');
}
