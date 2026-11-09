// ── A short tune, on three dials ───────────────────────────────────────────
// The same eight-note pattern, whatever the dials say, so that what changes is
// only speed, scale and how high it sits.

export type PhraseScale = 'major' | 'minor';
export type PhraseRegister = 'low' | 'middle' | 'high';

export interface PhraseDials {
  bpm: number;
  scale: PhraseScale;
  register: PhraseRegister;
}

const SCALES: Record<PhraseScale, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
};

const ROOTS: Record<PhraseRegister, number> = {
  low: 110,
  middle: 220,
  high: 440,
};

/** Positions in the scale: up the chord, back down, leaning on the second. */
const PATTERN = [0, 2, 4, 7, 4, 2, 1, 2] as const;

export const PHRASE_LENGTH = PATTERN.length;

/** Semitones above the root, for each of the tune's notes. */
export const phraseSemitones = (scale: PhraseScale) =>
  PATTERN.map((position) => SCALES[scale][position]);

export const phraseHz = (dials: PhraseDials) =>
  phraseSemitones(dials.scale).map(
    (semitones) => ROOTS[dials.register] * 2 ** (semitones / 12),
  );

/** How long one of its notes lasts: two to a beat. */
export const stepMs = (bpm: number) => 60_000 / bpm / 2;

export type Mood = 'calm' | 'excited' | 'sad';

/**
 * What many listeners raised on Western music tend to report. Not a right
 * answer: a student's own choice is never marked against it.
 */
export const COMMON_READING: Record<Mood, string> = {
  calm: 'Many listeners hear slow, often lower and in either scale, as calm.',
  excited:
    'Many listeners hear fast, often higher, as exciting, in either scale.',
  sad: 'Many listeners raised on Western music hear slow and minor as sad.',
};
