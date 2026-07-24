import { ModCurve } from './types';

/**
 * Response-curve tables for modulation routes.
 *
 * A WaveShaperNode maps input [-1..1] across the curve array. Curves are
 * odd-symmetric (f(-x) = -f(x)) so they shape unipolar sources (0..1) and
 * bipolar sources (-1..1) consistently: 0→0, 1→1, -1→-1 always hold.
 *
 * 'linear' is the identity — callers skip the WaveShaper entirely for it.
 */

const CURVE_LENGTH = 1025; // odd length so index 512 is exactly x=0

const cache = new Map<ModCurve, Float32Array>();

/** The curve's response for a single value — same math as the WaveShaper
 *  tables, exposed so UI indicators can mirror the audible modulation. */
export function shapeValue(type: ModCurve, x: number): number {
  return shape(type, x);
}

function shape(type: ModCurve, x: number): number {
  const sign = Math.sign(x);
  const t = Math.abs(x); // 0..1
  switch (type) {
    case 'exp':
      // Slow start, fast finish
      return sign * t * t;
    case 'log':
      // Fast start, slow finish
      return sign * Math.sqrt(t);
    case 'scurve':
      // Smoothstep: eased at both ends
      return sign * t * t * (3 - 2 * t);
    case 'linear':
    default:
      return x;
  }
}

export function buildCurve(type: ModCurve): Float32Array {
  const cached = cache.get(type);
  if (cached) return cached;

  const curve = new Float32Array(CURVE_LENGTH);
  for (let i = 0; i < CURVE_LENGTH; i++) {
    const x = -1 + (2 * i) / (CURVE_LENGTH - 1);
    curve[i] = shape(type, x);
  }
  cache.set(type, curve);
  return curve;
}
