# Scoring

## Key metrics

### Fresh Generalization Gap

```
fresh_generalization_gap = fixed_task_pass_rate - fresh_task_pass_rate
```

Measures the drop in pass rate when moving from fixed public tasks to fresh generated tasks. A large gap indicates overfitting or benchmark contamination.

### Rank Instability

```
rank_instability = 1 - kendall_tau(fixed_rank, fresh_rank)
```

Measures whether solver rankings change between fixed and fresh tasks. High instability confirms that FreshArena reveals information that fixed benchmarks miss.

### Adversarial Fragility

```
adversarial_fragility = canonical_pass_rate - post_tester_pass_rate
```

Measures the pass rate drop after submit-then-test adversarial testing. A significant drop validates that adversarial testing is necessary.

### Generator Discriminative Power

```
discriminative_power = variance(solver_scores_on_generated_tasks)
```

Combined with solvability band to ensure generators produce differentiating — not impossible — tasks.

### Solvability Band

| Pass rate | Interpretation | Action |
|---|---|---|
| 0% | Possibly unsolvable | Deprioritize, flag for review |
| 1–20% | Very hard | Low-weight retention |
| 20–70% | High-value | Primary evaluation range |
| 70–90% | Medium | Retain |
| 90%+ | Too easy | Deprioritize or move to warmup |

### Replay Reliability

```
replay_reliability = successful_replays / total_replays
```

MVP target: `>= 99%`.

## Leaderboard views

FreshArena intentionally has no single total score. Four views are always reported:

| Board | Purpose |
|---|---|
| Model-Fixed Strategy Board | Compare agent workflow / prompt strategies |
| Model-Open Product Board | Compare full product capability |
| Budget-Normalized Board | Compare cost efficiency |
| Non-LLM Regression Board | Reproducible baseline, CI-friendly |
