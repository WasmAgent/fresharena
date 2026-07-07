# schema_migration.v0 Examples

Examples for the `json_transform.schema_migration.v0` task family.

## Status

🔜 **PLANNED** - Reference implementation pending. See [milestone 2](../../docs/15-milestones.md).

## Overview

The `schema_migration.v0` operation migrates JSON objects from schema version N to N+1 using a declarative migration specification.

This task family tests a solver's ability to:
- Understand schema evolution rules
- Apply transformations safely and correctly
- Handle backward/forward compatibility

## Task Specification Schema

```typescript
{
  "id": "schema-migration-v0-XXXX",
  "family": "json_transform.schema_migration.v0",
  "input_schema": {
    "type": "object",
    "properties": {
      "data": { "type": "object" },
      "from_version": { "type": "string" },
      "to_version": { "type": "string" }
    }
  },
  "output_schema": {
    "type": "object"
  },
  "operation_spec": {
    "type": "migrate",
    "constraints": {
      "migration_spec": {
        // Migration rules
      }
    }
  }
}
```

## Example Use Cases

### Case 1: Field Renaming

**Input (v1)**:
```json
{
  "userName": "alice",
  "userAge": 30
}
```

**Migration Spec** (v1 → v2):
```json
{
  "rename_fields": {
    "userName": "name",
    "userAge": "age"
  }
}
```

**Expected Output (v2)**:
```json
{
  "name": "alice",
  "age": 30
}
```

### Case 2: Field Type Conversion

**Input (v1)**:
```json
{
  "port": "8080",
  "enabled": "true"
}
```

**Migration Spec** (v1 → v2):
```json
{
  "convert_types": {
    "port": "string_to_number",
    "enabled": "string_to_boolean"
  }
}
```

**Expected Output (v2)**:
```json
{
  "port": 8080,
  "enabled": true
}
```

### Case 3: Structure Reorganization

**Input (v1)**:
```json
{
  "server_host": "localhost",
  "server_port": 8080,
  "db_host": "db.local",
  "db_port": 5432
}
```

**Migration Spec** (v1 → v2):
```json
{
  "restructure": {
    "server": {
      "host": "$.server_host",
      "port": "$.server_port"
    },
    "database": {
      "host": "$.db_host",
      "port": "$.db_port"
    }
  },
  "remove_fields": ["server_host", "server_port", "db_host", "db_port"]
}
```

**Expected Output (v2)**:
```json
{
  "server": {
    "host": "localhost",
    "port": 8080
  },
  "database": {
    "host": "db.local",
    "port": 5432
  }
}
```

### Case 4: Adding Default Values

**Input (v1)**:
```json
{
  "name": "Alice"
}
```

**Migration Spec** (v1 → v2):
```json
{
  "add_fields": {
    "role": {
      "default": "user",
      "if_missing": true
    },
    "created_at": {
      "default": "$now()",
      "if_missing": true
    }
  }
}
```

**Expected Output (v2)**:
```json
{
  "name": "Alice",
  "role": "user",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Case 5: Complex Multi-Step Migration

**Input (v1)**:
```json
{
  "config": {
    "srv": {
      "addr": "localhost:8080",
      "ssl": "false"
    }
  }
}
```

**Migration Spec** (v1 → v2):
```json
{
  "steps": [
    {
      "rename_fields": {
        "srv": "server"
      }
    },
    {
      "split_field": {
        "field": "server.addr",
        "into": ["server.host", "server.port"],
        "separator": ":"
      }
    },
    {
      "convert_types": {
        "server.port": "string_to_number"
      }
    },
    {
      "convert_types": {
        "server.ssl": "string_to_boolean"
      }
    }
  ]
}
```

**Expected Output (v2)**:
```json
{
  "config": {
    "server": {
      "host": "localhost",
      "port": 8080,
      "ssl": false
    }
  }
}
```

## Design Questions

The following aspects of `schema_migration.v0` are still being designed:

1. **Migration Spec Format**: What DSL for expressing migration rules?
   - JSON-based declarative?
   - Expression language?
   - Built-in functions?

2. **Error Handling**: What happens when migration fails?
   - Partial results?
   - Rollback?
   - Error markers?

3. **Validation**: Should output be validated against target schema?
   - Strict vs lenient?
   - What if validation fails?

4. **Round-Tripping**: Can we migrate back (v2 → v1)?
   - Reversible migrations?
   - Lossy transformations?

5. **Complexity Limits**: How complex can migration specs be?
   - Max steps?
   - Conditional logic?
   - Loops/recursion?

## Migration Operation Categories

### Simple Operations
- Rename fields
- Remove fields
- Add fields with defaults
- Change field types

### Structural Operations  
- Flatten/nest objects
- Split/combine fields
- Array transformations
- Conditional moves

### Advanced Operations
- Value transformations (parsing, formatting)
- Conditional logic
- Multi-step migrations
- Cross-field references

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
