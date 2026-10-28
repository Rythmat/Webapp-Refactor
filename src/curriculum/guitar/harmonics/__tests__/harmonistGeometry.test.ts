import { describe, expect, it } from 'vitest';
import { positionOfFret } from '@/lib/guitar/harmonics';
import {
  BODY_OUTLINE,
  bodyPath,
  BRIDGE,
  diameterLabel,
  fretTableInches,
  partialCircles,
  PICKUPS,
  TAILPIECE,
  tangentPoints,
} from '../harmonistGeometry';

describe('harmonist geometry', () => {
  it.each([1, 2, 3, 5, 7, 12])(
    "partial %i's circles tile the string exactly",
    (n) => {
      const circles = partialCircles(n);
      expect(circles).toHaveLength(n);
      expect(circles[0].cy - circles[0].r).toBeCloseTo(0, 12);
      expect(circles[n - 1].cy + circles[n - 1].r).toBeCloseTo(1, 12);
      // Each touches the next at k/n.
      for (let k = 1; k < n; k++) {
        const a = circles[k - 1];
        const b = circles[k];
        expect(a.cy + a.r).toBeCloseTo(k / n, 12);
        expect(b.cy - b.r).toBeCloseTo(k / n, 12);
      }
    },
  );

  it('marks the tangent points that ring partial n', () => {
    expect(tangentPoints(4).map((p) => p.rings)).toEqual([true, false, true]);
    expect(
      tangentPoints(6)
        .filter((p) => p.rings)
        .map((p) => p.k),
    ).toEqual([1, 5]);
  });

  it('gives the fret distances of a 25" scale', () => {
    const frets = fretTableInches();
    expect(frets[0]).toBeCloseTo(1.403, 3);
    expect(frets[6]).toBeCloseTo(8.315, 3);
    expect(frets[11]).toBeCloseTo(12.5, 6);
    expect(frets[23]).toBeCloseTo(18.75, 6);
  });

  it('labels the circle diameters', () => {
    expect(diameterLabel(1)).toBe('25"');
    expect(diameterLabel(2)).toBe('12.5"');
    expect(diameterLabel(4)).toBe('6.25"');
    expect(diameterLabel(3)).toBe('8.333"');
  });
});

describe('the SG-style body', () => {
  it('is one closed outline round the bridge, horns above it', () => {
    const d = bodyPath(100);
    expect(d.startsWith('M -3.9 73.7')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    const ends = BODY_OUTLINE.map(([, , end]) => end);
    // Its widest bout is round the bridge (y = 1), and it ends below it.
    const widest = ends.reduce((a, b) =>
      Math.abs(b[0]) > Math.abs(a[0]) ? b : a,
    );
    expect(widest[1]).toBeGreaterThan(0.95);
    expect(Math.max(...ends.map(([, y]) => y))).toBeGreaterThan(1.15);
    // Both horns hook up to about the 17th fret, either side of the neck.
    const tips = ends.filter(([, y]) => y < 0.65);
    expect(tips).toHaveLength(2);
    const [bass, treble] = tips;
    expect(bass[0]).toBeLessThan(-0.1);
    expect(treble[0]).toBeGreaterThan(0.1);
    for (const [, y] of tips) expect(y).toBeCloseTo(positionOfFret(17), 1);
    // A waist between the upper body and the lower bout.
    const halfWidthAt = (y: number) =>
      Math.abs(
        ends.reduce((a, b) =>
          Math.abs(b[1] - y) < Math.abs(a[1] - y) ? b : a,
        )[0],
      );
    expect(halfWidthAt(0.93)).toBeLessThan(halfWidthAt(0.75));
    expect(halfWidthAt(0.93)).toBeLessThan(halfWidthAt(1.13));
  });

  it('puts the bridge at the scale length, between the pickups and tailpiece', () => {
    expect(BRIDGE.cy).toBe(1);
    expect(PICKUPS.every((p) => p.cy < BRIDGE.cy)).toBe(true);
    expect(TAILPIECE.cy).toBeGreaterThan(BRIDGE.cy);
  });
});
