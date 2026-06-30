# Component Specifications

## Solver

In Phase 1, solvers are **evaluation subjects only** — no self-evolution required.

### Adapter standard

```yaml
solver:
  id: string
  track: model_fixed | model_open | non_llm | budget_normalized
  model:                         # omit for non_llm track
    provider: string
    name: string
    version: string
    temperature: number
  workflow:
    prompt_hash: string
    tool_policy_hash: string
    retry_policy: object
  budget:
    max_tokens: integer
    max_wall_time_sec: integer
    max_attempts: integer
  artifact:
    source_hash: string
    logs_hash: string
```

### Model-Fixed Track constraints

- Fixed model
- Fixed temperature
- Fixed token budget
- Fixed tool allowlist
- Only workflow / prompt / tool policy may differ across solvers

---

## Generator

Phase 1 generators only need to produce valid tasks — no evolutionary pressure required.

### Three generator types

| Type | Purpose |
|---|---|
| `random-baseline` | Uniform grammar + parameter sampling — establishes lower bound |
| `curriculum-baseline` | Controlled difficulty via complexity dials |
| `adversarial-baseline` | Targets historical solver failure patterns |

### Admissibility gate

Every generated task must pass all six checks before entering evaluation:

```yaml
admissibility:
  deterministic: true                        # output fully determined by input + spec
  reference_solvable: true                   # reference solver must pass all examples
  duplicate_distance_above_threshold: true   # sufficiently distinct from existing tasks
  no_ambiguous_policy: true                  # no "best-effort" or "reasonable" semantics
  cost_within_limit: true                    # within per-task compute budget
  engineering_relevance_min: true            # maps to config / payload / schema scenario
```

### Hard rules for generators

- Must not generate pure math puzzles without engineering context
- Must map to a real config, payload, schema, or migration scenario
- Must include task intent metadata
- Must pass the reference solver
- Must stay below duplicate distance threshold

### Human relevance sampling

```yaml
human_relevance_review:
  sample_rate: 0.05
  reviewers: 1-3
  scale: 1-5
  reject_if_average_below: 3
```

### Negative constraints — deprioritize or reject tasks that

- Have high pass rate but no real engineering meaning
- Have high difficulty but unclear specification
- Only test string manipulation tricks
- Only use boundary edge cases to frustrate solvers

---

## Tester

Phase 1 testers do not need to be LLM agents. Prefer classical testing techniques.

### Tester strategies

| Strategy | Description |
|---|---|
| `property-based` | Idempotence, round-trip, monotonicity via fast-check / proptest |
| `metamorphic` | Semantically equivalent inputs must yield semantically equivalent outputs |
| `differential` | Solver output vs reference implementation on generated inputs |
| `boundary` | Empty objects, null values, max-depth nesting, large arrays |
| `fuzzing` | Random mutations to find unexpected failures |

### Tester output

```yaml
counterexample:
  task_id: string
  solver_id: string
  input: object
  expected_output: object
  actual_output: object
  verifier_version: string
  minimized: true
  reproduction_command: string
  hash: string
```

Minimized counterexamples are preferred — smaller inputs are easier to diagnose and archive.

---

## Verifier

The Verifier is FreshArena's correctness foundation. It does not participate in rankings; it only enforces them.

### Package manifest

```yaml
verifier_package:
  id: json_transform_verifier
  version: 0.1.0
  reference_impl_hash: string
  property_tests_hash: string
  metamorphic_tests_hash: string
  known_good_hash: string
  known_bad_hash: string
  environment_hash: string
```

### Versioning rules

| Change | Version bump | Effect on past scores |
|---|---|---|
| Fix logs or documentation | PATCH | None |
| Add new counterexamples or properties | MINOR | Old scores preserved; new scores computed separately |
| Change semantic definition | MAJOR | Old and new leaderboards cannot be directly compared |

### Task admission checklist

A task may only enter Phase 1 evaluation if it satisfies all eight conditions:

1. Has a formal-ish specification
2. Has a reference implementation
3. Has a deterministic oracle
4. Has property tests
5. Has replayable inputs
6. Requires no human semantic interpretation
7. Does not depend on real business context
8. Does not depend on LLM judgment for correctness

### Fuzzy task policy

| Task type | Admitted | Reason |
|---|---|---|
| JSON normalize | Yes | Semantics explicit |
| JSON diff / patch | Yes | Reference-verifiable |
| Config merge with explicit policy | Yes | Policy fully declared |
| "Intelligent config merge" | No | Semantics ambiguous |
| Fix a GitHub issue | No | Boundary too complex |
| Judge if code is more elegant | No | Requires subjective arbiter |
| Security filter sufficiency | Deferred | High false-judgment risk |

Fuzzy tasks may enter a sandbox research set but must not appear in the main evaluation.

---

## Public Immunity Pool

The Immunity Pool is a curated set of confirmed counterexamples that every solver must pass. It grows over time as counterexamples are confirmed and minimized.

Entry criteria:
- Confirmed by at least one Tester
- Minimized to smallest reproducing input
- Successfully replayed in a clean environment
- Assigned a stable hash

A solver that passes canonical and hidden tests but fails an Immunity Pool entry is considered broken.
