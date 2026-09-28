/**
 * Deterministic randomness. The keystone of the whole engine: every texture, wobble and fleck is
 * drawn from a generator seeded by a STRING KEY, so the picture is identical on every seek.
 *
 * Transcribed verbatim from upstream `prints/workings/index.html`. The integer coercions here are
 * load-bearing, not stylistic:
 *
 *   - `| 0` truncates toward zero into int32. `Math.trunc` is identical; `Math.floor` is NOT, for
 *     negatives. Do not substitute.
 *   - `>>> 0` reinterprets as uint32. `hash` returning a signed value would reseed everything.
 *   - `Math.imul` is 32-bit multiply with wraparound. `*` is not the same for large operands.
 *
 * Prettier will add clarifying parentheses to the mixed-precedence line in `mulberry32`. That is
 * semantically neutral — `>>>` binds tighter than `+`, which binds tighter than `^` — and the
 * golden test in __tests__/rng.test.ts is what proves it stayed neutral. Having been checked once,
 * do not touch these lines again.
 */

/** A uniform generator over [0, 1). */
export type Rng = () => number;

export function mulberry32(a: number): Rng {
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The only way to get randomness in this engine.
 *
 * RISO-KEY: the key string is part of the output. Renaming a scene id, changing a separator or
 * altering a `toFixed()` precision reseeds that element and silently changes the picture. Keys are
 * frozen once a work is approved. See src/__tests__/keys.test.ts.
 */
export const rngFor = (key: string): Rng => mulberry32(hash(key));
