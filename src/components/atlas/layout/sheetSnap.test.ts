import { describe, expect, it } from 'vitest';
import {
  SHEET_FLING_PX_PER_MS,
  SHEET_PEEK_PX,
  sheetHeights,
  snapSheet,
  stepSheet,
} from './sheetSnap';

describe('the bottom sheet heights', () => {
  it('peeks at 96 px, halves the area, and leaves a sliver at full', () => {
    expect(sheetHeights(700)).toEqual({ peek: 96, half: 350, full: 692 });
  });

  it('never orders the heights wrong in a short area', () => {
    const h = sheetHeights(150);
    expect(h.peek).toBe(SHEET_PEEK_PX);
    expect(h.half).toBeGreaterThanOrEqual(h.peek);
    expect(h.full).toBeGreaterThanOrEqual(h.half);
  });
});

describe('where a drag lands', () => {
  const h = sheetHeights(700); // 96 / 350 / 692

  it('lands on the nearest height when let go slowly', () => {
    expect(snapSheet(h, 120)).toBe('peek');
    expect(snapSheet(h, 300)).toBe('half');
    expect(snapSheet(h, 600)).toBe('full');
    expect(snapSheet(h, 30)).toBe('peek');
  });

  it('carries a flick on to the next height in its direction', () => {
    const fast = SHEET_FLING_PX_PER_MS + 0.1;
    // Just above half, flicked up: full, though half is nearer.
    expect(snapSheet(h, 360, fast)).toBe('full');
    // Just below half, flicked down: peek.
    expect(snapSheet(h, 340, -fast)).toBe('peek');
    // Flicked past the ends: stays at the end.
    expect(snapSheet(h, 692, fast)).toBe('full');
    expect(snapSheet(h, 90, -fast)).toBe('peek');
  });

  it('treats a slow release as no flick', () => {
    expect(snapSheet(h, 360, SHEET_FLING_PX_PER_MS / 2)).toBe('half');
  });
});

describe('the expand and collapse buttons', () => {
  it('step one height at a time and stop at the ends', () => {
    expect(stepSheet('peek', 1)).toBe('half');
    expect(stepSheet('half', 1)).toBe('full');
    expect(stepSheet('full', 1)).toBe('full');
    expect(stepSheet('full', -1)).toBe('half');
    expect(stepSheet('peek', -1)).toBe('peek');
  });
});
