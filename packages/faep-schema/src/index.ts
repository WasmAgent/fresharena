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

// ─── FAEP Evaluation Record ───────────────────────────────────────────────────

export const ScoreVectorSchema = z.object({
  canonical_pass: z.boolean(),
  hidden_pass: z.boolean(),
  adversarial_pass: z.boolean(),
  immunity_pass: z.boolean(),
  cost: z.record(z.unknown()),
  score_vector: z.record(z.unknown()),
});

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
  replay: z.object({
    command: z.string(),
    log_hash: z.string(),
  }),
});
export type FaepRecord = z.infer<typeof FaepRecordSchema>;
