import type { Song, ChordBar } from '@/curriculum/types/songLibrary';
import {
  DEFAULT_METER,
  performedBars,
  writtenBarMeters,
  type Meter,
} from './performance';

export interface BeatGrid {
  /** Sorted absolute beat times in seconds (relative to YouTube t=0). */
  beats: number[];
  /** Subset of `beats` marking detected downbeats. */
  downbeats: number[];
  beatsPerBar: number;
  /** Index in `beats` that maps to chart bar 1, beat 1. */
  anchorBeatIdx: number;
}

/* ── Constant-tempo helpers (used when no BeatGrid is available) ─────── */

/**
 * How long a bar lasts, in its own metre.
 *
 * `song.tempo` counts the metre's own beats — a 6/8 song at 220 is 220
 * eighths a minute — so a bar is its beat count over the tempo, and a 5/4 bar
 * in a 4/4 song is a quarter longer than its neighbours rather than the same.
 * Pass the bar's metre when the chart has one; the song's is the fallback and
 * the answer is unchanged for every chart that never changes metre.
 */
export function barDurationSec(
  bar: ChordBar,
  song: Song,
  meter: Meter = song.timeSignature ?? DEFAULT_METER,
): number {
  const secPerBar = (meter[0] * 60) / song.tempo;
  return secPerBar * (bar.restBars ?? 1);
}

export function getActiveBarIndex(
  song: Song,
  timeSec: number,
): { sectionIdx: number; barIdx: number } | null {
  const meters = writtenBarMeters(song);
  let elapsed = 0;
  for (const { sectionIdx, barIdx, bar, writtenIdx } of performedBars(song)) {
    const dur = barDurationSec(bar, song, meters[writtenIdx]);
    if (timeSec >= elapsed && timeSec < elapsed + dur)
      return { sectionIdx, barIdx };
    elapsed += dur;
  }
  return null;
}

/** When the first performance of a written bar starts. */
export function getBarStartTime(
  song: Song,
  sectionIdx: number,
  barIdx: number,
): number {
  const meters = writtenBarMeters(song);
  let elapsed = 0;
  for (const played of performedBars(song)) {
    if (played.sectionIdx === sectionIdx && played.barIdx === barIdx)
      return elapsed;
    elapsed += barDurationSec(played.bar, song, meters[played.writtenIdx]);
  }
  return elapsed;
}

/**
 * The first unbroken run of a written section in performance — repeats of it
 * included — for looping it.
 */
export function getSectionTimeRange(
  song: Song,
  sectionIdx: number,
): { start: number; end: number } {
  const meters = writtenBarMeters(song);
  let elapsed = 0;
  let start: number | null = null;
  for (const played of performedBars(song)) {
    const inSection = played.sectionIdx === sectionIdx;
    if (inSection && start === null) start = elapsed;
    if (!inSection && start !== null) return { start, end: elapsed };
    elapsed += barDurationSec(played.bar, song, meters[played.writtenIdx]);
  }
  return start === null ? { start: 0, end: 0 } : { start, end: elapsed };
}

/* ── Beat-grid helpers ───────────────────────────────────────────────── */

