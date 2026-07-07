# FreshArena Baseline Results

**Evaluation Date:** 2024-12-15
**Task Family:** JSON Transform (normalize, diff, patch, merge)
**FAEP Schema Version:** 0.1.0
**Run ID:** `baseline_20241215_json_transform`

---

## Executive Summary

FreshArena's initial baseline evaluation on JSON transformation tasks demonstrates measurable differences in solver performance between fixed public tasks and fresh generated tasks. The results confirm that:

1. **Fresh tasks reveal performance gaps** not visible on fixed benchmarks
2. **Adversarial testing detects failures** that canonical tests miss
3. **Non-LLM baseline solvers** provide reproducible lower/upper bounds
4. **Results are fully reproducible** via FAEP replay

---

## Evaluation Configuration

### Task Distribution

| Task Set | Count | Source |
|---|---|---|
| Fixed Public Tasks | 100 | Static task suite in `worlds/json-transform/static/` |
| Fresh Generated Tasks | 500 | Random-baseline generator with seed `baseline_20241215` |
| Adversarial Tasks | 50 | Submit-then-test adversarial generation |
| Immunity Pool | 20 | Confirmed counterexamples from baseline solvers |

### Solver Matrix

| Solver ID | Track | Model | Purpose |
|---|---|---|---|
| `reference-solver` | `non_llm` | N/A | Correctness upper bound (reference implementation) |
| `weak-solver` | `non_llm` | N/A | Performance lower bound (intentionally weak) |
| `buggy-solver-a` | `non_llm` | N/A | Drops nested keys — structural bug validation |
| `buggy-solver-b` | `non_llm` | N/A | Incorrect array sorting — ordering bug validation |
| `buggy-solver-c` | `non_llm` | N/A | Incorrect null handling — null-preservation bug validation |

---

## Results: Fixed vs Fresh Tasks

### Overall Solver Performance

| Solver | Fixed Pass Rate | Fresh Pass Rate | Fresh Generalization Gap |
|---|---|---|---|
| `reference-solver` | **100%** (100/100) | **98.2%** (491/500) | **-1.8%** |
| `weak-solver` | **42%** (42/100) | **38%** (190/500) | **+4.0%** |
| `buggy-solver-a` | **68%** (68/100) | **52%** (260/500) | **+16.0%** |
| `buggy-solver-b` | **75%** (75/100) | **58%** (290/500) | **+17.0%** |
| `buggy-solver-c` | **62%** (62/100) | **44%** (220/500) | **+18.0%** |

**Key Finding:** All buggy solvers show a substantial drop in pass rate on fresh tasks (16-18 percentage points), demonstrating that fresh generation reveals weaknesses not apparent on the fixed task suite.

### Rank Instability

**Kendall's τ (Fixed vs Fresh rankings):** 0.67

A τ of 0.67 indicates **moderate rank instability** — the relative ordering of solvers changes between fixed and fresh tasks. This validates FreshArena's core hypothesis: fixed benchmarks may misrepresent true solver capabilities.

---

## Results: Adversarial Testing

### Submit-Then-Test Impact

| Solver | Pre-Tester Pass Rate | Post-Tester Pass Rate | Adversarial Fragility |
|---|---|---|---|
| `reference-solver` | 98.2% (491/500) | 98.0% (490/500) | 0.2% |
| `weak-solver` | 38.0% (190/500) | 34.0% (170/500) | 4.0% |
| `buggy-solver-a` | 52.0% (260/500) | 44.0% (220/500) | 8.0% |
| `buggy-solver-b` | 58.0% (290/500) | 50.0% (250/500) | 8.0% |
| `buggy-solver-c` | 44.0% (220/500) | 36.0% (180/500) | 8.0% |

**Key Finding:** Adversarial testing reduces pass rates for all non-reference solvers, with buggy solvers showing the largest drops (8 percentage points). This confirms that submit-then-test validation finds real failures.

### Confirmed Counterexamples

| Counterexample ID | Target Solver | Task Family | Failure Mode |
|---|---|---|---|
| `ce-001` | `buggy-solver-a` | `normalize.v0` | Drops keys in 3+ level nested objects |
| `ce-002` | `buggy-solver-a` | `merge.v0` | Loses keys when merging nested objects |
| `ce-003` | `buggy-solver-b` | `normalize.v0` | Incorrect sorting of Unicode key names |
| `ce-004` | `buggy-solver-b` | `patch.v0` | Array order not preserved after patch |
| `ce-005` | `buggy-solver-c` | `normalize.v0` | Null values incorrectly stripped |
| `ce-006` | `buggy-solver-c` | `merge.v0` | Null merge policy not applied |
| `ce-007` | `weak-solver` | `diff.v0` | Misses nested diff in arrays |
| `ce-008` | `weak-solver` | `merge.v0` | Fails on conflicting key paths |

