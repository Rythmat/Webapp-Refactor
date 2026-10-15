// ── Degree labels ─────────────────────────────────────────────────────────
// How each note of a seven-note scale is written against the major scale:
// Dorian 1 2 ♭3 4 5 6 ♭7, Locrian 𝄫3 𝄫7 1 ♭2 𝄫3 4 ♭5 ♭6 𝄫7.

import { MAJOR_SCALE_STEPS } from './bookOne';

const ACCIDENTAL: Readonly<Record<number, string>> = {
  [-2]: '𝄫',
  [-1]: '♭',
  0: '',
  1: '♯',
  2: '𝄪',
};

/** The accidental for a degree `diff` semitones off the major scale's: −1 → '♭'. */
export function accidentalFor(diff: number): string {
  return ACCIDENTAL[diff] ?? '';
}

/** One label per degree of a seven-note scale: '1', '♭3', '♯4', '𝄫7'. */
export function heptatonicDegreeLabels(steps: readonly number[]): string[] {
  return steps.map((step, i) => {
    const accidental = ACCIDENTAL[step - MAJOR_SCALE_STEPS[i]];
    if (accidental === undefined) {
      throw new Error(`Degree ${i + 1} is ${step} semitones up`);
    }
    return `${accidental}${i + 1}`;
  });
}
