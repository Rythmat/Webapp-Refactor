// ── The track list's rows (milestone 2.6) ──────────────────────────────────
//
// Create's track rows and the timeline's lanes are one list: each row is as
// tall as its lane, and both are placed from the same height array, so a
// header and its lane can't drift apart (timeline-12). Every row is 86 px
// today (Suno's header, 2026-10-21); the array is there for rows that grow
// or shrink (inline automation, a collapsed track), so the canvas and the
// list never assume one height again.
//
// The heights of the bars above and below the rows live here too, so the
// shell, the canvas and the harness agree on them.

/** The track column's width (Suno's, 2026-10-21): the headers and Main. */
export const TRACK_COLUMN_PX = 260;

/**
 * A track row (Suno's header): number, name, mute, solo, arm and input on
 * top; the volume pill and pan dial below.
 */
export const TRACK_ROW_PX = 86;
/** + Add track's slot under the last track: a row high (AddTrackMenu). */
export const ADD_TRACK_SLOT_PX = TRACK_ROW_PX;
/** The Master strip pinned at the track column's foot (MasterRow). */
export const MASTER_STRIP_PX = 80;

/**
 * Under the lanes: the song at a glance (TimelineOverview), with zoom and
 * Follow beside it (milestone 2.13; 32 px since 2026-10-22, Suno's strip).
 */
export const SCROLL_FOOTER_PX = 32;
/**
 * How much of the Master strip stands beside the lanes: it sits at the
 * track area's foot, level with the song overview (owner, 2026-10-22, as
 * Suno's Main does), the rest of it in the footer's row.
 */
export const MASTER_OVER_LANES_PX = MASTER_STRIP_PX - SCROLL_FOOTER_PX;
/**
 * The track column under its rows: + Add track and room for the Master
 * strip over the lanes' foot. The timeline's canvas reaches this far below
 * the lanes too, so the grid shows as far down as the column scrolls (it
 * left a blank band, 2026-10-21).
 */
export const TRACK_FOOT_PX = ADD_TRACK_SLOT_PX + MASTER_OVER_LANES_PX;
/**
 * The song's sections, above the ruler (milestone 2.13), in the row Create's
 * toolbar had before it folded away.
 */
export const SECTIONS_LANE_PX = 24;
/**
 * The comment lane's slot, above the sections: shown only while the Comments
 * panel is open (milestone 4.3 fills it).
 */
export const COMMENT_LANE_PX = 24;
/** The ruler: the loop strip and the bar numbers. */
export const RULER_PX = 32;
/** The chord lane, under the ruler. */
export const CHORD_LANE_PX = 24;
/**
 * The rulers the lanes scroll under, which the timeline's canvas draws: the
 * ruler and the chord lane.
 */
export const LANE_HEADER_PX = RULER_PX + CHORD_LANE_PX;

/**
 * The lane header a student sees over the lanes: the sections lane, the
 * ruler and the chord lane, 80 px (decision 16's budget), and the comment
 * lane's 24 more while it shows.
 */
export function laneHeaderPx(commentLane = false): number {
  return (
    (commentLane ? COMMENT_LANE_PX : 0) + SECTIONS_LANE_PX + LANE_HEADER_PX
  );
}

export interface RowLayout {
  /** Each row's top, from the first row's top. */
  readonly tops: readonly number[];
  readonly heights: readonly number[];
  /** All the rows together. */
  readonly total: number;
}

const layouts = new WeakMap<readonly unknown[], RowLayout>();

/**
 * The rows for a list of tracks, in its order. Kept per array, so the canvas
 * and the list share one layout until the tracks change.
 */
export function rowLayoutOf(tracks: readonly unknown[]): RowLayout {
  const kept = layouts.get(tracks);
  if (kept) return kept;
  const heights = tracks.map(() => TRACK_ROW_PX);
  const tops: number[] = [];
  let total = 0;
  for (const height of heights) {
    tops.push(total);
    total += height;
  }
  const layout = { tops, heights, total };
  layouts.set(tracks, layout);
  return layout;
}

/**
 * The row at `y` (px from the first row's top), or -1 above the first row
 * and `rows` below the last one.
 */
export function rowIndexAt(layout: RowLayout, y: number): number {
  if (y < 0) return -1;
  if (y >= layout.total) return layout.heights.length;
  // Binary search: the last row whose top is at or above y.
  let lo = 0;
  let hi = layout.tops.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (layout.tops[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The row at `y`, kept within the list (a drag past either end). */
export function clampedRowAt(layout: RowLayout, y: number): number {
  const rows = layout.heights.length;
  if (rows === 0) return 0;
  return Math.max(0, Math.min(rows - 1, rowIndexAt(layout, y)));
}
