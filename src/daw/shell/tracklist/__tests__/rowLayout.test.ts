import { describe, expect, it } from 'vitest';
import { dropGap, gapTop, indexAfterDrop } from '../reorder';
import {
  clampedRowAt,
  rowIndexAt,
  rowLayoutOf,
  TRACK_ROW_PX,
} from '../rowLayout';

// ── The rows' geometry and where a dragged row lands (milestone 2.6) ───────

const tracks = ['a', 'b', 'c', 'd'];

describe('the row layout', () => {
  const layout = rowLayoutOf(tracks);

  it('places 86 px rows one under another (Suno’s header)', () => {
    expect(TRACK_ROW_PX).toBe(86);
    expect(layout.tops).toEqual([0, 86, 172, 258]);
    expect(layout.total).toBe(344);
  });

  it('is shared while the tracks array is the same', () => {
    expect(rowLayoutOf(tracks)).toBe(layout);
    expect(rowLayoutOf([...tracks])).not.toBe(layout);
  });

  it('finds the row at a y, and says when it is above or below them', () => {
    expect(rowIndexAt(layout, 0)).toBe(0);
    expect(rowIndexAt(layout, 85.9)).toBe(0);
    expect(rowIndexAt(layout, 86)).toBe(1);
    expect(rowIndexAt(layout, 343)).toBe(3);
    expect(rowIndexAt(layout, -1)).toBe(-1);
    expect(rowIndexAt(layout, 344)).toBe(4);
    expect(clampedRowAt(layout, -50)).toBe(0);
    expect(clampedRowAt(layout, 9999)).toBe(3);
    expect(clampedRowAt(rowLayoutOf([]), 10)).toBe(0);
  });
});

describe('reordering', () => {
  const layout = rowLayoutOf(tracks);

  it('drops above a row from its top half, below it from its bottom half', () => {
    expect(dropGap(layout, 10)).toBe(0);
    expect(dropGap(layout, 50)).toBe(1);
    expect(dropGap(layout, 95)).toBe(1);
    expect(dropGap(layout, 335)).toBe(4);
    expect(dropGap(layout, -20)).toBe(0);
    expect(dropGap(layout, 900)).toBe(4);
    expect(gapTop(layout, 2)).toBe(172);
    expect(gapTop(layout, 4)).toBe(344);
  });

  it('gives the index the row ends up at once it has left its place', () => {
    // Row 0 dropped below row 2 (gap 3) ends up third.
    expect(indexAfterDrop(0, 3)).toBe(2);
    // Row 3 dropped above row 1 (gap 1) ends up second.
    expect(indexAfterDrop(3, 1)).toBe(1);
    // Dropped where it was: no move.
    expect(indexAfterDrop(2, 2)).toBe(2);
    expect(indexAfterDrop(2, 3)).toBe(2);
  });
});
