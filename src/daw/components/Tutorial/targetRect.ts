// ── Tutorial target-rect helpers ────────────────────────────────────────────
// Shared by Spotlight (frame-accurate ring) and CoachCard (throttled position),
// so both resolve the current step's target the same way. `target` may be a
// list: the first id present in the DOM with a non-zero box wins — letting a
// step highlight a button, then follow into the modal card it opens.

export type Target = string | string[];

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const idsOf = (target?: Target): string[] =>
  !target ? [] : Array.isArray(target) ? target : [target];

/** First target element that exists AND has a non-zero box, in priority order. */
function resolveEl(target?: Target): Element | null {
  for (const id of idsOf(target)) {
    const el = document.querySelector(`[data-tutorial-id="${id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) return el;
    }
  }
  return null;
}

export function resolveTargetRect(target?: Target): Rect | null {
  const el = resolveEl(target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function scrollTargetIntoView(target?: Target): void {
  resolveEl(target)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);
