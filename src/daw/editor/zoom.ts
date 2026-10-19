import {
  BASE_PIXELS_PER_BEAT,
  TICKS_PER_BEAT,
} from '@/daw/utils/timelineScale';

// ── The timeline's zoom (milestone 2.7) ────────────────────────────────────
//
// The one place that says how far the timeline zooms, what a step of the
// toolbar's −/+ (and ⌥− / ⌥=) is, where a zoom keeps the music still, and
// what "fit the song" means. The store's zoomAtPoint and zoomToFit, the
// toolbar, the keys, the wheel and the ruler drag all come here.
//
// A zoom keeps the tick under its anchor where it was on screen. The old
// sum scaled the scroll as well as the anchor, so zooming a scrolled
// timeline slid the music away from the pointer (timeline-15). Fit used to
// assume an 800 px timeline; it now takes the width the canvas measures
// (shell-32).

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;
/** One step of the toolbar's + (and ⌥=): a quarter more. */
export const ZOOM_STEP = 0.25;
/** One step of − (and ⌥−): exactly undoes a + step. */
export const ZOOM_OUT_STEP = -ZOOM_STEP / (1 + ZOOM_STEP);

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export interface ZoomView {
  zoom: number;
  /** The timeline's horizontal scroll, in px at this zoom. */
  scrollLeft: number;
}

/**
 * `view` zoomed by `delta` (0.25 = a quarter more, −0.2 = a fifth less),
 * keeping the music at `anchorX` (px from the timeline's left edge, on
 * screen) where it is. Never scrolls before the song's start.
 */
export function zoomAround(
  view: ZoomView,
  delta: number,
  anchorX: number,
): ZoomView {
  const zoom = clampZoom(view.zoom * (1 + delta));
  const ratio = zoom / view.zoom;
  // The anchor's place in the song, in px at the old zoom, scaled to the new
  // one, less its place on screen.
  const scrollLeft = (view.scrollLeft + anchorX) * ratio - anchorX;
  return { zoom, scrollLeft: Math.max(0, scrollLeft) };
}

/** The zoom that shows `songTicks` across `viewportWidth` px. */
export function fitZoom(viewportWidth: number, songTicks: number): number {
  if (viewportWidth <= 0 || songTicks <= 0) return 1;
  return clampZoom(
    (viewportWidth * TICKS_PER_BEAT) / (songTicks * BASE_PIXELS_PER_BEAT),
  );
}

/** The zoom as the toolbar shows it: '100%'. */
export function zoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
