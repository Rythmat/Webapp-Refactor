import { describe, expect, it } from 'vitest';
import { binLabel, describeSeries } from './describe';
import { areaPath, linePath } from './paths';
import { linear, niceMax } from './scales';

describe('the chart kit', () => {
  it('scales and inverts', () => {
    const x = linear(1900, 2000, 0, 200);
    expect(x(1950)).toBe(100);
    expect(x.invert(150)).toBe(1975);
    expect(linear(5, 5, 0, 10)(5)).toBe(0);
  });

  it('rounds an axis top up to 1, 2 or 5', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(42)).toBe(50);
    expect(niceMax(130)).toBe(200);
  });

  it('draws a line that never overshoots, and closes an area', () => {
    const pts = [
      [0, 10],
      [10, 0],
      [20, 0],
      [30, 10],
    ] as const;
    const d = linePath(pts);
    expect(d.startsWith('M0,10')).toBe(true);
    // Flat between the two zeros: no control point dips below them.
    const ys = [...d.matchAll(/[ ,](-?[\d.]+)(?= |C|$)/g)].map((m) => +m[1]);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(areaPath(pts, 20).endsWith('L30,20L0,20Z')).toBe(true);
    expect(linePath([])).toBe('');
  });

  it('says a series in words', () => {
    const bins = [
      { start: 1950, size: 10, count: 4 },
      { start: 1960, size: 10, count: 9 },
    ];
    expect(binLabel(bins[0])).toBe('the 1950s');
    expect(binLabel({ start: 1950, size: 5, count: 1 })).toBe('1950–1954');
    expect(describeSeries('Events', bins)).toBe(
      'Events, 1950–1969: busiest the 1960s (9 events).',
    );
    expect(
      describeSeries('Events', [{ start: 1950, size: 10, count: 0 }]),
    ).toBe('Events: no events.');
  });
});
