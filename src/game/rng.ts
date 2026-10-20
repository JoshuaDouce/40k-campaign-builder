/** A source of randomness in [0, 1). Every dice roll and shuffle in the game goes through one of these. */
export type Rng = () => number;

/** Seeded generator, copied from the prototype. */
export function mulberry(seed: number): Rng {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Integer in [0, n). */
export function rollInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Seed for a new map. */
export function newSeed(rng: Rng): number {
  return rollInt(rng, 1e9);
}
