/**
 * intervalName.ts — a move by semitones in words, as the clip menu's
 * Transpose names it: "Up a minor 3rd", "Down an octave and a whole step".
 *
 * Half and whole steps are named as steps, the rest by their interval, so a
 * student hears the word a teacher would use. Past an octave the octaves are
 * counted first and the rest named after them.
 */

/** Within an octave, by semitones (1–11). */
const WITHIN_OCTAVE = [
  '',
  'a half step',
  'a whole step',
  'a minor 3rd',
  'a major 3rd',
  'a perfect 4th',
  'a tritone',
  'a perfect 5th',
  'a minor 6th',
  'a major 6th',
  'a minor 7th',
  'a major 7th',
] as const;

const OCTAVE_COUNT = ['', 'an octave', 'two octaves', 'three octaves'];

/** The size of a move, without its direction: "a minor 3rd", "an octave". */
export function intervalSize(semitones: number): string {
  const size = Math.abs(Math.trunc(semitones));
  if (size === 0) return 'no change';
  const octaves = Math.floor(size / 12);
  const rest = size % 12;
  const octaveWords = OCTAVE_COUNT[octaves] ?? `${octaves} octaves`;
  if (octaves === 0) return WITHIN_OCTAVE[rest];
  if (rest === 0) return octaveWords;
  return `${octaveWords} and ${WITHIN_OCTAVE[rest]}`;
}

/** "Up a minor 3rd", "Down an octave", or "No change". */
export function transposeWords(semitones: number): string {
  const n = Math.trunc(semitones);
  if (n === 0) return 'No change';
  return `${n > 0 ? 'Up' : 'Down'} ${intervalSize(n)}`;
}

/** "+3 semitones", "−1 semitone", "0 semitones" (a real minus sign). */
export function semitoneCount(semitones: number): string {
  const n = Math.trunc(semitones);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${Math.abs(n)} ${Math.abs(n) === 1 ? 'semitone' : 'semitones'}`;
}
