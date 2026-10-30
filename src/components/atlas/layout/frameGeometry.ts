/**
 * The Globe's frame, the Studio's (owner, 2026-10-29): the top rail, the
 * stage card with its gutter and the bottom rail.
 * frameGeometry.test.ts holds the rails to the Studio's own sizes
 * (src/daw/shell/layout/layoutModel.ts).
 */
export const FRAME_PX = {
  top: 44,
  bottom: 44,
  /** The stage card's gutter at each side, and the Inspector's inset. */
  gutter: 8,
} as const;

/**
 * The Inspector's width. Wider than the Studio's 300 px: an event row (its
 * still, its title, its links) and two cards across need the room.
 */
export const INSPECTOR_PX = { min: 320, default: 400, max: 640 } as const;

/** The widest the Inspector grows over a map area `areaPx` wide. */
export const inspectorMaxPx = (areaPx: number): number =>
  Math.max(
    INSPECTOR_PX.min,
    Math.min(INSPECTOR_PX.max, Math.round(areaPx * 0.7)),
  );

/** A width the Inspector can take over a map area `areaPx` wide. */
export const clampInspectorPx = (px: number, areaPx: number): number =>
  Math.round(Math.min(Math.max(px, INSPECTOR_PX.min), inspectorMaxPx(areaPx)));

/** Enlarged (an event's video, read in full): most of the map's width. */
export const INSPECTOR_ENLARGED = 'min(66vw, 900px)';
