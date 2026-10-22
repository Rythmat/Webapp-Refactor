import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

// ── The top bar's measured overflow (milestone 2.5) ────────────────────────
//
// The bar never clips or wraps: when its zones don't fit the window, it
// folds, a step at a time, in a fixed order (FOLD_STEPS): first labels
// become icons, then the rarely used buttons move into the '⋯' menu. Each
// step's width is measured once, at that step, and cached, so a resize
// picks the right step from the cache; a change of content (a longer
// project name, a collab session's avatars) measures again. Measuring
// happens in a layout effect, before the browser paints, so a first paint
// never shows the bar clipped.

/**
 * The fold steps, in order; a step folds everything before it too. What
 * never goes into '⋯': Back, the Project menu, the name, the save chip,
 * Undo and Redo, the transport, the song, Share, Export (its label folds,
 * last) and the avatar. (Help, Settings and
 * the computer keyboard's switch live in '⋯' at every width since the bar
 * was trimmed, 2.7; the transport and the song moved to the bottom rail and
 * the Inspector's toggle to the side rail, B4a.)
 */
export const FOLD_STEPS = [
  /** The project name: 96 px instead of 140. */
  'name-narrow',
  /** The song's key: its short name ('C', not 'C major'). */
  'key-short',
  /** The Export pill: its icon only (2.15). */
  'export-icon',
] as const;

export type FoldStep = (typeof FOLD_STEPS)[number];

/** The most folds there are. */
export const MAX_FOLD = FOLD_STEPS.length;

/** Whether `step` is folded at fold level `level` (0 folds nothing). */
export function folded(level: number, step: FoldStep): boolean {
  return FOLD_STEPS.indexOf(step) < level;
}

/**
 * The fold level for `available` px, given each level's measured width
 * (`widths[level]`, undefined until measured): the first level that fits.
 * An unmeasured level before it is chosen to be measured, so the bar never
 * folds more than it has to; past every level it takes the last.
 */
export function foldLevelFor(
  available: number,
  widths: ReadonlyArray<number | undefined>,
  maxFold: number = MAX_FOLD,
): number {
  for (let level = 0; level <= maxFold; level++) {
    const width = widths[level];
    if (width === undefined || width <= available) return level;
  }
  return maxFold;
}

/**
 * The bar's fold level. `barRef` is the bar, whose inner width is what the
 * zones may take; `zoneRefs` are its zones, whose content widths (plus
 * `chromePx` of padding and the least room between them) are what they
 * need. `maxFold` is how many steps the bar has (the top bar's FOLD_STEPS
 * by default; Create's toolbar has its own).
 */
export function useToolbarOverflow(
  barRef: RefObject<HTMLElement>,
  zoneRefs: ReadonlyArray<RefObject<HTMLElement>>,
  chromePx: number,
  maxFold: number = MAX_FOLD,
  /**
   * Three zones with the middle one centred in the bar (the top bar's
   * transport): the sides need room for twice the wider of them.
   */
  centred = false,
): number {
  const [level, setLevel] = useState(0);
  const levelRef = useRef(level);
  levelRef.current = level;
  const widths = useRef<Array<number | undefined>>([]);

  const settle = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const style = getComputedStyle(bar);
    const available =
      bar.clientWidth -
      parseFloat(style.paddingLeft || '0') -
      parseFloat(style.paddingRight || '0');
    if (available <= 0) return;
    const zoneWidths = zoneRefs.map((zone) => zone.current?.scrollWidth ?? 0);
    let needed =
      centred && zoneWidths.length === 3
        ? chromePx + zoneWidths[1] + 2 * Math.max(zoneWidths[0], zoneWidths[2])
        : chromePx + zoneWidths.reduce((sum, w) => sum + w, 0);
    needed = Math.ceil(needed);
    const at = levelRef.current;
    // Content changed since this level was measured: every level is stale.
    if (widths.current[at] !== undefined && widths.current[at] !== needed) {
      widths.current = [];
    }
    widths.current[at] = needed;
    const next = foldLevelFor(available, widths.current, maxFold);
    if (next !== at) setLevel(next);
  }, [barRef, chromePx, zoneRefs, maxFold, centred]);

  // After every render of the bar, before paint.
  useLayoutEffect(settle);

  // The window and the zones' content: a frame later.
  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(settle);
    });
    if (barRef.current) observer.observe(barRef.current);
    for (const zone of zoneRefs) {
      if (zone.current) observer.observe(zone.current);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [barRef, settle, zoneRefs]);

  return level;
}
