/** The print system's invariants. Order here is output, not presentation. */
import { describe, expect, it } from 'vitest';
import { INK, INK_NAMES, K, OUT, PITCH, REG, SCREEN, W } from '../constants.ts';

describe('ink tables', () => {
  /* Plate loops read INK_NAMES instead of casting Object.keys(INK). That substitution is only
     sound while the two orders agree — in bakeScene each plate multiplies onto the last, so
     reordering the inks changes the picture rather than just the iteration. */
  it('INK_NAMES order equals the INK literal order', () => {
    expect([...INK_NAMES]).toEqual(Object.keys(INK));
  });

  it('every ink has a screen angle and a registration offset', () => {
    for (const n of INK_NAMES) {
      expect(SCREEN[n]).toBeDefined();
      expect(REG[n]).toHaveLength(2);
    }
  });

  it('has no pure black — darks are overprints', () => {
    for (const n of INK_NAMES) expect(INK[n].toLowerCase()).not.toBe('#000000');
  });

  it('screen angles are rational tangents, so the dot tile wraps seamlessly', () => {
    for (const n of INK_NAMES) {
      const { a, b } = SCREEN[n];
      expect(Number.isInteger(a)).toBe(true);
      expect(Number.isInteger(b)).toBe(true);
      expect(a * a + b * b).toBeGreaterThan(0);
    }
  });

  it('keeps pitch tied to bake size, so a bigger print is not a finer screen', () => {
    expect(K).toBe(OUT / W);
    expect(PITCH).toBe(4.6 * K);
  });

  /* The brief specifies a 1-3px offset PER AXIS, not a Euclidean magnitude: pink is [-2.5, 2.0],
     which is 3.2 as a vector but within range on both axes. Indigo is deliberately [0, 0] - it is
     the reference plate the others are seen to miss against, which is what makes misregistration
     read as registration rather than as everything being blurry. */
  it('offsets every plate but the indigo reference by 1-3px on each axis', () => {
    for (const n of INK_NAMES) {
      const [dx, dy] = REG[n];
      if (n === 'indigo') {
        expect([dx, dy]).toEqual([0, 0]);
        continue;
      }
      expect(Math.max(Math.abs(dx), Math.abs(dy))).toBeGreaterThanOrEqual(1);
      expect(Math.abs(dx)).toBeLessThanOrEqual(3);
      expect(Math.abs(dy)).toBeLessThanOrEqual(3);
    }
  });
});