/** Largest i where `beats[i] <= t`. Returns -1 if t < beats[0]. */
export function findBeatIndex(beats: number[], t: number): number {
  if (beats.length === 0 || t < beats[0]) return -1;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (beats[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Number of audio beats consumed by a single bar.
 *
 * `beatsPerBar` comes from the detected grid, not from the chart, so a bar
 * that changes metre is measured as a ratio against the song's home metre
 * rather than in its own units: a 5/4 bar in a 4/4 song takes a quarter more
 * of the grid than its neighbours. A chart that never changes metre gives a
 * ratio of one and the answer is exactly what it always was.
 */
export function barAudioBeats(
  bar: ChordBar,
  beatsPerBar: number,
  ratio = 1,
): number {
  return beatsPerBar * ratio * (bar.restBars ?? 1);
}

/** Walk the chart and return cumulative audio-beat offsets at each bar's start. */
function buildChartBeatMap(
  song: Song,
  beatsPerBar: number,
): Array<{
  sectionIdx: number;
  barIdx: number;
  barStartChartBeat: number;
  barBeats: number;
}> {
  const map: Array<{
    sectionIdx: number;
    barIdx: number;
    barStartChartBeat: number;
    barBeats: number;
  }> = [];
  const meters = writtenBarMeters(song);
  const home = (song.timeSignature ?? DEFAULT_METER)[0] || 4;
  let chartBeat = 0;
  for (const { sectionIdx, barIdx, bar, writtenIdx } of performedBars(song)) {
    const barBeats = barAudioBeats(
      bar,
      beatsPerBar,
      (meters[writtenIdx]?.[0] ?? home) / home,
    );
    map.push({ sectionIdx, barIdx, barStartChartBeat: chartBeat, barBeats });
    chartBeat += barBeats;
  }
  return map;
}

/**
 * Map current playback time to a chart bar via the beat grid.
 * Returns null if `t` is before the chart's first downbeat or after the chart ends.
 */
export function getActiveFromBeats(
  song: Song,
  grid: BeatGrid,
  t: number,
): { sectionIdx: number; barIdx: number } | null {
  const audioBeatIdx = findBeatIndex(grid.beats, t);
  if (audioBeatIdx < grid.anchorBeatIdx) return null;
  const chartBeat = audioBeatIdx - grid.anchorBeatIdx;
  const beatMap = buildChartBeatMap(song, grid.beatsPerBar);
  for (let i = 0; i < beatMap.length; i++) {
    const entry = beatMap[i];
    if (
      chartBeat >= entry.barStartChartBeat &&
      chartBeat < entry.barStartChartBeat + entry.barBeats
    ) {
      return { sectionIdx: entry.sectionIdx, barIdx: entry.barIdx };
    }
  }
  return null;
}

/** Time at which a specific (sectionIdx, barIdx) occurrence's first beat lands. */
export function getBarStartFromBeats(
  song: Song,
  grid: BeatGrid,
  sectionIdx: number,
  barIdx: number,
): number {
  const beatMap = buildChartBeatMap(song, grid.beatsPerBar);
  for (const entry of beatMap) {
    if (entry.sectionIdx === sectionIdx && entry.barIdx === barIdx) {
      const audioIdx = grid.anchorBeatIdx + entry.barStartChartBeat;
      if (audioIdx < grid.beats.length) return grid.beats[audioIdx];
      return grid.beats[grid.beats.length - 1];
    }
  }
  return 0;
}

/** [start, end] times for a section, derived from the beat grid. */
export function getSectionTimeRangeFromBeats(
  song: Song,
  grid: BeatGrid,
  sectionIdx: number,
): { start: number; end: number } {
  const beatMap = buildChartBeatMap(song, grid.beatsPerBar);
  // The section's first unbroken run, as getSectionTimeRange takes it.
  const from = beatMap.findIndex((e) => e.sectionIdx === sectionIdx);
  if (from < 0) return { start: 0, end: 0 };
  let to = from;
  while (to + 1 < beatMap.length && beatMap[to + 1].sectionIdx === sectionIdx)
    to++;
  const sectionBars = beatMap.slice(from, to + 1);
  const first = sectionBars[0];
  const last = sectionBars[sectionBars.length - 1];
  const startAudioIdx = grid.anchorBeatIdx + first.barStartChartBeat;
  const endAudioIdx =
    grid.anchorBeatIdx + last.barStartChartBeat + last.barBeats;
  const start = grid.beats[Math.min(startAudioIdx, grid.beats.length - 1)] ?? 0;
  const end = grid.beats[Math.min(endAudioIdx, grid.beats.length - 1)] ?? start;
  return { start, end };
}

/**
 * Progress (0..1) of `t` within the active bar, using actual beat spacing.
 * Returns null if `t` is outside the bar.
 */
export function getBarProgressFromBeats(
  song: Song,
  grid: BeatGrid,
  sectionIdx: number,
  barIdx: number,
  t: number,
): number | null {
  const beatMap = buildChartBeatMap(song, grid.beatsPerBar);
  const entry = beatMap.find(
    (e) => e.sectionIdx === sectionIdx && e.barIdx === barIdx,
  );
  if (!entry) return null;
  const startAudioIdx = grid.anchorBeatIdx + entry.barStartChartBeat;
  const endAudioIdx = startAudioIdx + entry.barBeats;
  const start = grid.beats[Math.min(startAudioIdx, grid.beats.length - 1)];
  const end = grid.beats[Math.min(endAudioIdx, grid.beats.length - 1)];
  if (start == null || end == null || end <= start) return null;
  const p = (t - start) / (end - start);
  if (p < 0 || p >= 1) return null;
  return p;
}
