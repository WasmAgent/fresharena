import { parseNormalizeConstraints } from '@fresharena/faep-schema';
import { sha256Hex } from './crypto.js';
import { normalize } from './normalize.js';

export interface VerifyInput {
  taskId: string;
  input: unknown;
  output: unknown;
  /** Raw `operation_spec.constraints` value from the task spec. */
  constraints: unknown;
}

export interface VerifyResult {
  passed: boolean;
  expected_hash: string;
  actual_hash: string;
  failure_reason?: string;
}

/**
 * Deterministic verifier oracle for normalize.v0: a submission passes iff its
 * structural hash equals the reference implementation's structural hash. Object
 * key order is irrelevant (see `stableStringify`); array order is significant.
 */
export function verify(input: VerifyInput): VerifyResult {
  const constraints = parseNormalizeConstraints(input.constraints);
  const expected = normalize(input.input, constraints);
  const expectedHash = sha256Hex(expected);
  const actualHash = sha256Hex(input.output);
  const passed = expectedHash === actualHash;
  return {
    passed,
    expected_hash: expectedHash,
    actual_hash: actualHash,
    failure_reason: passed ? undefined : 'output does not match reference normalize output',
  };
}

export function expectedHashFor(input: unknown, constraints: unknown): string {
  return sha256Hex(normalize(input, parseNormalizeConstraints(constraints)));
}
