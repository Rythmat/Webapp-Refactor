/**
 * Scalar helpers. Re-associating any of these changes the last bits, so they are transcribed.
 *
 * Provenance, because it is split across upstream and easy to get wrong:
 *   clamp, lerp   prints/workings/index.html:106-107 (and every other copy of the engine)
 *   TAU           prints/workings/index.html:343
 *   fract, sm     the FILMS only — films/window-seat/index.html:1107-1108. Neither appears in
 *                 prints/workings or in any studies file.
 *   smooth01      docs/motion.md:99, where it is the loop-seam recipe:
 *                   const v = fract((t - origin) * hz + offset);
 *                   const life = smooth01(v / edge) * smooth01((1 - v) / edge);
 *                 value and slope both reach zero at each end, so a driven element can loop
 *                 without a visible seam.
 *
 * `sm` and `smooth01` are the same function under two upstream names — the docs use one, the films
 * the other. Both are exported so transcribed code reads like its source.
 */

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;

export const lerp = (a: number, b: number, u: number): number =>
  a + (b - a) * u;

/** Fractional part. Handles negative phase offsets, which `x % 1` does not. */
export const fract = (x: number): number => x - Math.floor(x);

/** Smoothstep over [0,1], clamped. Value and slope reach zero at both ends. */
export const smooth01 = (x: number): number => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};

/** The films' name for smooth01 (window-seat:1108). Same function, so transcriptions read true. */
export const sm = smooth01;
