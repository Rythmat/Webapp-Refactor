/**
 * A transpose named as an interval (milestone 2.12, the clip menu's
 * Transpose).
 *
 * Run: npx vitest run src/daw/harmony/__tests__/intervalName.test.ts
 */
import { describe, expect, it } from 'vitest';
import { intervalSize, semitoneCount, transposeWords } from '../intervalName';

describe('a transpose in words', () => {
  it('names steps as steps and the rest as intervals', () => {
    expect(transposeWords(1)).toBe('Up a half step');
    expect(transposeWords(-2)).toBe('Down a whole step');
    expect(transposeWords(3)).toBe('Up a minor 3rd');
    expect(transposeWords(7)).toBe('Up a perfect 5th');
    expect(transposeWords(6)).toBe('Up a tritone');
    expect(transposeWords(-12)).toBe('Down an octave');
    expect(transposeWords(0)).toBe('No change');
  });

  it('counts octaves first past an octave', () => {
    expect(intervalSize(14)).toBe('an octave and a whole step');
    expect(intervalSize(-24)).toBe('two octaves');
  });

  it('counts semitones with a real minus sign', () => {
    expect(semitoneCount(3)).toBe('+3 semitones');
    expect(semitoneCount(-1)).toBe('−1 semitone');
    expect(semitoneCount(0)).toBe('0 semitones');
  });
});
