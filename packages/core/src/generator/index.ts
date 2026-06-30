import {
  type AdmissibilityReport,
  type AdmissibilityResult,
  type NormalizeConstraints,
  type TaskFamily,
  type TaskSpec,
} from '@fresharena/faep-schema';
import { normalize, sha256OfString, shortHash } from '@fresharena/verifier-runtime';
import { evaluateAdmissibility } from '../admissibility.js';
import { Rng } from '../rng.js';

export type GeneratorType = 'random-baseline' | 'curriculum-baseline' | 'adversarial-baseline';

export const GENERATOR_ID = 'random-baseline';
export const GENERATOR_VERSION = '0.1.0';

const KEY_POOL = [
  'id',
  'name',
  'value',
  'config',
  'items',
  'meta',
  'version',
  'enabled',
  'tags',
  'data',
  'nested',
  'ts',
  'port',
  'host',
  'rules',
] as const;

const STRING_POOL = [
  'alpha',
  'beta',
  'gamma',
  'prod',
  'staging',
  'dev',
  'us-east',
  'v1',
  'v2',
  'primary',
  'replica',
  'cached',
] as const;

const FLATTEN_DELIMITERS = ['.', '_', '/'] as const;

const VERIFIER_REF = { package: 'json_transform_verifier', version: '0.1.0' };
const DEFAULT_LIMITS = { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 20000 };

export interface GenerateOptions {
  family: TaskFamily;
  count: number;
  rootSeed: string;
  maxSourceBytes?: number;
}

export interface GenerateDeps {
  now?: () => number;
}

export interface GenerateOutput {
  tasks: TaskSpec[];
  taskSeeds: string[];
  admissibilityResults: AdmissibilityResult[];
  genDurationsMs: number[];
  report: AdmissibilityReport;
}

function randomConstraints(rng: Rng): NormalizeConstraints {
  return {
    sort_keys: rng.bool(),
    strip_nulls: rng.bool(),
    flatten: rng.bool() ? { delimiter: rng.pick([...FLATTEN_DELIMITERS]) } : null,
  };
}

function randomPrimitive(rng: Rng): unknown {
  const branch = rng.int(0, 3);
  if (branch === 0) return rng.pick([...STRING_POOL]);
  if (branch === 1) return rng.int(0, 1000);
  if (branch === 2) return rng.bool();
  return null;
}

function randomValue(rng: Rng, depth: number, maxDepth: number): unknown {
  if (depth >= maxDepth) {
    return randomPrimitive(rng);
  }
  const branch = rng.next();
  if (branch < 0.3) {
    return randomObject(rng, depth + 1, maxDepth, 1, 3);
  }
  if (branch < 0.55) {
    const length = rng.int(1, 4);
    const arr: unknown[] = [];
    for (let i = 0; i < length; i++) {
      arr.push(randomValue(rng, depth + 1, maxDepth));
    }
    return arr;
  }
  if (branch < 0.7) {
    return null;
  }
  return randomPrimitive(rng);
}

function randomObject(
  rng: Rng,
  depth: number,
  maxDepth: number,
  minKeys: number,
  maxKeys: number,
): Record<string, unknown> {
  const keyCount = rng.int(minKeys, maxKeys);
  const available = [...KEY_POOL];
  const out: Record<string, unknown> = {};
  for (let i = 0; i < keyCount && available.length > 0; i++) {
    const idx = rng.int(0, available.length - 1);
    const key = available.splice(idx, 1)[0] as string;
    out[key] = randomValue(rng, depth, maxDepth);
  }
  return out;
}

export interface GeneratedTask {
  task: TaskSpec;
  seed: string;
}

/** Generate a single candidate task at a deterministic stream index. */
export function generateTaskAt(rootSeed: string, index: number): GeneratedTask {
  const taskSeed = `${rootSeed}:task:${index}`;
  const rng = Rng.fromSeed(taskSeed);
  const constraints = randomConstraints(rng);
  const input = randomObject(rng, 1, 3, 2, 5);
  const output = normalize(input, constraints);
  const task: TaskSpec = {
    id: `normalize-v0-${index.toString().padStart(4, '0')}-${shortHash(taskSeed, 8)}`,
    family: 'json_transform.normalize.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'normalize', constraints },
    examples: [{ input, output }],
    hidden_tests: {
      seed_hash: sha256OfString(`${taskSeed}:hidden`),
      count: 8,
    },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
  return { task, seed: taskSeed };
}

/**
 * Random-baseline generator: produces `count` admissible tasks as a pure
 * function of the root seed. Per-task generation timing is read from the
 * injected clock (volatile, excluded from replay comparison).
 */
export function generateTasks(opts: GenerateOptions, deps: GenerateDeps = {}): GenerateOutput {
  if (opts.family !== 'json_transform.normalize.v0') {
    throw new Error(`generateTasks: unsupported family ${opts.family}`);
  }
  const now = deps.now ?? (() => performance.now());
  const maxSourceBytes = opts.maxSourceBytes ?? DEFAULT_LIMITS.max_source_bytes;

  const tasks: TaskSpec[] = [];
  const taskSeeds: string[] = [];
  const admissibilityResults: AdmissibilityResult[] = [];
  const genDurationsMs: number[] = [];
  const reasons: Record<string, number> = {};
  let rejected = 0;

  for (let index = 0; index < opts.count; index++) {
    // Retry on the (extremely unlikely) duplicate-signature collision by
    // salting the stream index. Random space is large, so this is effectively
    // always first-try.
    let generated: GeneratedTask | undefined;
    let admissibility: AdmissibilityResult | undefined;
    let attempts = 0;
    const start = now();
    while (attempts < 8) {
      const candidate =
        attempts === 0
          ? generateTaskAt(opts.rootSeed, index)
          : generateTaskAt(`${opts.rootSeed}:salt${attempts}`, index);
      const result = evaluateAdmissibility({
        task: candidate.task,
        existing: tasks,
        maxSourceBytes,
      });
      if (
        result.deterministic &&
        result.reference_solvable &&
        result.duplicate_distance_above_threshold &&
        result.no_ambiguous_policy &&
        result.cost_within_limit &&
        result.engineering_relevance_min
      ) {
        generated = candidate;
        admissibility = result;
        break;
      }
      attempts++;
    }
    const duration = now() - start;
    if (generated === undefined || admissibility === undefined) {
      rejected++;
      reasons.duplicate_distance_above_threshold =
        (reasons.duplicate_distance_above_threshold ?? 0) + 1;
      continue;
    }
    tasks.push(generated.task);
    taskSeeds.push(generated.seed);
    admissibilityResults.push(admissibility);
    genDurationsMs.push(duration);
  }

  const report: AdmissibilityReport = {
    total: opts.count,
    passed: tasks.length,
    rejected,
    reasons,
  };

  return { tasks, taskSeeds, admissibilityResults, genDurationsMs, report };
}
