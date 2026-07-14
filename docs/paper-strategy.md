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

## Relationship to Existing Benchmarks

### SWE-bench Pro
SWE-bench Pro has become the accepted next-generation anti-contamination code benchmark
(OpenAI stopped reporting SWE-bench Verified due to contamination concerns; Epoch AI
actively deletes post-solution git history). It is not a competitor — it is a validation
point. The claim to make:

> FreshArena generalizes the anti-contamination insight behind SWE-bench Pro into a
> reusable protocol (FAEP). Where SWE-bench Pro applies the methodology to one domain
> (software engineering), FAEP makes it portable to any task family with a deterministic
> verifier.

Include a framing section in the paper: "FreshArena as a protocol layer for SWE-bench
Pro-style evaluation" — this makes it a complement, not a challenger, and increases the
chance of citation from the SWE-bench community.

### MMLU-CF (Microsoft)
The MMLU-CF decontamination study showed 3–7 point drops from cleaning benchmark
contamination alone. Cite this as direct empirical validation that the problem FreshArena
solves is real and measurable: *contamination inflates scores by several percentage points
even on well-known public benchmarks*.

### Slot-substitution (the emerging consensus technique)
The 2026 academic consensus on anti-contamination is slot-substitution: replace named
entities, values, and dates while preserving task structure, requiring models to "apply
structure" rather than "recall instances." FreshArena's generator should be positioned as
implementing this pattern in the coding domain, with deterministic verifiers making it
feasible where LLM-based scoring is not.

Cite: Shi et al. 2024, Oren et al. 2023 for black-box contamination detection methods
(these can be used to cross-validate that FreshArena's generated tasks are genuinely fresh).

Note on scope: `trace-pipeline` (`eval_trust`) handles **dataset-level** contamination
analysis (paired McNemar statistics across a full benchmark). FreshArena's contamination
probe is **per-task** — a lightweight probabilistic annotation in the FAEP record for
a single generated instance. Cite Shi/Oren for the underlying technique; the novelty
is applying it at per-task granularity inside a live evaluation protocol.

### Epoch AI's evaluation methodology
Epoch AI deletes post-solution git history to prevent gold-patch leakage. In FAEP record
terms, this maps to the `contamination_likelihood` annotation — the record should include
a confidence estimate of whether a given generated task may already be in training data.
Cite this as the motivation for the black-box contamination probe (issue #96).

### Scope statement (design intent, not a demonstrated capability)

> **Status:** Cross-domain portability is a *design goal* of the FAEP protocol, not a
> validated result. Only the JSON Transform World is implemented today.

The intended scope of FreshArena is a framework for building anti-contamination
evaluations in domains expressible as generator + verifier pairs. It is not a single
benchmark — it is a protocol (FAEP) *designed to make* dynamic generation and
contamination-resistant evaluation portable across task families, programming languages,
and reasoning domains. The JSON Transform World is the first — and currently only —
demonstration domain; portability to additional domains (e.g. data-structure and
state-machine worlds) is planned under the Phase 3 expansion (`docs/roadmap.md`) and is
not yet validated.

Where SWE-bench Pro applies dynamic generation to software engineering tasks specifically,
FreshArena's *aim* is to generalize that approach across domains. Where MMLU-CF
demonstrates the prevalence and cost of contamination in knowledge benchmarks, FreshArena
*intends to* provide a protocol-level mechanism to prevent it proactively rather than
filtering post-hoc.

### Proposed core experiment

The planned empirical study (full methodology in `docs/experiment-design.md`;
metrics in `docs/scoring.md`) compares solver performance on fixed vs. fresh tasks:
run the JSON Transform World on at least 3 LLM solvers under a fixed-task condition
(static snapshot from the versioned task family) and a fresh-task condition
(dynamically generated instances with hidden seeds), then compare rank orderings.
The hypothesis — that rankings differ between conditions — is the empirical
validation target for the paper's central claim that fixed benchmarks can obscure
real capability differences.

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
| Fig 8 | (optional) Contamination likelihood distribution across generated tasks |

## Target venues

- arXiv preprint first (matches Phase 2 timeline)
- Workshop at NeurIPS / ICML / ICLR on evaluation or benchmarking
- Full paper after Phase 3 data is available
