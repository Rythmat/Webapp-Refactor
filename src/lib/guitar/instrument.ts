// ── Fretted instruments ────────────────────────────────────────────────────
// What a fret on a string sounds like depends on the instrument. Guitar and
// bass share every fretted primitive (FretPosition, the diagrams, the TAB);
// this is the one place they differ. Strings are numbered the way VexFlow
// numbers TAB lines: 1 is the highest-pitched string, the lowest is
// `stringCount`. So a bass position (1-4) is a valid GuitarStringNumber.
//
// Functions that turn a position into a pitch take the instrument as a
// trailing argument that defaults to GUITAR, so guitar code reads as it
// always did. Bass code must always pass BASS: a defaulted call on a bass
// position sounds the wrong note without any error.

import type { FretPosition, GuitarStringNumber } from './types';

export type FrettedInstrumentId = 'guitar' | 'bass';

export interface FrettedInstrument {
  id: FrettedInstrumentId;
  stringCount: number;
  /** Open-string sounding MIDI, keyed by string number (1 = highest). */
  tuning: Readonly<Partial<Record<GuitarStringNumber, number>>>;
  /** Strings in the order shapes are written: lowest-pitched first. */
  stringsLowToHigh: readonly GuitarStringNumber[];
  /** TAB line labels, top line (string 1) first. */
  stringNames: readonly string[];
  /** The highest fret the lesson views draw. */
  maxFret: number;
}

/** Standard tuning, sounding pitch (a guitar is written an octave up). */
export const GUITAR_TUNING: Readonly<Record<GuitarStringNumber, number>> = {
  1: 64, // E4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

export const GUITAR: FrettedInstrument = {
  id: 'guitar',
  stringCount: 6,
  tuning: GUITAR_TUNING,
  stringsLowToHigh: [6, 5, 4, 3, 2, 1],
  stringNames: ['e', 'B', 'G', 'D', 'A', 'E'],
  maxFret: 22,
};

/** Four-string bass, E A D G, sounding pitch (written an octave up). */
export const BASS: FrettedInstrument = {
  id: 'bass',
  stringCount: 4,
  tuning: {
    1: 43, // G2
    2: 38, // D2
    3: 33, // A1
    4: 28, // E1
  },
  stringsLowToHigh: [4, 3, 2, 1],
  stringNames: ['G', 'D', 'A', 'E'],
  maxFret: 20,
};

/** The open string's sounding MIDI; throws for a string the instrument lacks. */
export function openMidi(
  string: GuitarStringNumber,
  inst: FrettedInstrument = GUITAR,
): number {
  const midi = inst.tuning[string];
  if (midi === undefined) {
    throw new Error(`${inst.id} has no string ${string}`);
  }
  return midi;
}

/** Whether a position lies on one of the instrument's strings. */
export function isOnInstrument(
  position: FretPosition,
  inst: FrettedInstrument,
): boolean {
  return inst.tuning[position.string] !== undefined;
}

export function frettedInstrument(id: FrettedInstrumentId): FrettedInstrument {
  return id === 'bass' ? BASS : GUITAR;
}
