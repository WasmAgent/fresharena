# Experiment Design

## Research hypotheses

| Hypothesis | Claim |
|---|---|
| H1 | Fresh tasks reveal overfitting in fixed benchmarks |
| H2 | Submit-then-test finds failures that canonical tests miss |
| H3 | Generators produce more discriminating tasks than pure random sampling |
| H4 | Results are reproducible and auditable |

## Experiment groups

| Group | Description |
|---|---|
| Static Set | Fixed public tasks — equivalent to traditional benchmark |
| Fresh Set | Dynamically generated tasks with hidden seed |
| Fresh + Tester | Submit-then-test adversarial testing after submission |
| Fresh + Tester + Immunity | Adds Public Immunity Pool counterexamples |

## Solver matrix

| Solver | Type | Track | Purpose |
|---|---|---|---|
| `reference-solver` | Non-LLM | `non_llm` | Correct upper bound |
| `weak-solver` | Non-LLM | `non_llm` | Difficulty lower bound |
| `buggy-solver-a/b/c` | Non-LLM | `non_llm` | Validate Tester finds counterexamples |
| `openai-prompt-v1` | LLM | `model_fixed` | Basic agent |
| `openai-prompt-v2` | LLM | `model_fixed` | Workflow variation |
| `openai-tool-v1` | LLM | `model_fixed` | Tool-use strategy |
| `anthropic-prompt-v1` | LLM | `model_fixed` | Cross-provider comparison |

## Success thresholds (MVP)

```yaml
mvp_success:
  replay_reliability: ">= 99%"
  fixed_vs_fresh_rank_instability: "visibly non-zero"
  adversarial_fragility_detected: true
  confirmed_counterexamples: ">= 20"
  duplicate_counterexample_rate: "<= 30%"
  invalid_generated_task_rate: "<= 10%"
  human_reviewed_engineering_relevance: ">= 3/5"
```

## Primary outputs

1. Fixed-task solver rankings
2. Fresh-task solver rankings
3. Rank correlation (Kendall's τ)
4. Per-solver generalization gap
5. Adversarial pass rate drop per solver
6. Minimized counterexample gallery
7. Replay report
8. Cost report per track
