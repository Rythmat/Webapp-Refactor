/**
 * Chroma's rounds: the intervals a player names, and the notes that sound.
 *
 * The root never changes: every interval is heard from the same note, within
 * one octave above it, unison through octave. A round plays the root before
 * each interval note (root – 4th, root – octave, root – ♭6), so every interval
 * is heard from the root, never from the note before it. The level is how many
 * intervals a round asks for.
 */

/** Every interval sounds from this note (C4). */
export const CHROMA_ROOT = 60;

export interface ChromaInterval {
  /** Above the root, 0 (unison) to 12 (octave). */
  semitones: number;
  /** Its name in words: 'Perfect 4th'. */
  words: string;
  /** Its scale-degree number: '4', '♭3', '♯4', '8'. */
  number: string;
  /** The note it lands on above C, spelled for that interval. */
  note: string;
}

export const CHROMA_INTERVALS: readonly ChromaInterval[] = [
  { semitones: 0, words: 'Perfect Unison', number: '1', note: 'C' },
  { semitones: 1, words: 'Minor 2nd', number: '♭2', note: 'D♭' },
  { semitones: 2, words: 'Major 2nd', number: '2', note: 'D' },
  { semitones: 3, words: 'Minor 3rd', number: '♭3', note: 'E♭' },
  { semitones: 4, words: 'Major 3rd', number: '3', note: 'E' },
  { semitones: 5, words: 'Perfect 4th', number: '4', note: 'F' },
  { semitones: 6, words: 'Tritone', number: '♯4', note: 'F♯' },
  { semitones: 7, words: 'Perfect 5th', number: '5', note: 'G' },
  { semitones: 8, words: 'Minor 6th', number: '♭6', note: 'A♭' },
  { semitones: 9, words: 'Major 6th', number: '6', note: 'A' },
  { semitones: 10, words: 'Minor 7th', number: '♭7', note: 'B♭' },
  { semitones: 11, words: 'Major 7th', number: '7', note: 'B' },
  { semitones: 12, words: 'Octave', number: '8', note: 'C' },
];

/** How the player names intervals: 'Perfect 4th', or '4'. */
export type IntervalNaming = 'words' | 'numbers';

export function chromaInterval(semitones: number): ChromaInterval {
  return (
    CHROMA_INTERVALS.find((iv) => iv.semitones === semitones) ??
    CHROMA_INTERVALS[0]
  );
}

/** An interval's name as the player has chosen to read them. */
export function intervalLabel(
  semitones: number,
  naming: IntervalNaming,
): string {
  const iv = chromaInterval(semitones);
  return naming === 'numbers' ? iv.number : iv.words;
}

/** How many intervals a round asks for. */
export type ChromaLevel = 1 | 2 | 3;

/**
 * An interval comes back only after six others have been heard: a streak of
 * five never hears one twice, and a Level 3 round never repeats one from the
 * round before.
 */
export const CHROMA_FRESH = 6;

/**
 * A round's intervals, `level` of them, in the order they're heard: no two
 * alike, and none of the `recent` ones (the last heard, newest last).
 * `random` returns [0, 1), as Math.random does.
 */
export function pickIntervals(
  level: ChromaLevel,
  random: () => number = Math.random,
  recent: readonly number[] = [],
): number[] {
  const stale = new Set(recent.slice(-CHROMA_FRESH));
  const all = CHROMA_INTERVALS.map((iv) => iv.semitones);
  const fresh = all.filter((s) => !stale.has(s));
  const pool = fresh.length >= level ? fresh : all;
  const picked: number[] = [];
  for (let i = 0; i < level; i++) {
    const at = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    picked.push(pool.splice(at, 1)[0]);
  }
  return picked;
}

/** One note of a round as it sounds: the root, or the interval it leads to. */
export interface ChromaNote {
  midi: number;
  /** Which of the round's intervals this note belongs to. */
  pair: number;
  isRoot: boolean;
}

/** The notes a round plays: the root before each interval note. */
export function roundNotes(intervals: readonly number[]): ChromaNote[] {
  return intervals.flatMap((semitones, pair) => [
    { midi: CHROMA_ROOT, pair, isRoot: true },
    { midi: CHROMA_ROOT + semitones, pair, isRoot: false },
  ]);
}
