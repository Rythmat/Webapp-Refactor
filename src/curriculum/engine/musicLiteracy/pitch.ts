/**
 * Music Literacy's pitches: scale degrees to MIDI in the series' register,
 * read the lesson's way (Part 1's chromatic labels, or Part 2's degrees of
 * the mode). Pure; literacy.ts re-exports all of it.
 */

import {
  LITERACY_SCALE_DEGREES,
  type LiteracyDegree,
  type LiteracyMode,
  type LiteracyNote,
  type LiteracyNumbering,
  type LiteracyScaleDegree,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';

/** A key: its tonic and its mode (the student's choice, or the lesson's). */
export interface LiteracyKey {
  tonic: LiteracyTonic;
  mode: LiteracyMode;
}

/** Semitones above the tonic, per degree. */
export const DEGREE_SEMITONES: Readonly<Record<LiteracyDegree, number>> = {
  '1': 0,
  b2: 1,
  '2': 2,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  b6: 8,
  '6': 9,
  b7: 10,
  '7': 11,
};

/** The degree written for each semitone above the tonic. */
export const DEGREE_OF_SEMITONE: readonly LiteracyDegree[] = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  '#4',
  '5',
  'b6',
  '6',
  'b7',
  '7',
];

/** Each mode's seven degrees, in semitones above the 1 (natural minor). */
export const SCALE_SEMITONES: Readonly<
  Record<LiteracyMode, readonly number[]>
> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const TONIC_PITCH_CLASS: Readonly<Record<LiteracyTonic, number>> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/** The 1's pitch class (C = 0). */
export const pitchClassOf = (tonic: LiteracyTonic): number =>
  TONIC_PITCH_CLASS[tonic];

/** The lowest and highest the 1 may sit: F♯3 and F4, around middle C. */
export const LOWEST_TONIC_MIDI = 54;
export const HIGHEST_TONIC_MIDI = 65;

/**
 * The 1 of a key, in the series' register: within a tritone of middle C, so
 * F♯ starts an augmented 4th below it and F a perfect 4th above. Everything
 * Part 1 and the melodies use (the low 5 up to the 5 above) then fits on the
 * two octaves C3–C5.
 */
export function tonicMidi(tonic: LiteracyTonic): number {
  const midi = 60 + TONIC_PITCH_CLASS[tonic];
  return midi > HIGHEST_TONIC_MIDI ? midi - 12 : midi;
}

/** A note's pitch, given its key's 1 (Part 1's chromatic reading). */
export function noteMidi(
  note: Pick<LiteracyNote, 'degree' | 'octave'>,
  tonic: number,
): number {
  return tonic + DEGREE_SEMITONES[note.degree] + 12 * (note.octave ?? 0);
}

/** A pitch back as a degree and octave of a key (the editors' piano roll). */
export function degreeOfMidi(
  midi: number,
  tonic: number,
): Pick<LiteracyNote, 'degree' | 'octave'> {
  const above = midi - tonic;
  const octave = Math.floor(above / 12);
  const degree = DEGREE_OF_SEMITONE[above - octave * 12];
  return octave === 0 ? { degree } : { degree, octave };
}

/** "♭3" for "b3", "♯4" for "#4": how a degree is shown. */
export function degreeLabel(degree: LiteracyDegree): string {
  return degree.replace('b', '♭').replace('#', '♯');
}

const scaleIndex = (degree: LiteracyDegree) =>
  (LITERACY_SCALE_DEGREES as readonly string[]).indexOf(degree);

/**
 * What a written degree means, as a chromatic degree: itself in chromatic
 * numbering; in scale numbering, that degree of the mode, so minor's 3, 6
 * and 7 are ♭3, ♭6 and ♭7. (An accidental under scale numbering, which the
 * schema refuses, reads as written.)
 */
export function modalDegree(
  degree: LiteracyDegree,
  mode: LiteracyMode,
  numbering: LiteracyNumbering = 'chromatic',
): LiteracyDegree {
  if (numbering === 'chromatic') return degree;
  const index = scaleIndex(degree);
  return index < 0 ? degree : DEGREE_OF_SEMITONE[SCALE_SEMITONES[mode][index]];
}

/**
 * Semitones above the 1 back as a written degree and octave, the lesson's
 * way: a degree of the mode in scale numbering (a pitch outside the mode
 * falls back to its chromatic label), the chromatic label otherwise.
 */
export function writtenDegree(
  semitones: number,
  mode: LiteracyMode,
  numbering: LiteracyNumbering = 'chromatic',
): Pick<LiteracyNote, 'degree' | 'octave'> {
  const octave = Math.floor(semitones / 12);
  const pitchClass = semitones - octave * 12;
  const inMode = SCALE_SEMITONES[mode].indexOf(pitchClass);
  const degree: LiteracyDegree =
    numbering === 'scale' && inMode >= 0
      ? LITERACY_SCALE_DEGREES[inMode]
      : DEGREE_OF_SEMITONE[pitchClass];
  return octave === 0 ? { degree } : { degree, octave };
}

/** A written note's pitch in a key, read the lesson's way. */
export function notePitch(
  note: Pick<LiteracyNote, 'degree' | 'octave'>,
  key: LiteracyKey,
  numbering: LiteracyNumbering = 'chromatic',
): number {
  return (
    tonicMidi(key.tonic) +
    DEGREE_SEMITONES[modalDegree(note.degree, key.mode, numbering)] +
    12 * (note.octave ?? 0)
  );
}

/** Semitones above the 1 of a mode's degree (a chord's root). */
export const scaleSemitones = (
  degree: LiteracyScaleDegree,
  mode: LiteracyMode,
): number => SCALE_SEMITONES[mode][scaleIndex(degree)];
