# JSON Transform Task Family

## Overview

The JSON Transform World is FreshArena's first task family. It was chosen because:

- Input/output structure is fully explicit
- Large space of fresh instances can be generated
- Reference implementation exists for all subtasks
- Metamorphic properties are straightforward to express
- Relates to real engineering work (config patching, API payload migration, data sync)
- No LLM judge required — all verification is deterministic
- Runs locally with no external services

## Subtask priorities

| Subtask | Priority | Real engineering meaning | Verification method |
|---|---|---|---|
| `json_transform.normalize.v0` | P0 | API payload normalization, config cleanup | reference + idempotence |
| `json_transform.diff_patch.v0` | P0 | Config sync, data repair | `apply(diff(a,b), a) == b` |
| `json_transform.merge.v0` | P1 | DevOps config merge | declared conflict policy |
| `json_transform.schema_migration.v0` | P1 | Data structure upgrade | reference + round-trip subset |
| `json_transform.format_preserving.v0` | P2 | Compatibility maintenance | differential + invariants |

P2 (`format_preserving`) is defined but not implemented in Phase 0. It enters Phase 1 if P0/P1 proves out.

## Full task instance structure

```yaml
task:
  id: string                    # stable unique identifier
  family: json_transform.v0     # versioned family name
  input_schema: JSONSchema       # describes valid inputs
  output_schema: JSONSchema      # describes expected output shape
  operation_spec:
    type: patch | diff | merge | normalize | migrate
    constraints: object          # all semantics fully declared (see closed semantics rule)
  examples:
    - input: object
      output: object             # public examples shown to solver
  hidden_tests:
    seed_hash: string            # hash of RNG seed — not revealed until after submission
    count: integer               # number of hidden tests generated from seed
  verifier:
    package: json_transform_verifier
    version: 0.1.0
  limits:
    timeout_ms: 3000
    memory_mb: 256
    max_source_bytes: 20000
```

## Solver interface

Solvers receive the task spec and must return a function or program:

```python
def solve(input_json: dict) -> dict:
    ...
```

The Verifier runs this function against:

1. Public examples
2. Hidden generated tests (seed revealed only to Verifier)
3. Canonical property tests
4. Submit-then-test adversarial tests (generated after submission)
5. Public Immunity Pool historical counterexamples

## Closed semantics rule

All tasks must fully specify:

- Conflict resolution strategy (for merge)
- Field priority rules
- Default values
- Sort order (where applicable)
- Type conversion rules

Tasks that use "reasonable", "best-effort", "sensible", or "user intent" semantics are **not admitted to Phase 1 evaluation**. They may enter a sandbox research set.

## Why not start with GitHub issues or bug fixing?

| Alternative | Why deferred |
|---|---|
| Real GitHub issue repair | Boundary complexity too high for a deterministic Verifier |
| Natural language requirement repair | Requires LLM judgment — violates design principle 2.3 |
| Large codebase bug fixing | Setup cost high; reproducibility fragile |
| Security vulnerability judgment | False-judgment risk too high |
| "More elegant code" judgment | Inherently subjective |

All of these are valid future task families. None of them can be the Phase 1 proving ground.
