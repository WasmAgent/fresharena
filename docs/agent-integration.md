# Agent Integration

This example shows how an external agent package can implement the public
`@fresharena/sdk` interfaces without importing FreshArena internals.

```ts
import type {
  Generator,
  GeneratedTask,
  Solver,
  TaskSpec,
  Tester,
  TesterResult,
} from '@fresharena/sdk';

const task: TaskSpec = {
  id: 'json_transform.normalize.v0|example',
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
};

export const solver: Solver<Record<string, unknown>, Record<string, unknown>> = {
  id: 'example-agent',
  track: 'non_llm',
  solve(input) {
    return { output: input };
  },
};

export const generator: Generator = {
  id: 'example-generator',
  version: '0.1.0',
  generate(): GeneratedTask {
    return {
      task,
      seed: 'example-root:0',
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

export const tester: Tester<Record<string, unknown>, Record<string, unknown>> = {
  id: 'example-tester',
  version: '0.1.0',
  async test(candidate, context): Promise<TesterResult> {
    const example = context.task.examples[0];
    const result = await candidate.solve(example.input, { task: context.task });
    const output = typeof result === 'object' && result !== null && 'output' in result
      ? result.output
      : result;

    return {
      passed: JSON.stringify(output) === JSON.stringify(example.output),
      testsRun: 1,
      counterexamples: [],
    };
  },
};
```

When exposed through an agent tool interface, the runner should return a
structured `tool_result` that includes the plugin identity, the test outcome,
and enough context to reproduce the evaluation.

```json
{
  "type": "tool_result",
  "tool_name": "fresharena.evaluate",
  "tool_call_id": "call_01JSDKEXAMPLE",
  "content": [
    {
      "type": "json",
      "json": {
        "solver_id": "example-agent",
        "tester_id": "example-tester",
        "task_id": "json_transform.normalize.v0|example",
        "passed": true,
        "tests_run": 1,
        "counterexamples": [],
        "record": {
          "schema_version": "0.1.0",
          "task": {
            "id": "json_transform.normalize.v0|example",
            "family": "json_transform.normalize.v0"
          },
          "solver": {
            "id": "example-agent",
            "track": "non_llm"
          },
          "generator": {
            "id": "example-generator",
            "version": "0.1.0",
            "seed": "example-root:0"
          },
          "tester": {
            "id": "example-tester",
            "version": "0.1.0"
          }
        }
      }
    }
  ]
}
```
