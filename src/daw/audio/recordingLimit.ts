// ── recordingLimit.ts ───────────────────────────────────────────────────────
// Pure helpers for the per-track audio recording cap.
//
// A track's *total* recorded audio is capped at MAX_RECORDING_SECONDS. The cap
// is measured as the union of time covered by the track's audio clips (in
// seconds), so a single 5-minute budget can be split across several takes.
// Because a new take overwrites whatever it rolls over (see overwriteAudioRegion),
// time spent recording over already-covered regions does NOT consume budget —
// only newly-covered time does.

import type { Track } from '@/daw/store/tracksSlice';

export const MAX_RECORDING_SECONDS = 5 * 60; // 5 minutes

const TICKS_PER_QUARTER = 480;

/** Convert a tick count to seconds at the given tempo. */
export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / TICKS_PER_QUARTER) * (60 / bpm);
}

export interface Interval {
  start: number;
  end: number;
}

/** Merge overlapping/adjacent intervals into a sorted, disjoint set. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** The track's audio clips as time intervals (seconds), merged into a union. */
export function audioClipIntervalsSeconds(
  track: Track,
  bpm: number,
): Interval[] {
  const intervals = track.audioClips.map((c) => ({
    start: ticksToSeconds(c.startTick, bpm),
    end: ticksToSeconds(c.startTick + c.duration, bpm),
  }));
  return mergeIntervals(intervals);
}

/** Total seconds of audio currently on the track (union coverage). */
export function audioCoverageSeconds(track: Track, bpm: number): number {
  return audioClipIntervalsSeconds(track, bpm).reduce(
    (sum, iv) => sum + (iv.end - iv.start),
    0,
  );
}

/**
 * How long (in wall-clock seconds) a recording starting at `startSeconds` may
 * run before the track hits MAX_RECORDING_SECONDS of total coverage.
 *
 * The transport advances in real time, so 1 second of wall-clock = 1 second of
 * timeline. Walking forward from the start, time over an already-covered
 * interval is free (it just overwrites); time over a gap spends the remaining
 * budget. Returns the wall-clock duration at which recording must stop.
 *
 * Returns 0 when there is no budget left and the start point is not over
 * existing audio (nothing can be recorded). Returns Infinity only if `cap` is
 * Infinity.
 */
export function computeMaxRecordSeconds(
  existing: Interval[],
  startSeconds: number,
  cap = MAX_RECORDING_SECONDS,
): number {
  const merged = mergeIntervals(existing);
  const usedCoverage = merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
  let budget = Math.max(0, cap - usedCoverage);

  let cursor = startSeconds;
  for (const iv of merged) {
    if (iv.end <= cursor) continue; // entirely behind the playhead
    if (iv.start > cursor) {
      // Uncovered gap [cursor, iv.start) consumes budget.
      const gap = iv.start - cursor;
      if (gap >= budget) return cursor + budget - startSeconds;
      budget -= gap;
    }
    // Skip over the covered interval for free.
    cursor = Math.max(cursor, iv.end);
  }
  // Past the last interval: open-ended uncovered space consumes the rest.
  return cursor + budget - startSeconds;
}
