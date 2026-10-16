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

  it('places 64 px rows one under another', () => {
    expect(TRACK_ROW_PX).toBe(64);
    expect(layout.tops).toEqual([0, 64, 128, 192]);
    expect(layout.total).toBe(256);
  });

  it('is shared while the tracks array is the same', () => {
    expect(rowLayoutOf(tracks)).toBe(layout);
    expect(rowLayoutOf([...tracks])).not.toBe(layout);
  });

  it('finds the row at a y, and says when it is above or below them', () => {
    expect(rowIndexAt(layout, 0)).toBe(0);
    expect(rowIndexAt(layout, 63.9)).toBe(0);
    expect(rowIndexAt(layout, 64)).toBe(1);
    expect(rowIndexAt(layout, 255)).toBe(3);
    expect(rowIndexAt(layout, -1)).toBe(-1);
    expect(rowIndexAt(layout, 256)).toBe(4);
    expect(clampedRowAt(layout, -50)).toBe(0);
    expect(clampedRowAt(layout, 9999)).toBe(3);
    expect(clampedRowAt(rowLayoutOf([]), 10)).toBe(0);
  });
});

describe('reordering', () => {
  const layout = rowLayoutOf(tracks);

  it('drops above a row from its top half, below it from its bottom half', () => {
    expect(dropGap(layout, 10)).toBe(0);
    expect(dropGap(layout, 40)).toBe(1);
    expect(dropGap(layout, 70)).toBe(1);
    expect(dropGap(layout, 250)).toBe(4);
    expect(dropGap(layout, -20)).toBe(0);
    expect(dropGap(layout, 900)).toBe(4);
    expect(gapTop(layout, 2)).toBe(128);
    expect(gapTop(layout, 4)).toBe(256);
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
