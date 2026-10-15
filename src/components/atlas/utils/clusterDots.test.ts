import { describe, expect, it } from 'vitest';
import { clusterDots } from './clusterDots';

const at = (...xs: number[]) => xs.map((x) => ({ x }));
const cluster = (xs: number[], window: number) =>
  clusterDots(at(...xs), (d) => d.x, window).map((c) => ({
    xs: c.items.map((d) => d.x),
    x: c.x,
  }));

describe('clusterDots', () => {
  it('leaves dots that are far apart alone', () => {
    expect(cluster([0, 30, 60], 20)).toEqual([
      { xs: [0], x: 0 },
      { xs: [30], x: 30 },
      { xs: [60], x: 60 },
    ]);
  });

  it('merges dots within the window of a cluster’s first dot', () => {
    expect(cluster([0, 5, 12, 20, 21, 50], 20)).toEqual([
      { xs: [0, 5, 12, 20], x: 0 },
      { xs: [21], x: 21 },
      { xs: [50], x: 50 },
    ]);
  });

  it('never lets a cluster grow wider than the window', () => {
    // Evenly dense dots must not chain into one cluster across the track.
    const xs = Array.from({ length: 100 }, (_, i) => i * 4);
    const clusters = cluster(xs, 20);
    for (const c of clusters) {
      expect(c.xs[c.xs.length - 1] - c.xs[0]).toBeLessThanOrEqual(20);
    }
    expect(clusters.length).toBeGreaterThan(10);
    expect(clusters.flatMap((c) => c.xs)).toEqual(xs);
  });

  it('draws clusters more than a window apart, so markers cannot overlap', () => {
    const xs = Array.from({ length: 200 }, (_, i) => (i * 37) % 600).sort(
      (a, b) => a - b,
    );
    const starts = cluster(xs, 30).map((c) => c.x);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1]).toBeGreaterThan(30);
    }
  });

  it('merges only identical positions with a zero window', () => {
    expect(cluster([3, 3, 3, 4], 0)).toEqual([
      { xs: [3, 3, 3], x: 3 },
      { xs: [4], x: 4 },
    ]);
  });

  it('returns nothing for nothing', () => {
    expect(cluster([], 20)).toEqual([]);
  });
});
