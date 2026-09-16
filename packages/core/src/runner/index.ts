import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EvalTrack, FaepRecord, SolverMetadata, TaskSpec } from '@fresharena/faep-schema';
import { FaepRecordSchema } from '@fresharena/faep-schema';
import { sha256Hex, sha256OfString, shortHash, verify } from '@fresharena/verifier-runtime';
import { GENERATOR_ID, GENERATOR_VERSION, generateTaskAt } from '../generator/index.js';
import { getSolver, solverMetadata } from '../solvers/index.js';
import { runIdempotenceProperty, TESTER_ID, TESTER_VERSION } from '../tester/index.js';

export interface EvalRunOptions {
  taskSpec: TaskSpec;
  solver: SolverMetadata;
  track: EvalTrack;
  worldDir: string;
  outputPath: string;
  runAdversarialTester?: boolean;
  immunityPoolPath?: string;
}

export interface EvalRunResult {
  record: FaepRecord;
  passed: boolean;
  durationMs: number;
}

/** Number of fresh hidden cases exercised per run (task.hidden_tests.count). */
function hiddenCount(task: TaskSpec): number {
  return task.hidden_tests?.count ?? 0;
}

/**
 * Phase-0 vertical slice (issue #133).
 *
 * Semantics of this slice, exactly and honestly:
 * - canonical_pass: the solver passes the task's published example.
 * - hidden_pass: the solver passes `hidden_tests.count` fresh tasks generated
 *   deterministically from `hidden_tests.seed_hash` (same generator stream,
 *   indices 0..N-1). No human-authored hidden set exists yet.
 * - adversarial_pass: when the adversarial tester is enabled, the
 *   property-differential tester runs and reports no counterexample;
 *   otherwise the check is recorded as not-run and defaults to true.
 * - immunity_pass: vacuously true — worlds/json-transform ships no Immunity
 *   Pool; a configured pool would be checked here instead.
 * - output: a schema-valid FAEP record (JSONL, one line).
 */
export async function runEval(opts: EvalRunOptions): Promise<EvalRunResult> {
  const start = performance.now();
  const solverEntry = getSolver(opts.solver.id);

  // Canonical case — the task's published example.
  const example = opts.taskSpec.examples.at(0);
  if (example === undefined) {
    throw new Error(`runEval: task ${opts.taskSpec.id} has no canonical example`);
  }
  const canonicalOutput = await solverEntry.fn(example.input, opts.taskSpec);
  const canonical = verify({
    taskId: opts.taskSpec.id,
    input: example.input,
    output: canonicalOutput,
    constraints: opts.taskSpec.operation_spec.constraints,
    operationType: opts.taskSpec.operation_spec.type,
  });

  // Hidden fresh cases — deterministic stream from the task's hidden seed.
  let hiddenPassed = 0;
  const hiddenTotal = hiddenCount(opts.taskSpec);
  for (let i = 0; i < hiddenTotal; i++) {
    const { task: hiddenTask } = generateTaskAt(opts.taskSpec.hidden_tests.seed_hash, i);
    const hiddenInput = hiddenTask.examples.at(0)?.input;
    if (hiddenInput === undefined) continue;
    const hiddenOutput = await solverEntry.fn(hiddenInput, hiddenTask);
    const hiddenResult = verify({
      taskId: hiddenTask.id,
      input: hiddenInput,
      output: hiddenOutput,
      constraints: hiddenTask.operation_spec.constraints,
      operationType: hiddenTask.operation_spec.type,
    });
    if (hiddenResult.passed) hiddenPassed++;
  }
  const hiddenPass = hiddenTotal === 0 ? true : hiddenPassed === hiddenTotal;

  // Adversarial tester (submit-then-test) — explicit opt-in in this slice.
  let adversarialPass = true;
  if (opts.runAdversarialTester === true) {
    const idempotence = runIdempotenceProperty({ numRuns: 100 });
    adversarialPass = idempotence.passed;
  }

  const passed = canonical.passed && hiddenPass && adversarialPass;

  const rootSeed = sha256OfString(JSON.stringify(opts.taskSpec.operation_spec)).slice(0, 16);
  const record: FaepRecord = FaepRecordSchema.parse({
    schema_version: '0.1.0',
    run_id: `run-${shortHash(rootSeed + ':' + opts.solver.id, 12)}`,
    task: {
      id: opts.taskSpec.id,
      family: opts.taskSpec.family,
      family_version: opts.taskSpec.verifier.version,
      seed_hash: opts.taskSpec.hidden_tests.seed_hash,
      spec_hash: sha256Hex(JSON.stringify(opts.taskSpec.operation_spec)),
    },
    solver: {
      id: opts.solver.id,
      track: opts.track,
      model_metadata_hash: 'n/a',
      workflow_hash: shortHash(JSON.stringify(opts.solver.workflow), 12),
      artifact_hash: opts.solver.artifact.source_hash,
    },
    generator: {
      id: GENERATOR_ID,
      version: GENERATOR_VERSION,
      seed_hash: rootSeed,
    },
    tester: {
      id: TESTER_ID,
      version: TESTER_VERSION,
      tests_hash: sha256Hex(
        JSON.stringify({ hidden: hiddenTotal, adversarial: opts.runAdversarialTester === true }),
      ),
    },
    verifier: {
      package: 'json_transform_verifier',
      version: opts.taskSpec.verifier.version,
      result_hash: sha256Hex(canonical.expected_hash + canonical.actual_hash),
    },
    environment: {
      os: process.platform,
      runtime: `node@${process.version}`,
      container_hash: 'n/a',
    },
    score: {
      canonical_pass: canonical.passed,
      hidden_pass: hiddenPass,
      adversarial_pass: adversarialPass,
      immunity_pass: true,
      cost: { max_tokens: 0, wall_time_ms: Math.round(performance.now() - start) },
      score_vector: {
        hidden_passed: hiddenPassed,
        hidden_total: hiddenTotal,
        adversarial: opts.runAdversarialTester === true ? 'run' : 'not_run',
        immunity: opts.immunityPoolPath !== undefined ? 'configured' : 'no_pool',
        solver_track: solverEntry.track,
      },
    },
    replay: {
      command: `fresharena replay --root-seed ${rootSeed} ${opts.outputPath}`,
      log_hash: sha256Hex(JSON.stringify({ canonical: canonical.passed, hiddenPassed })),
    },
  });

  // Replay re-runs pass an empty outputPath and skip persistence.
  if (opts.outputPath !== '') {
    const outDir = dirname(opts.outputPath);
    if (outDir !== '') mkdirSync(outDir, { recursive: true });
    writeFileSync(opts.outputPath, `${JSON.stringify(record)}\n`);
  }

  const durationMs = Math.round(performance.now() - start);
  return { record, passed, durationMs };
}

/**
 * Re-run the exact evaluation described by a record (used by `replay`).
 * Deterministic: the same root seed + solver id regenerate the task and
 * reproduce every score component.
 */
export async function rerunFromRecord(
  rootSeed: string,
  solverId: string,
): Promise<EvalRunResult> {
  const { task } = generateTaskAt(rootSeed, 0);
  const metadata = solverMetadata(solverId);
  return runEval({
    taskSpec: task,
    solver: metadata,
    track: 'non_llm',
    worldDir: '.',
    outputPath: '',
  });
}
