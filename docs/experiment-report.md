# Experiment Report

> **Milestone**: Milestone 2 — Research Experiment
> **Date**: 2026-07-07
> **Status**: Initial Documentation

This report documents the methodology, results, and statistical analysis of the FreshArena research experiment on evaluating coding agents through fresh task generation and adversarial testing.

---

## 1. Methodology

### 1.1 Experimental Design

The experiment evaluates solver performance across four configurations designed to test the research hypotheses:

| Group | Tasks | Tester Active | Immunity Pool | Purpose |
|---|---|---|---|---|
| **Static Set** | 50–200 fixed public tasks | No | No | Baseline fixed benchmark comparison |
| **Fresh Set** | 500–2000 dynamically generated tasks | No | No | Test fresh generalization |
| **Fresh + Tester** | Same fresh tasks | Yes (adversarial after submission) | No | Test adversarial fragility |
| **Fresh + Tester + Immunity** | Same fresh tasks | Yes | Yes (20+ confirmed counterexamples) | Test cumulative adversarial pressure |

### 1.2 Task Generation

Tasks are generated using property-based testing with the following constraints:

- **Solvability Band**: Tasks are filtered to maintain 20%–90% solve rates
- **Duplicate Rate**: Target < 10% semantically equivalent tasks
- **Invalid Rate**: Target < 10% generation failures
- **Engineering Relevance**: Human-sampled subset scored ≥ 3/5

The generator uses:
- Random seed initialization for reproducibility
- JSON schema-based input generation
- Property invariants for correctness verification
- Minimization for counterexample reduction

### 1.3 Solver Matrix

The experiment evaluates both non-LLM baseline solvers and LLM-based agents:

| Solver | Type | Track | Purpose |
|---|---|---|---|
| `reference-solver` | Non-LLM | `non_llm` | Correct upper bound |
| `weak-solver` | Non-LLM | `non_llm` | Difficulty lower bound |
| `buggy-solver-a` | Non-LLM | `non_llm` | Drops nested keys (structural bug) |
| `buggy-solver-b` | Non-LLM | `non_llm` | Incorrect array sorting (ordering bug) |
| `buggy-solver-c` | Non-LLM | `non_llm` | Strips null values (null-preservation bug) |
| `openai-prompt-v1` | LLM | `model_fixed` | Zero-shot prompt agent |
| `openai-prompt-v2` | LLM | `model_fixed` | Chain-of-thought workflow |
| `openai-tool-v1` | LLM | `model_fixed` | Tool-use strategy |
| `anthropic-prompt-v1` | LLM | `model_fixed` | Cross-provider comparison |

### 1.4 Verification Infrastructure

All solutions are verified through:
1. **Canonical Tests**: Fixed test cases from task specification
2. **Adversarial Tester**: Post-submission property-based testing
3. **Deterministic Sandbox**: Isolated execution environment
4. **Immunity Pool**: Confirmed counterexamples from prior runs

---

## 2. Results

### 2.1 Research Hypothesis H1: Fresh Tasks Reveal Overfitting

**Metrics Tracked:**
- `pass_rate_drop` — per-solver pass rate on fresh vs fixed
- `fresh_generalization_gap = fixed_pass_rate - fresh_pass_rate`
- `rank_instability = 1 - kendall_tau(fixed_rank, fresh_rank)`

*Results to be populated from experimental runs.*

