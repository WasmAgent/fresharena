# Non-LLM Baseline Example

This example demonstrates how to run FreshArena evaluations on non-LLM solvers (reference, weak, and buggy implementations).

## Purpose

The non-LLM baseline provides:
- **Reproducible results** without requiring API keys
- **Upper and lower bounds** for solver performance
- **Validation of adversarial testing** through known buggy implementations

## Solvers

| Solver | Description | Expected Pass Rate |
|---|---|---|
| `reference-solver` | Reference implementation (correct) | ~98% |
| `weak-solver` | Intentionally weak implementation | ~38% |
| `buggy-solver-a` | Drops nested keys | ~52% |
| `buggy-solver-b` | Incorrect array sorting | ~58% |
| `buggy-solver-c` | Incorrect null handling | ~44% |

## Running the Evaluation

```bash
# From the repository root
bun run fresharena run examples/non-llm-baseline

# Or with explicit options
bun run fresharena run \
  --world worlds/json-transform \
  --track non-llm \
  --solver solvers/non-llm/reference-solver \
  --adversarial \
  --immunity-pool worlds/json-transform/immunity-pool-v0.json
```

## Expected Output

The evaluation produces:
1. **FAEP record** (`records/non-llm-baseline.jsonl`) — replayable evaluation log
2. **Summary report** with pass rates and metrics
3. **Counterexample gallery** if adversarial testing finds failures

## Reproducing Published Results

To reproduce the published baseline results from `docs/baseline-results.md`:

```bash
bun run fresharena replay records/samples/sample-run.jsonl --strict
```

This command re-runs the evaluation using the exact same inputs and verifies that all scores match the published baseline.

## Next Steps

After running this example:
1. Compare your results to the published baseline
2. Try modifying solver implementations to see impact on scores
3. Experiment with different generator seeds
4. Enable/disable adversarial testing to observe its impact

## For External Agent Projects

If you're developing an external agent and want to evaluate it on FreshArena:

1. **Implement a FreshArena-compatible solver** following the interface in `docs/component-specifications.md`
2. **Add your solver to this config** or create a new config file
3. **Run the evaluation** using the commands above
4. **Submit your results** via GitHub issue (see `CONTRIBUTING.md`)

Your confirmation helps establish FreshArena as a credible, reproducible evaluation standard.