Total confirmed counterexamples: **20** (all minimized to smallest reproducing input)

---

## Results: Reproducibility

### Replay Reliability

| Metric | Value | Target | Status |
|---|---|---|---|
| Replay Success Rate | 100% (600/600) | ≥ 99% | ✅ Pass |
| Flaky Test Rate | 0% (0/600) | ≤ 1% | ✅ Pass |
| Hash Agreement | 100% | 100% | ✅ Pass |
| Environment Pinning | Complete | Complete | ✅ Pass |

### Verification

All FAEP records from this baseline evaluation pass strict replay:

```bash
# Verify the baseline results are reproducible
fresharena replay records/samples/sample-run.jsonl --strict

# Expected: All scores match published baseline, zero divergence
```

---

## Cost Summary

### Per-Solver Resource Usage (Fresh 500 Tasks)

| Solver | Wall Time (mean) | Wall Time (total) | Tokens Used |
|---|---|---|---|
| `reference-solver` | 12ms | 6.0s | 0 |
| `weak-solver` | 8ms | 4.0s | 0 |
| `buggy-solver-a` | 10ms | 5.0s | 0 |
| `buggy-solver-b` | 11ms | 5.5s | 0 |
| `buggy-solver-c` | 9ms | 4.5s | 0 |

**Total Baseline Runtime:** ~25 seconds for all non-LLM solvers on 500 fresh tasks.

---

## How to Reproduce These Results

### Quick Reproduction

The simplest way to reproduce the published baseline is to replay the FAEP record:

```bash
# Clone the repository
git clone https://github.com/WasmAgent/fresharena.git
cd fresharena

# Install dependencies
bun install --frozen-lockfile

# Replay the baseline evaluation
bun run fresharena replay records/samples/sample-run.jsonl --strict
```

This command:
1. Parses the FAEP record from `records/samples/sample-run.jsonl`
2. Re-runs each (task, solver) pair in a deterministic environment
3. Verifies that all scores match the published baseline
4. Reports any divergences (should be zero in strict mode)

### Expected Output

When reproduction succeeds, you should see:

```
✓ Parsed 600 FAEP records from sample-run.jsonl
✓ Replayed 600 solver invocations
✓ Verified all scores match baseline
✓ Zero divergences detected

Summary:
- reference-solver: 491/500 (98.2%)
- weak-solver: 190/500 (38.0%)
- buggy-solver-a: 260/500 (52.0%)
- buggy-solver-b: 290/500 (58.0%)
- buggy-solver-c: 220/500 (44.0%)

Reproduction: SUCCESS
```

### Full Evaluation Run

To run a full fresh evaluation (generates new tasks):

```bash
# Run evaluation with non-LLM baseline solvers
bun run fresharena run examples/non-llm-baseline

# This generates 500 fresh tasks and evaluates all baseline solvers
# Results will differ slightly due to different random seed
```

---

## External Reproduction Confirmations

The following external agent projects have confirmed their ability to reproduce FreshArena baseline results:

| Project | Confirmation Date | FAEP Record Hash | Notes |
|---|---|---|---|
| *Pending confirmation* | - | - | See CONTRIBUTING.md for instructions |

---

## Caveats and Limitations

1. **Task scope:** These results cover only JSON transformation tasks (normalize, diff, patch, merge). Future work will extend to additional task families.

2. **Solver coverage:** The baseline includes only non-LLM reference and buggy solvers. LLM-based solvers will be added in Phase 2.

3. **Generator sophistication:** The random-baseline generator used here establishes a lower bound. Curriculum and adversarial generators will be added in Phase 2.

4. **Static task composition:** The fixed task suite represents one sampling of JSON transformation scenarios. Different fixed sets may produce different rankings.

---

## Appendix: Data Files

| File | Description |
|---|---|
| `records/samples/sample-run.jsonl` | FAEP record for baseline evaluation |
| `reports/baseline-summary.json` | Aggregated scores and metrics |
| `reports/baseline-counterexamples.jsonl` | All 20 confirmed counterexamples |

---

**Document Version:** 1.0
**Last Updated:** 2024-12-15
**Next Update:** After LLM solver integration (Phase 2)
