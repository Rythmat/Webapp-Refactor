import { rowIndexAt, type RowLayout } from './rowLayout';

// ── Where a dragged row lands (milestone 2.6) ──────────────────────────────
//
// A row dragged by its grip is dropped between two rows: above the row under
// the pointer when the pointer is in its top half, below it otherwise. The
// drop line is drawn at that gap; the store's reorderTrack takes the index
// the row ends up at, once it has left its old place.

/** The gap (0 = above the first row, rows = below the last) at `y`. */
export function dropGap(layout: RowLayout, y: number): number {
  const rows = layout.heights.length;
  const row = rowIndexAt(layout, y);
  if (row < 0) return 0;
  if (row >= rows) return rows;
  const middle = layout.tops[row] + layout.heights[row] / 2;
  return y < middle ? row : row + 1;
}

/** The index the row at `from` takes when dropped in `gap`. */
export function indexAfterDrop(from: number, gap: number): number {
  return gap > from ? gap - 1 : gap;
}

/** The drop line's y for `gap`: the top of the row below it. */
export function gapTop(layout: RowLayout, gap: number): number {
  return gap < layout.tops.length ? layout.tops[gap] : layout.total;
}
