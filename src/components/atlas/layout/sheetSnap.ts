/**
 * The phone bottom sheet's heights, and which one a drag lands on. Pure, so
 * the snapping is tested without a pointer.
 */

export type SheetSnap = 'peek' | 'half' | 'full';

export const SHEET_SNAPS: readonly SheetSnap[] = ['peek', 'half', 'full'];

/** The peek height: the handle and the panel's title. */
export const SHEET_PEEK_PX = 96;
/** What full leaves of the map above the sheet. */
export const SHEET_FULL_GAP_PX = 8;
/**
 * A release faster than this (px/ms, about a flick) carries on to the next
 * height in its direction, whatever height it was let go at.
 */
export const SHEET_FLING_PX_PER_MS = 0.5;

export type SheetHeights = Record<SheetSnap, number>;

/** The three heights in a container `containerPx` tall. */
export function sheetHeights(containerPx: number): SheetHeights {
  const full = Math.max(SHEET_PEEK_PX, containerPx - SHEET_FULL_GAP_PX);
  const half = Math.min(full, Math.max(SHEET_PEEK_PX, containerPx * 0.5));
  return { peek: SHEET_PEEK_PX, half: Math.round(half), full };
}

/**
 * Where a drag released at `heightPx` lands. `velocity` is px/ms, positive
 * while the sheet grows (the finger moving up).
 */
export function snapSheet(
  heights: SheetHeights,
  heightPx: number,
  velocity = 0,
): SheetSnap {
  if (Math.abs(velocity) >= SHEET_FLING_PX_PER_MS) {
    const up = velocity > 0;
    const ordered = up ? SHEET_SNAPS : [...SHEET_SNAPS].reverse();
    const next = ordered.find((snap) =>
      up ? heights[snap] > heightPx : heights[snap] < heightPx,
    );
    return next ?? ordered[ordered.length - 1];
  }
  let best: SheetSnap = 'peek';
  for (const snap of SHEET_SNAPS) {
    if (
      Math.abs(heights[snap] - heightPx) < Math.abs(heights[best] - heightPx)
    ) {
      best = snap;
    }
  }
  return best;
}

/** One step up or down from `snap`, for the expand and collapse buttons. */
export function stepSheet(snap: SheetSnap, direction: 1 | -1): SheetSnap {
  const i = SHEET_SNAPS.indexOf(snap) + direction;
  return SHEET_SNAPS[Math.max(0, Math.min(SHEET_SNAPS.length - 1, i))];
}
