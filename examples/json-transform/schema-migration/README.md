# JSON Transform: Schema Migration Examples

This directory contains task examples for the `json_transform.schema_migration.v0` family.

## Operation Semantics

The schema migration operation transforms a JSON object from one schema version to another using a declarative migration specification.

## Constraint Schema

```typescript
{
  from_version: string,
  to_version: string,
  migration_spec: {
    field_mappings?: { [old_name: string]: new_name },
    type_conversions?: { [field: string]: conversion_type },
    structure_transform?: {
      move_under_metadata?: string[],
      move_under_payload?: string[],
      rename_fields?: { [old: string]: new }
    },
    default_values?: { [field: string]: any },
    required_fields?: string[]
  }
}
```

## Migration Types

### Field Rename
Simple field name mapping from old schema to new schema.

### Type Conversion
Convert field values between types (e.g., string → integer, string → boolean).

### Structure Reorganization
Move fields between nested objects and reorganize the document structure.

### Field Addition
Add new fields with default values.

### Field Removal
Drop deprecated fields (not explicitly shown in examples but supported).

## Examples

| File | Description | Migration Type |
|------|-------------|----------------|
| `example-01-field-rename.json` | Legacy to modern field names | Field rename |
| `example-02-type-conversion.json` | String values to proper types | Type conversion |
| `example-03-structure-reorganization.json` | Flat to nested structure | Structure reorganization |

## Verification Properties

- **Round-trip Subset**: Migrating back should preserve all information (when migration is reversible)
- **Schema Validation**: Output must validate against target schema
- **Determinism**: Same input always produces same output
- **Reference Implementation**: Must match the reference verifier output

## Usage

```bash
# Verify a single example
fresharena verify examples/json-transform/schema-migration/example-01-field-rename.json

# Run all schema migration examples
fresharena run examples/json-transform/schema-migration --solver reference
```
