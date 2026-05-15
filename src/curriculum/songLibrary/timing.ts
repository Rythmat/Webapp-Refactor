import type { Song, ChordBar } from '@/curriculum/types/songLibrary';

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

export function barDurationSec(bar: ChordBar, song: Song): number {
  const secPerBar = (song.timeSignature[0] * 60) / song.tempo;
  return secPerBar * (bar.restBars ?? 1);
}

export function getActiveBarIndex(
  song: Song,
  timeSec: number,
): { sectionIdx: number; barIdx: number } | null {
  let elapsed = 0;
  for (let si = 0; si < song.sections.length; si++) {
    const section = song.sections[si];
    for (let rep = 0; rep < (section.repeatCount ?? 1); rep++) {
      for (let bi = 0; bi < section.bars.length; bi++) {
        const dur = barDurationSec(section.bars[bi], song);
        if (timeSec >= elapsed && timeSec < elapsed + dur)
          return { sectionIdx: si, barIdx: bi };
        elapsed += dur;
      }
    }
  }
  return null;
}

export function getBarStartTime(
  song: Song,
  sectionIdx: number,
  barIdx: number,
): number {
  let elapsed = 0;
  for (let si = 0; si < song.sections.length; si++) {
    const section = song.sections[si];
    for (let rep = 0; rep < (section.repeatCount ?? 1); rep++) {
      for (let bi = 0; bi < section.bars.length; bi++) {
        if (si === sectionIdx && bi === barIdx) return elapsed;
        elapsed += barDurationSec(section.bars[bi], song);
      }
    }
  }
  return elapsed;
}

export function getSectionTimeRange(
  song: Song,
  sectionIdx: number,
): { start: number; end: number } {
  let elapsed = 0;
  for (let si = 0; si < song.sections.length; si++) {
    const section = song.sections[si];
    const perRepeatSec = section.bars.reduce(
      (sum, bar) => sum + barDurationSec(bar, song),
      0,
    );
    const sectionSec = perRepeatSec * (section.repeatCount ?? 1);
    if (si === sectionIdx) {
      return { start: elapsed, end: elapsed + sectionSec };
    }
    elapsed += sectionSec;
  }
  return { start: 0, end: 0 };
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

/** Number of audio beats consumed by a single bar. */
export function barAudioBeats(bar: ChordBar, beatsPerBar: number): number {
  return beatsPerBar * (bar.restBars ?? 1);
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
  let chartBeat = 0;
  for (let si = 0; si < song.sections.length; si++) {
    const section = song.sections[si];
    for (let rep = 0; rep < (section.repeatCount ?? 1); rep++) {
      for (let bi = 0; bi < section.bars.length; bi++) {
        const barBeats = barAudioBeats(section.bars[bi], beatsPerBar);
        map.push({
          sectionIdx: si,
          barIdx: bi,
          barStartChartBeat: chartBeat,
          barBeats,
        });
        chartBeat += barBeats;
      }
    }
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
  const sectionBars = beatMap.filter((e) => e.sectionIdx === sectionIdx);
  if (sectionBars.length === 0) return { start: 0, end: 0 };
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
