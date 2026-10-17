import { describe, expect, it } from 'vitest';
import {
  LITERACY_MODES,
  LITERACY_TONICS,
  type LiteracyHarmony,
} from '@/content/musicLiteracy/schemas';
import {
  CHORD_ROOT_HIGH,
  CHORD_ROOT_LOW,
  chordLabel,
  chordPalette,
  diatonicChord,
  diatonicChords,
  fillTemplate,
  progressionLabels,
  progressionProblems,
  sampleProgression,
  voiceChord,
  voicedChord,
  xBars,
} from '../chords';
import { SCALE_SEMITONES, pitchClassOf } from '../pitch';

/**
 * Part 2's chords, as the owner set them: natural major and minor, the
 * diminished chord left out, by the app's hybrid numbering; root position
 * with every root in D3–C♯4; the palette an X is picked from; and a
 * progression made from a template and the picks.
 */

const HARMONIES: LiteracyHarmony[] = ['triads', 'sevenths'];
const labels = (mode: 'major' | 'minor', harmony: LiteracyHarmony) =>
  diatonicChords(mode, harmony).map((chord) => chord.label);

describe('the chord table', () => {
  it('names major’s six chords as the app does', () => {
    expect(labels('major', 'triads')).toEqual([
      '1 maj',
      '2 min',
      '3 min',
      '4 maj',
      '5 maj',
      '6 min',
    ]);
    expect(labels('major', 'sevenths')).toEqual([
      '1 maj7',
      '2 min7',
      '3 min7',
      '4 maj7',
      '5 dom7',
      '6 min7',
    ]);
  });

  it('names minor’s six, the 5 chord a minor one', () => {
    expect(labels('minor', 'triads')).toEqual([
      '1 min',
      '♭3 maj',
      '4 min',
      '5 min',
      '♭6 maj',
      '♭7 maj',
    ]);
    expect(labels('minor', 'sevenths')).toEqual([
      '1 min7',
      '♭3 maj7',
      '4 min7',
      '5 min7',
      '♭6 maj7',
      '♭7 dom7',
    ]);
  });

  it('leaves out the diminished chord: major’s 7, minor’s 2', () => {
    for (const harmony of HARMONIES) {
      expect(diatonicChord('major', '7', harmony)).toBeNull();
      expect(diatonicChord('minor', '2', harmony)).toBeNull();
      expect(chordLabel('major', '7', harmony)).toBeNull();
    }
  });

  it('never writes a Roman numeral', () => {
    for (const mode of LITERACY_MODES)
      for (const harmony of HARMONIES)
        for (const label of labels(mode, harmony))
          expect(label).not.toMatch(/[IVX]/);
  });

  it('stacks each chord in thirds from the mode’s own notes', () => {
    for (const mode of LITERACY_MODES)
      for (const harmony of HARMONIES)
        for (const chord of diatonicChords(mode, harmony)) {
          expect(chord.intervals).toHaveLength(harmony === 'triads' ? 3 : 4);
          for (const interval of chord.intervals)
            expect(SCALE_SEMITONES[mode]).toContain(
              (chord.rootSemitones + interval) % 12,
            );
        }
    expect(diatonicChord('minor', '3')?.number).toBe('♭3');
    expect(diatonicChord('minor', '7', 'sevenths')?.intervals).toEqual([
      0, 4, 7, 10,
    ]);
  });
});

describe('the palette', () => {
  it('offers major 2, 3, 4, 5 and 6, and minor ♭3, 4, 5, ♭6 and ♭7', () => {
    expect(chordPalette('major').map((c) => c.number)).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(chordPalette('minor').map((c) => c.number)).toEqual([
      '♭3',
      '4',
      '5',
      '♭6',
      '♭7',
    ]);
    expect(chordPalette('minor', 'sevenths').map((c) => c.label)).toEqual([
      '♭3 maj7',
      '4 min7',
      '5 min7',
      '♭6 maj7',
      '♭7 dom7',
    ]);
  });
});

