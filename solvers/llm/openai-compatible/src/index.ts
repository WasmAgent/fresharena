import type { SolverMetadata, TaskSpec } from '@fresharena/faep-schema';
import OpenAI from 'openai';

export interface OpenAISolverConfig {
  apiKey?: string;
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

/**
 * Solve a task using OpenAI API
 *
 * @param taskSpec - The task specification
 * @param input - The input data to process
 * @param config - Solver configuration including API key and model settings
 * @returns The LLM response as a structured object
 */
export async function solve(
  taskSpec: TaskSpec,
  input: unknown,
  config: OpenAISolverConfig,
): Promise<unknown> {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey in config.');
  }

  const client = new OpenAI({ apiKey });

  const systemPrompt = config.systemPrompt || `You are a solver for the FreshArena evaluation protocol.
Task ID: ${taskSpec.id}
Task Family: ${taskSpec.family}

Process the input according to the task specification and return the result as a valid JSON object.`;

  const userPrompt = `Input: ${JSON.stringify(input)}

Task Specification:
${JSON.stringify(taskSpec.operation_spec, null, 2)}

Return the result as a JSON object.`;

  try {
    const response = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown OpenAI API error');
  }
}
