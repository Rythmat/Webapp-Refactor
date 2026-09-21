import { describe, expect, it } from 'vitest';
import { CHORDS, abbreviateSequence } from '@prism/engine';
import { formatChordSymbol } from '../leadSheetUtils';

/** Qualities whose jazz symbol is, by design, the same word. */
const WRITTEN_AS_IS = new Set(['5', 'sus2', 'sus4', 'quartal', 'maj4', 'min4']);

describe('formatChordSymbol (jazz)', () => {
  it('writes 13th chords as chart symbols', () => {
    expect(formatChordSymbol('G dom13')).toBe('G13');
    expect(formatChordSymbol('F maj13')).toBe('FΔ13');
    expect(formatChordSymbol('D min13')).toBe('Dm13');
  });

  it('writes an augmented triad with +', () => {
    expect(formatChordSymbol('C augmented')).toBe('C+');
  });

  it('never leaks an internal quality word for any catalog chord', () => {
    const leaked = Object.keys(CHORDS)
      .filter((quality) => !quality.includes('/'))
      .map((quality) => abbreviateSequence(`C ${quality}`).replace(/^C\s*/, ''))
      .filter((abbr) => abbr && !WRITTEN_AS_IS.has(abbr))
      .filter((abbr) => formatChordSymbol(`C ${abbr}`) === `C${abbr}`);
    expect(leaked).toEqual([]);
  });
});
