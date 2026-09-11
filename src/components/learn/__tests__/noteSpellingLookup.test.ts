import { describe, expect, it } from 'vitest';
import { formatNoteName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { DOUBLE_HARMONIC_MODES } from '../doubleHarmonicContent';
import { HARMONIC_MAJOR_MODES } from '../harmonicMajorContent';
import { HARMONIC_MINOR_MODES } from '../harmonicMinorContent';
import { MELODIC_MINOR_MODES } from '../melodicMinorContent';
import {
  buildPitchClassSpellingMap,
  getNoteSpelling,
  spelledMidiNoteName,
} from '../noteSpellingLookup';

const TILE_KEYS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F♯',
  'D♭',
  'A♭',
  'E♭',
  'B♭',
  'F',
];

describe('getNoteSpelling', () => {
  // Regression: the diatonic lookup compared the Unicode tile label ("B♭")
  // against "Bb" before normalizing, found nothing, and the overview fell back
  // to sharp-only names (A♯, D♯, G♯, C♯).
  it.each([
    ['B♭', 'B♭ C D E♭ F G A'],
    ['E♭', 'E♭ F G A♭ B♭ C D'],
    ['A♭', 'A♭ B♭ C D♭ E♭ F G'],
    ['D♭', 'D♭ E♭ F G♭ A♭ B♭ C'],
    ['F♯', 'F♯ G♯ A♯ B C♯ D♯ E♯'],
  ])('%s Ionian', (key, expected) => {
    expect(getNoteSpelling('ionian', key)).toEqual(expected.split(' '));
  });

  it('spells every diatonic mode for every tile key', () => {
    for (const mode of [
      'ionian',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
    ]) {
      for (const key of TILE_KEYS) {
        const spelling = getNoteSpelling(mode, key);
        expect(spelling, `${key} ${mode}`).toHaveLength(7);
        expect(spelling![0], `${key} ${mode}`).toBe(formatNoteName(key));
      }
    }
  });

  const curated = [
    ...HARMONIC_MINOR_MODES,
    ...MELODIC_MINOR_MODES,
    ...HARMONIC_MAJOR_MODES,
    ...DOUBLE_HARMONIC_MODES,
  ].flatMap((mode) =>
    mode.keys.map((entry) => [mode.modeSlug, entry.root, entry.notes] as const),
  );

  it.each(curated)(
    '%s on %s agrees with the curated table',
    (slug, root, notes) => {
      expect(getNoteSpelling(slug, root)).toEqual(
        notes.map((name) => formatNoteName(name)),
      );
    },
  );
});

describe('buildPitchClassSpellingMap / spelledMidiNoteName', () => {
  it('names piano-roll notes in B♭ Ionian with flats', () => {
    const scaleMidis = [70, 72, 74, 75, 77, 79, 81, 82];
    const map = buildPitchClassSpellingMap('ionian', 'B♭', scaleMidis);
    expect(scaleMidis.map((midi) => spelledMidiNoteName(midi, map))).toEqual(
      'B♭4 C5 D5 E♭5 F5 G5 A5 B♭5'.split(' '),
    );
    // Chromatic lane between D and E♭ is not in the scale — still no sharps.
    expect(spelledMidiNoteName(73, map)).toBe('D♭5');
  });

  it('covers all twelve pitch classes', () => {
    expect(buildPitchClassSpellingMap('dorian', 'E♭', []).size).toBe(12);
  });
});
