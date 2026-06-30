# Paper / Technical Report Strategy

## Recommended title

> **FreshArena: Dynamic, Verifiable, and Adversarial Evaluation for Coding Agents**

## Four core contributions

1. **FAEP** — A reproducible protocol for dynamic coding task evaluation: versioned task families, hidden seeds, deterministic verifiers, replayable evidence records.
2. **Submit-then-test** — Adversarial test generation triggered after solver submission, reducing inflated pass rates without requiring pre-built test suites.
3. **Public Immunity Pool** — A growing corpus of confirmed, minimized counterexamples that serves as a public regression test suite for all solvers.
4. **Empirical result** — On the JSON Transform World, fixed-task rankings and fresh-task rankings show significant divergence, demonstrating that fixed benchmarks hide real capability differences.

## Claim language

**Do not claim:**

> FreshArena has solved the coding agent evaluation problem.

**Claim instead:**

> In a controlled, deterministic, low-cost task world, dynamic task generation and submit-then-test adversarial testing reveal solver capability differences that fixed task evaluation cannot. This demonstrates that the FAEP protocol is worth extending to broader task families.

The contribution is the method and its empirical validation on one domain — not a general solution.

## Required figures

| Figure | Content |
|---|---|
| Fig 1 | Fixed vs fresh pass rate bar chart per solver |
| Fig 2 | Rank correlation heatmap (Kendall's τ, fixed vs fresh) |
| Fig 3 | Adversarial fragility — canonical vs post-tester pass rate per solver |
| Fig 4 | Counterexample minimization examples (before/after) |
| Fig 5 | Generator metrics: validity rate, novelty rate, discriminative power |
| Fig 6 | Replay reliability table |
| Fig 7 | Cost table per track |

## Target venues

- arXiv preprint first (matches Phase 2 timeline)
- Workshop at NeurIPS / ICML / ICLR on evaluation or benchmarking
- Full paper after Phase 3 data is available
