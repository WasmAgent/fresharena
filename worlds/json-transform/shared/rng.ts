/**
 * Shared deterministic RNG for the json_transform world.
 *
 * This is the single source of truth for the small linear-congruential RNG that
 * the world's generators and testers rely on for reproducible task/data
 * generation. It was previously inlined byte-for-byte in four files
 * (random/curriculum/adversarial baselines and the differential tester);
 * centralizing here removes that duplication.
 *
 * IMPORTANT: the algorithm (string-hash seed + LCG step) is preserved exactly
 * as it was inlined. It is deliberately NOT the mulberry32-based Rng in
 * @fresharena/core — the two produce different sequences, and every golden
 * output / reproduction hash in this world depends on THIS sequence. Do not
 * "upgrade" it to the core RNG without regenerating all fixtures.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  static fromSeed(seedStr: string): Rng {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      const char = seedStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return new Rng(Math.abs(hash));
  }

  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  bool(): boolean {
    return this.next() < 0.5;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}
