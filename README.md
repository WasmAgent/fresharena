# FreshArena

| | |
|---|---|
| **Status** | Research |
| **Contract stability** | Evolving |
| **Recommended for** | Evaluation researchers; solver rank-comparison experiments |
| **Not recommended for** | Production compliance reporting |


FreshArena is a dynamic, verifiable, and adversarial evaluation protocol for coding agents.

Instead of testing agents on a fixed set of public problems, FreshArena generates fresh task instances from versioned task families, evaluates submissions with deterministic verifier packages, and runs submit-then-test adversarial checks after the solver commits its answer.

The first release focuses on **JSON transformation tasks** to study whether fresh generated tasks reveal overfitting that fixed benchmarks miss.

---

## Core Research Question

> Do the same solvers rank significantly differently on fixed public tasks vs. fresh generated tasks?

If yes, FreshArena demonstrates that fixed benchmarks hide real capability gaps — and that dynamic evaluation is worth pursuing.

---

## Quick Start

```bash
# Run with non-LLM baseline (no API key required)
fresharena run examples/non-llm-baseline

# Replay a recorded evaluation
fresharena replay records/samples/sample-run.jsonl

# Verify the JSON transform world
fresharena verify worlds/json-transform
```

---

## Repository Layout

```
fresharena/
  packages/
    faep-schema/        # FAEP v0.1 record schema + Zod types
    core/               # Shared evaluation engine
    cli/                # fresharena CLI
    verifier-runtime/   # Deterministic verifier sandbox
    reporter/           # HTML / JSONL report generation
  worlds/
    json-transform/     # First task world: JSON normalize, diff, patch, merge
  solvers/
    non-llm/            # Reference, weak, and buggy baseline solvers
    llm/                # LLM solver adapters (OpenAI-compatible, Anthropic, local)
  records/samples/      # Example FAEP evaluation records
  reports/static/       # Pre-generated HTML reports
  docs/                 # Protocol spec, scoring, experiment design
```

---

## Evaluation Tracks

| Track | Purpose | LLM |
|---|---|---|
| Model-Fixed | Compare agent workflow / prompt strategies | Fixed |
| Model-Open | Compare full product capability | Any |
| Non-LLM Baseline | Reproducible lower bound, no API cost | None |
| Budget-Normalized | Compare cost efficiency | Any, fixed budget |

Main paper conclusions must come from the **Model-Fixed** track.

---

## FAEP: FreshArena Evaluation Protocol

Each evaluation run produces a `faep_record` — a signed, replayable JSONL artifact containing:

- task spec + seed hash
- solver metadata + workflow hash
- generator + tester metadata
- verifier version + result hash
- score vector (canonical / hidden / adversarial / immunity pass)
- replay command + log hash

See [`docs/protocol-faep.md`](docs/protocol-faep.md) for the full schema.

---

## Relationship to WasmAgent Projects

| Project | Role in FreshArena | Required in MVP |
|---|---|---|
| `wasmagent-js` | Sandbox / tool-use runtime reference | No |
| `open-agent-audit` | Evidence record enhancement layer | Optional |
| `trace-pipeline` | Export failure traces as training data | Phase 2 |
| `bscode` | Coding task source / solver baseline | Phase 2 |

---

## License

Apache-2.0 — see [LICENSE](LICENSE).

Part of the [WasmAgent](https://github.com/WasmAgent) ecosystem.
