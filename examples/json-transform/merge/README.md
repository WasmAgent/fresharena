# JSON Transform: Merge Examples

This directory contains task examples for the `json_transform.merge.v0` family.

## Operation Semantics

The merge operation combines two JSON objects (`left` and `right`) with an optional `base` object, resolving conflicts according to a specified policy.

## Constraint Schema

```typescript
{
  conflict_policy: "last_write_wins" | "union" | "intersect" | "error",
  recursive: boolean,
  priority: ["left" | "right" | "base"],
  array_behavior: "concat" | "replace" | "union"
}
```

## Conflict Policies

### last_write_wins
When both left and right modify the same key, the value from the higher-priority source wins (default: left > right > base).

### union
Combine all unique keys from all sources. For conflicting keys, include all values (for arrays) or use priority ordering.

### intersect
Only include keys present in all sources. For conflicts, use intersection semantics.

### error
Fail the merge if any key exists in multiple sources with different values.

## Examples

| File | Description | Policy Demonstrated |
|------|-------------|---------------------|
| `example-01-last-write-wins.json` | Priority-based conflict resolution | `last_write_wins` |
| `example-02-union-merge.json` | Combine all keys | `union` with array concatenation |
| `example-03-recursive-merge.json` | Deep object merging | `last_write_wins` with `recursive: true` |

## Verification Properties

- **Determinism**: Same inputs always produce same output
- **Conflict Policy Adherence**: Must respect the declared policy
- **Type Consistency**: Output must validate against output schema
- **Recursive Correctness**: When `recursive: true`, must merge nested objects properly

## Usage

```bash
# Verify a single example
fresharena verify examples/json-transform/merge/example-01-last-write-wins.json

# Run all merge examples
fresharena run examples/json-transform/merge --solver reference
```
