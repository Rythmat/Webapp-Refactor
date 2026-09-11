import { describe, expect, it } from 'vitest';
import {
  chordNotationLockTitle,
  formatChordRegion,
  type ChordRegionLabels,
} from './chordRegionNotation';

const C = { keyRootPc: 0, mode: 'ionian' };
const FALLBACK = '(today)';

const both = (region: ChordRegionLabels, context: object = C) => [
  formatChordRegion(region, 'jazz', context, FALLBACK),
  formatChordRegion(region, 'roman', context, FALLBACK),
];

describe('formatChordRegion — Midnight Groove in C (analyzer regions)', () => {
  it.each([
    [
      { name: '2 min9', noteName: 'D min9', degreeKey: '2 minor9' },
      ['D−9', 'ii9'],
    ],
    [
      { name: '5 dom13', noteName: 'G dom13', degreeKey: '5 dominant13' },
      ['G13', 'V13'],
    ],
    [
      { name: '1 maj9', noteName: 'C maj9', degreeKey: '1 major9' },
      ['CΔ9', 'IΔ9'],
    ],
    [
      { name: '6 min7', noteName: 'A min7', degreeKey: '6 minor7' },
      ['A−7', 'vi7'],
    ],
  ])('%o', (region, expected) => {
    expect(both(region)).toEqual(expected);
  });
});

describe('formatChordRegion — region sources', () => {
  it('Prism suggestions (letter name twice + degreeKey)', () => {
    expect(
      both({ name: 'G dom7', noteName: 'G dom7', degreeKey: '5 dominant7' }),
    ).toEqual(['G7', 'V7']);
  });

  it('curriculum (degree label twice, no letter)', () => {
    const region = { name: '4 maj7', noteName: '4 maj7', degreeKey: '4 maj7' };
    expect(both(region)).toEqual(['FΔ7', 'IVΔ7']);
    // Without a key jazz has no letter to write; Roman only needs the degree.
    expect(both(region, {})).toEqual([FALLBACK, 'IVΔ7']);
  });

  it('songs (degree name, letter noteName with a slash bass)', () => {
    const CSharp = { keyRootPc: 1, mode: 'ionian' };
    expect(both({ name: '♭7 maj', noteName: 'B/D♯' }, CSharp)).toEqual([
      'B/D♯',
      '♭VII/2',
    ]);
    const E = { keyRootPc: 4, mode: 'ionian' };
    expect(both({ name: '♭7 min7', noteName: 'Dmin7' }, E)).toEqual([
      'D−7',
      '♭vii7',
    ]);
  });

  it('MusicXML import (same letter label twice)', () => {
    expect(both({ name: 'D min7', noteName: 'D min7' })).toEqual([
      'D−7',
      'ii7',
    ]);
    expect(both({ name: 'Bb maj7', noteName: 'Bb maj7' })).toEqual([
      'B♭Δ7',
      '♭VIIΔ7',
    ]);
  });

  it('live analyzer (bare letter noteName borrows the quality)', () => {
    expect(both({ name: 'Dminor7', noteName: 'D' })).toEqual(['D−7', 'ii7']);
  });

  it('practice tracks (bass written as a key degree)', () => {
    const CLydian = { keyRootPc: 0, mode: 'lydian' };
    expect(
      both(
        { name: '2 maj/1', noteName: 'D maj/1', degreeKey: '2 major' },
        CLydian,
      ),
    ).toEqual(['D/C', 'II/1']);
  });

  it('engine inversions keep their chord-tone bass', () => {
    expect(
      both({ name: '4 maj/3', noteName: 'F maj/3', degreeKey: '4 major/3' }),
    ).toEqual(['F/A', 'IV/6']);
  });

  it('user renames ignore the stale degreeKey', () => {
    expect(
      both({ name: 'F maj7', noteName: 'F maj7', degreeKey: '2 minor7' }),
    ).toEqual(['FΔ7', 'IVΔ7']);
    expect(
      both({ name: 'D maj7', noteName: 'D maj7', degreeKey: '2 minor7' }),
    ).toEqual(['DΔ7', 'IIΔ7']);
  });

  it('counts degrees from the tonic in a minor key', () => {
    const Am = { keyRootPc: 9, mode: 'aeolian' };
    expect(both({ name: '1 min7', noteName: 'Amin7' }, Am)).toEqual([
      'A−7',
      'i7',
    ]);
    expect(both({ name: '♭3 maj', noteName: 'C' }, Am)).toEqual(['C', '♭III']);
    expect(
      both({ name: '5 min', noteName: '5 min', degreeKey: '5 minor' }, Am),
    ).toEqual(['E−', 'v']);
  });
});

describe('formatChordRegion — fallbacks', () => {
  it('returns today’s text for hybrid', () => {
    expect(
      formatChordRegion(
        { name: '2 min7', noteName: 'D min7' },
        'hybrid',
        C,
        '2 min7',
      ),
    ).toBe('2 min7');
  });

  it('returns today’s text when nothing parses', () => {
    expect(both({ name: 'N.C.', noteName: 'N.C.' })).toEqual([
      FALLBACK,
      FALLBACK,
    ]);
  });

  it('writes jazz without a key, but Roman needs one', () => {
    expect(both({ name: 'D min7', noteName: 'D min7' }, {})).toEqual([
      'D−7',
      FALLBACK,
    ]);
  });
});

describe('chordNotationLockTitle', () => {
  it('names the notation', () => {
    expect(chordNotationLockTitle('jazz')).toBe(
      'Chord notation: Jazz — change it in the top bar',
    );
  });
});
