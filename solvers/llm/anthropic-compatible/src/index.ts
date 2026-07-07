import type { SolverMetadata, TaskSpec } from '@fresharena/faep-schema';
import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicSolverConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
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

/**
 * Solve a task using Anthropic Claude API
 *
 * @param taskSpec - The task specification
 * @param input - The input data to process
 * @param config - Solver configuration including API key and model settings
 * @returns The LLM response as a structured object
 */
export async function solve(
  taskSpec: TaskSpec,
  input: unknown,
  config: AnthropicSolverConfig,
): Promise<unknown> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or pass apiKey in config.');
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = config.systemPrompt || `You are a solver for the FreshArena evaluation protocol.
Task ID: ${taskSpec.id}
Task Family: ${taskSpec.family}

Process the input according to the task specification and return the result as a valid JSON object.`;

  const userPrompt = `Input: ${JSON.stringify(input)}

Task Specification:
${JSON.stringify(taskSpec.operation_spec, null, 2)}

Return the result as a JSON object.`;

  try {
    const response = await client.messages.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract JSON from the response
      const text = content.text;
      // Try to parse as JSON directly first
      try {
        return JSON.parse(text);
      } catch {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        throw new Error('Could not extract JSON from Anthropic response');
      }
    }
    throw new Error('Anthropic returned unexpected response format');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw new Error('Unknown Anthropic API error');
  }
}
