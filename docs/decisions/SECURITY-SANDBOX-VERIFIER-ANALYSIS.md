# Decision: Verifier Runtime Security Sandbox Analysis

**Issue**: #83 — Security Hardening: Sandbox Verifier Runtime
**Filed by**: Patrol daemon (future-exploration sweep)
**Confidence**: 0.50 (below 0.8 threshold for autonomous fix)
**Status**: FALSE POSITIVE — no code changes needed

## Analysis

### Claim

> "Verifier packages run arbitrary code, presenting a critical RCE attack surface if a solver submits a malicious payload or a world generator contains an exploit. Relying solely on OS-level process isolation is insufficient..."

### Reality

After thorough code review of the entire `packages/verifier-runtime/` package and its integration points:

1. **The verifier-runtime does NOT run arbitrary code.** It is a collection of pure deterministic TypeScript functions:
   - `normalize()` — recursively strip nulls, flatten objects, sort keys
   - `diff()` — compute JSON structural differences (ops or merge-patch format)
   - `apply()` — apply a patch to a source value
   - `merge()` — merge two JSON objects with configurable conflict policy
   - `migrate()` — schema migration with field mappings and type conversions
   - `verify()` — hash comparison oracle

2. **No dynamic code execution exists in the runtime:**
   - No `eval()`, `new Function()`, or `vm.runInNewContext()` calls
   - No `child_process` spawning or subprocess execution
   - No filesystem or network I/O
   - No dynamic module loading or third-party plugin loading
   - No arbitrary code is received from solvers — solvers submit JSON outputs, not executables

3. **The verifier is compiled library code**, not a plugin system. It is imported as a static dependency (`@fresharena/verifier-runtime`) and called synchronously.

4. **OS-level process isolation is already sufficient** for running deterministic pure functions on structured JSON data.

5. **The attacker model doesn't apply:** A solver submitting a "malicious payload" can only submit JSON values (objects, arrays, strings, numbers, booleans, null). These are transformed by pure functions with no side effects. There is no RCE vector.

### Root Cause of False Positive

The patrol daemon appears to have over-fitted on a generic "sandbox runtime" pattern without verifying whether the verifier-runtime actually executes untrusted code. The name "verifier-runtime" may suggest a code execution engine, but functionally it is a library of hash-verification functions.

### Future Consideration

If the architecture evolves to support **third-party verifier plugins** (e.g., a Verifier SDK that loads external WASM modules or JavaScript plugins), then sandboxing with `isolated-vm` or `wasmtime` would become relevant. This should be tracked as a roadmap item under Phase 3 or Phase 4, not as a current security gap.

## Decision

**CLOSE AS WON'T DO.** The finding is a false positive from the patrol daemon's over-fitting. No security sandbox migration is needed for the current architecture.

## Cross-Repo Notes

None needed — the issue is contained entirely within `WasmAgent/fresharena` and does not affect sibling repos.

---

*Filed by Claude Bot on behalf of the deliberation process per issue #83*
