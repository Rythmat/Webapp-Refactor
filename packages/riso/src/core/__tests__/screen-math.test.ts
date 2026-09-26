/**
 * The halftone lattice, held to tiles captured from the live upstream page.
 *
 * These are asserted EXACTLY, unlike the wobbler. `buildScreenTile` uses only multiplication,
 * division and `Math.sqrt`, and IEEE-754 requires sqrt to be correctly rounded — so unlike
 * `Math.sin`, these values are bit-portable between V8 and SpiderMonkey. The first test below
 * checks that claim rather than assuming it: if a future engine makes it false, this is where it
 * surfaces, not in a mysterious pixel diff.
 */
import { describe, expect, it } from 'vitest';
import { INK_NAMES, PITCH, SCREEN } from '../constants.ts';
import { buildScreenTile } from '../screen-math.ts';
import golden from './core.golden.json' with { type: 'json' };

type GoldenScreen = {
  S: number;
  P: number;
  ptsCount: number;
  wrappedCount: number;
  pts: number[][];
  th: number[];
};
const screens = golden.screens as Record<string, GoldenScreen>;

describe('buildScreenTile', () => {
  it.each(INK_NAMES)('%s tile matches upstream exactly', (ink) => {
    const want = screens[ink];
    const got = buildScreenTile(ink);

    expect(got.S).toBe(want.S);
    expect(got.P).toBe(want.P);
    expect(got.pts.length).toBe(want.ptsCount);
    expect(got.wrapped.length).toBe(want.wrappedCount);
    expect(got.th.length).toBe(want.th.length);

    /* Float32Array, not number[] — the lower precision is part of the output. */
    expect(got.th).toBeInstanceOf(Float32Array);
    expect(Array.from(got.th)).toEqual(want.th);
  });

  it.each(INK_NAMES)('%s lattice points match upstream in order', (ink) => {
    const got = buildScreenTile(ink);
    expect(got.pts.map((p) => [p[0], p[1]])).toEqual(screens[ink].pts);
  });

  /* The epsilon dedupe in buildScreenTile is order-dependent and floating-point sensitive: an
     implementation that computes u as S/n (mathematically exact) yields FEWER points, because
     points that currently drift to 6.999999999999998 would land on 0 and be deduped away. That is
     a different picture. See PARITY.md. */
  it('keeps the edge-duplicate points that floating-point drift produces', () => {
    const green = buildScreenTile('green');
    expect(SCREEN.green).toEqual({ a: 1, b: 1 });
    expect(green.pts.length).toBe(4); // NOT a*a + b*b === 2
    expect(green.pts.some(([x]) => x > 6.99 && x < 7)).toBe(true);

    const yellow = buildScreenTile('yellow');
    expect(yellow.pts.length).toBe(1); // no drift: u is exactly 5
  });

  it('wraps each point into a 3x3 neighbourhood', () => {
    for (const ink of INK_NAMES) {
      const t = buildScreenTile(ink);
      expect(t.wrapped.length).toBe(t.pts.length * 9);
    }
  });

  it('keeps the tile at least 2px and ties it to PITCH', () => {
    for (const ink of INK_NAMES) {
      const { a, b } = SCREEN[ink];
      const n = a * a + b * b;
      const t = buildScreenTile(ink);
      expect(t.S).toBe(Math.max(2, Math.round(PITCH * Math.sqrt(n))));
      /* P is the EFFECTIVE pitch after S was rounded, so it drifts off PITCH slightly. */
      expect(t.P).toBeCloseTo(PITCH, 0);
    }
  });

  it('produces thresholds in [0,1]', () => {
    for (const ink of INK_NAMES) {
      for (const v of buildScreenTile(ink).th) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  /* The functional property, rather than a magic number on the minimum: a light tone must still
     put ink down somewhere, and a heavy tone must still leave paper showing. That spread is what
     makes a mid-tone read as a screen rather than as a flat fill.

     Asserted as behaviour because the raw minimum is not a free parameter — it is the distance
     from a dot centre to the nearest pixel centre. Yellow's tile is S=5 with its dot on the
     corner, so its closest sample sits at (0.5, 0.5) and its minimum is exactly PI*0.5/25
     = 0.0628. A bound tighter than that would fail on a correct implementation. */
  it('inks something at a light tone and leaves paper at a heavy one', () => {
    for (const ink of INK_NAMES) {
      const th = buildScreenTile(ink).th;
      const inked = (cover: number): number =>
        th.reduce((n, t) => n + (cover > t ? 1 : 0), 0);
      expect(
        inked(0.1),
        `${ink} prints nothing at 10% coverage`,
      ).toBeGreaterThan(0);
      expect(inked(0.9), `${ink} leaves no paper at 90% coverage`).toBeLessThan(
        th.length,
      );
      expect(inked(0.1)).toBeLessThan(inked(0.9));
    }
  });

  it('is deterministic across calls', () => {
    const a = buildScreenTile('blue');
    const b = buildScreenTile('blue');
    expect(Array.from(a.th)).toEqual(Array.from(b.th));
    expect(a.pts).toEqual(b.pts);
  });
});
