/**
 * In-memory LRU cache for verifier results keyed by content hash.
 *
 * This cache stores (task_spec + solver_answer) → VerifyResult mappings
 * so that repeated identical verification calls are short-circuited.
 * The cache is a singleton shared across the entire process.
 *
 * @packageDocumentation
 */

import type { VerifyInput, VerifyResult } from './verify.js';
import { sha256Hex, stableStringify } from './crypto.js';

/** Default maximum number of entries in the LRU cache. */
const DEFAULT_MAX_SIZE = 1000;

/**
 * A minimal LRU cache implemented with a Map (iteration order = insertion order
 * in modern JS engines). When the cache exceeds `maxSize`, the oldest entry
 * (first inserted) is evicted.
 */
export class VerifyResultCache {
  private readonly _map = new Map<string, VerifyResult>();
  private readonly _maxSize: number;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this._maxSize = maxSize;
  }

  /** Compute a deterministic cache key from the verify input. */
  static key(input: VerifyInput): string {
    // The key incorporates the task ID, operation type, input, output, and constraints
    // so that different solver answers produce different cache entries.
    return sha256Hex(
      stableStringify({
        taskId: input.taskId,
        operationType: input.operationType,
        input: input.input,
        output: input.output,
        constraints: input.constraints,
      }),
    );
  }

  /** Look up a cached result. Returns `undefined` on a cache miss. */
  get(key: string): VerifyResult | undefined {
    const value = this._map.get(key);
    if (value !== undefined) {
      // Refresh — delete and re-insert to maintain LRU order.
      this._map.delete(key);
      this._map.set(key, value);
    }
    return value;
  }

  /** Store a result in the cache, evicting the oldest entry if necessary. */
  set(key: string, value: VerifyResult): void {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._maxSize) {
      // Evict the first (oldest) entry.
      const oldest = this._map.keys().next();
      if (!oldest.done) {
        this._map.delete(oldest.value);
      }
    }
    this._map.set(key, value);
  }

  /** Number of entries currently cached. */
  get size(): number {
    return this._map.size;
  }

  /** Clear all cached entries. */
  clear(): void {
    this._map.clear();
  }
}

/** The singleton cache instance used by the verifier runtime. */
export const verifierCache = new VerifyResultCache();
