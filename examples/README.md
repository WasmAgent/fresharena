# FreshArena Examples

This directory contains published FAEP examples demonstrating the task families supported in FreshArena.

## Purpose

These examples serve three purposes:

1. **Documentation**: Show the structure and semantics of task specs for each family
2. **Testing**: Provide canonical test cases for verifier implementations  
3. **Reproducibility**: Enable external validation of FreshArena results

## Structure

```
examples/
├── json-transform/           # JSON transform task family examples
│   ├── normalize/           # Task specs for normalize.v0
│   ├── diff-patch/          # Task specs for diff_patch.v0
│   ├── merge/               # Task specs for merge.v0
│   └── schema-migration/    # Task specs for schema_migration.v0
```

## Example Format

Each example is a valid FAEP `TaskSpec` object (see `packages/faep-schema/src/index.ts`) with:

- `id`: Unique task identifier
- `family`: Task family ID (e.g., `json_transform.normalize.v0`)
- `input_schema` / `output_schema`: JSON Schema definitions
- `operation_spec`: Operation constraints and configuration
- `examples`: Array of concrete input/output pairs (public examples)
- `hidden_tests`: Reference to generated test cases (seed hash + count)
- `verifier`: Verifier package identifier
- `limits`: Resource limits for the task

## Using Examples

### To verify against the reference implementation:

```bash
fresharena verify examples/json-transform/normalize/example-01-sort-keys.json
```

### To generate fresh tasks from a family:

```bash
fresharena generate json_transform.normalize.v0 --count 10 --seed 12345
```

### To test a solver against examples:

```bash
fresharena run examples/json-transform --solver my-solver --track model_fixed
```

## Task Families

### json_transform.normalize.v0
**Priority**: P0

Normalize JSON objects according to declarative normalization specs:

- `sort_keys`: Recursively sort object keys
- `strip_nulls`: Remove null values from objects
- `flatten`: Collapse nested objects using a delimiter

**Verification**: Reference implementation + idempotence check

### json_transform.diff_patch.v0
**Priority**: P0

Generate patches between JSON objects such that `apply(patch, source) == target`.

**Verification**: Round-trip property `apply(diff(a,b), a) == b`

### json_transform.merge.v0
**Priority**: P1

Merge JSON objects with explicit conflict resolution policies.

**Verification**: Deterministic conflict policy application

### json_transform.schema_migration.v0
**Priority**: P1

Migrate JSON objects from schema version N to N+1 using migration specs.

**Verification**: Reference implementation + round-trip subset check

## Contributing

When adding new examples:

1. Ensure they are valid FAEP TaskSpec objects
2. Verify they pass the reference implementation
3. Include clear documentation of the operation being demonstrated
4. Tag with appropriate priority and difficulty level

## Versioning

Examples are versioned alongside the task family definitions. A family version bump requires:
- Reviewing all examples for compatibility
- Updating or deprecating incompatible examples
- Adding migration notes for breaking changes
