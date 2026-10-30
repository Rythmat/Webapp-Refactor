/**
 * How the floating cards sit over the map (owner, 2026-10-29: the Studio
 * frame with floating cards): a column at the stage's left, narrower when
 * the Inspector leaves less room, folded to an "At a glance" pill when it
 * leaves too little; none on the river, on a phone (for now), or when the
 * viewer hides them.
 */
export type CardsMode = 'hidden' | 'full' | 'compact' | 'collapsed';

/** The column's width, in rem, full and compact. */
export const CARDS_REM = { full: 17, compact: 15 } as const;
/** The least map, in px, the column leaves beside it, full and compact. */
const MAP_LEFT = { full: 480, compact: 320 } as const;
/** The stage's gutter and the gaps round the column, px. */
const GAP = 8;

export function cardsMode(v: {
  hidden: boolean;
  river: boolean;
  phone: boolean;
  /** The map area's width, px. */
  stageWidth: number;
  /** What the Inspector covers of its right, px. */
  inspectorPx: number;
  /** A rem in px (the app is set at 110%). */
  remPx: number;
}): CardsMode {
  if (v.hidden || v.river || v.phone) return 'hidden';
  const left = (rem: number) =>
    v.stageWidth - v.inspectorPx - rem * v.remPx - 3 * GAP;
  if (left(CARDS_REM.full) >= MAP_LEFT.full) return 'full';
  if (left(CARDS_REM.compact) >= MAP_LEFT.compact) return 'compact';
  return 'collapsed';
}
