# JSON Transform: Diff/Patch Examples

This directory contains task examples for the `json_transform.diff_patch.v0` family.

## Operation Semantics

The diff/patch operation has two modes:

### diff
Generate a JSON patch (RFC 6902) that transforms a `source` object into a `target` object.

### patch
Apply a JSON patch to a source object to produce the transformed output.

## Constraint Schema

```typescript
{
  format: "rfc6902",
  ensure_reversibility: boolean
}
```

## Patch Operations

The examples demonstrate standard JSON Patch operations:

- **add**: Add a value at a path
- **remove**: Remove a value at a path
- **replace**: Replace a value at a path
- **move**: Move a value from one path to another
- **copy**: Copy a value from one path to another
- **test**: Test that a value at a path equals a specified value

## Examples

| File | Description | Operations Demonstrated |
|------|-------------|------------------------|
| `example-01-object-replacement.json` | Simple field updates | `add`, `replace` |
| `example-02-array-operations.json` | Array modifications | `add`, `remove` on arrays |
| `example-03-nested-structures.json` | Deep object patching | Nested path operations |

## Verification Properties

- **Round-trip**: `apply(patch, source) == target` must hold
- **Reversibility**: The inverse patch should restore the original state
- **RFC 6902 Compliance**: Must follow JSON Patch specification

## Usage

```bash
# Verify a single example
fresharena verify examples/json-transform/diff-patch/example-01-object-replacement.json

# Run all diff/patch examples
fresharena run examples/json-transform/diff-patch --solver reference
```
