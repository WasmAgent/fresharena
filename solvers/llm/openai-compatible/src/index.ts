import type { SolverMetadata, TaskSpec } from '@fresharena/faep-schema';

export interface OpenAISolverConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export function createSolverMetadata(config: OpenAISolverConfig): SolverMetadata {
  return {
    id: `openai-${config.model}`,
    track: 'model_fixed',
    model: {
      provider: 'openai',
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

// Concrete implementation requires openai peer dep — Phase 0 placeholder
export async function solve(
  _taskSpec: TaskSpec,
  _input: unknown,
  _config: OpenAISolverConfig,
): Promise<unknown> {
  throw new Error('openai-solver: not yet implemented');
}
