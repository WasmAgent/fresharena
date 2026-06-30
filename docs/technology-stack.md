# Technology Stack

## Language choices by module

| Module | Language | Rationale |
|---|---|---|
| CLI | TypeScript | Consistent with WasmAgent ecosystem; fast iteration |
| Verifier runtime | TypeScript (Phase 0); Rust optional (Phase 2+) | TS ships faster; Rust adds determinism guarantees and sandbox isolation at scale |
| JSON world generator | TypeScript | Same stack as CLI, no context switch |
| Property-based testing | fast-check (TypeScript) | Mature ecosystem, composable |
| Report generator | TypeScript | Same stack; static HTML output |
| Schema | JSON Schema + Zod | Cross-language compatible; Zod handles TypeScript runtime validation |
| Evidence records | JSONL | Streamable, auditable, easy to diff |

## Phase 0 recommended stack

```
TypeScript CLI
+ TypeScript generators
+ fast-check property testers
+ TypeScript verifier (reference implementation)
+ JSONL records
+ static HTML report
```

This stack has zero external services, runs offline, and is deployable in CI with a single `bun install`.

## Relationship to WasmAgent infrastructure

FreshArena is a standalone repo. It intentionally **does not depend on** the full WasmAgent infrastructure in Phase 1.

| Project | Dependency status | When to integrate |
|---|---|---|
| `wasmagent-js` | Not required — sandbox/tool-use patterns are a reference only | Phase 3 if needed |
| `open-agent-audit` | Optional — can enhance evidence record storage and audit reporting | After replay records are stable |
| `trace-pipeline` | Not required | Phase 2+ when agent trace data exists |
| `bscode` | Not required | Phase 2+ as additional coding task source |

The reason for deferring integration is scope discipline: each dependency adds a failure mode and a setup cost. Phase 0/1 should be runnable with `bun install && bun run fresharena run examples/non-llm-baseline`.
