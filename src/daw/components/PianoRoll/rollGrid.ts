// ── The piano roll's beat and bar lines ────────────────────────────────────
// Drawn in song time. The roll's x = 0 is the clip's own tick 0 (its notes
// are clip time), but its bars are the song's: a clip at bar 9 reads 9, not
// 1, and a clip that starts on beat 2 still has its bar lines on the song's
// bar lines (pianoroll-10). The ruler's playhead, loop and the notation view
// beside it were in song bars already.

import {
  ticksPerBar,
  ticksPerBeat,
  type TimeSignature,
} from '@/daw/time/timeModel';

export interface RollBeatLine {
  /** px from the roll's left edge. */
  x: number;
  /** A bar line (otherwise a beat line). */
  bar: boolean;
  /** The song's bar number (1-based) the line is in. */
  barNumber: number;
  /** Which beat of its bar (0-based) the line is. */
  beatInBar: number;
  /** The line at the roll's left edge, where the clip starts. */
  atClipStart: boolean;
}

/**
 * The beat lines between `fromX` and `toX` px, for a roll whose x = 0 is
 * song tick `songOffset`, at `pixelsPerTick`, in `ts` (the metre's written
 * beat: an eighth in 6/8).
 */
export function rollBeatLines(
  songOffset: number,
  pixelsPerTick: number,
  fromX: number,
  toX: number,
  ts: TimeSignature,
): RollBeatLine[] {
  const beat = ticksPerBeat(ts);
  const bar = ticksPerBar(ts);
  const lines: RollBeatLine[] = [];
  const from = songOffset + fromX / pixelsPerTick;
  const to = songOffset + toX / pixelsPerTick;
  for (
    let tick = Math.max(0, Math.floor(from / beat) * beat);
    tick <= to;
    tick += beat
  ) {
    lines.push({
      x: (tick - songOffset) * pixelsPerTick,
      bar: tick % bar === 0,
      barNumber: Math.floor(tick / bar) + 1,
      beatInBar: Math.round((tick % bar) / beat),
      atClipStart: tick === songOffset,
    });
  }
  return lines;
}
