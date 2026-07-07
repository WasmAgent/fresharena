# LLM Baseline Example

This example demonstrates how to run FreshArena evaluations on LLM-based solvers using the model-fixed track.

## Purpose

The LLM baseline evaluates:
- **Zero-shot prompt strategies** on structured JSON tasks
- **Cross-provider comparison** between OpenAI and Anthropic models
- **Cost efficiency** of different prompting approaches

## Prerequisites

Before running this evaluation, configure your API keys:

```bash
# For OpenAI
export OPENAI_API_KEY="sk-..."

# For Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Solvers

| Solver | Model | Temperature | Strategy |
|---|---|---|---|
| `openai-prompt-v1` | GPT-4 | 0.0 | Zero-shot |
| `anthropic-prompt-v1` | Claude Sonnet 5 | 0.0 | Zero-shot |

## Running the Evaluation

```bash
# From the repository root
bun run fresharena run examples/llm-baseline

# Or with explicit options
bun run fresharena run \
  --world worlds/json-transform \
  --track model-fixed \
  --solver solvers/llm/openai-compatible \
  --adversarial \
  --immunity-pool worlds/json-transform/immunity-pool-v0.json
```

## Expected Output

The evaluation produces:
1. **FAEP record** (`records/llm-baseline.jsonl`) — replayable evaluation log
2. **Summary report** with pass rates, costs, and metrics
3. **Counterexample gallery** for any failures found
4. **Cost breakdown** by solver (tokens, wall time, API cost)

## Cost Estimates

Approximate costs for a full 500-task evaluation:

| Solver | Est. Tokens | Est. API Cost (USD) |
|---|---|---|
| `openai-prompt-v1` | ~200K tokens | ~$2-3 |
| `anthropic-prompt-v1` | ~200K tokens | ~$2-3 |

*Costs vary based on task complexity and solver performance.*

## Budget Control

To limit evaluation costs:

```bash
# Run with smaller task count
bun run fresharena run examples/llm-baseline \
  --fresh-task-count 50 \
  --fixed-task-count 10

# Or use the budget-normalized track
bun run fresharena run \
  --track budget-normalized \
  --max-tokens 10000
```

## Reproducing Published Results

Published LLM baseline results will be available in Phase 2. For now, use the non-LLM baseline to verify your setup:

```bash
bun run fresharena replay records/samples/sample-run.jsonl --strict
```

## Next Steps

After running this example:
1. Compare OpenAI vs Anthropic performance
2. Experiment with different prompting strategies (chain-of-thought, tool-use)
3. Analyze failure modes in the counterexample gallery
4. Consider implementing custom solver adapters

## For External Agent Projects

If you're evaluating an external LLM agent:

1. **Add your solver to this config** with your model and API configuration
2. **Run the evaluation** on a small subset first to verify behavior
3. **Scale to full evaluation** once costs and performance are understood
4. **Report your results** including cost metrics for comparison

Submit your results via GitHub issue (see `CONTRIBUTING.md`).
