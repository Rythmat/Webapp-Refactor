// ── Fretted instruments ────────────────────────────────────────────────────
// What a fret on a string sounds like depends on the instrument. Guitar and
// bass share every fretted primitive (FretPosition, the diagrams, the TAB);
// this is the one place they differ. Strings are numbered the way VexFlow
// numbers TAB lines: 1 is the top line, the last is `stringCount`. So a bass
// or ukulele position (1-4) is a valid GuitarStringNumber. On guitar and bass
// string 1 is also the highest pitch; a ukulele's string 4 (G4) is re-entrant,
// pitched between strings 2 and 1, so never assume string order is pitch
// order.
//
// Functions that turn a position into a pitch take the instrument as a
// trailing argument that defaults to GUITAR, so guitar code reads as it
// always did. Bass and ukulele code must always pass BASS / UKULELE: a
// defaulted call sounds the wrong note without any error.

import type { FretPosition, GuitarStringNumber } from './types';

export type FrettedInstrumentId = 'guitar' | 'bass' | 'ukulele';

export interface FrettedInstrument {
  id: FrettedInstrumentId;
  stringCount: number;
  /** Open-string sounding MIDI, keyed by string number (1 = highest). */
  tuning: Readonly<Partial<Record<GuitarStringNumber, number>>>;
  /**
   * Strings in the order shapes are written: the bottom TAB line first. That
   * is lowest pitch first on guitar and bass, but G C E A on a ukulele.
   */
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

/**
 * Ukulele in standard re-entrant (high-G) tuning, G C E A, written and
 * sounding at pitch. Shapes are written G-C-E-A, as The Ukulele Atlas prints
 * them: C major is '0-0-0-3'.
 */
export const UKULELE: FrettedInstrument = {
  id: 'ukulele',
  stringCount: 4,
  tuning: {
    1: 69, // A4
    2: 64, // E4
    3: 60, // C4
    4: 67, // G4 (re-entrant)
  },
  stringsLowToHigh: [4, 3, 2, 1],
  stringNames: ['A', 'E', 'C', 'G'],
  maxFret: 15,
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
  if (id === 'bass') return BASS;
  if (id === 'ukulele') return UKULELE;
  return GUITAR;
}

/**
 * The instrument's strings from lowest to highest sounding pitch. Equal to
 * `stringsLowToHigh` except on a re-entrant ukulele (C E G A).
 */
export function stringsByPitch(
  inst: FrettedInstrument,
): readonly GuitarStringNumber[] {
  return [...inst.stringsLowToHigh].sort(
    (a, b) => openMidi(a, inst) - openMidi(b, inst),
  );
}
