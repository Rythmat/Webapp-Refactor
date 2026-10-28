import { describe, expect, it } from 'vitest';
import {
  chladniGradient,
  chladniValue,
  CYMATIC_TIMING,
  cymaticSequence,
  morphAt,
} from '../cymatics';
import type { ChladniMode } from '../seed';

const MODES: ChladniMode[] = [
  { n: 2, m: 1, sign: 1 },
  { n: 5, m: 3, sign: -1 },
  { n: 6, m: 4, sign: -1 },
  { n: 7, m: 6, sign: 1 },
];

describe('a Chladni plate', () => {
  it("mirrors both ways and across its diagonal, as a free square plate's figure does", () => {
    for (const mode of MODES) {
      for (const [u, v] of [
        [0.4, 1.1],
        [2.2, -0.7],
        [-1.9, 2.8],
      ]) {
        const f = chladniValue(mode, u, v);
        expect(chladniValue(mode, -u, v)).toBeCloseTo(f, 12);
        expect(chladniValue(mode, u, -v)).toBeCloseTo(f, 12);
        expect(chladniValue(mode, v, u)).toBeCloseTo(mode.sign * f, 12);
      }
    }
  });

  it('has the slope the GPU draws its lines by (checked against the field)', () => {
    const h = 1e-6;
    for (const mode of MODES) {
      for (const [u, v] of [
        [0.3, 0.9],
        [1.7, -2.4],
      ]) {
        const [du, dv] = chladniGradient(mode, u, v);
        const nu =
          (chladniValue(mode, u + h, v) - chladniValue(mode, u - h, v)) /
          (2 * h);
        const nv =
          (chladniValue(mode, u, v + h) - chladniValue(mode, u, v - h)) /
          (2 * h);
        expect(du).toBeCloseTo(nu, 5);
        expect(dv).toBeCloseTo(nv, 5);
      }
    }
  });
});

describe('a cymatic morph', () => {
  it('moves through its own mode first, then three near resonances, all valid and distinct', () => {
    for (const home of MODES) {
      const seq = cymaticSequence(home);
      expect(seq[0]).toEqual(home);
      expect(seq.length).toBeGreaterThanOrEqual(3);
      const keys = seq.map((m) => `${m.n},${m.m},${m.sign}`);
      expect(new Set(keys).size).toBe(seq.length);
      for (const m of seq) {
        expect(m.n).toBeGreaterThanOrEqual(1);
        expect(m.n).toBeLessThanOrEqual(9);
        expect(m.m).toBeGreaterThanOrEqual(0);
        // No dense lattices (n > 4, 0): they read as one grid scaled.
        if (m.m === 0) expect(m.n).toBeLessThanOrEqual(4);
        expect(m.m).toBeLessThan(m.n);
      }
    }
  });

  it('holds each figure, eases into the next, and loops', () => {
    const { hold, morph } = CYMATIC_TIMING;
    const step = hold + morph;
    expect(morphAt(0, 4)).toEqual({ from: 0, to: 1, mix: 0 });
    expect(morphAt(hold - 0.01, 4).mix).toBe(0);
    expect(morphAt(hold + morph / 2, 4).mix).toBeCloseTo(0.5, 6);
    expect(morphAt(step - 1e-9, 4).mix).toBeCloseTo(1, 6);
    expect(morphAt(step * 3 + 0.1, 4)).toMatchObject({ from: 3, to: 0 });
    expect(morphAt(step * 4 + 0.1, 4)).toMatchObject({ from: 0, to: 1 });
    // One mode: it holds.
    expect(morphAt(99, 1)).toEqual({ from: 0, to: 0, mix: 0 });
  });
});
