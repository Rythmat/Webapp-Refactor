// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assignSlots, orbitGeometry, slotAngle } from '../orbitSlots';

/** The app's html font-size is 110%. */
const REM = 17.6;
/** As `fitCentre` places it. */
const centre = (w: number, h: number) => ({ x: w / 2, y: (h + 24) / 2 });
const geometry = (w: number, h: number) =>
  orbitGeometry(w, h, REM, centre(w, h));

const total = (g: ReturnType<typeof orbitGeometry>) =>
  g.capacity.inner + g.capacity.outer;

describe('orbitGeometry', () => {
  it('holds two rings on a laptop, and keeps them clear of the side card', () => {
    const g = geometry(1183, 463);
    expect(g.capacity.inner).toBeGreaterThan(0);
    expect(total(g)).toBeGreaterThanOrEqual(15);
    expect(g.cx - g.outerRadius).toBeGreaterThan(17.75 * REM);
  });

  it('flattens no further than 1.8:1', () => {
    const g = geometry(2400, 320);
    expect(1 / g.flatten).toBeLessThanOrEqual(1.8 + 1e-9);
  });

  it('flattens a short strip to hold more than a circle would', () => {
    const g = geometry(1269, 387);
    expect(g.flatten).toBeLessThan(1);
    expect(total(g)).toBeGreaterThanOrEqual(15);
  });

  it('is a circle on a phone, inside the screen', () => {
    const g = geometry(358, 467);
    expect(g.flatten).toBe(1);
    expect(g.outerRadius + (5 * REM) / 2).toBeLessThanOrEqual(358 / 2);
    expect(g.capacity.outer).toBeGreaterThanOrEqual(6);
  });

  it('falls back to one ring when the inner would hit the core', () => {
    const g = geometry(358, 300);
    expect(g.innerRadius).toBe(0);
    expect(g.capacity.inner).toBe(0);
    expect(g.capacity.outer).toBeGreaterThan(0);
  });

  it('holds nothing in a box with no room, rather than a negative count', () => {
    const g = geometry(40, 40);
    expect(g.capacity).toEqual({ inner: 0, outer: 0 });
    expect(g.outerRadius).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(g.flatten)).toBe(true);
  });

  it('never squeezes a side card’s box narrower than a circle', () => {
    const g = geometry(1030, 700);
    expect(g.outerRadius).toBeGreaterThanOrEqual(
      g.outerRadius * g.flatten - 1e-9,
    );
    expect(g.capacity.outer).toBeGreaterThan(0);
  });
});

describe('assignSlots', () => {
  const ranked = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('takes the best, up to capacity', () => {
    expect(assignSlots(ranked, [], 3)).toEqual(['a', 'b', 'c']);
    expect(assignSlots(ranked, [], 0)).toEqual([]);
  });

  it('brings a pin in over the lowest rank, moving nothing else', () => {
    expect(assignSlots(ranked, ['f'], 3)).toEqual(['a', 'b', 'f']);
    expect(assignSlots(ranked, ['e', 'f'], 3)).toEqual(['a', 'f', 'e']);
  });

  it('leaves a pin that is already shown where it is', () => {
    expect(assignSlots(ranked, ['b'], 3)).toEqual(['a', 'b', 'c']);
  });

  it('never displaces one pin for another, and caps pins at capacity', () => {
    expect(assignSlots(ranked, ['a', 'd', 'e', 'f'], 2).sort()).toEqual([
      'a',
      'd',
    ]);
  });

  it('uses a free slot before displacing anything', () => {
    expect(assignSlots(['a'], ['z'], 3)).toEqual(['a', 'z']);
  });

  it('shows a pin that was never ranked', () => {
    expect(assignSlots(['a', 'b'], ['z'], 2)).toEqual(['a', 'z']);
  });

  it('keeps the arranged order when a pin arrives', () => {
    const reverse = (ids: readonly string[]) => [...ids].reverse();
    expect(assignSlots(ranked, [], 3, reverse)).toEqual(['c', 'b', 'a']);
    // 'c' ranks lowest, and its slot is the first after arranging.
    expect(assignSlots(ranked, ['f'], 3, reverse)).toEqual(['f', 'b', 'a']);
  });

  it('gives one answer for one input', () => {
    expect(assignSlots(ranked, ['f'], 3)).toEqual(
      assignSlots(ranked, ['f'], 3),
    );
  });
});

describe('slotAngle', () => {
  it('starts the outer ring at the top and staggers the inner', () => {
    expect(slotAngle(0, 4, 'outer')).toBeCloseTo(-Math.PI / 2);
    expect(slotAngle(0, 4, 'inner')).toBeCloseTo(-Math.PI / 2 + Math.PI / 4);
  });

  it('spreads however many are used evenly around the ring', () => {
    expect(slotAngle(1, 2, 'outer') - slotAngle(0, 2, 'outer')).toBeCloseTo(
      Math.PI,
    );
  });
});
