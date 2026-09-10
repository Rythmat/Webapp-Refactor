/**
 * enharmonicEngine.ts — Single source of truth for note spelling across the app
 * (Learn, Studio, Arcade). Every user-visible note name should come from here.
 * Implements the "Enharmonic Interpretation Engine" rules document (v1.1).
 *
 * Rules, in priority order:
 *  1. Scale tones (doc Rule 2): a 7-note scale uses each letter exactly once,
 *     starting from the root's letter. B♭ Ionian → B♭ C D E♭ F G A; A♭ Dorian →
 *     A♭ B♭ C♭ D♭ E♭ F G♭. The root label decides the spelling (D♭ vs C♯).
 *  2. Tones outside the scale (doc Priority 2–3 / KEY_NOTE_NAMES): the table
 *     row for the key context. For the diatonic modes that is the parent major
 *     key (D Dorian → C), i.e. the parent mode.
 *  3. Octave numbers follow the letter, not the pitch class: C♭5 = MIDI 71,
 *     B♯3 = MIDI 60 (scientific pitch notation, same as Tone.js).
 *
 * Display strings use Unicode accidentals (♭ ♯ 𝄫 𝄪). The parser accepts both
 * Unicode and ASCII (b # bb ## x).
 */

// ── Rule table ───────────────────────────────────────────────────────────────
// Definitive key-specific note name table.
// Key = root note name, Value = 12 note names indexed by semitone 0-11.
// DO NOT MODIFY THIS TABLE — it is the canonical enharmonic reference.

