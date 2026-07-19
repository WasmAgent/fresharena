import type { TaskSpec } from '@fresharena/faep-schema';
import {
  verify,
  sha256OfString,
} from '@fresharena/verifier-runtime';
import type { EvaluationResponse } from './types.js';
import { ArenaStore } from './store.js';

/**
 * Run a single evaluation end-to-end:
 *
 * 1. Generate fresh tasks via `@fresharena/core/generator`
 * 2. Execute the solver on each task's example input
 * 3. Verify outputs via the deterministic verifier
 * 4. Build per-task audit records
 * 5. Persist results to the store
 *
 * Returns the completed `EvaluationResponse`.
 */
export async function runEvaluation(params: {
  evaluationId: string;
  submissionId: string;
  solverId: string;
  track: string;
  family: string;
  taskCount: number;
  rootSeed: string;
  store: ArenaStore;
}): Promise<EvaluationResponse> {
  const {
    evaluationId,
    submissionId,
    solverId,
    track,
    family,
    taskCount,
    rootSeed,
    store,
  } = params;

  const records: Array<Record<string, unknown>> = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;

  // Mark evaluation as running
  store.updateEvaluation(evaluationId, { status: 'running' });

  try {
    // Import generator (lazy to avoid circular deps at module level)
    const { generateTasks } = await import(
      '@fresharena/core/generator'
    );

    const generateOutput = generateTasks({
      family: family as TaskSpec['family'],
      count: taskCount,
      rootSeed,
    });

    // Import built-in solver registry
    const { getSolver } = await import(
      '@fresharena/core/solvers'
    );
    const solverEntry = getSolver(solverId);

    for (let i = 0; i < generateOutput.tasks.length; i++) {
      const task = generateOutput.tasks[i];
      const taskSeed = generateOutput.taskSeeds[i];
      const admissibility = generateOutput.admissibilityResults[i];

      try {
        const input = task.examples[0]?.input ?? {};
        const start = performance.now();

        // Run the solver
        const actualOutput = await solverEntry.fn(input, task);
        const durationMs = performance.now() - start;

        // Verify against the deterministic reference
        const result = verify({
          taskId: task.id,
          input,
          output: actualOutput,
          constraints: task.operation_spec.constraints,
        });

        if (result.passed) {
          passed++;
        } else {
          failed++;
        }

        records.push({
          schema_version: '0.1.0',
          task_id: task.id,
          task_family: task.family,
          seed_hash: sha256OfString(taskSeed),
          solver_id: solverId,
          track,
          verdict: result.passed ? 'pass' : 'fail',
          duration_ms: Math.round(durationMs),
          output_hash: result.actual_hash,
          expected_hash: result.expected_hash,
          error: null,
          admissibility,
          gen_duration_ms: generateOutput.genDurationsMs[i] ?? 0,
          generator_id: 'random-baseline',
          generator_version: '0.1.0',
          verifier_package: task.verifier.package,
          verifier_version: task.verifier.version,
        });
      } catch (err) {
        errors++;
        records.push({
          schema_version: '0.1.0',
          task_id: task.id,
          task_family: task.family,
          solver_id: solverId,
          track,
          verdict: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const now = new Date().toISOString();
    const total = generateOutput.tasks.length;

    const evaluation: EvaluationResponse = {
      evaluation_id: evaluationId,
      submission_id: submissionId,
      solver_id: solverId,
      track,
      family,
      task_count: taskCount,
      status: 'completed',
      passed,
      failed,
      errors,
      total,
      records,
      created_at: now,
      completed_at: now,
    };

    store.updateEvaluation(evaluationId, evaluation);
    return evaluation;
  } catch (err) {
    const now = new Date().toISOString();
    const errorMsg = err instanceof Error ? err.message : String(err);

    const evaluation: EvaluationResponse = {
      evaluation_id: evaluationId,
      submission_id: submissionId,
      solver_id: solverId,
      track,
      family,
      task_count: taskCount,
      status: 'error',
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
      records: [],
      created_at: now,
      completed_at: now,
      error: errorMsg,
    };

    store.updateEvaluation(evaluationId, evaluation);
    return evaluation;
  }
}
