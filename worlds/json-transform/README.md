# JSON Transform World

The first task world for FreshArena. Covers four closed-semantics subtasks:

| Subtask | Priority | Verification |
|---|---|---|
| `normalize` | P0 | reference + idempotence |
| `diff_patch` | P0 | `apply(diff(a,b), a) == b` |
| `merge` | P1 | declared conflict policy |
| `schema_migration` | P1 | reference + round-trip subset |

## Admissibility requirements

All generated tasks must pass the admissibility gate before entering evaluation:

- `deterministic: true` — output fully determined by input + spec
- `reference_solvable: true` — reference solver must pass all examples
- `duplicate_distance_above_threshold: true` — sufficiently distinct from existing tasks
- `no_ambiguous_policy: true` — no "best-effort" or "reasonable" semantics
- `cost_within_limit: true` — within per-task budget
- `engineering_relevance_min: true` — maps to a real config/payload/schema scenario

## Directory layout

```
json-transform/
  generator/    # Random, curriculum, and adversarial generators
  verifier/     # Deterministic verifier + reference implementation
  testers/      # Property-based, metamorphic, and differential testers
  immunity-pool/  # Confirmed counterexamples (public regression tests)
  examples/     # Sample task specs and solver inputs/outputs
```
