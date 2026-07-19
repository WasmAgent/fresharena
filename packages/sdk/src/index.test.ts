import { expect, test } from 'bun:test';
import type { Generator, Solver, TaskSpec, Tester } from './index.js';

const task = {
  id: 'normalize-v0-example',
  family: 'json_transform.normalize.v0',
  input_schema: { type: 'object' },
  output_schema: { type: 'object' },
  operation_spec: {
    type: 'normalize',
    constraints: { sort_keys: true, strip_nulls: false, flatten: null },
  },
  examples: [{ input: { b: 1, a: 2 }, output: { a: 2, b: 1 } }],
  hidden_tests: { seed_hash: '0'.repeat(64), count: 1 },
  verifier: { package: 'json_transform_verifier', version: '0.1.0' },
  limits: { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 20000 },
} satisfies TaskSpec;

test('public SDK interfaces accept solver, generator, and tester plugins', async () => {
  const solver: Solver<Record<string, unknown>, Record<string, unknown>> = {
    id: 'external-reference',
    track: 'non_llm',
    solve(input) {
      return { output: input };
    },
  };

  const generator: Generator = {
    id: 'external-generator',
    version: '0.1.0',
    generate() {
      return {
        task,
        seed: 'root:task:0',
        admissibility: {
          deterministic: true,
          reference_solvable: true,
          duplicate_distance_above_threshold: true,
          no_ambiguous_policy: true,
          cost_within_limit: true,
          engineering_relevance_min: true,
        },
      };
    },
  };

  const tester: Tester<Record<string, unknown>, Record<string, unknown>> = {
    id: 'external-tester',
    version: '0.1.0',
    async test(candidate, context) {
      const result = await candidate.solve(context.task.examples[0].input, {
        task: context.task,
      });
      return {
        passed: typeof result === 'object',
        testsRun: 1,
        counterexamples: [],
      };
    },
  };

  const generated = await generator.generate({
    rootSeed: 'root',
    family: 'json_transform.normalize.v0',
  });
  const generatedTask = Array.isArray(generated) ? generated[0] : generated;
  const result = await tester.test(solver, { task: generatedTask.task, seed: generatedTask.seed });

  expect(result).toMatchObject({ passed: true, testsRun: 1, counterexamples: [] });
});
