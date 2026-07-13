# FreshArena — CLAUDE.md

## Project overview
Dynamic, verifiable, adversarial evaluation protocol for coding agents.
Instead of fixed benchmarks, FreshArena generates fresh task instances from versioned task
families, evaluates with deterministic verifiers, and runs submit-then-test adversarial checks.

Core research question: *Do solvers rank significantly differently on fixed vs. fresh tasks?*

## Tech stack
- TypeScript, Bun, Turbo monorepo
- Packages: `faep-schema`, `core`, `cli`, `verifier-runtime`, `reporter`
- Lint: biome (`bun run lint`)
- Tests: `bun run test` (via turbo)
- CI: `bun run lint && bun run typecheck && bun run test`

## Build and verify
```bash
bun install
bun run lint        # biome check packages/
bun run typecheck   # tsc --noEmit
bun run test        # vitest
```

## Bot instructions
- Run `bun run lint` before every commit — CI fails on lint errors
- Use `bun run lint:fix` to auto-fix biome issues
- All new code in `packages/` must pass biome lint
- Do not introduce `any` types — typecheck must pass
- Tests live alongside source (`*.test.ts` files)

## Strategic positioning

**Read `docs/paper-strategy.md` before opening new issues or designing features.**

FreshArena addresses a real and confirmed 2026 industry problem: static benchmarks are
systematically failing. The external validation is strong:
- MMLU-CF shows 3–7 point drops from decontamination alone
- OpenAI stopped reporting SWE-bench Verified (contamination concerns)
- Epoch AI actively deletes git history post-task to prevent gold-patch leakage
- Slot-substitution (replace entities/values, preserve structure) is becoming the
  consensus anti-contamination technique

**Our positioning**: not another benchmark, but a **protocol (FAEP)** that makes any
evaluation dynamic and contamination-resistant. Position as the "generalization of
SWE-bench Pro's approach" — not competing with SWE-bench Pro but making its
anti-contamination methodology portable.

**BOT_STATE.md**: if it claims completions not reflected in milestone checkboxes,
that's a trust problem for external reviewers. Issue #95 tracks reconciliation.

## Key docs — read in this order when working on an issue

| Doc | When to read |
|-----|-------------|
| `docs/roadmap.md` | Phase 0→3 plan, gate condition, shipped vs. future |
| `docs/paper-strategy.md` | Claim language, venue targets, **competitive positioning** |
| `docs/15-milestones.md` | Acceptance criteria for each milestone (what "done" means) |
| `docs/protocol-faep.md` | FAEP v0.1 record schema — canonical format for all records |
| `docs/experiment-design.md` | Research methodology, hypothesis, statistical approach |
| `docs/component-specifications.md` | Package-level specs for core, cli, verifier-runtime |
| `docs/scoring.md` | Scoring formulas and rank comparison methodology |
| `docs/task-family-json-transform.md` | JSON transform world design — subtasks, generators |
| `docs/design-principles.md` | Architectural decisions (determinism, adversarial, reproducibility) |

## Current status (2026-07-13)

### Milestone 1 — Working Prototype ✅ COMPLETE
All M1 issues (#16-24, #53-55) closed and merged.

### Milestone 2 — Research Experiment ⚠️ MOSTLY COMPLETE
- ✅ Issues #25-32, #56-57 closed
- PR #52 open (Fix #28 — counterexample minimizer) — lint failing

**PR #52 fix needed**: Run `bun run lint:fix` on the changed files, commit.

### Milestone 3 — External Release ✅ MOSTLY COMPLETE
Issues #33-40 closed. Exception:
- ❌ Issue #39 (needs-human): Three external agent projects confirm reproducibility
  → Human networking task. Leave as needs-human.

### Open issues (in-progress)
- Issue #95: reconcile BOT_STATE.md completion claims with actual milestone status
- Issue #96: black-box contamination likelihood probe as optional FAEP record annotation
- Issue #97: slot-substitution perturbation for json-transform world (PR #99 open)
- Issue #98: paper-strategy.md — positioning relative to SWE-bench Pro and MMLU-CF
- Issue #3: add precise metric formulas, MVP success thresholds, admissibility gate

## Roadmap

Bot: implement issues in order. When closed, open the next unchecked item.

### Phase 2 immediate: fix open PRs and issues
- [ ] Fix PR #52 lint failure: run `bun run lint:fix`, commit, CI will pass
- [ ] Merge PR #22 and PR #42 (already MERGEABLE, just need CI to pass on #52 first)
- [ ] #3 Close issue #3: add metric formulas to docs/scoring.md and docs/experiment-design.md
- [ ] #95 fix: reconcile BOT_STATE.md with actual milestone checkboxes
- [ ] #97 feat: slot-substitution perturbation for json-transform world (PR #99)
- [ ] #98 docs: paper-strategy.md competitive positioning vs SWE-bench Pro / MMLU-CF
- [ ] #96 feat: black-box contamination likelihood probe in FAEP record

### Phase 3 — Platform expansion (proceed if Phase 1/2 results hold)
Per `docs/roadmap.md` gate condition:
> If Phase 1 fails to demonstrate statistically significant rank difference, Phase 3 suspended.

Assuming gate passes:
- [ ] feat: `worlds/data-structure/` — new task world (array/tree/graph operations)
- [ ] feat: `worlds/state-machine/` — state machine task world
- [ ] feat: Solver SDK — `packages/solver-sdk/` with standardized adapter interface
- [ ] feat: Generator SDK — `packages/generator-sdk/` for third-party task families
- [ ] feat: `website/` production deployment with CI/CD
- [ ] feat: `packages/core/` hosted arena mode (server-side evaluation)
- [ ] feat: `open-agent-audit` integration — export FAEP records to audit trail
- [ ] feat: `trace-pipeline` export — connect evaluation traces to provenance graph

### Phase 4 — Research extensions
- [ ] feat: multi-world leaderboard (aggregate scores across task families)
- [ ] feat: automated regression detection (flag when solver rank changes significantly)
- [ ] feat: FAEP v0.2 schema with additional evidence fields (contamination likelihood annotation)
- [ ] docs: peer-review-ready technical report (extend docs/technical-report.md)

## Repository layout
```
packages/
  faep-schema/         — FAEP v0.1 record schema + Zod types
  core/                — Shared evaluation engine
  cli/                 — fresharena CLI
  verifier-runtime/    — Deterministic verifier sandbox
  reporter/            — HTML/JSONL report generation
worlds/
  json-transform/      — JSON normalize/diff/patch/merge task world
solvers/
  non-llm/             — Reference, weak, buggy baseline solvers
  llm/                 — OpenAI-compatible, Anthropic solver adapters
records/samples/       — Example FAEP evaluation records
docs/                  — Planning, milestones, protocol specs
```

## How patrol sweep drives progress
Patrol reads the checkbox list above. Unchecked items → patrol opens issues.
Issues with `claude` label → workers implement them → merged → patrol ticks checkbox.
