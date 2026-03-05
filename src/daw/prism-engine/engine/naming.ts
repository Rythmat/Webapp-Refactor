import type { ChordDegree } from '../types';
import { CHORDS } from '../data/chords';
import { MODES } from '../data/modes';
import { noteNameLetter } from '../data/notes';

/**
 * Given a pitched chord (array of MIDI note numbers), returns the full name
 * like "C major" or "Eb minor7".
 */
export function chordName(pitchedChord: number[]): string {
  const r = pitchedChord[0];
  const steps = pitchedChord.map((x) => x - r);
  let quality = '';
  for (const [name, intervals] of Object.entries(CHORDS)) {
    if (
      intervals.length === steps.length &&
      intervals.every((v, i) => v === steps[i])
    ) {
      quality = name;
      break;
    }
  }
  return `${noteNameLetter(r)} ${quality}`;
}

/**
 * Given a pitched chord, returns just the chord quality without the note name.
 * e.g. "major", "minor7", "dominant7"
 */
export function flatChordName(pitchedChord: number[]): string {
  const r = pitchedChord[0];
  const steps = pitchedChord.map((x) => x - r);
  for (const [name, intervals] of Object.entries(CHORDS)) {
    if (
      intervals.length === steps.length &&
      intervals.every((v, i) => v === steps[i])
    ) {
      return name;
    }
  }
  return '';
}

/**
 * Given an unpitched chord (intervals from root, e.g. [0,4,7]),
 * returns the chord quality name from the dictionary.
 * Defaults to "major7" if not found.
 */
export function unpitchedChordName(unpitchedChord: number[]): string {
  for (const [name, intervals] of Object.entries(CHORDS)) {
    if (
      intervals.length === unpitchedChord.length &&
      intervals.every((v, i) => v === unpitchedChord[i])
    ) {
      return name;
    }
  }
  return 'major7';
}

/**
 * Given a pitched chord and the root of the progression, returns a degree-qualified
 * name like "1 major", "b3 dominant7", "#4 diminished".
 */
export function steppedChord(pitchedChord: number[], root: number): string {
  const diff = pitchedChord[0] - root;
  const degs = MODES.ionian;
  let degree = -1;
  let flat = false;

  for (let i = 0; i < degs.length; i++) {
    if (degs[i] === diff) {
      degree = i;
      break;
    }
  }

  if (degree < 0) {
    flat = true;
    for (let i = 0; i < degs.length; i++) {
      if (degs[i] === diff + 1) {
        degree = i;
        break;
      }
    }
  }

  const name = flatChordName(pitchedChord);
  return flat ? `b${degree + 1} ${name}` : `${degree + 1} ${name}`;
}

/**
 * Parses a degree prefix from a graph chord name.
 * "b3" -> { degree: 3, modifier: -1 }
 * "#4" -> { degree: 4, modifier: 1 }
 * "2"  -> { degree: 2, modifier: 0 }
 */
export function chordDeg(chord: string): ChordDegree {
  if (chord.length < 2) {
    return { degree: 0, modifier: 0 };
  }
  if (chord[0] === 'b') {
    return { degree: parseInt(chord[1], 10), modifier: -1 };
  }
  if (chord[0] === '#') {
    return { degree: parseInt(chord[1], 10), modifier: 1 };
  }
  return { degree: parseInt(chord[0], 10), modifier: 0 };
}

/**
 * Given the root MIDI note and a degree-qualified chord string (e.g. "b3 minor"),
 * returns the MIDI note of that scale degree.
 */
export function degreeMidi(root: number, chord: string): number {
  if (!chord) {
    return root;
  }
  const scale = MODES.ionian;
  const deg = chordDeg(chord);
  return root + scale[deg.degree - 1] + deg.modifier;
}

/**
 * Removes the degree prefix from a graph chord name.
 * "b3 dominant7" -> "dominant7"
 * "" -> "__"
 */
export function unstepChord(chord: string): string {
  if (chord.length > 0) {
    return chord.substring(chord.indexOf(' ') + 1);
  }
  return '__';
}

/**
 * Alias for steppedChord.
 */
export function degreeChordName(chord: number[], root: number): string {
  return steppedChord(chord, root);
}

/**
 * Abbreviates chord quality names in a sequence string.
 * dominant -> dom, diminished -> dim, minor -> min, major -> maj
 */
export function abbreviateSequence(sequence: string): string {
  return sequence
    .replace(/dominant/g, 'dom')
    .replace(/diminished/g, 'dim')
    .replace(/minor/g, 'min')
    .replace(/major/g, 'maj');
}

/**
 * Joins an array of chord names with "|" to form a graph key.
 */
export function graphToken(chordNames: string[]): string {
  return chordNames.join('|');
}

// ── Inversion Detection ─────────────────────────────────────────────────

export interface ChordMatch {
  quality: string;
  rootPc: number;
  bassNote: number;
  inversion: number;
}

/**
 * Given sorted MIDI notes, detects the chord quality and inversion.
 * Tries each pitch class as a potential root to recognize inversions.
 * Returns null if no chord is recognized.
 */
export function detectChordWithInversion(
  pitchedChord: number[],
): ChordMatch | null {
  if (pitchedChord.length < 2) return null;

  const sorted = [...pitchedChord].sort((a, b) => a - b);
  const bassNote = sorted[0];
  const bassPc = bassNote % 12;

  // Unique pitch classes, sorted ascending
  const pcs = [...new Set(sorted.map((n) => n % 12))].sort((a, b) => a - b);
  if (pcs.length < 2) return null;

  // Try bass pitch class first (root position priority)
  const candidates = [bassPc, ...pcs.filter((pc) => pc !== bassPc)];

  let bestMatch: ChordMatch | null = null;

  for (const candidate of candidates) {
    const intervals = pcs
      .map((pc) => (pc - candidate + 12) % 12)
      .sort((a, b) => a - b);

    for (const [name, def] of Object.entries(CHORDS)) {
      // Skip slash chord entries (voicing variants, not for detection)
      if (name.includes('/')) continue;

      // Normalize definition to mod 12 for pitch-class comparison
      const normDef = [...new Set(def.map((v) => v % 12))].sort(
        (a, b) => a - b,
      );
      if (
        normDef.length === intervals.length &&
        normDef.every((v, i) => v === intervals[i])
      ) {
        // Determine inversion from bass note position
        const bassInterval = (bassPc - candidate + 12) % 12;
        let inversion = 0;
        for (let j = 1; j < def.length; j++) {
          if (def[j] % 12 === bassInterval) {
            inversion = j;
            break;
          }
        }

        const match: ChordMatch = {
          quality: name,
          rootPc: candidate,
          bassNote,
          inversion,
        };

        // Root position → return immediately
        if (candidate === bassPc) return match;

        // Non-root: prefer 7th chords over 6th chords
        if (!bestMatch) {
          bestMatch = match;
        } else {
          const bestIs6th =
            bestMatch.quality === 'major6' || bestMatch.quality === 'minor6';
          const currentIs6th = name === 'major6' || name === 'minor6';
          if (bestIs6th && !currentIs6th) {
            bestMatch = match;
          }
        }
        break; // one match per candidate
      }
    }
  }

  return bestMatch;
}
