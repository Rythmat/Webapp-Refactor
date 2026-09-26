/**
 * Hand wobble. Nothing in this engine is a true circle or a straight line — a mark that is
 * geometrically exact reads as machine-printed, not risographed.
 *
 * Both forms are a stack of sines with seeded amplitudes and phases, so they are smooth, periodic
 * in θ (a ring closes on itself without a seam), and — crucially — a pure function of their
 * argument. Randomness is drawn ONCE at construction, never per frame. A fresh `rng()` draw inside
 * a render call is what makes texture crawl.
 *
 * Transcribed from upstream: `makeWob` from prints/workings, `wobbler`/`wander` from studies.
 */
import { TAU } from './num.ts';
import { type Rng, rngFor } from './rng.ts';

/** θ → displacement in roughly [-1, 1]. */
export type Wob = (th: number) => number;

/** Build a wobble from an existing generator. Consumes 2 draws per harmonic. */
export function makeWob(rng: Rng, harmonics = 3): Wob {
  const h: [number, number, number][] = [];
  for (let i = 0; i < harmonics; i++)
    h.push([2 + i, rng() * 2 - 1, rng() * Math.PI * 2]);
  return (th) =>
    h.reduce((s, [k, a, p]) => s + a * Math.sin(k * th + p), 0) / harmonics;
}

/** Smooth periodic wobble in θ, so a ring closes on itself without a seam. */
export function wobbler(key: string, harmonics = 3): Wob {
  return makeWob(rngFor(key), harmonics);
}

/**
 * Deterministic wander in t: one sine stack sampled at t, never a fresh rng
 * draw per frame. This is what lets a flame, a flag or a water surface vary
 * without crawling. Periodic with period 1/hz, so anything driven by it loops
 * seamlessly; give separate parts separate keys or they all breathe together.
 */
export const wander = (key: string, hz: number, harmonics?: number): Wob => {
  const w = wobbler(key, harmonics || 3);
  return (t) => w(TAU * hz * t);
};
