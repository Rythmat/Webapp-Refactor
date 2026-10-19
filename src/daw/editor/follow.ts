import { useEffect, useRef } from 'react';
import {
  isPlayheadRunning,
  subscribePlayhead,
} from '@/daw/engine/playheadClock';
import { useStore } from '@/daw/store';
import { tickToPixel } from '@/daw/utils/timelineScale';

// ── Follow the playhead (milestone 2.7) ────────────────────────────────────
//
// While the song plays, the timeline keeps the playhead on screen by pages:
// when the playhead passes 85% of the canvas's width (or is off screen, after
// a loop or a seek), the view flips so it sits near the left edge again
// (timeline-09, ia-flows-27). Between flips nothing moves, so the music can
// be read; the scroll is written to the store only on a flip, never per
// frame.
//
// Following pauses when the student takes the view (a scroll, a drag, a
// zoom, the scrollbar) and comes back when they press Play or Stop. The
// Follow toggle in Create's toolbar turns it off altogether (a per-user
// pref, on by default).

/** Where the playhead turns the page: this far across the canvas. */
export const FOLLOW_EDGE = 0.85;
/** Where a turned page puts the playhead: this far across. */
export const FOLLOW_LEAD = 0.1;

/**
 * The scroll that turns the page for a playhead at `playheadX` (px into the
 * song at the current zoom), or null while the playhead is still on the
 * page. A playhead before the page (a loop jumped back) turns it too.
 */
export function followScroll(
  playheadX: number,
  scrollLeft: number,
  width: number,
): number | null {
  if (width <= 0) return null;
  const onScreen = playheadX - scrollLeft;
  if (onScreen >= 0 && onScreen <= width * FOLLOW_EDGE) return null;
  return Math.max(0, playheadX - width * FOLLOW_LEAD);
}

let paused = false;

/** The student took the view: stop following until Play or Stop. */
export function pauseFollow(): void {
  paused = true;
}

/** Whether following is paused by the student's own scrolling. */
export function isFollowPaused(): boolean {
  return paused;
}

/** Play and Stop give the view back to the playhead. */
export function resumeFollow(): void {
  paused = false;
}

/**
 * Follows the playhead in the timeline while it is mounted: subscribes to
 * the playhead clock only while the song plays with Follow on. `width` is
 * the canvas's width now.
 */
export function useFollowPlayhead(width: () => number): void {
  const follow = useStore((s) => s.followPlayhead);
  const widthRef = useRef(width);
  widthRef.current = width;
  const playing = useStore((s) => s.isPlaying);

  // Play and Stop both resume, whatever paused it.
  useEffect(() => {
    resumeFollow();
  }, [playing]);

  useEffect(() => {
    if (!follow || !playing) return;
    return subscribePlayhead((tick) => {
      if (paused || !isPlayheadRunning()) return;
      const s = useStore.getState();
      const x = tickToPixel(tick, s.timelineZoom, 0);
      const next = followScroll(x, s.timelineScrollLeft, widthRef.current());
      if (next !== null && next !== s.timelineScrollLeft) {
        s.setTimelineScrollLeft(next);
      }
    });
  }, [follow, playing]);
}
