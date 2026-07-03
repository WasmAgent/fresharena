import type { EvalTrack, SolverMetadata, TaskSpec } from '@fresharena/faep-schema';
import { normalize, shortHash } from '@fresharena/verifier-runtime';

/**
 * Pure, deterministic non-LLM baseline solvers for the `non_llm` evaluation
 * track. Each solver is a pure function of (input, task); the only side-effect
 * entry is the CLI. Solver identifiers are stable: `reference`, `weak`,
 * `buggy-A`, `buggy-B`, `buggy-C`.
 */
export type SolverFn = (input: unknown, task: TaskSpec) => unknown | Promise<unknown>;

export interface SolverEntry {
  id: string;
  track: EvalTrack;
  fn: SolverFn;
  description: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reference implementation: always correct by definition. */
function reference(input: unknown, task: TaskSpec): unknown {
  return normalize(input, task.operation_spec.constraints);
}

/** Weak floor baseline: returns the input unchanged. */
function weak(input: unknown): unknown {
  return input;
}

/** Buggy A: drops nested object contents beyond depth 1. */
function buggyA(input: unknown): unknown {
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = isPlainObject(value) ? {} : value;
    }
    return out;
  }
  return input;
}

/** Buggy B: lexicographically sorts every array's elements (corrupts order/types). */
function buggyB(input: unknown): unknown {
  if (Array.isArray(input)) {
    return [...input].map((element) => buggyB(element)).sort((a, b) => stableCompare(a, b));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = buggyB(value);
    }
    return out;
  }
  return input;
}

function stableCompare(a: unknown, b: unknown): number {
  const sa = typeof a === 'number' ? `n:${a}` : `s:${String(a)}`;
  const sb = typeof b === 'number' ? `n:${b}` : `s:${String(b)}`;
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

/** Buggy C: strips null entries unconditionally (violates null-preserving specs). */
function buggyC(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((element) => buggyC(element));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === null) continue;
      out[key] = buggyC(value);
    }
    return out;
  }
  return input;
}

const SOLVERS: readonly SolverEntry[] = [
  {
    id: 'reference',
    track: 'non_llm',
    fn: reference,
    description: 'reference implementation — correct upper bound',
  },
  {
    id: 'weak',
    track: 'non_llm',
    fn: weak,
    description: 'returns input unchanged — lower-bound floor',
  },
  {
    id: 'buggy-A',
    track: 'non_llm',
    fn: buggyA,
    description: 'drops nested object contents beyond depth 1',
  },
  {
    id: 'buggy-B',
    track: 'non_llm',
    fn: buggyB,
    description: 'sorts array elements lexicographically',
  },
  {
    id: 'buggy-C',
    track: 'non_llm',
    fn: buggyC,
    description: 'strips null entries unconditionally',
  },
];

export const SOLVER_IDS = SOLVERS.map((solver) => solver.id);

export function listSolvers(): readonly SolverEntry[] {
  return SOLVERS;
}

export function getSolver(id: string): SolverEntry {
  const entry = SOLVERS.find((solver) => solver.id === id);
  if (entry === undefined) {
    throw new Error(`getSolver: unknown solver id "${id}"`);
  }
  return entry;
}

export function solverMetadata(id: string): SolverMetadata {
  const entry = getSolver(id);
  return {
    id: entry.id,
    track: entry.track,
    workflow: {
      prompt_hash: 'n/a',
      tool_policy_hash: 'n/a',
      retry_policy: {},
    },
    budget: {
      max_tokens: 0,
      max_wall_time_sec: 5,
      max_attempts: 1,
    },
    artifact: {
      source_hash: shortHash(`fresharena-solver:${id}`, 12),
      logs_hash: 'n/a',
    },
  };
}
