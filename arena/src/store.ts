import type {
  EvaluationResponse,
  LeaderboardEntry,
  SubmissionResponse,
} from './types.js';

/**
 * In-memory store for arena state: submissions, evaluations, and leaderboard.
 *
 * Phase 4 MVP uses an in-process Map. A production arena would swap this for
 * a persistent store (SQLite, Postgres) behind the same interface.
 */
export class ArenaStore {
  private readonly submissions = new Map<string, SubmissionResponse>();
  private readonly evaluations = new Map<string, EvaluationResponse>();

  addSubmission(submission: SubmissionResponse): void {
    this.submissions.set(submission.submission_id, submission);
  }

  getSubmission(id: string): SubmissionResponse | undefined {
    return this.submissions.get(id);
  }

  addEvaluation(evaluation: EvaluationResponse): void {
    this.evaluations.set(evaluation.evaluation_id, evaluation);
  }

  getEvaluation(id: string): EvaluationResponse | undefined {
    return this.evaluations.get(id);
  }

  updateEvaluation(
    id: string,
    update: Partial<EvaluationResponse>,
  ): void {
    const existing = this.evaluations.get(id);
    if (existing !== undefined) {
      this.evaluations.set(id, { ...existing, ...update } as EvaluationResponse);
    }
  }

  /**
   * Aggregate completed evaluations into a ranked leaderboard.
   * Sorted by pass rate descending; ties broken by total tasks descending.
   */
  getLeaderboard(track: string, family: string): LeaderboardEntry[] {
    const solverStats = new Map<
      string,
      { total: number; passed: number; lastAt: string }
    >();

    for (const evaluation of this.evaluations.values()) {
      if (evaluation.status !== 'completed') continue;
      if (evaluation.track !== track) continue;
      if (evaluation.family !== family) continue;

      const existing = solverStats.get(evaluation.solver_id) ?? {
        total: 0,
        passed: 0,
        lastAt: '',
      };
      existing.total += evaluation.total;
      existing.passed += evaluation.passed;
      if (
        evaluation.completed_at !== undefined &&
        evaluation.completed_at > existing.lastAt
      ) {
        existing.lastAt = evaluation.completed_at;
      }
      solverStats.set(evaluation.solver_id, existing);
    }

    const entries: LeaderboardEntry[] = [];
    for (const [solverId, stats] of solverStats) {
      entries.push({
        solver_id: solverId,
        track,
        family,
        total_tasks: stats.total,
        passed: stats.passed,
        pass_rate: stats.total > 0 ? stats.passed / stats.total : 0,
        rank: 0,
        last_evaluated_at: stats.lastAt,
      });
    }

    entries.sort(
      (a, b) =>
        b.pass_rate - a.pass_rate || b.total_tasks - a.total_tasks,
    );

    for (let i = 0; i < entries.length; i++) {
      entries[i] = { ...entries[i], rank: i + 1 };
    }

    return entries;
  }
}
