import type { ChordDegree, ModeName } from '../types';
import { CHORDS } from '../data/chords';
import { MODES, MODE_NAMES } from '../data/modes';
import { CHORD_COLORS } from '../data/keyColors';
import { noteNameLetter } from '../data/notes';

// ── Mode helpers ──────────────────────────────────────────────────────────

const DIATONIC_SET = new Set<string>(MODE_NAMES);

/** Returns true if the mode is one of the 7 diatonic modes. */
export function isDiatonicMode(mode: string): boolean {
  return DIATONIC_SET.has(mode);
}

/** Returns the semitone offset of a diatonic mode from its parent Ionian root. */
export function getModeOffset(mode: string): number {
  const idx = MODE_NAMES.indexOf(mode as ModeName);
  if (idx <= 0) return 0;
  return MODES.ionian[idx];
}

/**
 * Convert a degree prefix + quality from Ionian-relative to mode-relative.
 * Internal helper used by ionianToModeLabel and modeToIonianLabel.
 */
function convertDegreePart(
  degreeStr: string,
  quality: string,
  semitoneShift: number,
): string {
  const deg = chordDeg(`${degreeStr} _`);
  if (deg.degree === 0) return `${degreeStr} ${quality}`;
  const ionianScale = MODES.ionian;
  const srcSemitones = ionianScale[deg.degree - 1] + deg.modifier;
  const targetSemitones = (((srcSemitones + semitoneShift) % 12) + 12) % 12;

  for (let i = 0; i < ionianScale.length; i++) {
    if (ionianScale[i] === targetSemitones) return `${i + 1} ${quality}`;
  }
  for (let i = 0; i < ionianScale.length; i++) {
    if (ionianScale[i] === targetSemitones + 1) return `b${i + 1} ${quality}`;
  }
  for (let i = 0; i < ionianScale.length; i++) {
    if (ionianScale[i] === targetSemitones - 1) return `#${i + 1} ${quality}`;
  }
  return `${degreeStr} ${quality}`;
}

/** Parse the degree prefix string from a chord label (e.g., "b3" from "b3 minor"). */
function extractDegreePrefix(label: string): string {
  const spaceIdx = label.indexOf(' ');
  return spaceIdx >= 0 ? label.substring(0, spaceIdx) : label;
}

/**
 * Convert an Ionian-relative chord label to a mode-relative label.
 * Only transforms diatonic modes; non-diatonic modes return the label unchanged.
 * Handles slash chords (e.g., "4 major/1").
 */
export function ionianToModeLabel(ionianLabel: string, mode: string): string {
  if (mode === 'ionian' || !isDiatonicMode(mode)) return ionianLabel;
  const offset = getModeOffset(mode);
  if (offset === 0) return ionianLabel;

  const slashIdx = ionianLabel.indexOf('/');
  if (slashIdx >= 0) {
    const mainPart = ionianLabel.substring(0, slashIdx);
    const bassDegree = ionianLabel.substring(slashIdx + 1);
    const mainQuality = unstepChord(mainPart);
    const mainDegreeStr = extractDegreePrefix(mainPart);
    const convertedMain = convertDegreePart(
      mainDegreeStr,
      mainQuality,
      -offset,
    );
    // Bass is just a degree number (e.g., "1", "3")
    const bassConverted = convertDegreePart(bassDegree, '', -offset);
    const bassResult = extractDegreePrefix(bassConverted);
    return `${convertedMain}/${bassResult}`;
  }

  const quality = unstepChord(ionianLabel);
  const degreeStr = extractDegreePrefix(ionianLabel);
  return convertDegreePart(degreeStr, quality, -offset);
}

/**
 * Convert a mode-relative chord label back to Ionian-relative.
 * Reverse of ionianToModeLabel.
 */
export function modeToIonianLabel(modeLabel: string, mode: string): string {
  if (mode === 'ionian' || !isDiatonicMode(mode)) return modeLabel;
  const offset = getModeOffset(mode);
  if (offset === 0) return modeLabel;

  const slashIdx = modeLabel.indexOf('/');
  if (slashIdx >= 0) {
    const mainPart = modeLabel.substring(0, slashIdx);
    const bassDegree = modeLabel.substring(slashIdx + 1);
    const mainQuality = unstepChord(mainPart);
    const mainDegreeStr = extractDegreePrefix(mainPart);
    const convertedMain = convertDegreePart(mainDegreeStr, mainQuality, offset);
    const bassConverted = convertDegreePart(bassDegree, '', offset);
    const bassResult = extractDegreePrefix(bassConverted);
    return `${convertedMain}/${bassResult}`;
  }

  const quality = unstepChord(modeLabel);
  const degreeStr = extractDegreePrefix(modeLabel);
  return convertDegreePart(degreeStr, quality, offset);
}

/**
 * Given a chord's root pitch class, quality, and the session key pitch class,
 * resolves the degree-qualified chord key for CHORD_COLORS lookup.
 * Prefers the flat/sharp candidate that exists in CHORD_COLORS.
 * Shared by useLiveChordColor and prismSlice to guarantee identical results.
 */
export function resolveDegreeKey(
  rootPc: number,
  quality: string,
  keyPc: number,
): string | undefined {
  const ionian = MODES.ionian;
  const diff = (rootPc - keyPc + 12) % 12;
  const directIdx = ionian.indexOf(diff);
  if (directIdx >= 0) return `${directIdx + 1} ${quality}`;
  const flatIdx = ionian.indexOf(diff + 1);
  const sharpIdx = ionian.indexOf(diff - 1);
  const flatKey = flatIdx >= 0 ? `b${flatIdx + 1} ${quality}` : undefined;
  const sharpKey = sharpIdx >= 0 ? `#${sharpIdx + 1} ${quality}` : undefined;
  if (flatKey && sharpKey) {
    if (CHORD_COLORS[flatKey] !== undefined) return flatKey;
    if (CHORD_COLORS[sharpKey] !== undefined) return sharpKey;
    return flatKey;
  }
  return flatKey ?? sharpKey;
}

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
