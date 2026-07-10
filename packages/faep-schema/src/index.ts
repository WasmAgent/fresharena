import { z } from 'zod';

// ─── Task ────────────────────────────────────────────────────────────────────

export const TaskFamilySchema = z.enum([
  'json_transform.normalize.v0',
  'json_transform.diff_patch.v0',
  'json_transform.merge.v0',
  'json_transform.schema_migration.v0',
]);
export type TaskFamily = z.infer<typeof TaskFamilySchema>;

export const OperationTypeSchema = z.enum(['patch', 'diff', 'merge', 'normalize', 'migrate']);
export type OperationType = z.infer<typeof OperationTypeSchema>;

export const TaskLimitsSchema = z.object({
  timeout_ms: z.number().int().positive(),
  memory_mb: z.number().int().positive(),
  max_source_bytes: z.number().int().positive(),
});

export const TaskSpecSchema = z.object({
  id: z.string(),
  family: TaskFamilySchema,
  input_schema: z.record(z.unknown()),
  output_schema: z.record(z.unknown()),
  operation_spec: z.object({
    type: OperationTypeSchema,
    constraints: z.record(z.unknown()),
  }),
  examples: z.array(
    z.object({
      input: z.record(z.unknown()),
      output: z.record(z.unknown()),
    }),
  ),
  hidden_tests: z.object({
    seed_hash: z.string(),
    count: z.number().int().positive(),
  }),
  verifier: z.object({
    package: z.string(),
    version: z.string(),
  }),
  limits: TaskLimitsSchema,
});
export type TaskSpec = z.infer<typeof TaskSpecSchema>;

// ─── normalize.v0 closed semantics constraints ─────────────────────────────────
//
// The constraints below are the *complete* declaration of the normalize.v0
// operation. Every field has a fixed, deterministic meaning; no field defers to
// interpretation. The reference implementation in
// `@fresharena/verifier-runtime` is the single source of truth for these
// semantics.

export const NormalizeConstraintsSchema = z.object({
  // Recursively sort object keys ascending by UTF-16 code unit comparison.
  // Array element order is always preserved.
  sort_keys: z.boolean(),
  // Recursively drop object entries whose value is strictly `null`.
  strip_nulls: z.boolean(),
  // Collapse every nested plain object into single-level keys joined by the
  // declared delimiter. `null` disables flattening. Arrays are treated as
  // opaque leaf values and are never flattened.
  flatten: z.object({ delimiter: z.string().min(1) }).nullable(),
});
export type NormalizeConstraints = z.infer<typeof NormalizeConstraintsSchema>;

export function parseNormalizeConstraints(constraints: unknown): NormalizeConstraints {
  return NormalizeConstraintsSchema.parse(constraints);
}

// ─── diff_patch.v0 closed semantics constraints ─────────────────────────────────
//
// The diff operation produces a structural patch between two JSON values.
// The patch operation applies a patch to a source value to produce a target value.
// The semantics guarantee: apply(diff(source, target), source) === target

export const DiffPatchConstraintsSchema = z.object({
  // Maximum depth to traverse when computing differences
  max_depth: z.number().int().nonnegative().default(10),
  // Whether to include array indices in patch operations (false = array replace only)
  array_indices: z.boolean().default(true),
  // Patch format: 'ops' for operation list, 'merge' for RFC 7396 JSON Merge Patch
  format: z.enum(['ops', 'merge']).default('ops'),
});
export type DiffPatchConstraints = z.infer<typeof DiffPatchConstraintsSchema>;

export function parseDiffPatchConstraints(constraints: unknown): DiffPatchConstraints {
  return DiffPatchConstraintsSchema.parse(constraints);
}

// ─── merge.v0 closed semantics constraints ─────────────────────────────────────
//
// Merge operation combines two JSON objects according to explicit conflict policies.
// When both inputs have the same key, the resolution strategy is determined by policy.

export const MergePolicySchema = z.enum([
  'left', // Use left value on conflict
  'right', // Use right value on conflict
  'deep', // Recursively merge nested objects
  'error', // Fail on key conflict
]);

export const MergeConstraintsSchema = z.object({
  // How to resolve key conflicts
  policy: MergePolicySchema.default('right'),
  // Whether to merge arrays (concatenate) or replace them
  merge_arrays: z.boolean().default(false),
  // Array merge deduplication when merge_arrays is true
  array_dedup: z.boolean().default(true),
});
export type MergeConstraints = z.infer<typeof MergeConstraintsSchema>;

export function parseMergeConstraints(constraints: unknown): MergeConstraints {
  return MergeConstraintsSchema.parse(constraints);
}

