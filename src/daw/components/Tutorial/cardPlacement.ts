import type { Rect } from './anchorRegistry';

// ── Where the coach card goes ──────────────────────────────────────────────
// The card keeps clear of the step's target, and of whatever the student has
// open on top of the Studio: the Add Track sheet, the Instrument picker, a
// menu, a popover, a dialog. Those come and go while a step waits (the
// target is the Add Track button; the sheet it opens fills the bottom of the
// screen), so the card is placed against all of them, not the target alone.
//
// The card tries its usual spot first (below or above the target, centered
// on it), then spots around the target, then the window's corners and edges,
// and takes the first that covers nothing. When every spot covers something
// (a big dialog), it takes the one that covers the least, and never the
// target if any spot can help it.

/** Kept between the card and the window's edge, and between it and a target. */
export const CARD_MARGIN = 16;

/**
 * What the student can have open over the Studio. A component that floats
 * over the editor without one of these roles can opt in with
 * `data-tutorial-avoid`.
 */
const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[data-radix-popper-content-wrapper]',
  '[data-tutorial-avoid]',
].join(',');

/** The lesson's own layer (the card, the end card, the demo's stage). */
const LESSON_LAYER = '[data-tutorial-layer]';

/**
 * An overlay that fills most of the window (a full-screen sheet) leaves
 * nowhere to go; it is left out rather than pushing the card to a corner it
 * would cover anyway.
 */
const MAX_OVERLAY_SHARE = 0.85;

/** The open overlays' boxes, as the student sees them now. */
export function openOverlayRects(
  root: ParentNode = document,
  view = { w: window.innerWidth, h: window.innerHeight },
): Rect[] {
  const boxes: Rect[] = [];
  root.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR).forEach((el) => {
    if (el.closest(LESSON_LAYER)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    if (r.width * r.height > MAX_OVERLAY_SHARE * view.w * view.h) return;
    boxes.push({ top: r.top, left: r.left, width: r.width, height: r.height });
  });
  return boxes;
}

const overlap = (a: Rect, b: Rect) =>
  Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  ) *
  Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  );

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * The card's spot: its usual one when that covers nothing, else the first
 * free spot around the target or the window, else the one covering least.
 * `preferred` is the usual spot (CoachCard's computeCardPos).
 */
export function placeCard(
  preferred: { top: number; left: number },
  card: { w: number; h: number },
  view: { w: number; h: number },
  target: Rect | null,
  overlays: readonly Rect[],
): { top: number; left: number } {
  const m = CARD_MARGIN;
  const maxLeft = Math.max(m, view.w - card.w - m);
  const maxTop = Math.max(m, view.h - card.h - m);
  const at = (top: number, left: number) => ({
    top: Math.round(clamp(top, m, maxTop)),
    left: Math.round(clamp(left, m, maxLeft)),
  });

  const spots = [at(preferred.top, preferred.left)];
  if (target) {
    const below = target.top + target.height + m;
    const above = target.top - card.h - m;
    const toRight = target.left + target.width + m;
    const toLeft = target.left - card.w - m;
    const middle = target.top + target.height / 2 - card.h / 2;
    const lefts = [
      target.left + target.width / 2 - card.w / 2,
      target.left,
      target.left + target.width - card.w,
      m,
      maxLeft,
    ];
    for (const top of [below, above]) {
      for (const left of lefts) spots.push(at(top, left));
    }
    for (const left of [toRight, toLeft]) {
      for (const top of [
        middle,
        target.top,
        target.top + target.height - card.h,
        m,
        maxTop,
      ]) {
        spots.push(at(top, left));
      }
    }
  }
  for (const top of [m, (view.h - card.h) / 2, maxTop]) {
    for (const left of [m, (view.w - card.w) / 2, maxLeft]) {
      spots.push(at(top, left));
    }
  }

  // Covering the target costs far more than covering an overlay: the target
  // is what the step asks the student to click.
  const cost = (spot: { top: number; left: number }) => {
    const box = { ...spot, width: card.w, height: card.h };
    const onTarget = target ? overlap(box, target) : 0;
    const onOverlays = overlays.reduce((sum, o) => sum + overlap(box, o), 0);
    return onTarget * 1000 + onOverlays;
  };
  let best = spots[0];
  let bestCost = cost(best);
  for (const spot of spots) {
    if (bestCost === 0) break;
    const c = cost(spot);
    if (c < bestCost) {
      best = spot;
      bestCost = c;
    }
  }
  return best;
}
