import { describe, expect, it } from 'vitest';
import { chordSymbolTones } from '../chordSymbolTones';

describe('chordSymbolTones', () => {
  // Every symbol the backing-track steps use, plus the odd ones from other flows.
  it.each([
    ['C', 0, [0, 4, 7]],
    ['Am', 9, [0, 3, 7]],
    ['Bm', 11, [0, 3, 7]],
    ['Dm7', 2, [0, 3, 7, 10]],
    ['G7', 7, [0, 4, 7, 10]],
    ['Ebmaj7', 3, [0, 4, 7, 11]],
    ['Am9', 9, [0, 2, 3, 7, 10]],
    ['Cm9', 0, [0, 2, 3, 7, 10]],
    ['Gdom9', 7, [0, 2, 4, 7, 10]],
    ['Afunk9', 9, [0, 2, 4, 7, 10]],
    ['Eb9', 3, [0, 2, 4, 7, 10]],
    ['F13', 5, [0, 2, 4, 7, 9, 10]],
    ['Ddom13', 2, [0, 2, 4, 7, 9, 10]],
    ['A♭13', 8, [0, 2, 4, 7, 9, 10]],
    ['E7#5', 4, [0, 4, 8, 10]],
    ['Edom7#5', 4, [0, 4, 8, 10]],
    ['G7alt', 7, [0, 1, 3, 4, 6, 8, 10]],
    ['Ebm6', 3, [0, 3, 7, 9]],
    ['F7sus4', 5, [0, 5, 7, 10]],
    ['Fadd4', 5, [0, 4, 5, 7]],
    ['Gmadd2', 7, [0, 2, 3, 7]],
    ['C5', 0, [0, 7]],
    ['F#dim7', 6, [0, 3, 6, 9]],
  ] as const)('%s', (symbol, rootPc, intervals) => {
    const tones = chordSymbolTones(symbol);
    expect(tones?.rootPc).toBe(rootPc);
    expect(tones?.intervals).toEqual(intervals);
  });

  it('takes the bass from a slash chord', () => {
    expect(chordSymbolTones('Bb/D')).toMatchObject({
      rootPc: 10,
      bassPc: 2,
      intervals: [0, 4, 7],
    });
  });

  it('is null for text that is not a chord', () => {
    expect(chordSymbolTones('N.C.')).toBeNull();
  });
});

describe('chordSymbolTones — jazz format (root, quality symbol, (extensions))', () => {
  it.each([
    ['G7(sus4)', [0, 5, 7, 10]],
    ['G9(#11)', [0, 2, 4, 6, 7, 10]],
    ['G△7', [0, 4, 7, 11]],
    ['G△', [0, 4, 7, 11]],
    ['Gø7(9)', [0, 2, 3, 6, 10]],
    ['Gø', [0, 3, 6, 10]],
    ['G-9', [0, 2, 3, 7, 10]],
    ['G-7(9)', [0, 2, 3, 7, 10]],
    ['G−7', [0, 3, 7, 10]],
    ['G-△7', [0, 3, 7, 11]],
    ['G7(b9)', [0, 1, 4, 7, 10]],
    ['G°7', [0, 3, 6, 9]],
    ['G+', [0, 4, 8]],
    ['C6/9', [0, 2, 4, 7, 9]],
  ] as const)('%s', (symbol, intervals) => {
    expect(chordSymbolTones(symbol)?.intervals).toEqual(intervals);
  });

  it('keeps 6/9 as a quality, not a slash chord', () => {
    expect(chordSymbolTones('C6/9')?.bassPc).toBe(0);
  });
});

describe('chordSymbolTones — minor dash', () => {
  // Displayed with an en dash (–); hyphen, minus and em dash parse the same.
  it.each(['G–9', 'G-9', 'G−9', 'G—9'])('%s is G minor 9', (symbol) => {
    expect(chordSymbolTones(symbol)).toMatchObject({
      rootPc: 7,
      intervals: [0, 2, 3, 7, 10],
    });
  });

  it('reads C–△7 as minor-major 7', () => {
    expect(chordSymbolTones('C–△7')?.intervals).toEqual([0, 3, 7, 11]);
  });
});

describe('chordSymbolTones — double accidentals', () => {
  // Modes in flat keys spell chords like E𝄫m (D♭ Locrian's chord 2 is E𝄫).
  it.each([
    ['Ebbm', 2, [0, 3, 7]],
    ['Bbbdim', 9, [0, 3, 6]],
    ['Abbmaj7', 7, [0, 4, 7, 11]],
    ['F##m7', 7, [0, 3, 7, 10]],
    ['E♭♭', 2, [0, 4, 7]],
  ] as const)('%s', (symbol, rootPc, intervals) => {
    expect(chordSymbolTones(symbol)).toMatchObject({
      rootPc,
      bassPc: rootPc,
      intervals,
    });
  });
});

describe('jazz alterations (Peter’s ICP jazz sheets)', () => {
  const ints = (s: string) => chordSymbolTones(s)?.intervals;

  it('lets an altered 9 stand in for the natural 9 under a 13', () => {
    expect(ints('G7b9b13')).toEqual([0, 1, 4, 7, 8, 10]);
    expect(ints('A7b9b13')).toEqual([0, 1, 4, 7, 8, 10]);
    expect(ints('F13b9')).toEqual([0, 1, 4, 7, 9, 10]);
    // An unaltered 13 still implies its 9.
    expect(ints('F13')).toEqual([0, 2, 4, 7, 9, 10]);
  });

  it('reads m7♭6 as a ♭6 over a minor 7th, not a sixth chord', () => {
    expect(ints('Amin7b6')).toEqual([0, 3, 8, 10]);
    expect(ints('Am7b6')).toEqual([0, 3, 8, 10]);
    // Sixth chords are unchanged.
    expect(ints('Cm6')).toEqual([0, 3, 7, 9]);
    expect(ints('Cm6/9')).toEqual([0, 2, 3, 7, 9]);
  });
});
