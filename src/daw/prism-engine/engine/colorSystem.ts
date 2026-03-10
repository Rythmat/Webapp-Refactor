import type { RGB } from '../types';
import {
  KEY_COLORS,
  KEYS,
  CHORD_COLORS,
  QUALITY_FALLBACK,
} from '../data/keyColors';
import { MODES } from '../data/modes';
import { noteNameLetter } from '../data/notes';
import { steppedChord } from './naming';

/** Fallback: color by degree alone (most common modal association) */
const DEGREE_COLORS: Record<string, number> = {
  '1': 1,
  b2: 9,
  '2': 1,
  b3: 10,
  '3': 1,
  '4': 1,
  b5: 2,
  '5': 1,
  b6: 10,
  '6': 1,
  b7: 12,
  '7': 1,
  '#1': 14,
  '#2': 14,
  '#4': 2,
  '#5': 10,
};

/** Semitone offset from mode root to parent Ionian root */
const DIATONIC_PARENT_OFFSET: Record<string, number> = {
  ionian: 0,
  dorian: 10,
  phrygian: 8,
  lydian: 7,
  mixolydian: 5,
  aeolian: 3,
  locrian: 1,
};

/**
 * Remap a degree-qualified chord name from user-root perspective
 * to parent-Ionian-root perspective for correct color lookup.
 * For non-diatonic modes or ionian, returns the input unchanged.
 */
function remapChordForMode(
  chord: string,
  rootMidi: number,
  mode: string,
): { chord: string; rootMidi: number } {
  const offset = DIATONIC_PARENT_OFFSET[mode];
  if (offset === undefined || offset === 0) return { chord, rootMidi };

  const parentRootMidi = rootMidi + offset;

  // Parse degree prefix
  const spaceIdx = chord.indexOf(' ');
  if (spaceIdx <= 0) return { chord, rootMidi };

  const degreeStr = chord.slice(0, spaceIdx);
  const quality = chord.slice(spaceIdx + 1);

  let degree: number;
  let modifier: number;
  if (degreeStr[0] === 'b') {
    degree = parseInt(degreeStr.slice(1), 10);
    modifier = -1;
  } else if (degreeStr[0] === '#') {
    degree = parseInt(degreeStr.slice(1), 10);
    modifier = 1;
  } else {
    degree = parseInt(degreeStr, 10);
    modifier = 0;
  }

  // Convert degree to semitone offset from user root
  const ionian = MODES.ionian;
  if (degree < 1 || degree > ionian.length) return { chord, rootMidi };
  const semitones = ionian[degree - 1] + modifier;

  // Compute semitone offset from parent Ionian root
  const diffFromParent = (((semitones - offset) % 12) + 12) % 12;

  // Re-derive degree relative to parent using Ionian intervals
  let newDegree = -1;
  let newModifier = 0;
  for (let i = 0; i < ionian.length; i++) {
    if (ionian[i] === diffFromParent) {
      newDegree = i;
      break;
    }
  }
  if (newDegree < 0) {
    // Try flat
    for (let i = 0; i < ionian.length; i++) {
      if (ionian[i] === diffFromParent + 1) {
        newDegree = i;
        newModifier = -1;
        break;
      }
    }
  }
  if (newDegree < 0) {
    // Try sharp
    for (let i = 0; i < ionian.length; i++) {
      if (ionian[i] === diffFromParent - 1) {
        newDegree = i;
        newModifier = 1;
        break;
      }
    }
  }

  if (newDegree < 0) return { chord, rootMidi };

  const prefix =
    newModifier === -1
      ? `b${newDegree + 1}`
      : newModifier === 1
        ? `#${newDegree + 1}`
        : `${newDegree + 1}`;
  return { chord: `${prefix} ${quality}`, rootMidi: parentRootMidi };
}

/**
 * Given a degree-qualified chord name and the MIDI root of the progression,
 * returns the RGB color for the chord.
 *
 * When a non-Ionian diatonic mode is specified, the degree is remapped to
 * the parent Ionian key so that diatonic chords get "home" colors.
 *
 * Colors 1-12 rotate around the circle of fifths based on the root key.
 * Colors 13-16 are fixed scale-family colors (no rotation).
 * Color 0 (unknown) returns white.
 */
export function getChordColor(
  chord: string,
  root: number,
  mode: string = 'ionian',
): RGB {
  const { chord: remapped, rootMidi: effectiveRoot } = remapChordForMode(
    chord,
    root,
    mode,
  );

  let stepFrom = CHORD_COLORS[remapped] ?? 0;

  // Fallback: try base quality for extensions (e.g. "5 major9" → "5 major7")
  if (stepFrom === 0) {
    const spaceIdx = remapped.indexOf(' ');
    if (spaceIdx > 0) {
      const base = QUALITY_FALLBACK[remapped.slice(spaceIdx + 1)];
      if (base)
        stepFrom = CHORD_COLORS[remapped.slice(0, spaceIdx) + ' ' + base] ?? 0;
    }
  }

  // Degree-based fallback: use the degree's most common modal association
  if (stepFrom === 0) {
    const spaceIdx = remapped.indexOf(' ');
    if (spaceIdx > 0) {
      stepFrom = DEGREE_COLORS[remapped.slice(0, spaceIdx)] ?? 0;
    }
  }

  // Fixed colors: 0 = white/unknown, 13-16 = scale families (no rotation)
  if (stepFrom === 0 || stepFrom >= 13) {
    return KEY_COLORS[stepFrom] ?? [255, 255, 255];
  }

  // Circle-of-fifths rotation for colors 1-12
  const letter = noteNameLetter(effectiveRoot);
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
export function getChordColorFromNotes(
  notes: number[],
  root: number,
  mode: string = 'ionian',
): RGB {
  const offset = DIATONIC_PARENT_OFFSET[mode];
  if (offset !== undefined && offset !== 0) {
    // For non-Ionian diatonic modes, compute degrees from parent Ionian root
    const parentRoot = root + offset;
    const chord = steppedChord(notes, parentRoot);
    return getChordColor(chord, parentRoot);
  }
  const chord = steppedChord(notes, root);
  return getChordColor(chord, root, mode);
}
