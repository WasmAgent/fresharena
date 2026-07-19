/**
 * @module @fresharena/arena
 *
 * FreshArena hosted arena service — accepts solver submissions via API,
 * runs evaluations against generated tasks, and publishes a ranked leaderboard.
 *
 * ## Quick start
 *
 * ```ts
 * import { createArenaServer } from '@fresharena/arena';
 *
 * const arena = createArenaServer({ port: 3210 });
 * console.log(`Arena listening at ${arena.url}`);
 * ```
 *
 * ## API endpoints
 *
 * | Method | Path                         | Description              |
 * |--------|------------------------------|--------------------------|
 * | GET    | /api/v1/health               | Health check             |
 * | GET    | /api/v1/solvers              | List known solvers       |
 * | POST   | /api/v1/submissions          | Submit a solver          |
 * | GET    | /api/v1/submissions/:id      | Get submission status    |
 * | POST   | /api/v1/submissions/:id/evaluate | Trigger evaluation     |
 * | GET    | /api/v1/evaluations/:id      | Get evaluation results   |
 * | GET    | /api/v1/leaderboard          | Ranked solver scores     |
 *
 * ## Evaluation pipeline
 *
 * 1. Generate fresh tasks via `@fresharena/core/generator`
 * 2. Execute the submitted solver on each task
 * 3. Verify outputs via the deterministic verifier oracle
 * 4. Build per-task FAEP audit records
 * 5. Aggregate into leaderboard scores
 */

export { createArenaServer } from './server.js';
export type { ArenaServer, ArenaServerOptions } from './server.js';
export { ArenaStore } from './store.js';
export { runEvaluation } from './evaluator.js';
export type {
  EvaluateRequest,
  EvaluationResponse,
  EvaluationStatus,
  HealthResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  SolversListResponse,
  SubmissionRequest,
  SubmissionResponse,
} from './types.js';
export {
  EvaluateRequestSchema,
  SubmissionRequestSchema,
} from './types.js';
