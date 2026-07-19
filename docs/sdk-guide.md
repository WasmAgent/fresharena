# SDK Guide

The `@fresharena/sdk` package is the public contract for agent and world
packages that want to plug into FreshArena without importing internal runtime
modules. It exports three extension points:

- `Solver`: receives a task input and returns the candidate output.
- `Generator`: creates fresh, admissible task instances for a task family.
- `Tester`: runs a solver against public, hidden, property, adversarial, or
  immunity tests and returns a deterministic verdict.

The SDK also re-exports the FAEP schema types used by those interfaces,
including `TaskSpec`, `TaskFamily`, `EvalTrack`, `AdmissibilityResult`, and
`Counterexample`.

## Solver contract

A solver is identified by `id` and `track`, then implements `solve(input,
context)`. The `context.task` field is the full `TaskSpec`, so the solver can
read schemas, operation constraints, examples, limits, and verifier metadata.

```ts
import type { Solver } from '@fresharena/sdk';

export const solver: Solver<Record<string, unknown>, Record<string, unknown>> = {
  id: 'checklist-reference-solver',
  track: 'non_llm',
  solve(input) {
    const items = Array.isArray(input.items) ? input.items : [];
    return {
      output: {
        items: items
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
          .sort(),
      },
    };
  },
};
```

Returning `{ output, metadata }` is preferred when the solver has reproducible
diagnostics to attach. Returning the raw output value is also accepted by the
type contract.

## Generator contract

A generator is identified by `id` and `version`, then implements
`generate(context)`. It receives a root seed and task family and returns one
`GeneratedTask` or an array of generated tasks. Each generated task contains the
complete `TaskSpec`, the concrete seed used for that instance, and the
admissibility gates that made the task eligible for evaluation.

```ts
import type { GeneratedTask, Generator, TaskSpec } from '@fresharena/sdk';

const task: TaskSpec = {
  id: 'checklist.normalize.v0|root:0',
  family: 'checklist.normalize.v0',
  input_schema: {
    type: 'object',
    properties: { items: { type: 'array', items: { type: 'string' } } },
    required: ['items'],
  },
  output_schema: {
    type: 'object',
    properties: { items: { type: 'array', items: { type: 'string' } } },
    required: ['items'],
  },
  operation_spec: {
    type: 'normalize',
    constraints: { trim_items: true, drop_empty: true, sort_items: true },
  },
  examples: [
    {
      input: { items: [' beta ', '', 'alpha'] },
      output: { items: ['alpha', 'beta'] },
    },
  ],
  hidden_tests: {
    seed_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    count: 32,
  },
  verifier: { package: 'checklist_verifier', version: '0.1.0' },
  limits: { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 20000 },
};

export const generator: Generator = {
  id: 'checklist-generator',
  version: '0.1.0',
  generate(context): GeneratedTask {
    return {
      task: { ...task, id: `checklist.normalize.v0|${context.rootSeed}:0` },
      seed: `${context.rootSeed}:0`,
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
```

Generator output must be deterministic for the same `rootSeed` and `family`.
Hidden test seeds should be committed through a hash in the task spec and
revealed only to the verifier path that executes hidden tests.

## Tester contract

A tester is identified by `id` and `version`, then implements `test(solver,
context)`. It invokes the supplied solver and returns the number of tests run,
whether all tests passed, and any minimized counterexamples.

```ts
import type { Tester, TesterResult } from '@fresharena/sdk';

export const tester: Tester<Record<string, unknown>, Record<string, unknown>> = {
  id: 'checklist-tester',
  version: '0.1.0',
  async test(candidate, context): Promise<TesterResult> {
    const counterexamples = [];

    for (const example of context.task.examples) {
      const result = await candidate.solve(example.input, { task: context.task });
      const actual =
        typeof result === 'object' && result !== null && 'output' in result
          ? result.output
          : result;

      if (JSON.stringify(actual) !== JSON.stringify(example.output)) {
        counterexamples.push({
          task_id: context.task.id,
          solver_id: candidate.id,
          input: example.input,
          expected_output: example.output,
          actual_output: actual as Record<string, unknown>,
          verifier_version: context.task.verifier.version,
          minimized: true,
          reproduction_command: `fresharena verify ${context.task.family}`,
          hash: `${context.task.id}:${candidate.id}:0`,
        });
      }
    }

    return {
      passed: counterexamples.length === 0,
      testsRun: context.task.examples.length,
      counterexamples,
    };
  },
};
```

Production testers should use the world verifier rather than only public
examples. The SDK shape is intentionally small so a tester can wrap local
reference implementations, WASM verifier packages, or external harnesses while
still returning the same FAEP-compatible result.

## Worked example: adding a new world

Assume a new world called `checklist.normalize.v0` evaluates whether solvers can
normalize small checklist payloads by trimming whitespace, removing empty items,
and sorting the remaining strings.

1. Define closed semantics.

   Document the operation and constraints before writing generator code:

   ```ts
   type ChecklistNormalizeConstraints = {
     trim_items: boolean;
     drop_empty: boolean;
     sort_items: boolean;
   };
   ```

   Avoid subjective rules such as "clean up the list sensibly". Every accepted
   task must have one expected output for each input.

2. Add schema coverage.

   Extend the FAEP schema package so `TaskFamily` accepts
   `checklist.normalize.v0` and the operation constraints can be parsed by the
   verifier. This keeps generated tasks, run records, and exported evidence
   bundles type-checkable.

3. Implement the generator package.

   Create a world generator that exports the SDK `Generator`. Use
   `context.rootSeed` to derive task data, examples, hidden test commitments,
   and stable task IDs. Return failed admissibility gates only for research
   diagnostics; evaluation runners should admit tasks where every gate passes.

4. Implement the verifier-backed tester.

   Create a tester that exports the SDK `Tester`. It should run public examples
   first, then hidden and property tests from the verifier. When a solver fails,
   return a `Counterexample` with the input, expected output, actual output,
   verifier version, reproduction command, and stable hash.

5. Register the world with the runner.

   Wire the generator and tester into the CLI or evaluation engine using only
   their SDK exports. The runner should not depend on private implementation
   files from the world package.

6. Add reference and failure solvers.

   Keep at least one reference solver and one intentionally weak solver. The
   reference solver proves the generator is solvable; the weak solver confirms
   the tester catches realistic mistakes.

7. Verify the integration.

   A minimal world PR should include typecheck and tests for:

   - The new `TaskFamily` value parses.
   - The generator emits deterministic task specs for the same root seed.
   - The tester passes the reference solver.
   - The tester returns a counterexample for the weak solver.

The end state is a world package whose public surface is just SDK-compatible
`Generator`, `Tester`, and optional reference `Solver` exports, with FAEP schema
types providing the shared record format.
