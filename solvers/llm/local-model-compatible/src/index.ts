import type { SolverMetadata, TaskSpec } from '@fresharena/faep-schema';

export interface LocalModelSolverConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export function createSolverMetadata(config: LocalModelSolverConfig): SolverMetadata {
  return {
    id: `local-${config.model}`,
    track: 'non_llm',
    model: {
      provider: 'local',
      name: config.model,
      version: config.model,
      temperature: config.temperature,
    },
    workflow: {
      prompt_hash: 'TODO',
      tool_policy_hash: 'n/a',
      retry_policy: { max_retries: 1 },
    },
    budget: {
      max_tokens: config.maxTokens,
      max_wall_time_sec: 300,
      max_attempts: 2,
    },
    artifact: {
      source_hash: 'TODO',
      logs_hash: 'TODO',
    },
  };
}

export async function solve(
  _taskSpec: TaskSpec,
  _input: unknown,
  _config: LocalModelSolverConfig,
): Promise<unknown> {
  throw new Error('local-solver: not yet implemented');
}
