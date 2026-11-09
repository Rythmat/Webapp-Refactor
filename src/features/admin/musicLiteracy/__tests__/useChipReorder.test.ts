import { describe, expect, it } from 'vitest';
import { slotAt } from '../useChipReorder';

/**
 * Where a dragged chip would land, from where the pointer is over a row of
 * chips that wraps: the gap before the first chip whose middle is past the
 * pointer, on the row under it (or the nearest row).
 */

/** Chips 100px wide with 10px between, `perRow` to a row 120px tall. */
const row = (count: number, perRow: number) =>
  Array.from({ length: count }, (_, i) => {
    const left = (i % perRow) * 110;
    const top = Math.floor(i / perRow) * 130;
    return { left, right: left + 100, top, bottom: top + 120 };
  });

describe('where a drop lands', () => {
  it('finds the gap on one row', () => {
    const boxes = row(3, 5);
    expect(slotAt(boxes, 10, 50)).toBe(0);
    expect(slotAt(boxes, 60, 50)).toBe(1);
    expect(slotAt(boxes, 150, 50)).toBe(1);
    expect(slotAt(boxes, 200, 50)).toBe(2);
    // Past the last chip, and in the empty rest of the row.
    expect(slotAt(boxes, 280, 50)).toBe(3);
    expect(slotAt(boxes, 900, 50)).toBe(3);
  });

  it('finds the gap on the row the pointer is over when chips wrap', () => {
    const boxes = row(7, 4);
    // The second row holds chips 4, 5 and 6.
    expect(slotAt(boxes, 10, 180)).toBe(4);
    expect(slotAt(boxes, 120, 180)).toBe(5);
    expect(slotAt(boxes, 900, 180)).toBe(7);
    // The end of the first row is the gap before chip 4.
    expect(slotAt(boxes, 900, 50)).toBe(4);
  });

  it('takes the nearest row when the pointer is above, below or between', () => {
    const boxes = row(7, 4);
    expect(slotAt(boxes, 60, -40)).toBe(1);
    expect(slotAt(boxes, 60, 400)).toBe(5);
    expect(slotAt(boxes, 60, 124)).toBe(1);
    expect(slotAt([], 0, 0)).toBe(0);
  });
});
