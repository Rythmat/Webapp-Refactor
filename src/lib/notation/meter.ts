import type { NoteValue } from './types';

// ── Meter ──────────────────────────────────────────────────────────────────
// Splits a note or rest into written values the way engravers do (MuseScore's
// MIDI import works the same way): cut at the strongest metric point inside the
// span unless both ends sit on points almost as strong. Notes get one level of
// slack so syncopations stay whole (8th–quarter–8th, "and of 1" dotted
// quarter); rests get none, so they always show the beat.

export interface Meter {
  ticksPerQuarter: number;
  measureTicks: number;
  beatTicks: number;
  /** Beats split in three (6/8, 9/8, 12/8). */
  compound: boolean;
  halfBar: number | null;
  /** Beats are quarter notes, so eighth triplets / swing apply. */
  quarterBeats: boolean;
}

export function makeMeter(
  [numerator, denominator]: [number, number],
  ticksPerQuarter: number,
): Meter {
  const unit = (ticksPerQuarter * 4) / denominator;
  const measureTicks = numerator * unit;
  const compound = denominator === 8 && numerator % 3 === 0 && numerator > 3;
  const beatTicks = compound ? unit * 3 : unit;
  const beats = measureTicks / beatTicks;
  return {
    ticksPerQuarter,
    measureTicks,
    beatTicks,
    compound,
    halfBar: beats >= 4 && beats % 2 === 0 ? measureTicks / 2 : null,
    quarterBeats: !compound && beatTicks === ticksPerQuarter,
  };
}

/** Metric strength of a point inside a measure: 0 = barline (strongest). */
export function metricLevel(position: number, meter: Meter): number {
  if (position === 0 || position === meter.measureTicks) return 0;
  if (position === meter.halfBar) return 1;
  if (position % meter.beatTicks === 0) return 2;
  let step = meter.compound ? meter.beatTicks / 3 : meter.beatTicks / 2;
  for (let level = 3; step >= 1 && Number.isInteger(step); level++) {
    if (position % step === 0) return level;
    step /= 2;
  }
  return 99;
}

/** Spacing of the points at `level`, or null past the finest grid. */
function levelSpacing(level: number, meter: Meter): number | null {
  if (level === 0) return meter.measureTicks;
  if (level === 1) return meter.halfBar;
  if (level === 2) return meter.beatTicks;
  const spacing =
    (meter.compound ? meter.beatTicks / 3 : meter.beatTicks / 2) /
    2 ** (level - 3);
  return spacing >= 1 && Number.isInteger(spacing) ? spacing : null;
}

/** The strongest metric point strictly inside (start, end). */
function strongestInside(
  start: number,
  end: number,
  meter: Meter,
): { tick: number; level: number } | null {
  for (let level = 0; level < 12; level++) {
    const spacing = levelSpacing(level, meter);
    if (spacing === null) {
      if (level >= 3) return null;
      continue;
    }
    const tick = (Math.floor(start / spacing) + 1) * spacing;
    if (tick < end) return { tick, level };
  }
  return null;
}

export interface WrittenValue {
  value: NoteValue;
  dots: 0 | 1;
}

const PLAIN: Array<[NoteValue, number]> = [
  ['w', 4],
  ['h', 2],
  ['q', 1],
  ['8', 1 / 2],
  ['16', 1 / 4],
  ['32', 1 / 8],
];

/** Plain or single-dotted value lasting exactly `ticks`, if there is one. */
export function writtenValue(
  ticks: number,
  ticksPerQuarter: number,
): WrittenValue | null {
  for (const [value, quarters] of PLAIN) {
    const plain = quarters * ticksPerQuarter;
    if (ticks === plain) return { value, dots: 0 };
    if (ticks === plain * 1.5 && value !== '32') return { value, dots: 1 };
  }
  return null;
}

export interface Piece extends WrittenValue {
  start: number;
  duration: number;
}

/**
 * Written pieces (tied together for notes) for a span [start, end) inside one
 * measure. Positions are relative to the measure's start.
 */
export function splitMetric(
  start: number,
  end: number,
  isRest: boolean,
  meter: Meter,
): Piece[] {
  if (end <= start) return [];
  const inside = strongestInside(start, end, meter);
  const slack = isRest ? 0 : 1;
  const fitsMeter =
    !inside ||
    (metricLevel(start, meter) <= inside.level + slack &&
      metricLevel(end, meter) <= inside.level + slack);
  const written = fitsMeter
    ? writtenValue(end - start, meter.ticksPerQuarter)
    : null;
  if (written) return [{ start, duration: end - start, ...written }];
  if (inside) {
    return [
      ...splitMetric(start, inside.tick, isRest, meter),
      ...splitMetric(inside.tick, end, isRest, meter),
    ];
  }
  // Off every grid (shouldn't happen after quantizing): peel off the largest
  // value that fits.
  for (const [value, quarters] of PLAIN) {
    const ticks = quarters * meter.ticksPerQuarter;
    if (ticks <= end - start) {
      return [
        { start, duration: ticks, value, dots: 0 },
        ...splitMetric(start + ticks, end, isRest, meter),
      ];
    }
  }
  return [];
}

/**
 * Pieces for a span inside one eighth-triplet beat [beatStart, beatStart +
 * quarter). A span filling the whole beat is a plain quarter.
 */
export function splitTriplet(
  start: number,
  end: number,
  beatStart: number,
  ticksPerQuarter: number,
): Piece[] {
  if (end <= start) return [];
  if (start === beatStart && end === beatStart + ticksPerQuarter) {
    return [{ start, duration: end - start, value: 'q', dots: 0 }];
  }
  const units: Array<[NoteValue, number]> = [
    ['q', (ticksPerQuarter * 2) / 3],
    ['8', ticksPerQuarter / 3],
    ['16', ticksPerQuarter / 6],
  ];
  const pieces: Piece[] = [];
  let position = start;
  while (position < end) {
    const remaining = end - position;
    const unit =
      units.find(([, ticks]) => ticks <= remaining + 0.5) ??
      units[units.length - 1];
    const duration = Math.min(unit[1], remaining);
    pieces.push({ start: position, duration, value: unit[0], dots: 0 });
    position += duration;
  }
  return pieces;
}