export const KEY_NOTE_NAMES: Record<string, string[]> = {
  C: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  Db: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb'],
  D: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  Eb: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  E: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
  F: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  'F#': ['B#', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  Gb: ['C', 'Db', 'D', 'Eb', 'Fb', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb'],
  G: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  Ab: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  A: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
  Bb: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  B: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
};

// Map MIDI root number to key name
export const MIDI_ROOT_TO_KEY: Record<number, string> = {
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

// ── Parsing & formatting ─────────────────────────────────────────────────────

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11];

const ACCIDENTAL_OFFSETS: Record<string, number> = {
  '': 0,
  '♮': 0,
  '#': 1,
  '♯': 1,
  b: -1,
  '♭': -1,
  '##': 2,
  '♯♯': 2,
  x: 2,
  X: 2,
  '𝄪': 2,
  bb: -2,
  '♭♭': -2,
  '𝄫': -2,
};

const NOTE_NAME_PATTERN =
  /^([A-Ga-g])(𝄫|𝄪|♭♭|♯♯|bb|##|♮|♭|♯|b|#|x|X)?(-?\d+)?$/u;

const UNICODE_ACCIDENTALS: Record<number, string> = {
  [-2]: '𝄫',
  [-1]: '♭',
  0: '',
  1: '♯',
  2: '𝄪',
};

const ASCII_ACCIDENTALS: Record<number, string> = {
  [-2]: 'bb',
  [-1]: 'b',
  0: '',
  1: '#',
  2: '##',
};

export type AccidentalStyle = 'unicode' | 'ascii';

export interface SpelledNote {
  /** Index into C D E F G A B. */
  letterIndex: number;
  /** -2 (𝄫) … +2 (𝄪). */
  accidental: number;
  octave?: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** "B♭4", "Bb4", "bb", "F𝄪", "Fx3" → letter, accidental and optional octave. */
export function parseNoteName(name: string): SpelledNote | null {
  const match = NOTE_NAME_PATTERN.exec(name.trim());
  if (!match) return null;
  const [, letter, accidental = '', octave] = match;
  return {
    letterIndex: LETTERS.indexOf(
      letter.toUpperCase() as (typeof LETTERS)[number],
    ),
    accidental: ACCIDENTAL_OFFSETS[accidental],
    ...(octave !== undefined ? { octave: Number(octave) } : {}),
  };
}

export function noteNameToPitchClass(name: string): number | null {
  const note = parseNoteName(name);
  return note
    ? mod12(LETTER_PITCH_CLASS[note.letterIndex] + note.accidental)
    : null;
}

/** "B♭4" → 70, "C♭5" → 71, "B♯3" → 60. Null if unparseable or octave-less. */
export function pitchNameToMidi(name: string): number | null {
  const note = parseNoteName(name);
  if (!note || note.octave === undefined) return null;
  return (
    (note.octave + 1) * 12 +
    LETTER_PITCH_CLASS[note.letterIndex] +
    note.accidental
  );
}

function formatNote(note: SpelledNote, style: AccidentalStyle): string {
  const accidentals =
    style === 'ascii' ? ASCII_ACCIDENTALS : UNICODE_ACCIDENTALS;
  return `${LETTERS[note.letterIndex]}${accidentals[note.accidental] ?? ''}${note.octave ?? ''}`;
}

/** Re-render a note name in one accidental style. Unparseable input is returned as-is. */
export function formatNoteName(
  name: string,
  style: AccidentalStyle = 'unicode',
): string {
  const note = parseNoteName(name);
  return note ? formatNote(note, style) : name;
}

/** Attach the octave that belongs to `note`'s letter when it sounds as `midi`. */
function withLetterOctave(note: SpelledNote, midi: number): SpelledNote {
  return { ...note, octave: Math.floor((midi - note.accidental) / 12) - 1 };
}

// ── Spelling ─────────────────────────────────────────────────────────────────

const IONIAN_STEPS = [0, 2, 4, 5, 7, 9, 11];

/** KEY_NOTE_NAMES row for a key name, falling back to its pitch class. */
function chromaticRow(keyName: string): string[] {
  const note = parseNoteName(keyName);
  if (!note) return KEY_NOTE_NAMES.C;
  const ascii = formatNote({ ...note, octave: undefined }, 'ascii');
  const pitchClass = mod12(
    LETTER_PITCH_CLASS[note.letterIndex] + note.accidental,
  );
  return (
    KEY_NOTE_NAMES[ascii] ??
    KEY_NOTE_NAMES[MIDI_ROOT_TO_KEY[pitchClass]] ??
    KEY_NOTE_NAMES.C
  );
}

/** Distinct scale steps within one octave, ascending. */
function scaleDegrees(steps: number[]): number[] {
  return [...new Set(steps.map(mod12))].sort((a, b) => a - b);
}

/** For a rotation of the major scale, the degree index of its parent major tonic. */
function parentMajorDegree(degrees: number[]): number | null {
  for (let rotation = 0; rotation < 7; rotation++) {
    const matches = degrees.every(
      (step, i) =>
        step ===
        mod12(IONIAN_STEPS[(rotation + i) % 7] - IONIAN_STEPS[rotation]),
    );
    if (matches) return (7 - rotation) % 7;
  }
  return null;
}

/**
 * Spell a 7-note scale from its root label and semitone steps (a closing
 * octave is ignored). Returns null for anything that isn't a 7-note scale.
 * A degree that would need a triple accidental falls back to KEY_NOTE_NAMES.
 */
export function spellScale(root: string, steps: number[]): string[] | null {
  const rootNote = parseNoteName(root);
  const degrees = scaleDegrees(steps);
  if (!rootNote || degrees.length !== 7 || degrees[0] !== 0) return null;

  const rootPitchClass =
    LETTER_PITCH_CLASS[rootNote.letterIndex] + rootNote.accidental;
  return degrees.map((step, i) => {
    const letterIndex = (rootNote.letterIndex + i) % 7;
    const accidental =
      mod12(rootPitchClass + step - LETTER_PITCH_CLASS[letterIndex] + 6) - 6;
    if (Math.abs(accidental) > 2) {
      return formatNoteName(chromaticRow(root)[mod12(rootPitchClass + step)]);
    }
    return formatNote({ letterIndex, accidental }, 'unicode');
  });
}

/**
 * Pitch class (0-11) → display name for all twelve pitch classes in the context
 * of `root` and, optionally, its scale steps. Scale tones follow rule 1, the
 * rest rule 2. Empty when `root` can't be parsed.
 */
export function buildSpellingMap(
  root: string,
  steps?: number[],
): Map<number, string> {
  const map = new Map<number, string>();
  const rootPitchClass = noteNameToPitchClass(root);
  if (rootPitchClass === null) return map;

  const scale = steps ? spellScale(root, steps) : null;
  const parentDegree =
    scale && steps ? parentMajorDegree(scaleDegrees(steps)) : null;
  const keyContext =
    scale && parentDegree !== null ? scale[parentDegree] : root;

  chromaticRow(keyContext).forEach((name, pitchClass) =>
    map.set(pitchClass, formatNoteName(name)),
  );
  map.set(rootPitchClass, formatNoteName(root));
  scale?.forEach((name) => map.set(noteNameToPitchClass(name)!, name));
  return map;
}

/** MIDI → "E♭4" from a spelling map. The octave follows the letter (C♭5 = 71). */
export function spellMidi(midi: number, spelling: Map<number, string>): string {
  const pitchClass = mod12(midi);
  const note =
    parseNoteName(spelling.get(pitchClass) ?? '') ??
    parseNoteName(KEY_NOTE_NAMES.C[pitchClass])!;
  return formatNote(withLetterOctave(note, midi), 'unicode');
}

/**
 * Convert MIDI note to pitch name with key-context-aware enharmonic spelling.
 * Uses KEY_NOTE_NAMES lookup — the single source of truth. ASCII accidentals.
 *
 * @param midi - MIDI note number (0-127)
 * @param keyRoot - optional MIDI root for key context (e.g., 62 for D)
 */
export function midiToPitchName(midi: number, keyRoot?: number): string {
  const keyName =
    keyRoot !== undefined ? (MIDI_ROOT_TO_KEY[mod12(keyRoot)] ?? 'C') : 'C';
  const noteNames = KEY_NOTE_NAMES[keyName] ?? KEY_NOTE_NAMES.C;
  const note = parseNoteName(noteNames[mod12(midi)])!;
  return formatNote(withLetterOctave(note, midi), 'ascii');
}

// ── Chords ───────────────────────────────────────────────────────────────────

/** Letter steps above the root for each chord interval (semitones above the root). */
function chordLetterSteps(intervals: number[]): number[] {
  const has = new Set(intervals.map(mod12));
  return intervals.map((interval) => {
    switch (mod12(interval)) {
      case 0:
        return 0;
      case 1:
      case 2:
        return 1; // ♭9, 9
      case 3:
        return has.has(4) ? 1 : 2; // ♯9 over a major 3rd, else minor 3rd
      case 4:
        return 2;
      case 5:
        return 3; // 4, 11
      case 6:
        return has.has(7) ? 3 : 4; // ♯11 over a perfect 5th, else ♭5
      case 7:
        return 4;
      case 8:
        return has.has(7) ? 5 : 4; // ♭13 over a perfect 5th, else ♯5
      case 9:
        // 𝄫7 in a diminished 7th, else 6 / 13
        return has.has(3) && has.has(6) && !has.has(10) && !has.has(11) ? 6 : 5;
      default:
        return 6; // ♭7, 7
    }
  });
}

/** A natural if the pitch class has one, else a single accidental in `direction`. */
function simplestName(pitchClass: number, direction: number): string {
  const natural = LETTER_PITCH_CLASS.indexOf(pitchClass);
  if (natural >= 0) return LETTERS[natural];
  const letterIndex = LETTER_PITCH_CLASS.indexOf(mod12(pitchClass - direction));
  return formatNote({ letterIndex, accidental: direction }, 'unicode');
}

/**
 * Spell a chord as one unit from its root (doc Rule 3): A dom7 → A C♯ E G, never
 * A D♭ E G. `intervals` are semitones above the root. Double accidentals show as
 * their simplest equivalent (F𝄪 → G) unless `strict` (doc Priority 0a).
 */
export function spellChord(
  root: string,
  intervals: number[],
  { strict = false }: { strict?: boolean } = {},
): string[] {
  const rootNote = parseNoteName(root);
  if (!rootNote) return [];
  const rootPitchClass =
    LETTER_PITCH_CLASS[rootNote.letterIndex] + rootNote.accidental;
  const steps = chordLetterSteps(intervals);
  return intervals.map((interval, i) => {
    const pitchClass = mod12(rootPitchClass + interval);
    const letterIndex = (rootNote.letterIndex + steps[i]) % 7;
    const accidental =
      mod12(pitchClass - LETTER_PITCH_CLASS[letterIndex] + 6) - 6;
    if (Math.abs(accidental) <= 1 || (strict && Math.abs(accidental) === 2)) {
      return formatNote({ letterIndex, accidental }, 'unicode');
    }
    return simplestName(pitchClass, Math.sign(accidental));
  });
}
