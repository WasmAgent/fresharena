# normalize.v0 Examples

Complete examples for the `json_transform.normalize.v0` task family.

## Overview

The `normalize.v0` operation applies three independent transformation passes in a fixed order:

1. **strip_nulls** - Remove object entries with `null` values (recursive)
2. **flatten** - Collapse nested objects using a delimiter (arrays are opaque leaves)
3. **sort_keys** - Sort object keys ascending by UTF-16 code unit (recursive)

Each pass can be independently enabled/disabled via constraints.

## Constraint Schema

```typescript
{
  "sort_keys": boolean,      // true = enable, false = disable
  "strip_nulls": boolean,    // true = enable, false = disable  
  "flatten": {               // null = disable, object = enable
    "delimiter": string      // One character: '.', '_', '/', etc.
  } | null
}
```

## Example 1: Sort Keys Only

**Task ID**: `normalize-v0-example-001`

**Constraints**:
```json
{
  "sort_keys": true,
  "strip_nulls": false,
  "flatten": null
}
```

**Examples**:

| Input | Output |
|---|---|
| `{"z": 1, "a": 2, "m": 3}` | `{"a": 2, "m": 3, "z": 1}` |
| `{"nested": {"z": 1, "a": 2}}` | `{"nested": {"a": 2, "z": 1}}` |
| `[{"z": 1, "a": 2}, {"z": 3, "a": 4}]` | `[{"a": 2, "z": 1}, {"a": 4, "z": 3}]` |

## Example 2: Strip Nulls Only

**Task ID**: `normalize-v0-example-002`

**Constraints**:
```json
{
  "sort_keys": false,
  "strip_nulls": true,
  "flatten": null
}
```

**Examples**:

| Input | Output |
|---|---|
| `{"a": 1, "b": null, "c": 2}` | `{"a": 1, "c": 2}` |
| `{"x": {"a": 1, "b": null}}` | `{"x": {"a": 1}}` |
| `{"arr": [1, null, 3]}` | `{"arr": [1, null, 3]}` |

*Note: `null` values in arrays are preserved - only object entries are stripped.*

## Example 3: Flatten Only

**Task ID**: `normalize-v0-example-003`

**Constraints**:
```json
{
  "sort_keys": false,
  "strip_nulls": false,
  "flatten": {
    "delimiter": "."
  }
}
```

**Examples**:

| Input | Output |
|---|---|
| `{"a": {"b": {"c": 1}}}` | `{"a.b.c": 1}` |
| `{"x": {"y": 1}, "z": 2}` | `{"x.y": 1, "z": 2}` |
| `{"arr": [{"a": 1}]}` | `{"arr": [{"a": 1}]}` |

*Note: Arrays are opaque leaves - their contents are not flattened.*

## Example 4: All Passes Enabled

**Task ID**: `normalize-v0-example-004`

**Constraints**:
```json
{
  "sort_keys": true,
  "strip_nulls": true,
  "flatten": {
    "delimiter": "_"
  }
}
```

**Examples**:

| Input | Output |
|---|---|
| `{"z": {"y": {"x": 1}}, "a": null}` | `{"z_y_x": 1}` |
| `{"b": {"a": 1}, "c": null, "a": 2}` | `{"a": 2, "b_a": 1}` |

**Transformation sequence**:
1. **strip_nulls**: `{"b": {"a": 1}, "a": 2}`
2. **flatten**: `{"b_a": 1, "a": 2}`  
3. **sort_keys**: `{"a": 2, "b_a": 1}`

## Example 5: Complex Nested Structure

**Task ID**: `normalize-v0-example-005`

**Constraints**:
```json
{
  "sort_keys": true,
  "strip_nulls": true,
  "flatten": {
    "delimiter": "."
  }
}
```

**Example**:

```json
// Input
{
  "config": {
    "server": {
      "host": "localhost",
      "port": 8080,
      "ssl": null
    },
    "database": {
      "host": "db.local",
      "port": 5432,
      "ssl": true
    }
  },
  "features": {
    "auth": true,
    "cache": null
  },
  "meta": {
    "version": "1.0.0"
  }
}

// Output
{
  "config.database.host": "db.local",
  "config.database.port": 5432,
  "config.database.ssl": true,
  "config.server.host": "localhost",
  "config.server.port": 8080,
  "features.auth": true,
  "meta.version": "1.0.0"
}
```

## Example 6: Array Handling

