/**
 * chordSymbolTones.ts — Chord symbol → root, bass and chord tones.
 *
 * Covers the symbols the lesson flows use: triads (C, Am), sevenths (Dm7, G7,
 * Ebmaj7), extensions (Am9, F13, Ddom13, Gdom9, Afunk9), altered dominants
 * (E7#5, Edom7#5, G7alt), sixths (Ebm6), sus (F7sus4), add chords (Fadd4,
 * Gmadd2), power chords (C5), diminished (F#dim7) and slash chords (Bb/D) —
 * and the jazz format the app displays: capital root, quality symbol, then
 * alterations/extensions in parentheses: G7(sus4), G9(#11), G△7, Gø7(9), G–9.
 * Minor is displayed with an en dash (–); any dash (- − – —) parses.
 */

import { parseNoteName } from './chordBassNote';

export interface ChordSymbolTones {
  rootPc: number;
  /** The slash note when there is one, else the root. */
  bassPc: number;
  /** Semitones above the root, ascending from 0. */
  intervals: number[];
  /** Guide tones for voicing, in semitones above the root (absent when the chord has none). */
  third?: number;
  fifth?: number;
  seventh?: number;
}

export function chordSymbolTones(symbol: string): ChordSymbolTones | null {
  const trimmed = symbol.trim();
  // A slash before a note name is a bass note (Bb/D); in 6/9 it's part of the quality.
  const slashAt = trimmed.search(/\/[A-Ga-g]/);
  const main = slashAt >= 0 ? trimmed.slice(0, slashAt) : trimmed;
  const slash = slashAt >= 0 ? trimmed.slice(slashAt + 1) : undefined;
  const rootPc = parseNoteName(main);
  if (rootPc === null) return null;
  const q = main.slice(/^[A-Ga-g][#b♯♭]/.test(main) ? 2 : 1).toLowerCase();
  const has = (s: string) => q.includes(s);

  const power = q === '5';
  const halfDim = has('m7b5') || has('ø');
  const dim = has('dim') || has('°');
  const altered = has('alt');
  const minor = halfDim || dim || /^(m(?!aj)|min|[-−–—])/.test(q);

  const third = power
    ? undefined
    : has('sus2')
      ? 2
      : has('sus')
        ? 5
        : minor
          ? 3
          : 4;
  const fifth = altered
    ? undefined
    : dim || halfDim || has('b5')
      ? 6
      : has('#5') || has('aug') || has('+')
        ? 8
        : 7;

  let seventh: number | undefined;
  if (/maj(7|9|11|13)|δ|△/.test(q)) seventh = 11;
  else if (dim && has('7')) seventh = 9;
  else if (/(^|[^1])6/.test(q))
    seventh = 9; // a sixth takes the seventh's place
  else if (
    altered ||
    halfDim ||
    has('dom') ||
    has('funk') ||
    (/7|9|11|13/.test(q) && !has('add'))
  )
    seventh = 10;

  const tensions: number[] = [];
  if (
    /(^|[^#b])9/.test(q) ||
    has('funk') ||
    has('11') ||
    has('13') ||
    has('add2')
  )
    tensions.push(2);
  if ((has('11') && !has('#11')) || has('add4')) tensions.push(5);
  if (has('13') && !has('b13')) tensions.push(9);
  if (has('b9')) tensions.push(1);
  if (has('#9')) tensions.push(3);
  if (has('#11')) tensions.push(6);
  if (has('b13')) tensions.push(8);
  if (altered) tensions.push(1, 3, 6, 8);

  const intervals = [
    ...new Set(
      [0, third, fifth, seventh, ...tensions].filter(
        (i): i is number => i !== undefined,
      ),
    ),
  ].sort((a, b) => a - b);
  const bassPc = slash ? (parseNoteName(slash) ?? rootPc) : rootPc;
  return { rootPc, bassPc, intervals, third, fifth, seventh };
}
