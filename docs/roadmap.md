# Roadmap

## Phase 0 — Two-week prototype

**Goal:** Run end-to-end locally.

**Tasks:**
- Define FAEP v0.1 schema
- Implement JSON normalize / diff / patch subtasks
- Implement reference verifier
- Implement random generator
- Implement property-based tester
- Implement non-LLM baseline solvers (reference, weak, buggy A/B/C)
- Output JSONL evaluation records
- Support `fresharena replay`

**Deliverables:**
- Working README
- CLI demo (`fresharena run`, `fresharena replay`, `fresharena verify`)
- Sample records
- Minimal static report

---

## Phase 1 — Four-week research experiment

**Goal:** Produce data sufficient for a technical report.

**Tasks:**
- Add fixed static task set (50–200 tasks)
- Add fixed-model LLM solvers (OpenAI + Anthropic)
- Add adversarial tester
- Add counterexample minimizer
- Add Public Immunity Pool v0 (20+ confirmed counterexamples)
- Generate rank comparison report (fixed vs fresh)

**Deliverables:**
- Experiment report
- Plots (pass rate bar chart, rank correlation heatmap, adversarial fragility drop)
- Counterexample gallery
- Replay package (full reproduction instructions)

---

## Phase 2 — Eight-week public technical report

**Goal:** Form an externally credible narrative.

**Tasks:**
- Complete technical report
- Publish GitHub repo (open source)
- Publish static website
- Publish FAEP examples
- Publish baseline results
- Invite a small number of agent projects to reproduce

**Deliverables:**
- Technical report (see [`docs/paper-strategy.md`](paper-strategy.md))
- Open-source repository
- Public dataset subset
- Reproducibility guide

---

## Phase 3 — Expand to platform

**Proceed only if Phase 1/2 conclusions hold.**

**Planned work:**
- Data Structure World
- State Machine World
- Solver / Generator / Tester SDK
- Hosted arena
- Model-Open product board
- `open-agent-audit` integration
- `trace-pipeline` export

---

## Gate condition

> If Phase 1 fails to demonstrate a statistically significant rank difference between fixed and fresh tasks, Phase 2 and Phase 3 are suspended pending redesign.

The MVP is falsifiable by design.
