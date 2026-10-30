import { describe, expect, it } from 'vitest';
import {
  centsFromET,
  partialHz,
  partialInterval,
  partialSemitones,
} from '../harmonicSeries';

describe('harmonicSeries', () => {
  it('partials are whole-number multiples of the fundamental', () => {
    expect(partialHz(110, 1)).toBe(110);
    expect(partialHz(110, 3)).toBe(330);
    expect(partialHz(110, 12)).toBe(1320);
  });

  // The reference sheet's cents for partials 1–12 (sheet 4; its +1.995 for
  // partial 3 is a misprint of 1200·log2 3 − 1900 = +1.955).
  it.each([
    [1, 0],
    [2, 0],
    [3, 1.955],
    [4, 0],
    [5, -13.686],
    [6, 1.955],
    [7, -31.174],
    [8, 0],
    [9, 3.91],
    [10, -13.686],
    [11, -48.682],
    [12, 1.955],
  ])('partial %i is %f cents from equal temperament', (n, cents) => {
    expect(centsFromET(n)).toBeCloseTo(cents, 3);
  });

  it('names the nearest equal-tempered step', () => {
    expect(partialSemitones(3)).toBe(19); // octave + 5th
    expect(partialSemitones(5)).toBe(28); // 2 octaves + major 3rd
    expect(partialSemitones(7)).toBe(34); // 2 octaves + minor 7th
    expect(partialSemitones(11)).toBe(42); // 3 octaves + tritone
    expect(partialInterval(7).long).toBe('2 octaves + minor 7th');
    expect(partialInterval(3).short).toBe('P5 (+oct)');
  });
});
