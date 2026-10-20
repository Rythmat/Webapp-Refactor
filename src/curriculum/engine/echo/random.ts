/**
 * Echo's random source. Every choice a call makes (a contour, a zero point,
 * a rhythm, a chord) goes through one of these, so a seed gives the same
 * calls every time: the tests, and a game that wants to replay a round.
 * A game passes `Math.random` when it wants no seed.
 */

/** Numbers in [0, 1), like Math.random. */
export type EchoRandom = () => number;

/** A stable 32-bit seed from a string (FNV-1a). */
function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A seeded source (mulberry32): the same seed, the same numbers. */
export function echoRandom(seed: number | string): EchoRandom {
  let a = (typeof seed === 'string' ? seedOf(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of `items`, each as likely. */
export function pickOne<T>(rng: EchoRandom, items: readonly T[]): T {
  if (items.length === 0) throw new Error('Nothing to pick from');
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** One of `items`, each as likely as its weight (a weight above 0). */
export function pickWeighted<T>(
  rng: EchoRandom,
  items: readonly T[],
  weight: (item: T) => number,
): T {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return pickOne(rng, items);
  let at = rng() * total;
  for (let i = 0; i < items.length; i++) {
    at -= weights[i];
    if (at < 0) return items[i];
  }
  return items[items.length - 1];
}
