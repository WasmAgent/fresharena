# merge.v0 Examples

Examples for the `json_transform.merge.v0` task family.

## Status

🔜 **PLANNED** - Reference implementation pending. See [milestone 2](../../docs/15-milestones.md).

## Overview

The `merge.v0` operation merges two JSON objects according to an explicit conflict resolution policy.

Given:
- **base**: The original object
- **left**: One set of changes
- **right**: Another set of changes  
- **policy**: Conflict resolution rules

The solver must produce a merged result that follows the declared policy.

## Task Specification Schema

```typescript
{
  "id": "merge-v0-XXXX",
  "family": "json_transform.merge.v0",
  "input_schema": {
    "type": "object",
    "properties": {
      "base": { "type": "object" },
      "left": { "type": "object" },
      "right": { "type": "object" }
    }
  },
  "output_schema": {
    "type": "object"
  },
  "operation_spec": {
    "type": "merge",
    "constraints": {
      "policy": "three-way-merge" | "last-write-wins" | "error-on-conflict",
      "array_behavior": "append" | "replace" | "merge",
      "conflict_resolution": {
        "prefer": "left" | "right" | "base",
        "custom_rules": {}  // Optional custom merge logic
      }
    }
  }
}
```

## Example Use Cases

### Case 1: Three-Way Merge with No Conflicts

**Base**:
```json
{
  "name": "shared-doc",
  "section1": "original content",
  "section2": "original content"
}
```

**Left**:
```json
{
  "section1": "edited by Alice"
}
```

**Right**:
```json
{
  "section2": "edited by Bob"
}
```

**Policy**: `three-way-merge`

**Expected Output**:
```json
{
  "name": "shared-doc",
  "section1": "edited by Alice",
  "section2": "edited by Bob"
}
```

### Case 2: Conflict with Prefer-Left Policy

**Base**:
```json
{
  "port": 8080
}
```

**Left**:
```json
{
  "port": 9090
}
```

**Right**:
```json
{
  "port": 443
}
```

**Policy**: `prefer-left`

**Expected Output**:
```json
{
  "port": 9090
}
```

### Case 3: Nested Object Merge

**Base**:
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

**Left**:
```json
{
  "config": {
    "server": {
      "host": "prod.example.com"
    }
  }
}
```

**Right**:
```json
{
  "config": {
    "server": {
      "port": 443,
      "ssl": true
    }
  }
}
```

**Policy**: `three-way-merge`

**Expected Output**:
```json
{
  "config": {
    "server": {
      "host": "prod.example.com",
      "port": 443,
      "ssl": true
    }
  }
}
```

### Case 4: Array Merging

**Base**:
```json
{
  "tags": ["important", "backend"]
}
```

**Left**:
```json
{
  "tags": ["important", "backend", "frontend"]
}
```

**Right**:
```json
{
  "tags": ["important", "backend", "api"]
}
```

**Policy**: `array_behavior: append`

**Expected Output**: (depends on array merge semantics)

## Design Questions

The following aspects of `merge.v0` are still being designed:

1. **Conflict Policies**: What merge policies should be supported?
   - Three-way merge
   - Last-write-wins
   - Error-on-conflict
   - Custom rules?

2. **Array Semantics**: How should arrays be merged?
   - Append (union)?
   - Replace entirely?
   - Element-wise merge?

3. **Type Coercion**: How to handle type mismatches?
   - String vs number for the same key?
   - Object vs array?

4. **Deep vs Shallow**: Should merging be recursive or top-level only?

## Timeline

- **Milestone 2**: Reference implementation planned (P1 priority)
- **Milestone 3**: Published examples available

## Tracking

See the following for implementation progress:
- [Milestone 2 tasks](../../docs/15-milestones.md#milestone-2--research-experiment)
- [JSON Transform World README](../../worlds/json-transform/README.md)

## See Also

- [normalize.v0 Examples](./normalize-v0-examples.md) - Implemented examples
- [FAEP Protocol](../../docs/protocol-faep.md)
- [JSON Transform World](../../worlds/json-transform/README.md)
