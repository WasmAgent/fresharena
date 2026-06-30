# FreshArena Evaluation Protocol (FAEP) v0.1

## Overview

FAEP is the wire format and evaluation contract for FreshArena. Every evaluation run produces exactly one `faep_record` — a deterministic, signed, replayable JSONL artifact.

## Record structure

See [`packages/faep-schema/src/index.ts`](../packages/faep-schema/src/index.ts) for the Zod schema.

Key fields:

| Field | Description |
|---|---|
| `schema_version` | Always `"0.1.0"` for this release |
| `run_id` | Globally unique identifier for this evaluation run |
| `task.seed_hash` | Hash of the random seed used to generate hidden tests |
| `task.spec_hash` | Hash of the full task spec (ensures reproducibility) |
| `solver.workflow_hash` | Hash of prompt + tool policy (enables strategy comparison) |
| `score.canonical_pass` | Passed public examples |
| `score.hidden_pass` | Passed hidden generated tests |
| `score.adversarial_pass` | Passed submit-then-test adversarial tests |
| `score.immunity_pass` | Passed all Public Immunity Pool counterexamples |
| `replay.command` | Shell command to reproduce this exact evaluation |

## Evaluation tracks

| Track | `solver.track` value | LLM required |
|---|---|---|
| Model-Fixed | `model_fixed` | Yes, fixed |
| Model-Open | `model_open` | Yes, any |
| Non-LLM Baseline | `non_llm` | No |
| Budget-Normalized | `budget_normalized` | Yes, any |

**Main paper conclusions must use `model_fixed` only.**

## Versioning

FAEP records are immutable once written. A `schema_version` bump means records from different versions cannot be directly compared.

## Replay guarantee

Any FAEP record must be replayable with:

```bash
fresharena replay <record.jsonl> --strict
```

Target: `replay_reliability >= 99%`, `flaky_rate <= 1%`.