// ─── schema_migration.v0 closed semantics constraints ─────────────────────────
//
// Schema migration transforms JSON objects from one schema version to another.
// Uses explicit field mapping, type conversion, and default value rules.

export const FieldMappingSchema = z.object({
  // New field name (null = remove field)
  target: z.string().nullable(),
  // Default value if source field is missing
  default: z.unknown().optional(),
  // Type conversion: 'string', 'number', 'boolean', 'keep'
  type: z.enum(['string', 'number', 'boolean', 'keep']).default('keep'),
});

export const SchemaMigrationConstraintsSchema = z.object({
  // Field mappings from old schema to new schema
  // Format: { "old_field_name": { target: "new_field_name", default: ..., type: ... } }
  field_mappings: z.record(FieldMappingSchema),
  // Whether to remove unmapped fields
  drop_unmapped: z.boolean().default(true),
});
export type SchemaMigrationConstraints = z.infer<typeof SchemaMigrationConstraintsSchema>;

export function parseSchemaMigrationConstraints(constraints: unknown): SchemaMigrationConstraints {
  return SchemaMigrationConstraintsSchema.parse(constraints);
}

// ─── Solver ──────────────────────────────────────────────────────────────────

export const EvalTrackSchema = z.enum([
  'model_fixed',
  'model_open',
  'non_llm',
  'budget_normalized',
]);
export type EvalTrack = z.infer<typeof EvalTrackSchema>;

export const SolverMetadataSchema = z.object({
  id: z.string(),
  track: EvalTrackSchema,
  model: z
    .object({
      provider: z.string(),
      name: z.string(),
      version: z.string(),
      temperature: z.number(),
    })
    .optional(),
  workflow: z.object({
    prompt_hash: z.string(),
    tool_policy_hash: z.string(),
    retry_policy: z.record(z.unknown()),
  }),
  budget: z.object({
    max_tokens: z.number().int().positive(),
    max_wall_time_sec: z.number().int().positive(),
    max_attempts: z.number().int().positive(),
  }),
  artifact: z.object({
    source_hash: z.string(),
    logs_hash: z.string(),
  }),
});
export type SolverMetadata = z.infer<typeof SolverMetadataSchema>;

// ─── Counterexample ───────────────────────────────────────────────────────────

export const CounterexampleSchema = z.object({
  task_id: z.string(),
  solver_id: z.string(),
  input: z.record(z.unknown()),
  expected_output: z.record(z.unknown()),
  actual_output: z.record(z.unknown()),
  verifier_version: z.string(),
  minimized: z.boolean(),
  reproduction_command: z.string(),
  hash: z.string(),
});
export type Counterexample = z.infer<typeof CounterexampleSchema>;

// ─── Admissibility gates ──────────────────────────────────────────────────────

export const AdmissibilityGateSchema = z.object({
  gate: z.string(),
  passed: z.boolean(),
  reason: z.string(),
});
export type AdmissibilityGate = z.infer<typeof AdmissibilityGateSchema>;

export const AdmissibilityResultSchema = z.object({
  deterministic: z.boolean(),
  reference_solvable: z.boolean(),
  duplicate_distance_above_threshold: z.boolean(),
  no_ambiguous_policy: z.boolean(),
  cost_within_limit: z.boolean(),
  engineering_relevance_min: z.boolean(),
});
export type AdmissibilityResult = z.infer<typeof AdmissibilityResultSchema>;

// ─── Run audit log (JSONL records) ─────────────────────────────────────────────
//
// One record per (task, solver) invocation. Each record also carries the task
// generation snapshot (seed + admissibility + generation timing) so the run
// JSONL is the single audit log with no companion file.

