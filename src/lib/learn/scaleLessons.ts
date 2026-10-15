/**
 * Theory lessons for the pentatonic and blues scales — the Pentatonic/Blues
 * mode family. They are scales, not modes of a seven-note parent, so there is
 * no chord built on every degree: each lesson's Chords chapter is only the
 * tonic chords Peter chose for it (`chords`), and it ends in a Practice Track
 * over a fixed progression.
 *
 * The slugs are the API's own (`/learn/majorpentatonic/c`), so routing and
 * progress keys work as they do for every other mode.
 */

/** The parent mode the Studio colours and spells a scale's chords in. */
export type ScaleParentMode = 'ionian' | 'aeolian' | 'mixolydian' | 'dorian';

/** One bar of a practice progression, a degree of the parent major scale. */
export interface ScaleProgressionChord {
  /** 1–7, counted from the major scale of the tonic. */
  degree: number;
  accidental: -1 | 0 | 1;
  quality: 'major' | 'minor' | 'major7' | 'dominant7';
}

/** A tonic chord the scale's Chords chapter teaches, in one set voicing. */
export interface ScaleLessonChord {
  /** Hybrid quality after the degree: "maj6" → "1 maj6". */
  quality: string;
  /** The voicing, low to high, in semitones from the tonic. */
  offsets: number[];
  /** Those notes as degrees, for the directions: ['3', '♭7', '♯9']. */
  tones: string[];
}

export interface ScaleLesson {
  slug: ScaleLessonSlug;
  title: string;
  /** Semitones from the tonic, ascending, without the octave. */
  steps: number[];
  /** The scale written as degrees, e.g. '1 – 2 – 3 – 5 – 6'. */
  formula: string;
  /** One line on the scale's sound, shown in the overview and payoff. */
  character: string;
  /** The tonic chord's tones as semitones from the tonic, which the melody
   *  rules land phrases on. A five- or six-note scale has no every-other-
   *  degree triad, so it is named outright. */
  chordTones: number[];
  /** One bar per chord, looped. */
  progression: ScaleProgressionChord[];
  /** The Chords chapter: one arpeggio-and-hold activity each, in order. */
  chords: ScaleLessonChord[];
  parentMode: ScaleParentMode;
  /** Tile art under /learn-tiles/theory. */
  image: string;
}

export const SCALE_LESSON_SLUGS = [
  'majorpentatonic',
  'minorpentatonic',
  'majorblues',
  'minorblues',
] as const;

export type ScaleLessonSlug = (typeof SCALE_LESSON_SLUGS)[number];

const bar = (
  degree: number,
  accidental: -1 | 0 | 1,
  quality: ScaleProgressionChord['quality'],
): ScaleProgressionChord => ({ degree, accidental, quality });

/** | 1 dom7 | 4 dom7 | 1 dom7 | 1 dom7 | — the blues scales' practice changes. */
const BLUES_CHANGES = [
  bar(1, 0, 'dominant7'),
  bar(4, 0, 'dominant7'),
  bar(1, 0, 'dominant7'),
  bar(1, 0, 'dominant7'),
];

const chord = (
  quality: string,
  offsets: number[],
  tones: string[],
): ScaleLessonChord => ({ quality, offsets, tones });

const MAJ = chord('maj', [0, 4, 7], ['1', '3', '5']);
const MIN = chord('min', [0, 3, 7], ['1', '♭3', '5']);
const MAJ6 = chord('maj6', [0, 4, 7, 9], ['1', '3', '5', '6']);
const MIN7 = chord('min7', [0, 3, 7, 10], ['1', '♭3', '5', '♭7']);

