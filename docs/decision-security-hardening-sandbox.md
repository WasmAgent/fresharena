# Decision: Security Hardening — Sandbox Verifier Runtime

**Issue:** #83 — [discussion] explore: Security Hardening: Sandbox Verifier Runtime (make its acceptance criteria hold)

**Filed by:** future-exploration sweep | **Confidence:** 0.50 | **Category:** security

## Analysis

### Observation summary
The patrol sweep observed that verifier packages run arbitrary code, presenting a potential RCE attack surface if a solver submits a malicious payload or a world generator contains an exploit. The suggested fix is to migrate to an embedded sandbox like `isolated-vm` (for JavaScript runtimes) or `wasmtime` (for WASI modules).

### Assessment

**1. Is this a real gap?**

The current `@fresharena/verifier-runtime` package implements deterministic verification functions (normalize, diff, patch, merge, migrate) as pure TypeScript functions running in the same Node.js process as the evaluation pipeline. However:

- The verifier-runtime does **not** currently execute arbitrary solver code — it runs the reference implementation and compares hashes. The solver's output is data (JSON), not code.
- The RCE concern would become real if the verifier were extended to support **pluggable verifier packages** (e.g., third-party verifiers loaded dynamically), or if the task world generators could inject code into the verification phase.
- In the current architecture (Phase 0/1), verifiers are statically compiled into the monorepo and audited via code review. The attack surface is limited to supply-chain attacks on dependencies.

**Verdict:** The gap is **real but premature** for the current phase. It becomes critical when Phase 3 introduces pluggable verifier packages or third-party task worlds.

**2. If real, does the fix belong in this repo or a sibling?**

The fix belongs in **this repo** (`WasmAgent/fresharena`), specifically in `packages/verifier-runtime/`. No sibling repo currently provides sandboxing primitives that FreshArena would consume.

However, if the team decides to share sandbox infrastructure across projects, a cross-cutting sandbox library could live in `WasmAgent/agent-trust-infra` (which already hosts trust/safety specifications).

**3. Is the suggested fix correct?**

The suggested fix (isolated-vm or wasmtime) is **conceptually correct** but premature:

- **isolated-vm**: Would make sense if verifiers are written in JavaScript/TypeScript and need to be sandboxed from the host process. Adds ~2 MB to bundle size and introduces async overhead for every verifier call.
- **wasmtime**: Would make sense if verifiers are compiled to WASI modules. This would require either (a) rewriting existing TypeScript verifiers in Rust or (b) running a WASI-compiled JS runtime — both are high-effort.
- A simpler intermediate approach: **run verifiers as child processes** with resource limits (cgroups, RLIMITs) rather than embedding a sandbox library. This leverages OS-level isolation without adding a heavy dependency.

## Decision

**Status:** ⏳ Deferred — not actionable in current Phase 0/1.

**Rationale:**
1. The current verifier-runtime does not execute user-supplied code; it runs only audited, statically-linked reference implementations.
2. Sandboxing introduces operational complexity (async boundaries, serialization overhead, error propagation) that would slow down the current research prototype without measurable security benefit.
3. The milestone acceptance criteria for verifier-runtime (Milestone 1: "provides deterministic sandbox for JSON transform verification") is satisfied by the current architecture — "sandbox" here refers to deterministic isolation (pure functions, no side effects, no I/O), not OS-level process isolation.

**Recommended action for future:**
- If Phase 3 introduces pluggable verifier packages (as hinted in the roadmap), revisit sandboxing with `isolated-vm` as the primary candidate.
- Before then, add a **resource limit wrapper** (`packages/verifier-runtime/src/sandbox.ts`) that wraps verifier execution with timeout and memory limits using `worker_threads` or child processes. This provides practical safety without a heavy dependency.
- Document security assumptions in `docs/security-model.md`.

**Close condition:** Close this discussion with reference from a future PR that implements sandboxing alongside pluggable verifier support. Not actionable as a standalone change.
