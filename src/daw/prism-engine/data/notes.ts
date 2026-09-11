// Pitch class to note name (0-11)
export const NOTES: Record<number, string> = {
  0: 'C',
  1: 'Db',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B',
};

// Reverse lookup: note name to pitch class
const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Convert a note name string to MIDI number.
 * Supports: "C4", "C#4", "Db4", "C\u266F4", "D\u266D4"
 */
export function getMidi(name: string): number {
  const normalized = name.replace(/\u266F/g, '#').replace(/\u266D/g, 'b');
  const match = normalized.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter, accidental, octaveStr] = match;
  const base = NOTE_TO_PC[letter];
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const octave = parseInt(octaveStr);
  return (octave + 1) * 12 + base + offset;
}

/** Convert MIDI number to note name: e.g. 60 -> "C4" */
export function noteName(midi: number): string {
  return NOTES[midi % 12] + String(Math.floor(midi / 12) - 1);
}

/** Convert MIDI number to note letter only: e.g. 60 -> "C" */
export function noteNameLetter(midi: number): string {
  return NOTES[midi % 12];
}

// ── Key-aware enharmonic spelling ──────────────────────────────────────────
// All spelling comes from the enharmonic engine (Enharmonic Interpretation
// Engine rules): the key center is named per Rule 1 (NOTES above), scale tones
// get one letter per degree, other pitches follow KEY_NOTE_NAMES for the key —
// or its parent major key for the diatonic modes. Names stay ASCII ("Bb", "F#",
// "Ebb") because chord regions persist and re-parse them; wrap them with
// displayAccidentals() for display.

import {
  buildSpellingMap,
  formatNoteName,
  noteNameToPitchClass,
  spellChord,
  spellLeadingRoot,
  spellScale,
} from '../../../curriculum/engine/genreGeneration/enharmonicEngine';
import { CHORDS } from './chords';
import { ALL_MODES } from './modes';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

const keySpellingCache = new Map<string, Map<number, string>>();

function keySpelling(keyPc: number, mode?: string): Map<number, string> {
  const cacheKey = `${keyPc}:${mode ?? ''}`;
  let spelling = keySpellingCache.get(cacheKey);
  if (!spelling) {
    const steps = mode ? ALL_MODES[mode] : undefined;
    spelling = new Map(
      [...buildSpellingMap(NOTES[keyPc], steps)].map(([pc, name]) => [
        pc,
        formatNoteName(name, 'ascii'),
      ]),
    );
    keySpellingCache.set(cacheKey, spelling);
  }
  return spelling;
}

/**
 * Name pitch class `pc` in the key whose tonic is `keyPc`, optionally in `mode`
 * (an ALL_MODES key). G minor → "Bb", "Eb"; never "A#", "D#".
 */
export function noteNameInKey(
  pc: number,
  keyPc: number,
  mode?: string,
): string {
  return keySpelling(mod12(keyPc), mode).get(mod12(pc))!;
}

/** MIDI → "Bb4" in the key. The octave follows the letter: "Cb5" is MIDI 71. */
export function midiNameInKey(
  midi: number,
  keyPc: number,
  mode?: string,
): string {
  const name = noteNameInKey(midi, keyPc, mode);
  const accidental =
    (name.match(/#/g)?.length ?? 0) - (name.match(/b/g)?.length ?? 0);
  return `${name}${Math.floor((midi - accidental) / 12) - 1}`;
}

/** Chord tones spelled as one unit from `root` (doc Rule 3). Map<pc, ASCII name>. */
export function chordToneNames(
  root: string,
  intervals: number[],
): Map<number, string> {
  const rootPc = noteNameToPitchClass(root) ?? 0;
  const names = spellChord(root, intervals);
  return new Map(
    intervals.map((interval, i) => [
      mod12(rootPc + interval),
      formatNoteName(names[i], 'ascii'),
    ]),
  );
}

/**
 * Chord tones spelled as one unit from the chord root (doc Rule 3), the root
 * named for the key: D major in G minor → D, F#, A (not Gb). Map<pc, ASCII name>.
 */
export function chordToneNamesInKey(
  rootPc: number,
  intervals: number[],
  keyPc: number,
  mode?: string,
): Map<number, string> {
  return chordToneNames(noteNameInKey(rootPc, keyPc, mode), intervals);
}

// "F# dim", "Bb maj/D", "Ebb min7(b5)": root, quality token, optional slash bass.
const CHORD_NAME = /^([A-G](?:bb|##|b|#)?) (\S+?)(?:\/([A-G](?:bb|##|b|#)?))?$/;

/**
 * Doc Priority 1 for leading diminished chords. In an ordered list of chord names,
 * a diminished chord whose root moves a half step to the next chord's root is
 * spelled by that motion: "Gb dim" → "F# dim" before "G min", "F# dim" → "Gb dim"
 * before "F min". A slash bass that is a chord tone follows the new root. Every
 * other name is returned unchanged.
 */
export function respellLeadingChords(names: readonly string[]): string[] {
  const result = [...names];
  // Back to front, so each goal chord is already final when its lead-in is spelled.
  for (let i = result.length - 2; i >= 0; i--) {
    const chord = CHORD_NAME.exec(result[i]);
    const goal = CHORD_NAME.exec(result[i + 1]);
    if (!chord || !goal || !chord[2].startsWith('dim')) continue;
    const [, root, quality, bass] = chord;
    const leading = spellLeadingRoot(noteNameToPitchClass(root)!, goal[1]);
    if (!leading) continue;
    const newRoot = formatNoteName(leading, 'ascii');
    const intervals =
      CHORDS[quality.replace(/^dim/, 'diminished').replace(/[()]/g, '')];
    const newBass =
      bass && intervals
        ? (chordToneNames(newRoot, intervals).get(
            noteNameToPitchClass(bass)!,
          ) ?? bass)
        : bass;
    result[i] = `${newRoot} ${quality}${newBass ? `/${newBass}` : ''}`;
  }
  return result;
}

// ── Scale-aware enharmonic spelling ──────────────────────────────────────────

/**
 * Correctly-spelled note names for in-scale notes.
 * Each of the 7 letter names (A-G) appears exactly once; double accidentals are
 * kept. Returns Map<pitchClass, spelledName> (ASCII) for the 7 in-scale notes.
 */
export function getScaleSpellings(
  rootNote: number,
  mode: string,
): Map<number, string> {
  const intervals = ALL_MODES[mode];
  const scale = intervals
    ? spellScale(NOTES[mod12(rootNote)], intervals)
    : null;
  if (!scale) return new Map();
  return new Map(
    scale.map((name, i) => [
      mod12(rootNote + intervals[i]),
      formatNoteName(name, 'ascii'),
    ]),
  );
}

/** Ticks per quarter note */
export const BEAT_VAL = 480;