export const SCALE_LESSONS: Record<ScaleLessonSlug, ScaleLesson> = {
  majorpentatonic: {
    slug: 'majorpentatonic',
    title: 'Major Pentatonic',
    steps: [0, 2, 4, 7, 9],
    formula: '1 – 2 – 3 – 5 – 6',
    character: 'Major without the 4 and 7: open, sunny, no half steps',
    chordTones: [0, 4, 7],
    progression: [
      bar(1, 0, 'major'),
      bar(4, 0, 'major'),
      bar(1, 0, 'major'),
      bar(4, 0, 'major'),
    ],
    chords: [MAJ, MAJ6],
    parentMode: 'ionian',
    image: '/learn-tiles/theory/majorpentatonic.svg',
  },
  minorpentatonic: {
    slug: 'minorpentatonic',
    title: 'Minor Pentatonic',
    steps: [0, 3, 5, 7, 10],
    formula: '1 – ♭3 – 4 – 5 – ♭7',
    character: 'Minor without the 2 and ♭6: the backbone of rock and blues',
    chordTones: [0, 3, 7],
    progression: [
      bar(1, 0, 'minor'),
      bar(1, 0, 'minor'),
      bar(6, -1, 'major7'),
      bar(6, -1, 'major7'),
    ],
    chords: [MIN, MIN7],
    parentMode: 'aeolian',
    image: '/learn-tiles/theory/minorpentatonic.svg',
  },
  majorblues: {
    slug: 'majorblues',
    title: 'Major Blues',
    steps: [0, 2, 3, 4, 7, 9],
    formula: '1 – 2 – ♭3 – 3 – 5 – 6',
    character: 'Major pentatonic plus the ♭3 blue note, bending up into the 3',
    chordTones: [0, 4, 7],
    progression: BLUES_CHANGES,
    chords: [
      MAJ,
      MAJ6,
      // Shell voicing, no 5th.
      chord('dom7', [0, 4, 10], ['1', '3', '♭7']),
    ],
    parentMode: 'mixolydian',
    image: '/learn-tiles/theory/majorblues.svg',
  },
  minorblues: {
    slug: 'minorblues',
    title: 'Minor Blues',
    steps: [0, 3, 5, 6, 7, 10],
    formula: '1 – ♭3 – 4 – ♯4 – 5 – ♭7',
    character: 'Minor pentatonic plus the ♯4 blue note between the 4 and 5',
    chordTones: [0, 3, 7],
    progression: BLUES_CHANGES,
    chords: [
      MIN,
      MIN7,
      // Rootless: the 3, ♭7 and ♯9 over the tonic.
      chord('dom7(♯9)', [4, 10, 15], ['3', '♭7', '♯9']),
    ],
    parentMode: 'mixolydian',
    image: '/learn-tiles/theory/minorblues.svg',
  },
};

export const isScaleLesson = (
  mode: string | null | undefined,
): mode is ScaleLessonSlug =>
  !!mode && (SCALE_LESSON_SLUGS as readonly string[]).includes(mode);

export const getScaleLesson = (
  mode: string | null | undefined,
): ScaleLesson | null => (isScaleLesson(mode) ? SCALE_LESSONS[mode] : null);

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/**
 * The scale's notes spelled from its formula: each degree takes its own
 * letter above the tonic, so C minor blues' ♯4 is F♯, not G♭. `tonic` is the
 * spelled tonic, e.g. 'E♭'.
 */
export function spellScaleLesson(lesson: ScaleLesson, tonic: string): string[] {
  const match = tonic.match(/^([A-G])([♭♯]?)/);
  if (!match) return [];
  const tonicLetter = LETTERS.indexOf(match[1]);
  const tonicPc =
    (LETTER_PC[tonicLetter] +
      (match[2] === '♯' ? 1 : match[2] === '♭' ? -1 : 0) +
      12) %
    12;
  return lesson.formula.split(' – ').map((token, i) => {
    const degree = Number(token.replace(/[♭♯]/g, ''));
    const letter = (tonicLetter + degree - 1) % 7;
    let diff = (tonicPc + lesson.steps[i] - LETTER_PC[letter] + 12) % 12;
    if (diff > 6) diff -= 12;
    const accidental = diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff);
    return `${LETTERS[letter]}${accidental}`;
  });
}

/**
 * A scale chord's notes spelled from its own degrees, low to high: the 9 takes
 * the 2's letter, so C's dom7(♯9) is E – B♭ – D♯, never an E♭ beside the E
 * the chord's 3 needs. `tonic` takes ♭/♯ or b/#: "B♭", "Bb", "F#".
 */
export function spellScaleChord(
  chord: ScaleLessonChord,
  tonic: string,
): string[] {
  const match = tonic.match(/^([A-G])([♭♯b#]?)/);
  if (!match) return [];
  const tonicLetter = LETTERS.indexOf(match[1]);
  const sharp = match[2] === '♯' || match[2] === '#';
  const flat = match[2] === '♭' || match[2] === 'b';
  const tonicPc =
    (LETTER_PC[tonicLetter] + (sharp ? 1 : flat ? -1 : 0) + 12) % 12;
  return chord.tones.map((tone, i) => {
    const degree = Number(tone.replace(/[♭♯]/g, ''));
    const letter = (tonicLetter + degree - 1) % 7;
    let diff = (tonicPc + chord.offsets[i] - LETTER_PC[letter] + 24) % 12;
    if (diff > 6) diff -= 12;
    const accidental = diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff);
    return `${LETTERS[letter]}${accidental}`;
  });
}
