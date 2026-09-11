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