describe('voicing', () => {
  it('roots every chord in D3–C♯4, in root position, in all 12 keys, both modes, triads and 7ths', () => {
    for (const tonic of LITERACY_TONICS)
      for (const mode of LITERACY_MODES)
        for (const harmony of HARMONIES)
          for (const chord of diatonicChords(mode, harmony)) {
            const voiced = voiceChord(chord, tonic);
            const where = `${tonic} ${mode} ${chord.label}`;
            expect(voiced.root, where).toBeGreaterThanOrEqual(CHORD_ROOT_LOW);
            expect(voiced.root, where).toBeLessThanOrEqual(CHORD_ROOT_HIGH);
            expect(voiced.midis[0], where).toBe(voiced.root);
            expect(
              voiced.midis.map((m) => m - voiced.root),
              where,
            ).toEqual(chord.intervals);
            expect(voiced.root % 12, where).toBe(
              (pitchClassOf(tonic) + chord.rootSemitones) % 12,
            );
            // All on the 25 keys, C3–C5.
            expect(Math.max(...voiced.midis), where).toBeLessThanOrEqual(72);
          }
  });

  it('voices C major’s 1, 4 and 5 as the owner would play them', () => {
    const key = { tonic: 'C', mode: 'major' } as const;
    expect(voicedChord(key, '1')?.midis).toEqual([60, 64, 67]);
    expect(voicedChord(key, '4')?.midis).toEqual([53, 57, 60]);
    expect(voicedChord(key, '5', 'sevenths')?.midis).toEqual([55, 59, 62, 65]);
    expect(voicedChord({ tonic: 'D', mode: 'minor' }, '1')?.midis).toEqual([
      50, 53, 57,
    ]);
    expect(voicedChord({ tonic: 'Db', mode: 'major' }, '1')?.root).toBe(61);
    expect(voicedChord(key, '7')).toBeNull();
  });
});

describe('a progression from a template', () => {
  it('fills the X bars with the picks, in order, the 1 where the template puts it', () => {
    expect(xBars(['X', '1', 'X', 'X'])).toEqual([0, 2, 3]);
    expect(fillTemplate(['X', '1', 'X', 'X'], ['4', '5', '4'])).toEqual([
      '4',
      '1',
      '5',
      '4',
    ]);
    expect(fillTemplate(['1', 'X'], [])).toBeNull();
    expect(fillTemplate(['1', 'X'], [null])).toBeNull();
  });

  it('wants exactly the step’s number of different chords, from the palette', () => {
    const template = ['1', 'X', 'X', 'X'] as const;
    expect(
      progressionProblems([...template], 2, ['4', '5', '5'], 'major'),
    ).toEqual([]);
    expect(
      progressionProblems([...template], 2, ['4', '4', '4'], 'major').map(
        (p) => p.code,
      ),
    ).toEqual(['tooFew']);
    expect(
      progressionProblems([...template], 2, ['4', '5', '6'], 'major').map(
        (p) => [p.code, p.message],
      ),
    ).toEqual([['tooMany', 'Use just 2 different chords.']]);
    expect(
      progressionProblems([...template], 2, ['4', null, '5'], 'major'),
    ).toEqual([
      { code: 'unfilled', message: 'Choose a chord for every X.', pick: 1 },
    ]);
    // Not the 1, nor the chord the mode leaves out.
    expect(
      progressionProblems([...template], 2, ['1', '7', '5'], 'major').map(
        (p) => [p.code, p.pick],
      ),
    ).toEqual([
      ['notInPalette', 0],
      ['notInPalette', 1],
    ]);
    expect(
      progressionProblems(
        ['X', 'X', 'X', 'X'],
        4,
        ['3', '4', '6', '7'],
        'minor',
      ),
    ).toEqual([]);
    expect(
      progressionProblems(
        ['X', 'X', 'X', 'X'],
        4,
        ['2', '4', '6', '7'],
        'minor',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('makes a sample for a preview: the step’s count of common chords', () => {
    expect(sampleProgression(['1', 'X'], 1, 'major')).toEqual(['1', '4']);
    expect(sampleProgression(['1', 'X', 'X', 'X'], 2, 'major')).toEqual([
      '1',
      '4',
      '5',
      '4',
    ]);
    const four = sampleProgression(['X', 'X', 'X', 'X'], 4, 'minor');
    expect(new Set(four).size).toBe(4);
    expect(progressionProblems(['X', 'X', 'X', 'X'], 4, four, 'minor')).toEqual(
      [],
    );
  });

  it('names a progression’s chords by the mode and harmony', () => {
    expect(progressionLabels(['1', '6', '4', '5'], 'major')).toEqual([
      '1 maj',
      '6 min',
      '4 maj',
      '5 maj',
    ]);
    expect(
      progressionLabels(['1', '6', '7', '5'], 'minor', 'sevenths'),
    ).toEqual(['1 min7', '♭6 maj7', '♭7 dom7', '5 min7']);
  });
});
