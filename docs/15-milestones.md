# Milestones

## Milestone 1 — Working Prototype

- [ ] `packages/faep-schema/` exports complete FAEP v0.1 Zod schema with TypeScript types
- [ ] `worlds/json-transform/` implements four subtasks: normalize, diff, patch, merge
- [ ] `packages/verifier-runtime/` provides deterministic sandbox for JSON transform verification
- [ ] `solvers/reference/` and `solvers/weak/` implement non-LLM baseline solvers with passing tests
- [ ] `packages/core/` implements random task generator with property-based test coverage
- [ ] `packages/cli/` exports `fresharena run`, `fresharena replay`, `fresharena verify` commands with help text
- [ ] `records/samples/sample-run.jsonl` contains example evaluation records for replay testing
- [ ] `packages/reporter/` generates minimal static HTML report from JSONL records

## Milestone 2 — Research Experiment

- [ ] `worlds/json-transform/static/` contains 50–200 fixed public tasks with known solutions
- [ ] `solvers/llm/openai/` and `solvers/llm/anthropic/` implement fixed-model LLM solvers with API key configuration
- [ ] `packages/core/` implements adversarial tester that finds counterexamples to submitted solutions
- [ ] `packages/core/` implements counterexample minimizer reducing failing cases to minimal input
- [ ] `worlds/json-transform/immunity-pool-v0.json` contains 20+ confirmed counterexamples across baseline solvers
- [ ] `packages/reporter/` generates rank comparison report (fixed vs fresh tasks) with pass rate bar chart
- [ ] `docs/experiment-report.md` documents methodology, results, and statistical analysis
- [ ] `replay/` package contains full reproduction instructions with environment specification

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
