import type {
  EvaluateRequest,
  EvaluationResponse,
  HealthResponse,
  LeaderboardResponse,
  SolversListResponse,
  SubmissionRequest,
  SubmissionResponse,
} from './types.js';
import {
  EvaluateRequestSchema,
  SubmissionRequestSchema,
} from './types.js';
import { ArenaStore } from './store.js';
import { runEvaluation } from './evaluator.js';

const API_PREFIX = '/api/v1';
const ARENA_VERSION = '0.1.0';

export interface ArenaServerOptions {
  port?: number;
  hostname?: string;
  store?: ArenaStore;
}

export interface ArenaServer {
  readonly url: string;
  readonly port: number;
  readonly store: ArenaStore;
  stop(): void;
}

/**
 * Create and start the FreshArena hosted arena HTTP service.
 *
 * Uses Bun's built-in HTTP server (zero external dependencies).
 * All routes are under `/api/v1/`.
 */
export function createArenaServer(
  options: ArenaServerOptions = {},
): ArenaServer {
  const port = options.port ?? 3210;
  const hostname = options.hostname ?? '0.0.0.0';
  const store = options.store ?? new ArenaStore();
  const startTime = Date.now();

  async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // GET /api/v1/health
    if (method === 'GET' && path === `${API_PREFIX}/health`) {
      return json<HealthResponse>({
        status: 'ok',
        version: ARENA_VERSION,
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      });
    }

    // GET /api/v1/solvers
    if (method === 'GET' && path === `${API_PREFIX}/solvers`) {
      return listKnownSolvers();
    }

    // POST /api/v1/submissions — accept a new solver submission
    if (method === 'POST' && path === `${API_PREFIX}/submissions`) {
      return handleCreateSubmission(req);
    }

    // GET /api/v1/submissions/:id — retrieve submission status
    if (
      method === 'GET' &&
      path.startsWith(`${API_PREFIX}/submissions/`)
    ) {
      const id = path.slice(`${API_PREFIX}/submissions/`.length);
      if (!id.includes('/')) {
        return handleGetSubmission(id);
      }
    }

    // POST /api/v1/submissions/:id/evaluate — trigger evaluation
    if (
      method === 'POST' &&
      path.startsWith(`${API_PREFIX}/submissions/`)
    ) {
      const suffix = path.slice(`${API_PREFIX}/submissions/`.length);
      const match = suffix.match(/^([^/]+)\/evaluate$/);
      if (match !== null) {
        return handleStartEvaluation(match[1], req);
      }
    }

    // GET /api/v1/evaluations/:id — retrieve evaluation result
    if (
      method === 'GET' &&
      path.startsWith(`${API_PREFIX}/evaluations/`)
    ) {
      const id = path.slice(`${API_PREFIX}/evaluations/`.length);
      return handleGetEvaluation(id);
    }

    // GET /api/v1/leaderboard — ranked solver scores
    if (method === 'GET' && path === `${API_PREFIX}/leaderboard`) {
      const track =
        url.searchParams.get('track') ?? 'non_llm';
      const family =
        url.searchParams.get('family') ??
        'json_transform.normalize.v0';
      return handleLeaderboard(track, family);
    }

    return json({ error: 'Not Found', path }, 404);
  }

  // ── Route handlers ──────────────────────────────────────────────────────

  async function handleCreateSubmission(
    req: Request,
  ): Promise<Response> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = SubmissionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        { error: 'Validation failed', details: parsed.error.issues },
        400,
      );
    }

    const data = parsed.data;
    const submission: SubmissionResponse = {
      submission_id: crypto.randomUUID(),
      solver_id: data.solver_id,
      track: data.track,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    store.addSubmission(submission);
    return json(submission, 201);
  }

  function handleGetSubmission(id: string): Response {
    const submission = store.getSubmission(id);
    if (submission === undefined) {
      return json({ error: 'Submission not found' }, 404);
    }
    return json(submission);
  }

  async function handleStartEvaluation(
    submissionId: string,
    req: Request,
  ): Promise<Response> {
    const submission = store.getSubmission(submissionId);
    if (submission === undefined) {
      return json({ error: 'Submission not found' }, 404);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = EvaluateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        { error: 'Validation failed', details: parsed.error.issues },
        400,
      );
    }

    const data = parsed.data;
    const evaluationId = crypto.randomUUID();

    const evaluation: EvaluationResponse = {
      evaluation_id: evaluationId,
      submission_id: submissionId,
      solver_id: submission.solver_id,
      track: submission.track,
      family: data.family,
      task_count: data.task_count,
      status: 'pending',
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
      records: [],
      created_at: new Date().toISOString(),
    };

    store.addEvaluation(evaluation);

    // Fire-and-forget: evaluation runs asynchronously
    void runEvaluation({
      evaluationId,
      submissionId,
      solverId: submission.solver_id,
      track: submission.track,
      family: data.family,
      taskCount: data.task_count,
      rootSeed: data.root_seed,
      store,
    });

    return json(evaluation, 202);
  }

  function handleGetEvaluation(id: string): Response {
    const evaluation = store.getEvaluation(id);
    if (evaluation === undefined) {
      return json({ error: 'Evaluation not found' }, 404);
    }
    return json(evaluation);
  }

  function handleLeaderboard(
    track: string,
    family: string,
  ): Response {
    const entries = store.getLeaderboard(track, family);
    return json<LeaderboardResponse>({
      track,
      family,
      entries,
      generated_at: new Date().toISOString(),
    });
  }

  async function listKnownSolvers(): Promise<Response> {
    try {
      const { listSolvers } = await import(
        '@fresharena/core/solvers'
      );
      const solvers = listSolvers();
      return json<SolversListResponse>({
        solvers: solvers.map((s: { id: string; track: string; description: string }) => ({
          id: s.id,
          track: s.track,
          description: s.description,
        })),
      });
    } catch {
      return json<SolversListResponse>({ solvers: [] });
    }
  }

  // ── Start server ────────────────────────────────────────────────────────

  const server = Bun.serve({
    port,
    hostname,
    fetch: handleRequest,
  });

  return {
    url: server.url.toString(),
    port: server.port as number,
    store,
    stop: () => server.stop(),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Powered-By': 'FreshArena',
    },
  });
}
