import { RULER_PX } from '@/daw/shell/tracklist/rowLayout';
import type { Marker } from '@/daw/store/markersSlice';
import { PLAYHEAD_HANDLE_H, PLAYHEAD_HIT_PX } from '@/daw/utils/rulerLoop';
import { tickToPixel } from '@/daw/utils/timelineScale';

// ── Where a marker is on the ruler (milestone 2.13, plan finding F8) ───────
//
// A marker is drawn as a flag at its tick and its name just after it, in
// the ruler's bar-number lane. A press, the cursor and a right-click all
// find it here, over exactly what is drawn: they used to disagree (a press
// within 10 px of the flag dragged it, the cursor showed a grab hand from 5
// px before it to 70 px after, and a right-click used the same 75 px), so a
// press on the name sought the playhead instead of taking the marker.

/** The flag's width, and where its name starts after the tick (Timeline). */
export const MARKER_FLAG_PX = 7;
export const MARKER_NAME_GAP_PX = 10;
/** Slack around what is drawn, so a flag at a bar line is easy to take. */
const SLACK_PX = 3;

/**
 * The marker drawn at canvas x `x`, given how wide each name is
 * (`nameWidth`, measured in the ruler's font): the topmost, the one drawn
 * last, when two overlap. Null over none. `x` is in the canvas's px.
 */
export function markerAtX(
  markers: readonly Marker[],
  x: number,
  zoom: number,
  scrollLeft: number,
  nameWidth: (name: string) => number,
): Marker | null {
  for (let i = markers.length - 1; i >= 0; i--) {
    const marker = markers[i];
    const mx = tickToPixel(marker.tick, zoom, scrollLeft);
    const end = Math.max(
      mx + MARKER_FLAG_PX,
      mx + MARKER_NAME_GAP_PX + nameWidth(marker.name),
    );
    if (x >= mx - SLACK_PX && x <= end + SLACK_PX) return marker;
  }
  return null;
}

/**
 * Whether a press at canvas x `x`, `localY` px under the ruler's top, is on
 * the playhead's grab handle: in the handle's rows at the foot of the
 * ruler, within its hit width of the playhead's x. The handle takes the
 * press before a marker there: a click on a marker puts the playhead on its
 * flag, and a drag from the handle must then move the playhead, not the
 * marker.
 */
export function onPlayheadHandle(
  x: number,
  localY: number,
  playheadX: number,
): boolean {
  return (
    localY >= RULER_PX - PLAYHEAD_HANDLE_H &&
    localY < RULER_PX &&
    Math.abs(x - playheadX) <= PLAYHEAD_HIT_PX
  );
}
