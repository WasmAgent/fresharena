# FreshArena Evaluation Protocol (FAEP) v0.1

## Overview

FAEP is the wire format and evaluation contract for FreshArena. Every evaluation run produces exactly one `faep_record` — a deterministic, signed, replayable JSONL artifact.

## Record structure

See [`packages/faep-schema/src/index.ts`](../packages/faep-schema/src/index.ts) for the full Zod schema.

Key fields:

| Field | Description |
|---|---|
| `schema_version` | Always `"0.1.0"` for this release |
| `run_id` | Globally unique identifier for this evaluation run |
| `task.seed_hash` | SHA-256 of the RNG seed used to generate hidden tests — not revealed to solvers before submission |
| `task.spec_hash` | SHA-256 of the full task spec — changing the spec invalidates old records |
| `solver.workflow_hash` | SHA-256 of prompt + tool policy — enables comparing different strategies on identical tasks |
| `solver.artifact_hash` | SHA-256 of solver source code submitted |
| `generator.seed_hash` | SHA-256 of generator seed — enables re-generating identical task sets |
| `verifier.result_hash` | SHA-256 of full verifier output — detects any tampering with scores |
| `environment.container_hash` | SHA-256 of the execution environment image — ensures replay uses same runtime |
| `score.canonical_pass` | Passed public examples |
| `score.hidden_pass` | Passed hidden generated tests |
| `score.adversarial_pass` | Passed submit-then-test adversarial tests |
| `score.immunity_pass` | Passed all Public Immunity Pool counterexamples |
| `replay.command` | Exact shell command to reproduce this evaluation in a clean environment |
| `replay.log_hash` | SHA-256 of full execution log |

## Example record (abbreviated)

```json
{
  "schema_version": "0.1.0",
  "run_id": "run_20240101_abc123",
  "task": {
    "id": "jt-normalize-0042",
    "family": "json_transform.normalize.v0",
    "family_version": "0.1.0",
    "seed_hash": "sha256:e3b0c44...",
    "spec_hash": "sha256:a1b2c3d..."
  },
  "solver": {
    "id": "reference-solver",
    "track": "non_llm",
    "model_metadata_hash": "n/a",
    "workflow_hash": "sha256:deadbeef...",
    "artifact_hash": "sha256:cafebabe..."
  },
  "generator": {
    "id": "random-baseline",
    "version": "0.1.0",
    "seed_hash": "sha256:11223344..."
  },
  "tester": {
    "id": "property-based-tester",
    "version": "0.1.0",
    "tests_hash": "sha256:55667788..."
  },
  "verifier": {
    "package": "json_transform_verifier",
    "version": "0.1.0",
    "result_hash": "sha256:99aabbcc..."
  },
  "environment": {
    "os": "linux",
    "runtime": "bun@1.3.14",
    "container_hash": "sha256:ddeeff00..."
  },
  "score": {
    "canonical_pass": true,
    "hidden_pass": true,
    "adversarial_pass": false,
    "immunity_pass": true,
    "cost": { "wall_time_ms": 142, "tokens": 0 },
    "score_vector": { "canonical": 1.0, "hidden": 1.0, "adversarial": 0.0, "immunity": 1.0 }
  },
  "replay": {
    "command": "fresharena replay records/run_20240101_abc123.jsonl --strict",
    "log_hash": "sha256:ffeeddcc..."
  }
}
```

## Evaluation tracks

| Track | `solver.track` value | LLM required |
|---|---|---|
| Model-Fixed | `model_fixed` | Yes, fixed model + temperature |
| Model-Open | `model_open` | Yes, any |
| Non-LLM Baseline | `non_llm` | No |
| Budget-Normalized | `budget_normalized` | Yes, any, fixed budget |

**Main paper conclusions must use `model_fixed` only. `model_open` results belong in appendices and must not be mixed into primary rankings.**

## Versioning

FAEP records are immutable once written. A `schema_version` bump means records from different versions cannot be directly compared. Version bumps follow semantic versioning:

- **PATCH** — documentation or logging only
- **MINOR** — new optional fields added (backward compatible)
- **MAJOR** — field semantics or required fields changed (breaks comparability)

## Replay guarantee

Any FAEP record must be replayable with:

```bash
fresharena replay <record.jsonl> --strict
```

`--strict` mode fails if any score field diverges from the recorded value.

Target: `replay_reliability >= 99%`, `flaky_rate <= 1%`.

Replay conditions that cause legitimate divergence (and must be documented):
- Verifier MAJOR version bump
- Container image unavailable (use `environment.container_hash` to locate it)
- Generator seed no longer produces same outputs (must not happen within a MINOR version)
