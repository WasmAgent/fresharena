# diff_patch.v0 Examples

Examples for the `json_transform.diff_patch.v0` task family.

## Status

🔜 **PLANNED** - Reference implementation pending. See [milestone 2](../../docs/15-milestones.md).

## Overview

The `diff_patch.v0` operation generates patches such that:

```
apply(patch, source) == target
```

Given two JSON objects (source and target), the solver must produce a patch that transforms the source into the target when applied.

## Task Specification Schema

```typescript
{
  "id": "diff-patch-v0-XXXX",
  "family": "json_transform.diff_patch.v0",
  "input_schema": {
    "type": "object",
    "properties": {
      "source": { "type": "object" },
      "target": { "type": "object" }
    }
  },
  "output_schema": {
    "type": "object"  // Patch format TBD
  },
  "operation_spec": {
    "type": "diff_patch",
    "constraints": {
      // Constraints TBD - may include:
      // - patch format (JSON Merge Patch, JSON Patch, etc.)
      // - size limits
      // - semantic requirements
    }
  }
}
```

## Example Use Cases

### Case 1: Simple Object Modification

**Source**:
```json
{"name": "Alice", "age": 30}
```

**Target**:
```json
{"name": "Alice", "age": 31}
```

**Expected Patch**: (format TBD)

### Case 2: Nested Structure Changes

**Source**:
```json
{
  "config": {
    "server": {
      "host": "localhost",
      "port": 8080
    }
  }
}
```

**Target**:
```json
{
  "config": {
    "server": {
      "host": "prod.example.com",
      "port": 443
    }
  }
}
```

**Expected Patch**: (format TBD)

### Case 3: Array Operations

**Source**:
```json
{"items": ["a", "b", "c"]}
```

**Target**:
```json
{"items": ["a", "b", "c", "d"]}
```

**Expected Patch**: (format TBD)

## Design Questions

The following aspects of `diff_patch.v0` are still being designed:

1. **Patch Format**: Should we use JSON Merge Patch (RFC 7396), JSON Patch (RFC 6902), or a custom format?

2. **Array Semantics**: How should array differences be represented? Position-based? Value-based?

3. **Optimization Requirements**: Should patches be minimal? Or just correct?

4. **Determinism**: Given multiple valid patches, should the solver prefer a specific one?

## Timeline

- **Milestone 2**: Reference implementation planned
- **Milestone 3**: Published examples available

## Tracking

See the following for implementation progress:
- [Milestone 2 tasks](../../docs/15-milestones.md#milestone-2--research-experiment)
- [JSON Transform World README](../../worlds/json-transform/README.md)

## See Also

- [normalize.v0 Examples](./normalize-v0-examples.md) - Implemented examples
- [FAEP Protocol](../../docs/protocol-faep.md)
- [JSON Transform World](../../worlds/json-transform/README.md)
