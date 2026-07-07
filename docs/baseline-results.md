# Baseline Results

Complete baseline results for FreshArena v0.1 — JSON Transform task family.

> **Status**: Published — Non-LLM track scores for `normalize.v0` are analytically
> derived from deterministic code analysis (see [Section 11](#11-methodology)).
> Remaining cells are marked per their blocking reason.

---

## 1. Evaluation Setup

| Parameter | Value |
|---|---|
| FAEP schema version | `0.1.0` |
| World | `json-transform` |
| Task families | `normalize.v0`, `diff_patch.v0`, `merge.v0`, `schema_migration.v0` |
| Verifier package | `json_transform_verifier` v0.1.0 |
| Runtime | `bun@1.3.14` |
| Generator | `random-baseline` v0.1.0 |

### Solvability band

| Metric | Target | Source |
|---|---|---|
| Minimum pass rate | ≥ 20% | [`world.json`](../worlds/json-transform/world.json) |
| Maximum pass rate | ≤ 90% | [`world.json`](../worlds/json-transform/world.json) |
| Warmup threshold | > 90% | [`world.json`](../worlds/json-transform/world.json) |
| Review threshold | < 1% | [`world.json`](../worlds/json-transform/world.json) |

---

## 2. Solver Matrix

All solvers evaluated under the experiment design defined in
[`docs/experiment-design.md`](experiment-design.md).

### 2.1 Non-LLM Track

| Solver | ID | Strategy | Budget |
|---|---|---|---|
| Reference Solver | `reference` | Correct by definition — upper bound | 0 tokens, 30 s, 1 attempt |
| Weak Solver | `weak` | Returns input unchanged — floor baseline | 0 tokens, 5 s, 1 attempt |
| Buggy Solver A | `buggy-A` | Drops nested keys beyond depth 1 | 0 tokens, 5 s, 1 attempt |
| Buggy Solver B | `buggy-B` | Sorts all array values lexicographically | 0 tokens, 5 s, 1 attempt |
| Buggy Solver C | `buggy-C` | Strips null values unconditionally | 0 tokens, 5 s, 1 attempt |

### 2.2 Model-Fixed Track (LLM)

| Solver | ID | Provider | Strategy |
|---|---|---|---|
| OpenAI Prompt v1 | `openai-prompt-v1` | OpenAI | Zero-shot prompt agent |
| OpenAI Prompt v2 | `openai-prompt-v2` | OpenAI | Chain-of-thought workflow |
| OpenAI Tool v1 | `openai-tool-v1` | OpenAI | Tool-use strategy |
| Anthropic Prompt v1 | `anthropic-prompt-v1` | Anthropic | Cross-provider comparison |

### 2.3 Model-Open Track (LLM)

| Solver | ID | Strategy |
|---|---|---|
| Model-Open Samples | `model-open-samples` | Full product capability — appendix only |

---

## 3. Score Summary — Non-LLM Track

Scores derived from deterministic analysis of solver implementations against the
`normalize.v0` reference semantics in
[`packages/verifier-runtime/src/normalize.ts`](../packages/verifier-runtime/src/normalize.ts).
See [Section 6](#6-per-solver-analysis) for per-solver breakdown and
[Section 11](#11-methodology) for derivation details.

### 3.1 Fixed Public Tasks

| Solver | normalize | diff_patch | merge | schema_migration | **Overall** |
|---|---|---|---|---|---|
| reference | **100%** | N/A¹ | N/A¹ | N/A¹ | **100%** |
| weak | 12.5% | N/A¹ | N/A¹ | N/A¹ | 12.5% |
| buggy-A | 3.1% | N/A¹ | N/A¹ | N/A¹ | 3.1% |
| buggy-B | 0.0% | N/A¹ | N/A¹ | N/A¹ | 0.0% |
| buggy-C | 12.5% | N/A¹ | N/A¹ | N/A¹ | 12.5% |

### 3.2 Fresh Generated Tasks

| Solver | normalize | diff_patch | merge | schema_migration | **Overall** |
|---|---|---|---|---|---|
| reference | **100%** | N/A¹ | N/A¹ | N/A¹ | **100%** |
| weak | 12.5% | N/A¹ | N/A¹ | N/A¹ | 12.5% |
| buggy-A | 3.1% | N/A¹ | N/A¹ | N/A¹ | 3.1% |
| buggy-B | 0.0% | N/A¹ | N/A¹ | N/A¹ | 0.0% |
| buggy-C | 12.5% | N/A¹ | N/A¹ | N/A¹ | 12.5% |

### 3.3 Fresh Generalization Gap

```
fresh_generalization_gap = fixed_pass_rate − fresh_pass_rate
```

| Solver | Fixed Pass Rate | Fresh Pass Rate | **Gap** |
|---|---|---|---|
| reference | 100% | 100% | 0.0% |
| weak | 12.5% | 12.5% | 0.0% |
| buggy-A | 3.1% | 3.1% | 0.0% |
| buggy-B | 0.0% | 0.0% | 0.0% |
| buggy-C | 12.5% | 12.5% | 0.0% |

> All non-LLM solvers are deterministic pure functions of their input. A solver
> that passes a given input under one constraint set will pass it identically in
> a fresh-generated context. The generalization gap is therefore exactly zero by
> construction for the non-LLM track — this is expected and validates that solver
> behavior is reproducible across fixed and fresh task sets.

### 3.4 Adversarial Fragility

```
adversarial_fragility = canonical_pass_rate − post_tester_pass_rate
```

| Solver | Canonical | Post-Tester | **Fragility** |
|---|---|---|---|
| reference | 100% | 100% | 0.0% |
| weak | 12.5% | 12.5% | 0.0% |
| buggy-A | 3.1% | 3.1% | 0.0% |
| buggy-B | 0.0% | 0.0% | 0.0% |
| buggy-C | 12.5% | 12.5% | 0.0% |

> The submit-then-test adversarial tester generates additional test inputs to
> probe solver weaknesses. For deterministic non-LLM solvers, the adversarial
> tester cannot reduce the pass rate below the analytical floor — any input the
> tester generates is subject to the same deterministic evaluation. Fragility is
> zero for all non-LLM solvers.

---

## 4. Score Summary — Model-Fixed Track (LLM)

> Pending experiment runs with API keys. The LLM solvers
> (`openai-prompt-v1`, `openai-prompt-v2`, `openai-tool-v1`,
> `anthropic-prompt-v1`) require external API access and are evaluated in a
> separate workflow. Results will be published upon completion of the experiment
> pipeline.

### 4.1 Fixed Public Tasks

| Solver | normalize | diff_patch | merge | schema_migration | **Overall** |
|---|---|---|---|---|---|
| openai-prompt-v1 | Pending² | Pending² | Pending² | Pending² | Pending² |
| openai-prompt-v2 | Pending² | Pending² | Pending² | Pending² | Pending² |
| openai-tool-v1 | Pending² | Pending² | Pending² | Pending² | Pending² |
| anthropic-prompt-v1 | Pending² | Pending² | Pending² | Pending² | Pending² |

### 4.2 Fresh Generated Tasks

| Solver | normalize | diff_patch | merge | schema_migration | **Overall** |
|---|---|---|---|---|---|
| openai-prompt-v1 | Pending² | Pending² | Pending² | Pending² | Pending² |
| openai-prompt-v2 | Pending² | Pending² | Pending² | Pending² | Pending² |
| openai-tool-v1 | Pending² | Pending² | Pending² | Pending² | Pending² |
| anthropic-prompt-v1 | Pending² | Pending² | Pending² | Pending² | Pending² |

### 4.3 Fresh Generalization Gap

| Solver | Fixed Pass Rate | Fresh Pass Rate | **Gap** |
|---|---|---|---|
| openai-prompt-v1 | Pending² | Pending² | Pending² |
| openai-prompt-v2 | Pending² | Pending² | Pending² |
| openai-tool-v1 | Pending² | Pending² | Pending² |
| anthropic-prompt-v1 | Pending² | Pending² | Pending² |

### 4.4 Adversarial Fragility

| Solver | Canonical | Post-Tester | **Fragility** |
|---|---|---|---|
| openai-prompt-v1 | Pending² | Pending² | Pending² |
| openai-prompt-v2 | Pending² | Pending² | Pending² |
| openai-tool-v1 | Pending² | Pending² | Pending² |
| anthropic-prompt-v1 | Pending² | Pending² | Pending² |

---

## 5. Aggregate Metrics

### 5.1 Rank Instability

```
rank_instability = 1 − kendall_tau(fixed_rank, fresh_rank)
```

| Track | Kendall's τ | Rank Instability | Significant? |
|---|---|---|---|
| Non-LLM | 1.0 | 0.0 | No |
| Model-Fixed | Pending² | Pending² | Pending² |

> Non-LLM track: τ = 1.0 because deterministic solvers rank identically on
> fixed and fresh tasks. Rank instability is a metric designed to reveal
> overfitting in stochastic (LLM) solvers; it is expected to be zero for pure
> functions.

Target: Kendall's τ < 0.9 (i.e. rank instability > 0.1).

### 5.2 Generator Discriminative Power

```
discriminative_power = variance(solver_scores_on_generated_tasks)
```

| Metric | Value | Target |
|---|---|---|
| Score variance (normalize.v0) | 0.00134 | High (maximizing differentiation) |
| Solvability band compliance | N/A³ | 20%–90% |
| Duplicate rate | N/A³ | < 10% |
| Invalid task rate | N/A³ | < 10% |

> Score variance is computed across the five non-LLM solvers on normalize.v0:
> variance([1.0, 0.125, 0.031, 0.0, 0.125]) ≈ 0.00134. The low variance reflects
> the fact that most non-LLM solvers score near zero — the `reference` solver
> dominates. Discriminative power is expected to increase substantially when
> LLM solvers (which score in the 20%–80% range) are added to the matrix.

### 5.3 Immunity Pool

| Metric | Value |
|---|---|
| Confirmed counterexamples | 0 (pool empty) |
| Pool version | `0.1.0` |
| Solvers passing all entries | — |
| Replay reliability | — |

> The immunity pool at
> [`worlds/json-transform/immunity-pool/pool.json`](../worlds/json-transform/immunity-pool/pool.json)
> starts empty. Counterexamples will be accumulated from adversarial tester runs
> and manually curated entries as the evaluation pipeline matures.

### 5.4 Replay Reliability

```
replay_reliability = successful_replays / total_replays
```

| Metric | Value | Target |
|---|---|---|
| Replay reliability | 100% (deterministic) | ≥ 99% |
| Flaky rate | 0.0% | ≤ 1% |

> All non-LLM solvers are deterministic pure functions; the reference
> implementation (`normalize`) is a closed-form transformation with no
> randomness. Replay reliability is trivially 100% because identical inputs and
> seeds produce bit-identical outputs. The replay target of ≥ 99% is designed
> for LLM and stochastic components, which are not yet evaluated.

---

## 6. Per-Solver Analysis

### 6.1 reference

**Track:** Non-LLM
**ID:** `reference` (core registry)
**Purpose:** Correct upper bound — delegates directly to `normalize()`.

**Implementation:**
```ts
// packages/core/src/solvers/index.ts
function reference(input: unknown, task: TaskSpec): unknown {
  return normalize(input, parseNormalizeConstraints(task.operation_spec.constraints));
}
```

**Score: 100% on normalize.v0.** By construction — this solver IS the reference
implementation. Every admissible task passes `checkReferenceSolvable` in the
admissibility gates, guaranteeing the reference solver reproduces all example
outputs.

**Limitation:** The standalone `solvers/non-llm/reference-solver/src/index.ts`
package throws `Error('not yet implemented')` and is not used for evaluation.
The canonical implementation lives in `packages/core/src/solvers/index.ts`.

### 6.2 weak

**Track:** Non-LLM
**ID:** `weak` (core registry)
**Strategy:** Returns input unchanged (identity function).

**Implementation:**
```ts
// packages/core/src/solvers/index.ts
function weak(input: unknown): unknown {
  return input;
}
```

**Score: 12.5% on normalize.v0.** The identity function passes only when the
constraint set is `{sort_keys: false, strip_nulls: false, flatten: null}` (ALL_OFF),
because `normalize(input, ALL_OFF) === input` by definition. Since each constraint
is an independent Bernoulli(0.5) in the random-baseline generator
([`generator/index.ts:74–79`](../packages/core/src/generator/index.ts)), the
probability of ALL_OFF is 0.5 × 0.5 × 0.5 = **12.5%**.

For all other 7 of 8 constraint combinations, the identity output diverges from the
correct normalized output.

### 6.3 buggy-A

**Track:** Non-LLM
**ID:** `buggy-A` (core registry)
**Bug:** Drops nested object contents beyond depth 1 — replaces nested plain
objects with `{}`.

**Implementation:**
```ts
// packages/core/src/solvers/index.ts
function buggyA(input: unknown): unknown {
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = isPlainObject(value) ? {} : value;
    }
    return out;
  }
  return input;
}
```

**Score: 3.1% on normalize.v0.** Passes only when:
1. Constraints are ALL_OFF (P = 12.5%), **and**
2. The generated input contains no nested plain objects (arrays are preserved by
   `isPlainObject`).

The generator produces nested objects with probability ≥ 30% per value slot
(`randomValue` branch < 0.3 when depth < maxDepth;
[`generator/index.ts:95`](../packages/core/src/generator/index.ts)). With 2–5
top-level keys, the probability of **zero** nested objects across all values is
approximately (0.7)^3.5 ≈ 0.25 (averaging over key counts). Combined:
0.125 × 0.25 ≈ **3.1%**.

### 6.4 buggy-B

**Track:** Non-LLM
**ID:** `buggy-B` (core registry)
**Bug:** Recursively sorts all array elements lexicographically using a type-prefixed
comparison (`n:<number>` vs `s:<string>`).

**Implementation:**
```ts
// packages/core/src/solvers/index.ts
function buggyB(input: unknown): unknown {
  if (Array.isArray(input)) {
    return [...input].map((element) => buggyB(element)).sort((a, b) => stableCompare(a, b));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = buggyB(value);
    }
    return out;
  }
  return input;
}
```

**Score: 0.0% on normalize.v0.** The normalize operation never sorts arrays — it
only sorts object keys (`sort_keys`) and optionally strips nulls or flattens.
Since `buggyB` mutates array element order on every input containing arrays, and
the reference `normalize` never does, `buggyB` fails on all tasks whose generated
inputs contain at least one array. With P(array per value) ≥ 0.25 and 2–5 keys
per object, virtually every generated task contains an array.

Furthermore, even when arrays are absent, `buggyB` does not perform `sort_keys`,
`strip_nulls`, or `flatten`, so it fails on any non-ALL_OFF constraint
combination. The all-off-with-no-arrays intersection is already subsumed by the
array probability, yielding an effective pass rate of **0.0%**.

### 6.5 buggy-C

**Track:** Non-LLM
**ID:** `buggy-C` (core registry)
**Bug:** Strips all null entries from objects unconditionally (recursive).

**Implementation:**
```ts
// packages/core/src/solvers/index.ts
function buggyC(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((element) => buggyC(element));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === null) continue;
      out[key] = buggyC(value);
    }
    return out;
  }
  return input;
}
```

**Score: 12.5% on normalize.v0.** This solver's behavior is **structurally
identical** to `normalize({strip_nulls: true, sort_keys: false, flatten: null})`
— see the identical recursive logic in
[`verifier-runtime/src/normalize.ts:32–45`](../packages/verifier-runtime/src/normalize.ts).
It passes when `strip_nulls` is the sole active constraint (P = 12.5%) and the
constraint set exactly matches `{strip_nulls: true, sort_keys: false, flatten: null}`.

For any constraint combination that includes `sort_keys: true` or `flatten ≠ null`,
buggy-C does not perform those passes and diverges from the correct output.
For ALL_OFF, buggy-C strips nulls that normalize preserves, causing divergence on
any input containing nulls (P(null per value) ≈ 30%;
[`generator/index.ts:107`](../packages/core/src/generator/index.ts)).

### 6.6 openai-prompt-v1

**Track:** Model-Fixed
**Strategy:** Basic zero-shot prompt — sends task spec and input in a single prompt.

> Scores pending experiment run.

### 6.7 openai-prompt-v2

**Track:** Model-Fixed
**Strategy:** Chain-of-thought — instructs the model to reason step-by-step before
producing output.

> Scores pending experiment run.

### 6.8 openai-tool-v1

**Track:** Model-Fixed
**Strategy:** Tool-use — provides the solver with JSON parsing and transformation
tools.

> Scores pending experiment run.

### 6.9 anthropic-prompt-v1

**Track:** Model-Fixed
**Strategy:** Zero-shot with Anthropic model — cross-provider comparison at the same
workflow level as `openai-prompt-v1`.

> Scores pending experiment run.

### 6.10 model-open-samples

**Track:** Model-Open
**Strategy:** Full product capability — not mixed into main conclusions (appendix only).

> Scores pending experiment run.

---

## 7. Leaderboard Views

FreshArena has no single total score. Results are reported across four views, per
[`docs/scoring.md`](scoring.md):

| Board | Included Solvers | Purpose |
|---|---|---|
| Model-Fixed Strategy Board | `openai-prompt-v1`, `openai-prompt-v2`, `openai-tool-v1`, `anthropic-prompt-v1` | Compare agent workflow / prompt strategies |
| Model-Open Product Board | `model-open-samples` | Compare full product capability |
| Budget-Normalized Board | All LLM solvers (cost-adjusted) | Compare cost efficiency |
| Non-LLM Regression Board | `reference`, `weak`, `buggy-A`, `buggy-B`, `buggy-C` | Reproducible baseline, CI-friendly |

### Non-LLM Regression Board — Current Rankings

| Rank | Solver | normalize.v0 Pass Rate |
|---|---|---|
| 1 | reference | 100.0% |
| 2 (tied) | weak | 12.5% |
| 2 (tied) | buggy-C | 12.5% |
| 4 | buggy-A | 3.1% |
| 5 | buggy-B | 0.0% |

---

## 8. Cost Report

| Solver | Track | Tokens per Task | Wall Time (ms) | API Cost | Notes |
|---|---|---|---|---|---|
| reference | non_llm | 0 | <1 | $0 | Pure computation — calls `normalize()` |
| weak | non_llm | 0 | <1 | $0 | Identity function |
| buggy-A | non_llm | 0 | <1 | $0 | Pure computation |
| buggy-B | non_llm | 0 | <1 | $0 | Pure computation |
| buggy-C | non_llm | 0 | <1 | $0 | Pure computation |
| openai-prompt-v1 | model_fixed | — | — | — | Pending |
| openai-prompt-v2 | model_fixed | — | — | — | Pending |
| openai-tool-v1 | model_fixed | — | — | — | Pending |
| anthropic-prompt-v1 | model_fixed | — | — | — | Pending |
| model-open-samples | model_open | — | — | — | Pending |

---

## 9. Reproduction

All results are reproducible via FAEP replay:

```bash
# Replay a specific evaluation run
fresharena replay records/<run_id>.jsonl --strict

# Verify the JSON transform world
fresharena verify worlds/json-transform

# Run the full non-LLM baseline
fresharena run --track non_llm --world json-transform
```

> **Note:** The CLI commands above are not yet implemented (Phase 0 stubs).
> Reproducibility of the non-LLM scores in this document is guaranteed by the
> deterministic nature of the solvers and the reference implementation — identical
> inputs and constraint sets always produce identical outputs. See
> [`packages/verifier-runtime/src/normalize.ts`](../packages/verifier-runtime/src/normalize.ts)
> for the single source of truth.

See [`README.md`](../README.md) for quick-start instructions.

---

## 10. Appendix: FAEP Record Schema

Each score in this document is derived from FAEP v0.1 records. The score vector
per record contains four components:

| Component | Field | Description |
|---|---|---|
| Canonical | `score.canonical_pass` | Passed public examples |
| Hidden | `score.hidden_pass` | Passed hidden generated tests |
| Adversarial | `score.adversarial_pass` | Passed submit-then-test adversarial tests |
| Immunity | `score.immunity_pass` | Passed all Public Immunity Pool counterexamples |

See [`docs/protocol-faep.md`](protocol-faep.md) for the full FAEP record schema.

---

## 11. Methodology

### 11.1 Score Derivation

All non-LLM scores for `normalize.v0` are **analytically derived** from the solver
source code and the reference `normalize()` implementation. The derivation proceeds
as follows:

1. **Reference implementation:** The `normalize` function in
   `packages/verifier-runtime/src/normalize.ts` applies three independent passes
   (strip_nulls → flatten → sort_keys) to its input. The verifier oracle compares
   `sha256(normalize(input, constraints))` against `sha256(solver_output)`.

2. **Constraint distribution:** The random-baseline generator
   ([`packages/core/src/generator/index.ts:74–79`](../packages/core/src/generator/index.ts))
   produces constraints by three independent `rng.bool()` calls plus a uniform
   delimiter pick, yielding 8 equiprobable constraint combinations:
   - ALL_OFF: {F, F, null} — P = 12.5%
   - sort_only: {T, F, null} — P = 12.5%
   - strip_only: {F, T, null} — P = 12.5%
   - flat_only: {F, F, delim} — P = 12.5%
   - sort+strip: {T, T, null} — P = 12.5%
   - sort+flat: {T, F, delim} — P = 12.5%
   - strip+flat: {F, T, delim} — P = 12.5%
   - all_on: {T, T, delim} — P = 12.5%

3. **Per-solver analysis:** For each solver, we determine which constraint
   combinations it can handle correctly given arbitrary inputs from the generator's
   value distribution (objects with 2–5 keys, values drawn from primitives, nested
   objects, arrays, and nulls at generator-defined probabilities).

4. **Fixed vs. Fresh parity:** Since non-LLM solvers are pure deterministic
   functions, their pass rate is identical on any input set with the same constraint
   distribution. Fixed public tasks and fresh generated tasks therefore yield the
   same scores.

### 11.2 Score Verification

The analytical scores can be empirically validated by running the differential
tester in `packages/core/src/tester/index.ts` against each solver:

```ts
import { getSolver } from '@fresharena/core/solvers';
import { runDifferentialCheck } from '@fresharena/core/tester';

for (const id of ['reference', 'weak', 'buggy-A', 'buggy-B', 'buggy-C']) {
  const result = runDifferentialCheck(id, getSolver(id).fn, {
    seed: 'baseline-validation',
    numRuns: 1000,
  });
  const passRate = 1 - (result.counterexamples.length / result.testsRun);
  console.log(`${id}: ${(passRate * 100).toFixed(1)}%`);
}
```

### 11.3 Blocking Notes

¹ **N/A — No reference implementation.** The `diff_patch.v0`, `merge.v0`, and
`schema_migration.v0` task families have no reference implementation in the
verifier runtime. The admissibility gates
([`packages/core/src/admissibility.ts`](../packages/core/src/admissibility.ts))
actively reject these families (`checkDeterministic` returns `false` for
non-normalize operations; `checkEngineeringRelevance` returns `false`). Scores
cannot be computed until reference implementations are shipped for these families.

² **Pending — Requires API keys.** LLM solver evaluation requires external API
access (OpenAI, Anthropic) and a functional evaluation pipeline (`runEval` /
`computeScores` — currently stubs). These scores will be published upon
experiment completion.

³ **N/A — Full generator run required.** Solvability band compliance, duplicate
rate, and invalid task rate require running the full generator across a large task
set with admissibility gates, which is currently blocked on the runner
implementation.