export const VerdictSchema = z.enum(['pass', 'fail', 'error']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const RunRecordSchema = z.object({
  schema_version: z.literal('0.1.0'),
  kind: z.literal('solver'),
  run_id: z.string(),
  root_seed: z.string(),
  // Volatile timestamp fields — excluded from byte-identical replay comparison.
  ts: z.string(),
  track: EvalTrackSchema,
  task_family: TaskFamilySchema,
  // Task generation snapshot.
  task_id: z.string(),
  seed: z.string(),
  seed_hash: z.string(),
  spec_hash: z.string(),
  admissibility: AdmissibilityResultSchema,
  gen_duration_ms: z.number(),
  // Solver invocation snapshot.
  solver_id: z.string(),
  verdict: VerdictSchema,
  duration_ms: z.number(),
  output_hash: z.string().nullable(),
  expected_hash: z.string(),
  error: z.string().nullable(),
  // Component identifiers / versions for full reproducibility.
  generator_id: z.string(),
  generator_version: z.string(),
  tester_id: z.string(),
  tester_version: z.string(),
  verifier_package: z.string(),
  verifier_version: z.string(),
});
export type RunRecord = z.infer<typeof RunRecordSchema>;

// ─── Run summary ──────────────────────────────────────────────────────────────

export const SolverScoreSchema = z.object({
  solver_id: z.string(),
  track: EvalTrackSchema,
  fresh_pass_rate: z.number().min(0).max(1),
  fresh_passed: z.number().int().min(0),
  fresh_total: z.number().int().min(0),
  fixed_pass_rate: z.number().min(0).max(1),
  fixed_passed: z.number().int().min(0),
  fixed_total: z.number().int().min(0),
  // fresh_pass_rate - fixed_pass_rate: a positive gap means the solver does
  // worse on fresh generated tasks than on fixed public tasks.
  fresh_fixed_gap: z.number(),
  errors: z.number().int().min(0),
});
export type SolverScore = z.infer<typeof SolverScoreSchema>;

export const AdmissibilityReportSchema = z.object({
  total: z.number().int().min(0),
  passed: z.number().int().min(0),
  rejected: z.number().int().min(0),
  reasons: z.record(z.number()),
});
export type AdmissibilityReport = z.infer<typeof AdmissibilityReportSchema>;

export const RunSummarySchema = z.object({
  schema_version: z.literal('0.1.0'),
  run_id: z.string(),
  root_seed: z.string(),
  task_family: TaskFamilySchema,
  track: EvalTrackSchema,
  count: z.number().int().positive(),
  produced_at: z.string(),
  total_records: z.number().int().positive(),
  admissibility_report: AdmissibilityReportSchema,
  solvers: z.array(SolverScoreSchema),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

// ─── FAEP Evaluation Record (canonical signed record) ──────────────────────────

export const ScoreVectorSchema = z.object({
  canonical_pass: z.boolean(),
  hidden_pass: z.boolean(),
  adversarial_pass: z.boolean(),
  immunity_pass: z.boolean(),
  cost: z.record(z.unknown()),
  score_vector: z.record(z.unknown()),
});

// ─── Failure diff annotation ──────────────────────────────────────────────────
//
// When a verifier check fails, the runner computes a minimal semantic diff
// between the solver output and the verifier expectation and stores it on the
// FAEP record so a failure explains *what* changed, not just *that* it did. The
// runner redacts secrets, size-caps the payload, and hashes the result (see
// issue #60). `FailureDiffSchema` is a permissive union so it can represent every
// runner outcome without over-constraining the delta shape:
//   - object: a jsondiffpatch delta, or a "structure clash" sentinel object
//     emitted when the two values are not mutually comparable JSON;
//   - string: a literal sentinel such as "<diff_too_large>" (>4KB once
//     serialized) or "__DIFF_UNAVAILABLE__" (diff threw or timed out);
//   - null:   the run passed, or no comparable diff could be produced.
export const FailureDiffSchema = z.union([z.record(z.unknown()), z.string(), z.null()]);
export type FailureDiff = z.infer<typeof FailureDiffSchema>;

export const FaepRecordSchema = z.object({
  schema_version: z.literal('0.1.0'),
  run_id: z.string(),
  task: z.object({
    id: z.string(),
    family: z.string(),
    family_version: z.string(),
    seed_hash: z.string(),
    spec_hash: z.string(),
  }),
  solver: z.object({
    id: z.string(),
    track: EvalTrackSchema,
    model_metadata_hash: z.string(),
    workflow_hash: z.string(),
    artifact_hash: z.string(),
  }),
  generator: z.object({
    id: z.string(),
    version: z.string(),
    seed_hash: z.string(),
  }),
  tester: z.object({
    id: z.string(),
    version: z.string(),
    tests_hash: z.string(),
  }),
  verifier: z.object({
    package: z.string(),
    version: z.string(),
    result_hash: z.string(),
  }),
  environment: z.object({
    os: z.string(),
    runtime: z.string(),
    container_hash: z.string(),
  }),
  score: ScoreVectorSchema,
  // Minimal semantic diff of the failure (redacted, size-capped). Absent on a
  // passing run; on failure it is a delta object, a sentinel string, or null.
  // See `FailureDiffSchema`.
  failure_diff: FailureDiffSchema.optional(),
  // SHA-256 of the serialized, redacted `failure_diff`. Absent when no diff was
  // computed (e.g. a passing run).
  failure_diff_hash: z.string().optional(),
  replay: z.object({
    command: z.string(),
    log_hash: z.string(),
  }),
});
export type FaepRecord = z.infer<typeof FaepRecordSchema>;
