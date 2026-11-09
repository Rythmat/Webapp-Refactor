/**
 * How the floating card sits over the map (owner, 2026-10-30: the region is
 * the hero): one card in the stage's top-right corner, folded to an "At a
 * glance" pill when the events card leaves it too little room; none on the
 * river, on a phone (it has a strip), or when the viewer hides it.
 */
export type CardsMode = 'hidden' | 'shown' | 'collapsed';

/** The card's width, in rem. */
export const CARDS_REM = 17;
/** The least clear width, px, kept between the two cards. */
const CLEAR_MIN = 160;
/** The stage's gutter and the gaps round the card, px. */
const GAP = 8;

export function cardsMode(v: {
  hidden: boolean;
  river: boolean;
  phone: boolean;
  /** The map area's width, px. */
  stageWidth: number;
  /** The events card's width when it is open, px. */
  inspectorPx: number;
  /** A rem in px (the app is set at 110%). */
  remPx: number;
}): CardsMode {
  if (v.hidden || v.river || v.phone) return 'hidden';
  const clear = v.stageWidth - v.inspectorPx - CARDS_REM * v.remPx - 3 * GAP;
  return clear >= CLEAR_MIN ? 'shown' : 'collapsed';
}
