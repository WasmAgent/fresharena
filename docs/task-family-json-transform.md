# JSON Transform Task Family

## Overview

The JSON Transform World is FreshArena's first task family. It was chosen because:

- Input/output structure is fully explicit
- Large space of fresh instances can be generated
- Reference implementation exists for all subtasks
- Metamorphic properties are straightforward to express
- Relates to real engineering work (config patching, API payload migration, data sync)
- No LLM judge required — all verification is deterministic

## Subtasks

### `json_transform.normalize.v0`

Input: a JSON object + a normalization spec (field ordering, type coercion rules, default values).  
Output: the normalized JSON object.

Verification: reference implementation + idempotence property (`normalize(normalize(x)) == normalize(x)`).

### `json_transform.diff_patch.v0`

Input: a source JSON object + a target JSON object.  
Output: a patch such that `apply(patch, source) == target`.

Verification: `apply(diff(a, b), a) == b`.

### `json_transform.merge.v0`

Input: two JSON objects + an explicit conflict resolution policy.  
Output: the merged JSON object.

Verification: declared conflict policy is fully respected. No "best-effort" merges.

### `json_transform.schema_migration.v0`

Input: a JSON object conforming to schema version N + a migration spec.  
Output: the migrated JSON object conforming to schema version N+1.

Verification: reference implementation + round-trip subset property.

## Closed semantics rule

All tasks must specify:

- Conflict resolution strategy (for merge)
- Field priority rules
- Default values
- Sort order (where applicable)
- Type conversion rules

Tasks that use "reasonable", "best-effort", or "sensible" semantics are **not admitted**.
