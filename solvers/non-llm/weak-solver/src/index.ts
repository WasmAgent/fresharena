import type { SolverMetadata } from '@fresharena/faep-schema';

export const metadata: SolverMetadata = {
  id: 'weak-solver',
  track: 'non_llm',
  workflow: {
    prompt_hash: 'n/a',
    tool_policy_hash: 'n/a',
    retry_policy: {},
  },
  budget: {
    max_tokens: 0,
    max_wall_time_sec: 5,
    max_attempts: 1,
  },
  artifact: {
    source_hash: 'TODO',
    logs_hash: 'TODO',
  },
};

// Weak heuristic: returns input unchanged. Useful as a floor baseline.
export async function solve(input: unknown): Promise<unknown> {
  return input;
}
