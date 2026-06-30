import {
  type AdmissibilityResult,
  type TaskSpec,
  NormalizeConstraintsSchema,
} from '@fresharena/faep-schema';
import { normalize, stableStringify } from '@fresharena/verifier-runtime';

/**
 * Wording that signals under-specified, non-deterministic policy. A task whose
 * declared constraints mention any of these terms is rejected by the
 * `no_ambiguous_policy` gate. (This list lives in the admissibility gate, not in
 * the closed normalize semantics, which must remain free of such terms.)
 */
export const AMBIGUOUS_POLICY_TERMS = ['reasonable', 'best-effort', 'sensible', 'user intent'];

// Strict variant: rejects undeclared keys, which would imply undocumented
// (and therefore ambiguous) behaviour.
const StrictNormalizeConstraintsSchema = NormalizeConstraintsSchema.strict();

export interface GateInput {
  readonly task: TaskSpec;
  readonly existing: readonly TaskSpec[];
  readonly maxSourceBytes: number;
}

export interface GateOutcome {
  readonly passed: boolean;
  readonly reason: string;
}

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return { kind: 'array', length: value.length, element: shapeOf(value[0] ?? null) };
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const shape: Record<string, unknown> = {};
    for (const key of keys) {
      shape[key] = shapeOf(record[key]);
    }
    return { kind: 'object', keys, shape };
  }
  return { kind: typeof value };
}

function taskSignature(task: TaskSpec): string {
  return stableStringify({
    constraints: task.operation_spec.constraints,
    shape: shapeOf(task.examples[0]?.input ?? null),
  });
}

/** Gate 1: output fully determined by input + declared spec. */
export function checkDeterministic(task: TaskSpec): GateOutcome {
  if (task.operation_spec.type !== 'normalize') {
    return { passed: false, reason: 'operation type is not normalize' };
  }
  const parsed = StrictNormalizeConstraintsSchema.safeParse(task.operation_spec.constraints);
  if (!parsed.success) {
    return { passed: false, reason: `constraints not deterministic: ${parsed.error.message}` };
  }
  return { passed: true, reason: 'normalize is a pure function of input + constraints' };
}

/** Gate 2: the reference solver passes every public example. */
export function checkReferenceSolvable(task: TaskSpec): GateOutcome {
  const constraints = task.operation_spec.constraints;
  for (const example of task.examples) {
    const actual = normalize(example.input, constraints);
    if (stableStringify(actual) !== stableStringify(example.output)) {
      return { passed: false, reason: 'reference output disagrees with declared example output' };
    }
  }
  return { passed: true, reason: 'reference solver reproduces all examples' };
}

/** Gate 3: sufficiently distinct from already-admitted tasks. */
export function checkDuplicateDistance(input: GateInput): GateOutcome {
  const candidate = taskSignature(input.task);
  for (const prior of input.existing) {
    if (taskSignature(prior) === candidate) {
      return {
        passed: false,
        reason: 'task signature collides with an existing task (distance below threshold)',
      };
    }
  }
  return { passed: true, reason: 'task signature is distinct from all existing tasks' };
}

/** Gate 4: no under-specified or heuristic policy wording. */
export function checkNoAmbiguousPolicy(task: TaskSpec): GateOutcome {
  const strict = StrictNormalizeConstraintsSchema.safeParse(task.operation_spec.constraints);
  if (!strict.success) {
    return { passed: false, reason: 'constraints contain undeclared or invalid fields' };
  }
  const text = stableStringify(task.operation_spec.constraints);
  for (const term of AMBIGUOUS_POLICY_TERMS) {
    if (text.includes(term)) {
      return { passed: false, reason: `constraints use ambiguous policy term "${term}"` };
    }
  }
  return { passed: true, reason: 'policy is fully declared with no ambiguous wording' };
}

/** Gate 5: within the per-task compute budget. */
export function checkCostWithinLimit(input: GateInput): GateOutcome {
  const inputBytes = Buffer.byteLength(stableStringify(input.task.examples[0]?.input ?? {}), 'utf8');
  if (inputBytes > input.maxSourceBytes) {
    return {
      passed: false,
      reason: `input size ${inputBytes}B exceeds limit ${input.maxSourceBytes}B`,
    };
  }
  return { passed: true, reason: `input size ${inputBytes}B within limit` };
}

/** Gate 6: maps to a real config / payload / schema engineering scenario. */
export function checkEngineeringRelevance(task: TaskSpec): GateOutcome {
  if (task.family !== 'json_transform.normalize.v0') {
    return { passed: false, reason: 'task family is not an engineering-relevant transform' };
  }
  return {
    passed: true,
    reason: 'normalize.v0 models API payload / config cleanup',
  };
}

export function evaluateAdmissibility(input: GateInput): AdmissibilityResult {
  const deterministic = checkDeterministic(input.task).passed;
  const referenceSolvable = checkReferenceSolvable(input.task).passed;
  const duplicateDistanceAboveThreshold = checkDuplicateDistance(input).passed;
  const noAmbiguousPolicy = checkNoAmbiguousPolicy(input.task).passed;
  const costWithinLimit = checkCostWithinLimit(input).passed;
  const engineeringRelevanceMin = checkEngineeringRelevance(input.task).passed;
  return {
    deterministic,
    reference_solvable: referenceSolvable,
    duplicate_distance_above_threshold: duplicateDistanceAboveThreshold,
    no_ambiguous_policy: noAmbiguousPolicy,
    cost_within_limit: costWithinLimit,
    engineering_relevance_min: engineeringRelevanceMin,
  };
}

export function admits(result: AdmissibilityResult): boolean {
  return (
    result.deterministic &&
    result.reference_solvable &&
    result.duplicate_distance_above_threshold &&
    result.no_ambiguous_policy &&
    result.cost_within_limit &&
    result.engineering_relevance_min
  );
}
