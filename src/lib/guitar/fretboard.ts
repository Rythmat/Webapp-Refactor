// ── Fretboard math ─────────────────────────────────────────────────────────
// Standard tuning, sounding pitch. A guitar is written an octave above what it
// sounds; everything here is the sounding MIDI a microphone hears and a MIDI
// guitar sends, which is what lessons score against.

import type { FretPosition, GuitarStringNumber, ShapeFret } from './types';

/** Open-string MIDI notes, keyed by string number (1 = high E). */
export const GUITAR_STANDARD_TUNING: Readonly<
  Record<GuitarStringNumber, number>
> = {
  1: 64, // E4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

/** Strings in the order shape strings are written: low E first. */
export const GUITAR_STRINGS_LOW_TO_HIGH: readonly GuitarStringNumber[] = [
  6, 5, 4, 3, 2, 1,
];

/** The highest fret the lesson views draw. */
export const GUITAR_MAX_FRET = 22;

export function midiAt(string: GuitarStringNumber, fret: number): number {
  return GUITAR_STANDARD_TUNING[string] + fret;
}

export function fretToMidi(position: FretPosition): number {
  return midiAt(position.string, position.fret);
}

export function isGuitarStringNumber(n: number): n is GuitarStringNumber {
  return Number.isInteger(n) && n >= 1 && n <= 6;
}

/**
 * Parse a book shape string (`'X-3-2-0-1-0'`, string 6 first) into one entry
 * per string, index 0 = string 6. `X` is muted (null), digits are frets.
 */
export function parseShape(frets: string): ShapeFret[] {
  const parts = frets.split('-');
  if (parts.length !== 6) {
    throw new Error(`Shape "${frets}" must have 6 strings`);
  }
  return parts.map((part) => {
    if (part === 'X' || part === 'x') return null;
    const fret = Number(part);
    if (!Number.isInteger(fret) || fret < 0) {
      throw new Error(`Shape "${frets}" has a bad fret "${part}"`);
    }
    return fret;
  });
}

/** The inverse of parseShape. */
export function formatShape(frets: readonly ShapeFret[]): string {
  return frets.map((fret) => (fret === null ? 'X' : String(fret))).join('-');
}

/** The sounding strings of a shape, from the low E up. */
export function shapePositions(frets: string): FretPosition[] {
  const parsed = parseShape(frets);
  const positions: FretPosition[] = [];
  parsed.forEach((fret, i) => {
    if (fret !== null) {
      positions.push({ string: GUITAR_STRINGS_LOW_TO_HIGH[i], fret });
    }
  });
  return positions;
}

/** The notes a shape sounds, low to high, with where each is played. */
export function shapeNotes(
  frets: string,
): { midi: number; position: FretPosition }[] {
  return shapePositions(frets).map((position) => ({
    midi: fretToMidi(position),
    position,
  }));
}

/** The distinct pitch classes a shape sounds, ascending. */
export function shapePitchClasses(frets: string): number[] {
  const pcs = new Set(shapeNotes(frets).map((n) => n.midi % 12));
  return [...pcs].sort((a, b) => a - b);
}

export function shapeLowestMidi(frets: string): number {
  const notes = shapeNotes(frets);
  if (notes.length === 0) throw new Error(`Shape "${frets}" sounds nothing`);
  return Math.min(...notes.map((n) => n.midi));
}

/** Distance between the lowest and highest fretted (non-open) frets. */
export function fretSpan(frets: string): number {
  const fretted = parseShape(frets).filter(
    (fret): fret is number => fret !== null && fret > 0,
  );
  if (fretted.length === 0) return 0;
  return Math.max(...fretted) - Math.min(...fretted);
}

/**
 * The top row of a five-row chord box for a shape the book gives no window
 * for: first position when everything fits in frets 1-5, otherwise one fret
 * above the lowest fretted note (the book's own habit).
 */
export function defaultDiagramStart(frets: string): number {
  const fretted = parseShape(frets).filter(
    (fret): fret is number => fret !== null && fret > 0,
  );
  if (fretted.length === 0) return 1;
  if (Math.max(...fretted) <= 5) return 1;
  return Math.max(1, Math.min(...fretted) - 1);
}

/** Every place a pitch can be played, low string first. */
export function positionsFor(
  midi: number,
  maxFret = GUITAR_MAX_FRET,
): FretPosition[] {
  const positions: FretPosition[] = [];
  for (const string of GUITAR_STRINGS_LOW_TO_HIGH) {
    const fret = midi - GUITAR_STANDARD_TUNING[string];
    if (fret >= 0 && fret <= maxFret) positions.push({ string, fret });
  }
  return positions;
}

export interface FretWindow {
  min: number;
  max: number;
}

/**
 * Where to put a pitch the lesson didn't ask for (a wrong note): the position
 * nearest the middle of the window the step is using, so the mark lands where
 * the student's hand already is.
 */
export function nearestPosition(
  midi: number,
  window: FretWindow,
): FretPosition | null {
  const candidates = positionsFor(midi);
  if (candidates.length === 0) return null;
  const centre = (window.min + window.max) / 2;
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const outside =
      candidate.fret < window.min
        ? window.min - candidate.fret
        : candidate.fret > window.max
          ? candidate.fret - window.max
          : 0;
    // Stay inside the window first, then prefer the middle of it.
    const distance = outside * 100 + Math.abs(candidate.fret - centre);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * The fret range a view should draw for a set of positions: at least
 * `minSpan` frets wide, starting at the nut when anything is open, and never
 * past `maxFret`. It is computed once per step so the neck never jumps.
 */
export function fretWindow(
  positions: readonly FretPosition[],
  { minSpan = 5, maxFret = GUITAR_MAX_FRET } = {},
): FretWindow {
  if (positions.length === 0) return { min: 0, max: minSpan };
  const frets = positions.map((p) => p.fret);
  let min = Math.min(...frets);
  let max = Math.max(...frets);
  if (min > 0) min = Math.max(1, min - 1);
  if (max - min < minSpan) max = min + minSpan;
  if (max > maxFret) {
    max = maxFret;
    min = Math.max(0, Math.min(min, maxFret - minSpan));
  }
  return { min, max };
}
