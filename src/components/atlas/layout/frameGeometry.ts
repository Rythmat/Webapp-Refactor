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
 * The Inspector's fixed size, a card in the stage's bottom-left corner (owner,
 * 2026-10-30: the region is the hero; the card never grows over it). A
 * lesson's mind map is a board, and keeps a tall column of `mindmapPx`.
 */
export const INSPECTOR_REM = { width: 24, height: 26 } as const;
export const MINDMAP_PX = 400;

/**
 * How much of a corner card's width the map frames around. The events card
 * and the Connections card sit in opposite corners, leaving the other two
 * free, so framing around their full width would shrink the region for
 * nothing; a region may pass beside a card at its widest.
 */
export const CORNER_INSET_SHARE = 0.6;
