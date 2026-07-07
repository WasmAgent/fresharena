# JSON Transform Examples

This directory contains published examples for the JSON transform task family in FreshArena.

## Task Families

### normalize.v0 (P0 - Implemented)

Normalize JSON objects according to declarative constraints:

- **sort_keys**: Recursively sort object keys ascending by UTF-16 code unit
- **strip_nulls**: Recursively remove object entries with `null` values
- **flatten**: Collapse nested objects using a delimiter (arrays are opaque leaves)

See [normalize-v0-examples.md](./normalize-v0-examples.md) for detailed examples.

### diff_patch.v0 (P0 - Planned)

Generate patches such that `apply(patch, source) == target`.

*Reference implementation pending - see [milestone 2](../../docs/15-milestones.md).*

### merge.v0 (P1 - Planned)

Merge JSON objects with explicit conflict resolution policies.

*Reference implementation pending - see [milestone 2](../../docs/15-milestones.md).*

### schema_migration.v0 (P1 - Planned)

Migrate JSON objects between schema versions using migration specifications.

*Reference implementation pending - see [milestone 2](../../docs/15-milestones.md).*

## Example Files

- [normalize-v0-examples.md](./normalize-v0-examples.md) - Complete normalize.v0 examples
- [sample-faep-record.jsonl](./sample-faep-record.jsonl) - Example FAEP evaluation record

## Quick Start

```bash
# Run normalize.v0 examples with reference solver
fresharena run examples/json-transform/normalize-v0-examples.md

# Replay a sample FAEP record
fresharena replay examples/json-transform/sample-faep-record.jsonl

# Verify JSON transform world
fresharena verify worlds/json-transform
```

## Task Specification Format

Each task follows the FAEP schema (see `packages/faep-schema/src/index.ts`):

```typescript
{
  "id": "normalize-v0-0001",
  "family": "json_transform.normalize.v0",
  "input_schema": { "type": "object" },
  "output_schema": { "type": "object" },
  "operation_spec": {
    "type": "normalize",
    "constraints": {
      "sort_keys": true,
      "strip_nulls": true,
      "flatten": { "delimiter": "." }
    }
  },
  "examples": [
    {
      "input": { "z": 1, "a": 2 },
      "output": { "a": 2, "z": 1 }
    }
  ],
  "hidden_tests": {
    "seed_hash": "sha256:...",
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

## Reference Implementation

The reference implementation for `normalize.v0` is in `packages/verifier-runtime/src/normalize.ts`.

## Verifier

All JSON transform operations are verified by `json_transform_verifier` package version `0.1.0`.

## See Also

- [FAEP Protocol](../../docs/protocol-faep.md)
- [JSON Transform World](../../worlds/json-transform/README.md)
- [Milestones](../../docs/15-milestones.md)
