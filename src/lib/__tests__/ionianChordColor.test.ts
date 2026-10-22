import { describe, expect, it } from 'vitest';
import { getChordColor } from '@prism/engine';
import { KEY_OF_COLORS } from '@/constants/theme';
import { ionianChordColor } from '../ionianChordColor';

const F = 65;
const chord = (root: number, intervals: readonly number[]) =>
  intervals.map((i) => root + i);
const invert = (notes: number[], times: number) => {
  const out = [...notes];
  for (let i = 0; i < times; i++) out.push(out.shift()! + 12);
  return out;
};
const hex = ([r, g, b]: number[]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

const QUALITIES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
} as const;

describe('a chord’s color in Board Choice', () => {
  it('puts F7 in B♭ major’s color, never at random', () => {
    for (let i = 0; i < 20; i++)
      expect(ionianChordColor(chord(F, [0, 4, 7, 10])).toUpperCase()).toBe(
        KEY_OF_COLORS.Bb.toUpperCase(),
      );
  });

  it('colors each quality by its mode’s parent key', () => {
    const color = (notes: number[]) => ionianChordColor(notes).toUpperCase();
    expect(color(chord(F, QUALITIES.major))).toBe(
      KEY_OF_COLORS.F.toUpperCase(),
    );
    expect(color(chord(F, QUALITIES.major7))).toBe(
      KEY_OF_COLORS.F.toUpperCase(),
    );
    expect(color(chord(69, QUALITIES.minor))).toBe(
      KEY_OF_COLORS.C.toUpperCase(),
    );
    expect(color(chord(69, QUALITIES.minor7))).toBe(
      KEY_OF_COLORS.C.toUpperCase(),
    );
    expect(color(chord(71, QUALITIES.diminished))).toBe(
      KEY_OF_COLORS.C.toUpperCase(),
    );
    expect(color(chord(67, QUALITIES.dominant7))).toBe(
      KEY_OF_COLORS.C.toUpperCase(),
    );
  });

  it('gives an inversion its root’s color, not its bass note’s', () => {
    for (let root = 60; root < 72; root++)
      for (const intervals of Object.values(QUALITIES)) {
        const notes = chord(root, [...intervals]);
        for (let inv = 1; inv < notes.length; inv++)
          expect(ionianChordColor(invert(notes, inv))).toBe(
            ionianChordColor(notes),
          );
      }
  });

  it('matches the Studio’s Prism colors for a chord on its own root', () => {
    // Prism's table: '1 major' and '1 major7' Ionian, '1 dominant7'
    // Mixolydian, '1 minor' and '1 minor7' Aeolian.
    for (let root = 60; root < 72; root++)
      for (const quality of [
        'major',
        'major7',
        'dominant7',
        'minor',
        'minor7',
      ] as const) {
        const studio = hex(getChordColor(`1 ${quality}`, root));
        expect(
          ionianChordColor(chord(root, [...QUALITIES[quality]])).toLowerCase(),
          `${root} ${quality}`,
        ).toBe(studio);
      }
  });
});
