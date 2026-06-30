import { sha256OfString } from '@fresharena/verifier-runtime';

/**
 * Mulberry32: a fast, deterministic 32-bit PRNG. Seeded by a string via a
 * SHA-256-derived uint32 so every stream is a pure function of its seed string.
 * FreshArena never calls `Math.random()`; all randomness flows from a single
 * root seed through `Rng.fork`, which makes runs fully reproducible.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedToUint32(seed: string): number {
  const hex = sha256OfString(seed).slice(0, 8);
  return Number.parseInt(hex, 16) >>> 0;
}

export class Rng {
  private readonly nextFn: () => number;
  readonly seedString: string;

  private constructor(seedString: string) {
    this.seedString = seedString;
    this.nextFn = mulberry32(seedToUint32(seedString));
  }

  static fromSeed(seedString: string): Rng {
    return new Rng(seedString);
  }

  /** Derive an independent, deterministic sub-stream. */
  fork(label: string): Rng {
    return new Rng(`${this.seedString}:${label}`);
  }

  /** Next float in [0, 1). */
  next(): number {
    return this.nextFn();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) throw new Error(`Rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(this.nextFn() * (max - min + 1));
  }

  bool(): boolean {
    return this.nextFn() < 0.5;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    const index = this.int(0, items.length - 1);
    return items[index] as T;
  }
}