**Task ID**: `normalize-v0-example-006`

**Constraints**:
```json
{
  "sort_keys": true,
  "strip_nulls": true,
  "flatten": {
    "delimiter": "/"
  }
}
```

**Example**:

```json
// Input
{
  "users": [
    {"name": "Alice", "email": null},
    {"name": "Bob", "email": "bob@example.com"},
    {"name": null, "email": "charlie@example.com"}
  ],
  "settings": {
    "theme": "dark"
  }
}

// Output
{
  "settings/theme": "dark",
  "users": [
    {"name": "Alice"},
    {"name": "Bob", "email": "bob@example.com"},
    {"email": "charlie@example.com"}
  ]
}
```

*Note: Arrays are recursed into for sorting and null-stripping, but not for flattening.*

## Example 7: Empty and Minimal Values

**Task ID**: `normalize-v0-example-007`

**Constraints**:
```json
{
  "sort_keys": true,
  "strip_nulls": true,
  "flatten": null
}
```

**Examples**:

| Input | Output |
|---|---|
| `{}` | `{}` |
| `{"a": {}}` | `{"a": {}}` |
| `{"a": [], "b": {}}` | `{"a": [], "b": {}}` |
| `{"z": null, "a": null}` | `{}` |

## Example 8: Different Delimiters

**Task ID**: `normalize-v0-example-008`

**Constraints**:
```json
{
  "sort_keys": false,
  "strip_nulls": false,
  "flatten": {
    "delimiter": "/"
  }
}
```

**Examples**:

| Input | Output |
|---|---|
| `{"a": {"b": {"c": 1}}}` | `{"a/b/c": 1}` |

**Constraints** (delimiter: `_`):
```json
{
  "sort_keys": false,
  "strip_nulls": false,
  "flatten": {
    "delimiter": "_"
  }
}
```

| Input | Output |
|---|---|
| `{"a": {"b": {"c": 1}}}` | `{"a_b_c": 1}` |

## Idempotence Property

**Critical**: The normalize operation is idempotent for any valid constraint set:

```
normalize(normalize(x, c), c) === normalize(x, c)
```

This means applying normalization twice produces the same result as applying it once.

**Example**:
```json
// Input: {"z": 1, "a": 2}
// Constraints: {"sort_keys": true, "strip_nulls": false, "flatten": null}

// First pass: {"a": 2, "z": 1}
// Second pass: {"a": 2, "z": 1}  // Same result!
```

This property is verified automatically by the property-based tester in `@fresharena/core`.

## Complete Task Specification

Here's a complete task specification following the FAEP schema:

```json
{
  "id": "normalize-v0-0001",
  "family": "json_transform.normalize.v0",
  "input_schema": {
    "type": "object"
  },
  "output_schema": {
    "type": "object"
  },
  "operation_spec": {
    "type": "normalize",
    "constraints": {
      "sort_keys": true,
      "strip_nulls": true,
      "flatten": {
        "delimiter": "."
      }
    }
  },
  "examples": [
    {
      "input": {
        "config": {
          "server": {
            "host": "localhost",
            "port": 8080
          }
        },
        "features": {
          "auth": true
        }
      },
      "output": {
        "config.server.host": "localhost",
        "config.server.port": 8080,
        "features.auth": true
      }
    }
  ],
  "hidden_tests": {
    "seed_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "count": 8
  },
  "verifier": {
    "package": "json_transform_verifier",
    "version": "0.1.0"
  },
  "limits": {
    "timeout_ms": 3000,
    "memory_mb": 256,
    "max_source_bytes": 20000
  }
}
```

## Running These Examples

```bash
# Run with reference solver
fresharena run examples/json-transform/normalize-v0-examples.md

# Test specific constraint combinations
fresharena run --task-id normalize-v0-example-001

# Verify normalize semantics
fresharena verify worlds/json-transform --family normalize.v0
```

## Reference Implementation

The canonical reference implementation is in:
- `packages/verifier-runtime/src/normalize.ts`

## Testing

The normalize.v0 implementation is tested with:
- Unit tests in `packages/verifier-runtime/src/normalize.test.ts`
- Property-based tests in `@fresharena/core`
- Idempotence verification for all constraint combinations

## See Also

- [FAEP Protocol](../../docs/protocol-faep.md)
- [JSON Transform World](../../worlds/json-transform/README.md)
- [Reference Implementation](../../packages/verifier-runtime/src/normalize.ts)