**Expected Findings:**
- Solvers ranked highly on fixed tasks show significant performance drops on fresh tasks
- Rank correlation (Kendall's τ) between fixed and fresh < 0.9
- Pass rate drops vary by solver type (LLM vs non-LLM)

### 2.2 Research Hypothesis H2: Submit-Then-Test Finds Failures Canonical Tests Miss

**Metrics Tracked:**
- `canonical_only_pass_rate`
- `canonical_plus_adversarial_pass_rate`
- `adversarial_fragility = canonical_pass_rate - post_tester_pass_rate`
- Newly confirmed counterexamples count
- Minimized counterexample size distribution

*Results to be populated from experimental runs.*

**Expected Findings:**
- Adversarial testing reduces pass rates significantly (> 10% drop)
- Multiple counterexamples found per buggy solver
- Counterexample minimization reduces inputs by > 50% on average

### 2.3 Research Hypothesis H3: Generators Produce More Discriminating Tasks Than Random Sampling

**Metrics Tracked:**
- `discriminative_power = variance(solver_scores_on_generated_tasks)`
- Solvability band compliance (20%–90% target)
- Duplicate rate (< 10% target)
- Invalid task rate (< 10% target)
- Cost per valid task

*Results to be populated from experimental runs.*

**Expected Findings:**
- Generated tasks show higher per-solver variance than pure random sampling
- Tasks stay within solvability band (> 80% in 20-70% range)
- Engineering relevance scores ≥ 3/5

### 2.4 Research Hypothesis H4: Results Are Reproducible and Auditable

**Metrics Tracked:**
- `replay_reliability = successful_replays / total_replays` (≥ 99% target)
- Deterministic verifier agreement across environments
- Artifact hash consistency
- Flaky test rate (≤ 1% target)

*Results to be populated from experimental runs.*

**Expected Findings:**
- Replay reliability ≥ 99%
- Verifier produces identical results across runs
- Flaky test rate ≤ 1%

---

## 3. Statistical Analysis

### 3.1 Rank Correlation Analysis

Kendall's τ is used to measure rank correlation between:
- Fixed task rankings vs fresh task rankings
- Pre-tester vs post-tester rankings

**Interpretation:**
- τ = 1: Perfect rank agreement
- τ = 0: No rank correlation
- τ = -1: Perfect rank inversion
- τ < 0.9: Significant rank instability detected

### 3.2 Pass Rate Gap Significance

For each solver, we compute:
```
fresh_generalization_gap = fixed_pass_rate - fresh_pass_rate
```

Paired statistical tests assess whether gaps are significant:
- Null hypothesis: gap = 0 (no difference)
- Alternative: gap > 0 (fresh tasks harder)

### 3.3 Counterexample Analysis

Adversarial findings are analyzed for:
- **Unique failure modes**: Distinct bug patterns discovered
- **Minimization effectiveness**: Size reduction achieved
- **Cross-solver overlap**: Do counterexamples generalize?

### 3.4 Cost Efficiency

Per-track cost analysis includes:
- Tokens consumed (input + output)
- API cost (USD)
- Wall time per task
- Cost per confirmed bug found

---

## 4. Success Thresholds

The experiment meets MVP success criteria when:

| Metric | Target | Status |
|---|---|---|
| Replay reliability | ≥ 99% | ⏳ Pending |
| Flaky test rate | ≤ 1% | ⏳ Pending |
| Fixed vs fresh rank instability | τ < 0.9 | ⏳ Pending |
| Adversarial fragility detected | true | ⏳ Pending |
| Confirmed counterexamples | ≥ 20 | ⏳ Pending |
| Duplicate counterexample rate | ≤ 30% | ⏳ Pending |
| Invalid generated task rate | ≤ 10% | ⏳ Pending |
| Human reviewed engineering relevance | ≥ 3/5 | ⏳ Pending |

---

## 5. Artifacts

### 5.1 Output Files

- `worlds/json-transform/static/` — Fixed public task set
- `worlds/json-transform/immunity-pool-v0.json` — Confirmed counterexamples
- `records/experiment-results.jsonl` — Full evaluation records
- `packages/reporter/` — HTML report generator

### 5.2 Reproduction

See `replay/` package for:
- Environment specification
- One-command reproduction instructions
- Hash verification script

---

## 6. Limitations

1. **Task Family Scope**: Current experiment covers only JSON transform tasks
2. **Solver Coverage**: Limited to selected LLM providers and strategies
3. **Generator Constraints**: Property-based generation may miss edge cases
4. **Cost Constraints**: Full adversarial testing may be prohibitively expensive for some tracks

---

## 7. Future Work

1. **Expand Task Families**: Add protocol parsing, code generation, file system tasks
2. **Adversarial Improvement**: Explore mutation-based and LLM-guided test generation
3. **Cost Optimization**: Develop early-stopping and budget-aware strategies
4. **External Validation**: Invite external agent teams to reproduce results
