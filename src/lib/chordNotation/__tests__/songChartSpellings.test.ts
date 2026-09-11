import { describe, expect, it } from 'vitest';
import { formatChordLabel, normalizeQuality } from '..';

// Spellings found in the bundled song charts.
describe('song chart chord spellings', () => {
  it.each([
    ['7(♯9)', 'dominant7#9'],
    ['7(♭9)', 'dominant7b9'],
    ['7(♯5)', 'dominant7#5'],
    ['7aug', 'dominant7#5'],
    ['7alt', 'dominant7alt'],
    ['alt7', 'dominant7alt'],
    ['(♯5)', 'augmented'],
    ['sus7', 'dominant7sus4'],
  ])('reads %s as %s', (raw, key) => {
    expect(normalizeQuality(raw)).toBe(key);
  });

  it('writes them in jazz and Roman', () => {
    const C = { keyRootPc: 0, mode: 'ionian' };
    expect(formatChordLabel('G♯7(♯9)', 'jazz', C)).toBe('G♯7♯9');
    expect(formatChordLabel('D7(♭9)', 'jazz', C)).toBe('D7♭9');
    expect(formatChordLabel('E♭7alt', 'jazz', C)).toBe('E♭7alt');
    expect(formatChordLabel('B♭(♯5)', 'jazz', C)).toBe('B♭+');
    expect(formatChordLabel('F sus7', 'jazz', C)).toBe('F7sus4');
    expect(formatChordLabel('C7(♯5)', 'roman', C)).toBe('I7♯5');
    expect(formatChordLabel('G7alt', 'roman', C)).toBe('V7alt');
  });

  it('leaves "no chord" alone', () => {
    expect(formatChordLabel('N.C.', 'jazz')).toBe('N.C.');
  });
});
