import { createHash } from 'node:crypto';

/**
 * Deterministic JSON canonicalisation: object keys are sorted ascending and
 * nested recursively. Arrays preserve element order. Produces a string that is
 * independent of object key insertion order, so equality is structural.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((element) => canonicalize(element));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = canonicalize(record[key]);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value: unknown): string {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

export function sha256OfString(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Short, deterministic identifier derived from a string. */
export function shortHash(value: string, length = 12): string {
  return sha256OfString(value).slice(0, length);
}
