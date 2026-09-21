import { writtenValue, type Meter } from './meter';

// ── Quantize ───────────────────────────────────────────────────────────────
// Each beat of each staff reads on the simplest grid that fits its onsets:
//   eighths    — swung off-beats (lesson swing pushes them up to a triplet
//                late) still read as plain eighths, as lead sheets write them
//   sixteenths
//   eighth triplets — only when an onset sits on the first triplet partial
// Lesson data is already on the grid, so this mostly just rounds the short
// gated durations (460 → 480); Studio recordings get properly snapped.

export type BeatGrid = 'eighth' | 'sixteenth' | 'triplet';

interface Span {
  start: number;
  end: number;
}

function snapOffset(grid: BeatGrid, offset: number, quarter: number): number {
  if (grid === 'eighth') {
    const half = quarter / 2;
    // Straight to fully swung (a triplet late) off-beats all read as the "and".
    if (offset >= quarter * 0.375 && offset <= quarter * 0.71) return half;
    return Math.round(offset / half) * half;
  }
  const step = grid === 'sixteenth' ? quarter / 4 : quarter / 3;
  return Math.round(offset / step) * step;
}

/** How far `offset` is from its grid point; swung off-beats count as on it. */
function snapError(grid: BeatGrid, offset: number, quarter: number): number {
  if (
    grid === 'eighth' &&
    offset >= quarter * 0.375 &&
    offset <= quarter * 0.71
  ) {
    return 0;
  }
  return Math.abs(snapOffset(grid, offset, quarter) - offset);
}

const TOLERANCE: Record<BeatGrid, number> = {
  eighth: 1 / 8,
  sixteenth: 1 / 16,
  triplet: 1 / 12,
};

function chooseGrid(offsets: number[], quarter: number): BeatGrid {
  const fits = (grid: BeatGrid) =>
    offsets.every(
      (o) => snapError(grid, o, quarter) <= TOLERANCE[grid] * quarter,
    );
  if (fits('eighth')) return 'eighth';
  if (fits('sixteenth')) return 'sixteenth';
  if (fits('triplet')) return 'triplet';
  const error = (grid: BeatGrid) =>
    offsets.reduce((sum, o) => sum + snapError(grid, o, quarter), 0);
  return error('triplet') < error('sixteenth') * 0.6 ? 'triplet' : 'sixteenth';
}

export interface QuantizeResult<T> {
  spans: Array<T & Span>;
  /** Start ticks (origin-relative) of beats written as eighth triplets. */
  tripletBeats: Set<number>;
}

/**
 * Snap one staff's notes. `start`/`end` are relative to the origin (bar 1).
 * Notes never shrink below one grid step.
 */
export function quantizeStaff<T extends Span>(
  notes: T[],
  meter: Meter,
): QuantizeResult<T> {
  const quarter = meter.ticksPerQuarter;
  const tripletBeats = new Set<number>();

  // Other meters (6/8, 7/8 …) snap to plain sixteenths.
  if (!meter.quarterBeats) {
    const step = quarter / 4;
    return {
      tripletBeats,
      spans: notes.map((n) => {
        const start = Math.round(n.start / step) * step;
        const end = Math.max(start + step, Math.round(n.end / step) * step);
        return { ...n, start, end };
      }),
    };
  }

  // Onsets up to a 64th early count toward the next beat.
  const early = quarter / 16;
  const beatOf = (tick: number) => Math.floor((tick + early) / quarter);
  const offsetsByBeat = new Map<number, number[]>();
  for (const n of notes) {
    const beat = beatOf(n.start);
    const offsets = offsetsByBeat.get(beat) ?? [];
    offsets.push(n.start - beat * quarter);
    offsetsByBeat.set(beat, offsets);
  }
  const grids = new Map<number, BeatGrid>();
  for (const [beat, offsets] of offsetsByBeat) {
    const grid = chooseGrid(offsets, quarter);
    grids.set(beat, grid);
    if (grid === 'triplet') tripletBeats.add(beat * quarter);
  }
  const gridOf = (beat: number) => grids.get(beat) ?? 'sixteenth';
  const snap = (tick: number, beat: number) =>
    beat * quarter + snapOffset(gridOf(beat), tick - beat * quarter, quarter);

  const spans = notes.map((n) => {
    const startBeat = beatOf(n.start);
    const start = snap(n.start, startBeat);
    // A note written shorter than a sixteenth keeps its length: the beat grid
    // would round it away, and the editor can ask for a thirty-second.
    const short = n.end - n.start < quarter / 4;
    if (short) {
      const step = quarter / 8;
      const end = Math.max(start + step, Math.round(n.end / step) * step);
      return { ...n, start, end };
    }
    // A note that was written rather than played is left alone: its onset is
    // already exactly on the grid and its length is already a value notation
    // can spell. Rounding it can only do damage — a beat takes its grid from
    // onsets alone, so a bar holding one note on the beat reads as eighths,
    // and snapping that note's end onto the eighth grid turns a sixteenth
    // (120 of 480) into an eighth, because 0.5 rounds up. The same rounding
    // cost the dotted sixteenth and the dotted eighth their values.
    //
    // A performed note fails one test or the other — its onset drifts off the
    // grid, or its length is gated short — and still gets snapped, so swing
    // and recorded input are untouched.
    const written = n.end - n.start;
    if (start === n.start && writtenValue(written, quarter)) {
      return { ...n, start, end: start + written };
    }
    // An end belongs to the beat it finishes in (an end on a beat line
    // finishes the beat before).
    const endBeat = Math.max(startBeat, Math.ceil(n.end / quarter) - 1);
    let end = snap(n.end, endBeat);
    if (end <= start) {
      const grid = gridOf(startBeat);
      end =
        start +
        (grid === 'eighth'
          ? quarter / 2
          : grid === 'triplet'
            ? quarter / 3
            : quarter / 4);
    }
    return { ...n, start, end };
  });

  // A beat holding triplet starts but also a note ending on a straight
  // sixteenth can't be written; move such ends to the triplet grid.
  for (const span of spans) {
    const endBeat = Math.ceil(span.end / quarter) - 1;
    if (tripletBeats.has(endBeat * quarter) && span.end % quarter !== 0) {
      const offset = span.end - endBeat * quarter;
      span.end = Math.max(
        span.start + quarter / 6,
        endBeat * quarter + snapOffset('triplet', offset, quarter),
      );
    }
  }
  return { spans, tripletBeats };
}
