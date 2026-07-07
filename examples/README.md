# FAEP Examples

Published FreshArena Evaluation Protocol (FAEP) example task specs covering the
JSON transform task family.

These files conform to the `TaskSpecSchema` defined in
`packages/faep-schema/src/index.ts`. Each example is a self-contained task
specification that can be fed to a solver for evaluation.

## Task families covered

| Family | Examples |
|---|---|
| `json_transform.normalize.v0` | `normalize-sort-keys.json`, `normalize-strip-nulls.json`, `normalize-flatten.json`, `normalize-composed.json` |
| `json_transform.diff_patch.v0` | `diff-patch-basic.json` |
| `json_transform.merge.v0` | `merge-override.json` |
| `json_transform.schema_migration.v0` | `schema-migration-rename.json` |

## Schema reference

Every file in this directory is a JSON object satisfying:

```typescript
interface TaskSpec {
  id: string;
  family: "json_transform.normalize.v0" | "json_transform.diff_patch.v0" | "json_transform.merge.v0" | "json_transform.schema_migration.v0";
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  operation_spec: { type: string; constraints: Record<string, unknown> };
  examples: Array<{ input: Record<string, unknown>; output: Record<string, unknown> }>;
  hidden_tests: { seed_hash: string; count: number };
  verifier: { package: string; version: string };
  limits: { timeout_ms: number; memory_mb: number; max_source_bytes: number };
}
```

Published examples carry a nominal `hidden_tests` entry (`count: 1`) to satisfy
the `TaskSpecSchema` constraint that `count` must be positive. The visible
`examples` array contains all demonstration test cases; the nominal hidden
test slot would be replaced with real generated hidden tests in evaluation runs.

## Verification

Example input/output pairs for `normalize.v0` are guaranteed correct against the
reference implementation in `packages/verifier-runtime/src/normalize.ts`. The other
families document their intended semantics; reference implementations are tracked
separately.
