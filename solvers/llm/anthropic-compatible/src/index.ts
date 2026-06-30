import type { SolverMetadata, TaskSpec } from '@fresharena/faep-schema';

export interface AnthropicSolverConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export function createSolverMetadata(config: AnthropicSolverConfig): SolverMetadata {
  return {
    id: `anthropic-${config.model}`,
    track: 'model_fixed',
    model: {
      provider: 'anthropic',
      name: config.model,
      version: config.model,
      temperature: config.temperature,
    },
    workflow: {
      prompt_hash: 'TODO',
      tool_policy_hash: 'n/a',
      retry_policy: { max_retries: 2 },
    },
    budget: {
      max_tokens: config.maxTokens,
      max_wall_time_sec: 120,
      max_attempts: 3,
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
  _config: AnthropicSolverConfig,
): Promise<unknown> {
  throw new Error('anthropic-solver: not yet implemented');
}
