# JSON Transform: Normalize Examples

This directory contains task examples for the `json_transform.normalize.v0` family.

## Operation Semantics

The normalize operation applies three independent transformations to JSON objects:

### 1. sort_keys
Recursively sort object keys in ascending order by UTF-16 code unit comparison. Array element order is always preserved.

### 2. strip_nulls
Recursively remove object entries whose value is strictly `null`.

### 3. flatten
Collapse every nested plain object into single-level keys joined by a delimiter. Arrays are treated as opaque leaf values and are never flattened.

## Constraint Schema

```typescript
{
  sort_keys: boolean,
  strip_nulls: boolean,
  flatten: { delimiter: string } | null
}
```

## Examples

| File | Description | Constraints Demonstrated |
|------|-------------|--------------------------|
| `example-01-sort-keys.json` | Key sorting | `sort_keys: true` |
| `example-02-strip-nulls.json` | Null value removal | `strip_nulls: true` |
| `example-03-flatten.json` | Object flattening | `flatten: { delimiter: "." }` |
| `example-04-combined.json` | Combined operations | All three operations together |

## Verification Properties

- **Idempotence**: Applying normalize twice produces the same result as applying it once
- **Determinism**: Same input always produces same output
- **Reference Implementation**: Must match the reference verifier output

## Usage

```bash
# Verify a single example
fresharena verify examples/json-transform/normalize/example-01-sort-keys.json

# Run all normalize examples
fresharena run examples/json-transform/normalize --solver reference
```
