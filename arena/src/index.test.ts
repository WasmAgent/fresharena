import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { createArenaServer, ArenaStore } from './index.js';
import type { ArenaServer } from './index.js';

/** Base URL for all test requests. */
let BASE = '';
let arena: ArenaServer;

beforeAll(() => {
  arena = createArenaServer({ port: 0, store: new ArenaStore() });
  BASE = arena.url;
});

afterEach(() => {
  arena.store.clear();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function get(path: string) {
  return fetch(`${BASE}${path}`);
}

async function post(
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body !== undefined
      ? { 'Content-Type': 'application/json' }
      : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function getJson(path: string) {
  const res = await get(path);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function postJson(
  path: string,
  body?: unknown,
) {
  const res = await post(path, body);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

// ── Health endpoint ──────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  test('returns 200 with ok status', async () => {
    const { status, body } = await getJson('/api/v1/health');

    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(typeof body.uptime_seconds).toBe('number');
  });
});

// ── Solvers endpoint ─────────────────────────────────────────────────────────

describe('GET /api/v1/solvers', () => {
  test('returns list of known solvers', async () => {
    const { status, body } = await getJson('/api/v1/solvers');

    expect(status).toBe(200);
    const solvers = body.solvers as Array<Record<string, unknown>>;
    expect(Array.isArray(solvers)).toBe(true);
    expect(solvers.length).toBeGreaterThanOrEqual(5);

    // Check known solver IDs are present
    const ids = solvers.map((s) => s.id as string);
    expect(ids).toContain('reference');
    expect(ids).toContain('weak');
    expect(ids).toContain('buggy-A');
    expect(ids).toContain('buggy-B');
    expect(ids).toContain('buggy-C');
  });
});

// ── Submission endpoint ────────────────────────────────────────────────────

describe('POST /api/v1/submissions', () => {
  test('creates a submission with valid solver_id', async () => {
    const { status, body } = await postJson('/api/v1/submissions', {
      solver_id: 'reference',
    });

    expect(status).toBe(201);
    expect(body.submission_id).toBeDefined();
    expect(body.solver_id).toBe('reference');
    expect(body.track).toBe('non_llm');
    expect(body.status).toBe('pending');
  });

  test('creates a submission with explicit track', async () => {
    const { status, body } = await postJson('/api/v1/submissions', {
      solver_id: 'reference',
      track: 'model_fixed',
    });

    expect(status).toBe(201);
    expect(body.track).toBe('model_fixed');
  });

  test('rejects missing solver_id', async () => {
    const { status, body } = await postJson('/api/v1/submissions', {});

    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  test('rejects empty solver_id', async () => {
    const { status, body } = await postJson('/api/v1/submissions', {
      solver_id: '',
    });

    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  test('rejects invalid JSON', async () => {
    const res = await fetch(`${BASE}/api/v1/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Invalid JSON body');
  });
});

// ── Get submission endpoint ─────────────────────────────────────────────────

describe('GET /api/v1/submissions/:id', () => {
  test('returns submission by id', async () => {
    const created = await postJson('/api/v1/submissions', {
      solver_id: 'reference',
    });
    const id = created.body.submission_id as string;

    const { status, body } = await getJson(
      `/api/v1/submissions/${id}`,
    );

    expect(status).toBe(200);
    expect(body.submission_id).toBe(id);
    expect(body.solver_id).toBe('reference');
  });

  test('returns 404 for unknown submission', async () => {
    const { status, body } = await getJson(
      '/api/v1/submissions/nonexistent',
    );

    expect(status).toBe(404);
    expect(body.error).toBe('Submission not found');
  });
});

// ── Evaluation endpoint ─────────────────────────────────────────────────────

describe('POST /api/v1/submissions/:id/evaluate', () => {
  test('triggers evaluation and returns 202', async () => {
    // Create submission first
    const created = await postJson('/api/v1/submissions', {
      solver_id: 'reference',
    });
    const submissionId = created.body.submission_id as string;

    // Trigger evaluation
    const { status, body } = await postJson(
      `/api/v1/submissions/${submissionId}/evaluate`,
      { task_count: 5, root_seed: 'test-seed-123' },
    );

    expect(status).toBe(202);
    expect(body.evaluation_id).toBeDefined();
    expect(body.submission_id).toBe(submissionId);
    expect(body.solver_id).toBe('reference');
    expect(body.status).toBe('pending');
    expect(body.task_count).toBe(5);
    expect(body.family).toBe('json_transform.normalize.v0');
  });

  test('returns 404 for unknown submission', async () => {
    const { status, body } = await postJson(
      '/api/v1/submissions/nonexistent/evaluate',
      { task_count: 5 },
    );

    expect(status).toBe(404);
    expect(body.error).toBe('Submission not found');
  });

  test('uses default values when body is empty', async () => {
    const created = await postJson('/api/v1/submissions', {
      solver_id: 'weak',
    });
    const submissionId = created.body.submission_id as string;

    const { status, body } = await postJson(
      `/api/v1/submissions/${submissionId}/evaluate`,
    );

    expect(status).toBe(202);
    expect(body.task_count).toBe(20);
    expect(body.family).toBe('json_transform.normalize.v0');
  });

  test('evaluation with unknown solver_id completes with error status', async () => {
    const created = await postJson('/api/v1/submissions', {
      solver_id: 'nonexistent-solver',
    });
    const submissionId = created.body.submission_id as string;

    const { status, body } = await postJson(
      `/api/v1/submissions/${submissionId}/evaluate`,
      { task_count: 1, root_seed: 'unknown-solver-test' },
    );

    expect(status).toBe(202);
    const evaluationId = body.evaluation_id as string;

    // Wait for async evaluation to finish
    await Bun.sleep(500);

    const { status: evalStatus, body: evalBody } = await getJson(
      `/api/v1/evaluations/${evaluationId}`,
    );

    expect(evalStatus).toBe(200);
    expect(evalBody.status).toBe('error');
    expect(evalBody.error).toBeDefined();
  });
});

// ── Get evaluation endpoint ────────────────────────────────────────────────

describe('GET /api/v1/evaluations/:id', () => {
  test('returns evaluation results after completion', async () => {
    // Create and evaluate
    const created = await postJson('/api/v1/submissions', {
      solver_id: 'reference',
    });
    const submissionId = created.body.submission_id as string;
    const evalResp = await postJson(
      `/api/v1/submissions/${submissionId}/evaluate`,
      { task_count: 5, root_seed: 'eval-test-seed' },
    );
    const evaluationId = evalResp.body.evaluation_id as string;

    // Wait for async evaluation to complete
    await Bun.sleep(1000);

    const { status, body } = await getJson(
      `/api/v1/evaluations/${evaluationId}`,
    );

    expect(status).toBe(200);
    expect(body.evaluation_id).toBe(evaluationId);
    expect(body.solver_id).toBe('reference');
    expect(body.status).toBe('completed');
    expect(body.total).toBeGreaterThan(0);
    // Reference solver should pass all tasks
    expect(body.passed).toBe(body.total);
  });

  test('returns 404 for unknown evaluation', async () => {
    const { status, body } = await getJson(
      '/api/v1/evaluations/nonexistent',
    );

    expect(status).toBe(404);
    expect(body.error).toBe('Evaluation not found');
  });
});

// ── Leaderboard endpoint ────────────────────────────────────────────────────

describe('GET /api/v1/leaderboard', () => {
  test('returns empty leaderboard initially', async () => {
    const { status, body } = await getJson('/api/v1/leaderboard');

    expect(status).toBe(200);
    expect(body.track).toBe('non_llm');
    expect(body.family).toBe('json_transform.normalize.v0');
    const entries = body.entries as unknown[];
    expect(Array.isArray(entries)).toBe(true);
  });

  test('returns ranked entries after evaluations complete', async () => {
    // Use a unique store for this test
    const testStore = new ArenaStore();
    const testArena = createArenaServer({
      port: 0,
      store: testStore,
    });
    const testBase = testArena.url;

    // Submit and evaluate reference solver
    const refSub = await (
      await fetch(`${testBase}/api/v1/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solver_id: 'reference' }),
      })
    ).json();
    const refEval = await (
      await fetch(
        `${testBase}/api/v1/submissions/${(refSub as Record<string, unknown>).submission_id}/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_count: 5,
            root_seed: 'leaderboard-test-ref',
          }),
        },
      )
    ).json();

    // Submit and evaluate weak solver
    const weakSub = await (
      await fetch(`${testBase}/api/v1/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solver_id: 'weak' }),
      })
    ).json();
    const weakEval = await (
      await fetch(
        `${testBase}/api/v1/submissions/${(weakSub as Record<string, unknown>).submission_id}/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_count: 5,
            root_seed: 'leaderboard-test-weak',
          }),
        },
      )
    ).json();

    // Wait for async evaluations
    await Bun.sleep(1000);

    const lbRes = await fetch(`${testBase}/api/v1/leaderboard`);
    const lbBody = (await lbRes.json()) as Record<string, unknown>;

    expect(lbRes.status).toBe(200);
    const entries = lbBody.entries as Array<Record<string, unknown>>;
    expect(entries.length).toBe(2);

    // Reference should rank higher than weak
    const refEntry = entries.find(
      (e) => e.solver_id === 'reference',
    );
    const weakEntry = entries.find(
      (e) => e.solver_id === 'weak',
    );
    expect(refEntry).toBeDefined();
    expect(weakEntry).toBeDefined();
    expect(refEntry!.rank as number).toBeLessThan(weakEntry!.rank as number);

    testArena.stop();
  });

  test('filters by track and family query params', async () => {
    const { status, body } = await getJson(
      '/api/v1/leaderboard?track=model_fixed&family=json_transform.normalize.v0',
    );

    expect(status).toBe(200);
    expect(body.track).toBe('model_fixed');
    expect(body.family).toBe('json_transform.normalize.v0');
  });
});

// ── 404 for unknown routes ───────────────────────────────────────────────────

describe('unknown routes', () => {
  test('returns 404 with error', async () => {
    const { status, body } = await getJson('/api/v1/nonexistent');

    expect(status).toBe(404);
    expect(body.error).toBe('Not Found');
  });
});

// ── ArenaStore unit tests ───────────────────────────────────────────────────

describe('ArenaStore', () => {
  test('submissions and evaluations are isolated', () => {
    const store = new ArenaStore();

    expect(store.getSubmission('nope')).toBeUndefined();
    expect(store.getEvaluation('nope')).toBeUndefined();

    // Adding and retrieving works
    store.addSubmission({
      submission_id: 'sub-1',
      solver_id: 'reference',
      track: 'non_llm',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(store.getSubmission('sub-1')?.solver_id).toBe('reference');

    store.addEvaluation({
      evaluation_id: 'eval-1',
      submission_id: 'sub-1',
      solver_id: 'reference',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'completed',
      passed: 8,
      failed: 2,
      errors: 0,
      total: 10,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:01:00Z',
    });
    expect(store.getEvaluation('eval-1')?.passed).toBe(8);
  });

  test('updateEvaluation merges partial updates', () => {
    const store = new ArenaStore();

    store.addEvaluation({
      evaluation_id: 'eval-2',
      submission_id: 'sub-2',
      solver_id: 'weak',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'pending',
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
    });

    store.updateEvaluation('eval-2', {
      status: 'completed',
      passed: 3,
      failed: 7,
      total: 10,
    });

    const eval_ = store.getEvaluation('eval-2');
    expect(eval_?.status).toBe('completed');
    expect(eval_?.passed).toBe(3);
    expect(eval_?.total).toBe(10);
    // Unchanged fields preserved
    expect(eval_?.solver_id).toBe('weak');
  });

  test('getLeaderboard aggregates completed evaluations', () => {
    const store = new ArenaStore();

    // Two evaluations for the same solver
    store.addEvaluation({
      evaluation_id: 'e1',
      submission_id: 's1',
      solver_id: 'reference',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'completed',
      passed: 10,
      failed: 0,
      errors: 0,
      total: 10,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:01:00Z',
    });
    store.addEvaluation({
      evaluation_id: 'e2',
      submission_id: 's2',
      solver_id: 'reference',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 5,
      status: 'completed',
      passed: 4,
      failed: 1,
      errors: 0,
      total: 5,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:02:00Z',
    });
    // A weak solver
    store.addEvaluation({
      evaluation_id: 'e3',
      submission_id: 's3',
      solver_id: 'weak',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'completed',
      passed: 0,
      failed: 10,
      errors: 0,
      total: 10,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:01:00Z',
    });
    // Pending evaluation should be excluded
    store.addEvaluation({
      evaluation_id: 'e4',
      submission_id: 's4',
      solver_id: 'buggy-A',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'pending',
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
    });

    const board = store.getLeaderboard('non_llm', 'json_transform.normalize.v0');

    expect(board.length).toBe(2);
    expect(board[0].solver_id).toBe('reference');
    expect(board[0].rank).toBe(1);
    expect(board[0].total_tasks).toBe(15);
    expect(board[0].passed).toBe(14);
    expect(board[0].pass_rate).toBeCloseTo(14 / 15);

    expect(board[1].solver_id).toBe('weak');
    expect(board[1].rank).toBe(2);
    expect(board[1].pass_rate).toBe(0);
  });

  test('getLeaderboard filters by track and family', () => {
    const store = new ArenaStore();

    store.addEvaluation({
      evaluation_id: 'e1',
      submission_id: 's1',
      solver_id: 'reference',
      track: 'non_llm',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'completed',
      passed: 10,
      failed: 0,
      errors: 0,
      total: 10,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:01:00Z',
    });
    store.addEvaluation({
      evaluation_id: 'e2',
      submission_id: 's2',
      solver_id: 'reference',
      track: 'model_fixed',
      family: 'json_transform.normalize.v0',
      task_count: 10,
      status: 'completed',
      passed: 8,
      failed: 2,
      errors: 0,
      total: 10,
      records: [],
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:02:00Z',
    });

    const nonLlm = store.getLeaderboard('non_llm', 'json_transform.normalize.v0');
    expect(nonLlm.length).toBe(1);
    expect(nonLlm[0].passed).toBe(10);

    const modelFixed = store.getLeaderboard('model_fixed', 'json_transform.normalize.v0');
    expect(modelFixed.length).toBe(1);
    expect(modelFixed[0].passed).toBe(8);
  });
});
