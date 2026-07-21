/**
 * Curriculum-baseline generator for json_transform world.
 *
 * Generates tasks at controlled difficulty levels via complexity dials.
 * Supports gradual progression from simple to complex scenarios.
 */

import type {
  DiffPatchConstraints,
  MergeConstraints,
  NormalizeConstraints,
  TaskFamily,
  TaskSpec,
} from '@fresharena/faep-schema';
import {
  apply,
  diff,
  merge,
  normalize,
  sha256OfString,
  shortHash,
} from '@fresharena/verifier-runtime';
import { Rng } from '../../shared/rng.js';

const VERIFIER_REF = { package: 'json_transform_verifier', version: '0.1.0' };
const DEFAULT_LIMITS = { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 20000 };

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
  'timestamp',
  'count',
  'status',
] as const;

const STRING_POOL = [
  'alpha',
  'beta',
  'gamma',
  'prod',
  'staging',
  'dev',
  'v1',
  'v2',
  'active',
  'inactive',
] as const;

// Difficulty levels for curriculum generation
type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

interface CurriculumConfig {
  level: DifficultyLevel;
  maxDepth: number;
  maxKeys: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

function getCurriculumConfig(level: DifficultyLevel): CurriculumConfig {
  switch (level) {
    case 1:
      return { level, maxDepth: 1, maxKeys: 2, complexity: 'simple' };
    case 2:
      return { level, maxDepth: 2, maxKeys: 3, complexity: 'simple' };
    case 3:
      return { level, maxDepth: 2, maxKeys: 4, complexity: 'moderate' };
    case 4:
      return { level, maxDepth: 3, maxKeys: 5, complexity: 'moderate' };
    case 5:
      return { level, maxDepth: 3, maxKeys: 6, complexity: 'complex' };
  }
}

function randomPrimitive(rng: Rng, config: CurriculumConfig): unknown {
  if (config.complexity === 'simple') {
    return rng.bool() ? rng.int(0, 100) : rng.pick(STRING_POOL);
  }
  const branch = rng.int(0, 3);
  if (branch === 0) return rng.pick(STRING_POOL);
  if (branch === 1) return rng.int(0, 1000);
  if (branch === 2) return rng.bool();
  return null;
}

function randomValue(rng: Rng, depth: number, config: CurriculumConfig): unknown {
  if (depth >= config.maxDepth) {
    return randomPrimitive(rng, config);
  }
  const branch = rng.next();
  if (branch < 0.35 + config.level * 0.05) {
    return randomObject(rng, depth + 1, config);
  }
  if (branch < 0.6 + config.level * 0.05) {
    const length = rng.int(1, config.maxKeys);
    const arr: unknown[] = [];
    for (let i = 0; i < length; i++) {
      arr.push(randomValue(rng, depth + 1, config));
    }
    return arr;
  }
  if (branch < 0.75 && config.complexity !== 'simple') {
    return null;
  }
  return randomPrimitive(rng, config);
}

function randomObject(
  rng: Rng,
  depth: number,
  config: CurriculumConfig,
): Record<string, unknown> {
  const keyCount = rng.int(1, config.maxKeys);
  const available = [...KEY_POOL];
  const out: Record<string, unknown> = {};
  for (let i = 0; i < keyCount && available.length > 0; i++) {
    const idx = rng.int(0, available.length - 1);
    const key = available.splice(idx, 1)[0] as string;
    out[key] = randomValue(rng, depth, config);
  }
  return out;
}

// Constraint generators with curriculum-aware complexity
function normalizeConstraintsForLevel(rng: Rng, level: DifficultyLevel): NormalizeConstraints {
  const config = getCurriculumConfig(level);
  return {
    sort_keys: config.complexity !== 'simple' ? rng.bool() : level >= 3,
    strip_nulls: config.complexity !== 'simple' ? rng.bool() : level >= 2,
    flatten:
      config.complexity === 'complex' && rng.bool()
        ? { delimiter: rng.pick(['.', '_', '/']) }
        : null,
  };
}

function diffPatchConstraintsForLevel(rng: Rng, level: DifficultyLevel): DiffPatchConstraints {
  const config = getCurriculumConfig(level);
  return {
    max_depth: config.maxDepth,
    array_indices: config.complexity !== 'simple' ? rng.bool() : level >= 3,
    format: rng.bool() ? 'ops' : 'merge',
  };
}

function mergeConstraintsForLevel(rng: Rng, level: DifficultyLevel): MergeConstraints {
  const config = getCurriculumConfig(level);
  return {
    policy: rng.pick(['left', 'right', 'deep', 'error']),
    merge_arrays: config.complexity !== 'simple' && rng.bool(),
    array_dedup: config.complexity === 'complex' && rng.bool(),
  };
}

// Task generators with curriculum-based complexity
function generateNormalizeTask(
  seed: string,
  index: number,
  level: DifficultyLevel,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const config = getCurriculumConfig(level);
  const constraints = normalizeConstraintsForLevel(rng, level);
  const input = randomObject(rng, 1, config);
  const output = normalize(input, constraints);

  return {
    id: `normalize-curriculum-l${level}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.normalize.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'normalize', constraints },
    examples: [{ input: input as Record<string, unknown>, output: output as Record<string, unknown> }],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 6 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateDiffTask(
  seed: string,
  index: number,
  level: DifficultyLevel,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const config = getCurriculumConfig(level);
  const constraints = diffPatchConstraintsForLevel(rng, level);
  const source = randomObject(rng, 1, config);
  const target = randomObject(rng, 1, config);
  const output = diff(source, target, constraints);

  return {
    id: `diff-curriculum-l${level}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.diff_patch.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'diff', constraints },
    examples: [
      {
        input: { source, target } as Record<string, unknown>,
        output: output as Record<string, unknown>,
      },
    ],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 6 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generatePatchTask(
  seed: string,
  index: number,
  level: DifficultyLevel,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const config = getCurriculumConfig(level);
  const constraints = diffPatchConstraintsForLevel(rng, level);
  const source = randomObject(rng, 1, config);
  const target = randomObject(rng, 1, config);
  const patch = diff(source, target, constraints);
  const output = apply(patch, source, constraints);

  return {
    id: `patch-curriculum-l${level}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.diff_patch.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'patch', constraints },
    examples: [
      {
        input: { patch, source } as Record<string, unknown>,
        output: output as Record<string, unknown>,
      },
    ],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 6 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

function generateMergeTask(
  seed: string,
  index: number,
  level: DifficultyLevel,
): TaskSpec {
  const rng = Rng.fromSeed(seed);
  const config = getCurriculumConfig(level);
  const constraints = mergeConstraintsForLevel(rng, level);
  const left = randomObject(rng, 1, config);
  const right = randomObject(rng, 1, config);

  let output: unknown;
  try {
    output = merge(left, right, constraints);
  } catch {
    output = right;
  }

  return {
    id: `merge-curriculum-l${level}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family: 'json_transform.merge.v0',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: 'merge', constraints },
    examples: [
      {
        input: { left, right } as Record<string, unknown>,
        output: output as Record<string, unknown>,
      },
    ],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 6 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}

export interface GenerateOptions {
  family: TaskFamily;
  count: number;
  rootSeed: string;
  level?: DifficultyLevel;
}

export interface GenerateOutput {
  tasks: TaskSpec[];
  seeds: string[];
  level: DifficultyLevel;
}

/**
 * Generate curriculum-based tasks with controlled difficulty progression.
 *
 * @param opts - Generation options including family, count, root seed, and difficulty level
 * @returns Generated tasks, their seeds, and the difficulty level
 */
export function generate(opts: GenerateOptions): GenerateOutput {
  const tasks: TaskSpec[] = [];
  const seeds: string[] = [];
  const level = opts.level ?? 3;

  for (let i = 0; i < opts.count; i++) {
    const seed = `${opts.rootSeed}:l${level}:${i}`;
    let task: TaskSpec;

    switch (opts.family) {
      case 'json_transform.normalize.v0':
        task = generateNormalizeTask(seed, i, level);
        break;
      case 'json_transform.diff_patch.v0':
        // Alternate between diff and patch
        task = i % 2 === 0
          ? generateDiffTask(seed, i, level)
          : generatePatchTask(seed, i, level);
        break;
      case 'json_transform.merge.v0':
        task = generateMergeTask(seed, i, level);
        break;
      case 'json_transform.schema_migration.v0':
        throw new Error('Schema migration not implemented in curriculum generator');
      default:
        throw new Error(`Unsupported family: ${opts.family}`);
    }

    tasks.push(task);
    seeds.push(seed);
  }

  return { tasks, seeds, level };
}

export { type NormalizeConstraints, type DiffPatchConstraints, type MergeConstraints };
