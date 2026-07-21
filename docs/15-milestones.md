# Milestones

## Milestone 1 — Working Prototype

- [x] `packages/faep-schema/` exports complete FAEP v0.1 Zod schema with TypeScript types
- [x] `worlds/json-transform/` implements four subtasks: normalize, diff, patch, merge
- [x] `packages/verifier-runtime/` provides deterministic sandbox for JSON transform verification
- [x] `solvers/reference/` and `solvers/weak/` implement non-LLM baseline solvers with passing tests
- [ ] `packages/core/` implements random task generator with property-based test coverage
- [ ] `packages/cli/` exports `fresharena run`, `fresharena replay`, `fresharena verify` commands with help text
- [ ] `records/samples/sample-run.jsonl` contains example evaluation records for replay testing
- [x] `packages/reporter/` generates minimal static HTML report from JSONL records

> **Status updates (commits `92df3ce9`, `54e42191`, `8f4ade33`):**  
> - `worlds/json-transform/` verifier now includes complete implementations for all four subtask types (normalize, diff/patch, merge, schema_migration) with deterministic closed semantics.  
> - `packages/reporter/` now generates a full static HTML report with solver comparison tables, pass-rate bar charts, metrics cards (rank instability, adversarial fragility, generator discriminative power, solvability band), and a rank-change display.  
> - `packages/faep-schema/` exports a complete Zod schema covering `TaskSpec`, `FaepRecord`, `RunRecord`, `RunSummary`, solver metadata, counterexamples, admissibility gates, and all four constraint-family parsers (`NormalizeConstraints`, `DiffPatchConstraints`, `MergeConstraints`, `SchemaMigrationConstraints`).  
> - `solvers/reference/`, `solvers/weak/`, and `buggy-A/B/C` are implemented in `packages/core/src/solvers/` with deterministic, testable functions. The standalone solver packages in `solvers/non-llm/` and `solvers/llm/` are scaffolded with package structure.

## Milestone 2 — Research Experiment

- [ ] `worlds/json-transform/static/` contains 50–200 fixed public tasks with known solutions
- [ ] `solvers/llm/openai/` and `solvers/llm/anthropic/` implement fixed-model LLM solvers with API key configuration
- [x] `packages/core/` implements adversarial tester that finds counterexamples to submitted solutions
- [ ] `packages/core/` implements counterexample minimizer reducing failing cases to minimal input
- [ ] `worlds/json-transform/immunity-pool-v0.json` contains 20+ confirmed counterexamples across baseline solvers
- [x] `packages/reporter/` generates rank comparison report (fixed vs fresh tasks) with pass rate bar chart
- [x] `docs/experiment-report.md` documents methodology, results, and statistical analysis
- [ ] `replay/` package contains full reproduction instructions with environment specification

> **Status updates (commits `92df3ce9`, `54e42191`, `8f4ade33`):**  
> - `packages/core/src/tester/` now implements property-based (idempotence law), differential (comparison against reference), metamorphic, and boundary testers; all find and record `Counterexample` instances.  
> - `packages/reporter/src/index.ts` now generates a comprehensive rank-comparison HTML report with fixed-vs-fresh pass-rate bar charts, rank-change indicators, and overall metrics (rank instability, adversarial fragility, generator discriminative power, solvability band).  
> - `docs/experiment-report.md` now contains a complete methodology section covering experimental design (four groups: Static, Fresh, Fresh+Tester, Fresh+Tester+Immunity), task generation constraints, solver matrix, verification infrastructure, four research hypotheses with metrics, statistical analysis plan, success thresholds with status tracking, artifacts listing, limitations, and future work.

## Milestone 3 — External Release

- [ ] `docs/technical-report.md` contains complete technical report with abstract, methods, results, discussion
- [ ] GitHub repository is public with LICENSE, CONTRIBUTING.md, and issue templates
- [ ] `website/` deploys static site with project overview, quick start, and example results
- [ ] `examples/` contains published FAEP examples covering JSON transform task family
- [ ] `docs/baseline-results.md` publishes complete baseline results with all solver scores
- [ ] `README.md` includes "Reproducing These Results" section with one-command verification
- [ ] Three external agent projects confirm ability to reproduce baseline results
- [ ] `docs/future-work.md` outlines extensions to additional task families beyond JSON transforms

## Milestone 4 — Platform Expansion (Gate-conditional)

> **Gate condition:** this milestone proceeds only if Milestone 2's
> `docs/experiment-report.md` demonstrates a statistically significant rank
> difference between fixed and fresh tasks. If the gate fails, this milestone
> is suspended pending redesign. Do not open issues for this milestone until
> the gate condition is confirmed.

- [ ] `worlds/data-structure/` implements Data Structure World task family (insert/delete/query operations on trees and graphs) with verifier, random generator, and static task set of 50+ tasks
- [ ] `worlds/state-machine/` implements State Machine World task family (reachability, invariant, and trace-equivalence tasks) with verifier and static task set of 50+ tasks
- [ ] `packages/sdk/` exports public Solver, Generator, and Tester interfaces so external contributors can add new worlds without forking the core
- [ ] `docs/sdk-guide.md` documents the Solver/Generator/Tester SDK with a worked example of adding a new world
- [ ] Hosted arena: `arena/` service accepts solver submissions via API, runs evaluation, and publishes leaderboard; deployable via `docker compose up`
- [ ] `open-agent-audit` integration: evaluation records exported as AEP evidence bundles via `packages/aep-export/`
- [ ] `trace-pipeline` export: JSONL evaluation records streamed to `trace-pipeline` ingest endpoint; documented in `docs/integrations.md`
