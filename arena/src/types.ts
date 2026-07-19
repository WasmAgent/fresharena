import { z } from 'zod';
import { EvalTrackSchema } from '@fresharena/faep-schema';

// ─── Request schemas (Zod-validated at API boundary) ─────────────────────────

/** POST /api/v1/submissions request body. */
export const SubmissionRequestSchema = z.object({
  solver_id: z.string().min(1).max(100),
  track: EvalTrackSchema.optional().default('non_llm'),
});
export type SubmissionRequest = z.infer<typeof SubmissionRequestSchema>;

/** POST /api/v1/submissions/:id/evaluate request body. */
export const EvaluateRequestSchema = z.object({
  task_count: z.number().int().min(1).max(100).optional().default(20),
  root_seed: z.string().min(1).optional().default('arena-default-seed'),
  family: z
    .literal('json_transform.normalize.v0')
    .optional()
    .default('json_transform.normalize.v0'),
});
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

// ─── Response types ──────────────────────────────────────────────────────────

/** POST /api/v1/submissions response. */
export interface SubmissionResponse {
  submission_id: string;
  solver_id: string;
  track: string;
  status: 'pending';
  created_at: string;
}

/** Evaluation lifecycle status. */
export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'error';

/** GET /api/v1/evaluations/:id response. */
export interface EvaluationResponse {
  evaluation_id: string;
  submission_id: string;
  solver_id: string;
  track: string;
  family: string;
  task_count: number;
  status: EvaluationStatus;
  passed: number;
  failed: number;
  errors: number;
  total: number;
  records: ReadonlyArray<Record<string, unknown>>;
  created_at: string;
  completed_at?: string;
  error?: string;
}

/** Single entry in the leaderboard. */
export interface LeaderboardEntry {
  solver_id: string;
  track: string;
  family: string;
  total_tasks: number;
  passed: number;
  pass_rate: number;
  rank: number;
  last_evaluated_at: string;
}

/** GET /api/v1/leaderboard response. */
export interface LeaderboardResponse {
  track: string;
  family: string;
  entries: ReadonlyArray<LeaderboardEntry>;
  generated_at: string;
}

/** GET /api/v1/health response. */
export interface HealthResponse {
  status: 'ok';
  version: string;
  uptime_seconds: number;
}

/** GET /api/v1/solvers response. */
export interface SolversListResponse {
  solvers: ReadonlyArray<{
    id: string;
    track: string;
    description: string;
  }>;
}
