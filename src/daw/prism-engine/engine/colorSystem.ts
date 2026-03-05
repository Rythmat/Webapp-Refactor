import type { RGB } from '../types';
import {
  KEY_COLORS,
  KEYS,
  CHORD_COLORS,
  QUALITY_FALLBACK,
} from '../data/keyColors';
import { noteNameLetter } from '../data/notes';
import { steppedChord } from './naming';

/**
 * Given a degree-qualified chord name and the MIDI root of the progression,
 * returns the RGB color for the chord.
 *
 * Colors 1-12 rotate around the circle of fifths based on the root key.
 * Colors 13-16 are fixed scale-family colors (no rotation).
 * Color 0 (unknown) returns white.
 */
export function getChordColor(chord: string, root: number): RGB {
  let stepFrom = CHORD_COLORS[chord] ?? 0;

  // Fallback: try base quality for extensions (e.g. "5 major9" → "5 major7")
  if (stepFrom === 0) {
    const spaceIdx = chord.indexOf(' ');
    if (spaceIdx > 0) {
      const base = QUALITY_FALLBACK[chord.slice(spaceIdx + 1)];
      if (base)
        stepFrom = CHORD_COLORS[chord.slice(0, spaceIdx) + ' ' + base] ?? 0;
    }
  }

  // Fixed colors: 0 = white/unknown, 13-16 = scale families (no rotation)
  if (stepFrom === 0 || stepFrom >= 13) {
    return KEY_COLORS[stepFrom] ?? [255, 255, 255];
  }

  // Circle-of-fifths rotation for colors 1-12
  const letter = noteNameLetter(root);
  for (let i = 1; i < KEYS.length; i++) {
    if (KEYS[i] === letter) {
      let keyInd = i + stepFrom - 1;
      if (keyInd > 12) {
        keyInd = ((keyInd - 1) % 12) + 1;
      }
      return KEY_COLORS[keyInd];
    }
  }

  return [255, 255, 255];
}

/**
 * Given an array of MIDI note numbers (a pitched chord) and the progression root,
 * computes the stepped chord name and returns its color.
 */
export function getChordColorFromNotes(notes: number[], root: number): RGB {
  const chord = steppedChord(notes, root);
  return getChordColor(chord, root);
}
