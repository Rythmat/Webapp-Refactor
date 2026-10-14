import { describe, expect, it, vi } from 'vitest';
import { createRiverCamera } from './riverCamera';
import {
  LEVEL_STEP,
  clusterLanes,
  levelOf,
  levelPxPerYear,
} from './riverLevels';

const DOMAIN = { from: 500, to: 2026 };

describe('the river camera', () => {
  it('starts inside the domain and moves with gestures', () => {
    const camera = createRiverCamera({ from: 1900, to: 2000 }, DOMAIN);
    const heard = vi.fn();
    camera.subscribe(heard);
    camera.zoomAt(1950, 0.5);
    expect(camera.get()).toEqual({ from: 1925, to: 1975 });
    camera.panBy(10);
    expect(camera.get()).toEqual({ from: 1935, to: 1985 });
    expect(heard).toHaveBeenCalledTimes(2);
    expect(heard).toHaveBeenLastCalledWith('gesture');
  });

  it('says nothing when nothing moved', () => {
    const camera = createRiverCamera({ from: 1900, to: 2000 }, DOMAIN);
    const heard = vi.fn();
    camera.subscribe(heard);
    camera.set({ from: 1900, to: 2000 }, 'page');
    expect(heard).not.toHaveBeenCalled();
  });

  it('jumps when a tween has no time', () => {
    const camera = createRiverCamera({ from: 1900, to: 2000 }, DOMAIN);
    const heard = vi.fn();
    camera.subscribe(heard);
    camera.tween({ from: 1946, to: 1979 }, 0);
    expect(camera.get()).toEqual({ from: 1946, to: 1979 });
    expect(heard).toHaveBeenCalledWith('tween');
  });

  it('keeps the window inside the domain', () => {
    const camera = createRiverCamera({ from: 0, to: 3000 }, DOMAIN);
    expect(camera.get()).toEqual(DOMAIN);
  });
});

describe('zoom levels', () => {
  it('steps by √2', () => {
    expect(levelOf(1)).toBe(0);
    expect(levelOf(LEVEL_STEP * 1.01)).toBe(1);
    expect(levelOf(10)).toBe(6);
    expect(levelPxPerYear(levelOf(10))).toBeLessThanOrEqual(10);
    expect(levelPxPerYear(levelOf(10) + 1)).toBeGreaterThan(10);
  });

  it('never lets two markers on a lane come closer than the gap within a level', () => {
    // Events every 0.37 years: dense enough to cluster at every level.
    const items = Array.from({ length: 400 }, (_, i) => ({
      id: `e${i}`,
      year: 1950 + i * 0.37,
    }));
    const lanes = new Map([['a', items]]);
    for (const level of [0, 3, 6, 9, 12]) {
      const clusters = clusterLanes(lanes, level, 40, (e) => e.id);
      const low = levelPxPerYear(level);
      for (const ppy of [low, low * 1.2, low * LEVEL_STEP * 0.999]) {
        for (let i = 1; i < clusters.length; i++) {
          const gap = (clusters[i].year - clusters[i - 1].year) * ppy;
          expect(gap).toBeGreaterThan(40);
        }
      }
      expect(clusters.flatMap((c) => c.items)).toHaveLength(400);
    }
  });
});
