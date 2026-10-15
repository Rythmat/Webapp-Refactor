import { describe, expect, it } from 'vitest';
import { GUITAR_KEY_ORDER } from '@/curriculum/data/guitar/bookOne';
import { getGuitarCenter } from '@/curriculum/data/guitar/centers';
import {
  DIATONIC_SEVENTHS,
  DIATONIC_TRIADS,
  FUNCTION_OF_DEGREE,
  chordAliases,
  hiddenTriad,
  keyChange,
  previousBookKey,
  relativeMinor,
  romanNumeral,
} from '../keyTheory';
import type { KeyDegree } from '../types';

const DEGREES: KeyDegree[] = [1, 2, 3, 4, 5, 6, 7];
const C = getGuitarCenter('C');

describe('key theory', () => {
  it('changes one note per key, respelling only at Db', () => {
    const table = GUITAR_KEY_ORDER.map((key) => {
      const prev = previousBookKey(key);
      const change = prev ? keyChange(prev, key) : null;
      return [
        key,
        change
          ? `${change.oldNote} → ${change.newNote}${change.respelled ? ', respelled' : ''}`
          : 'none',
        relativeMinor(getGuitarCenter(key)),
      ];
    });
    expect(table).toEqual([
      ['C', 'none', 'A'],
      ['G', 'F → F#', 'E'],
      ['D', 'C → C#', 'B'],
      ['A', 'G → G#', 'F#'],
      ['E', 'D → D#', 'C#'],
      ['B', 'A → A#', 'G#'],
      ['F#', 'E → E#', 'D#'],
      ['Db', 'B → C, respelled', 'Bb'],
      ['Ab', 'Gb → G', 'F'],
      ['Eb', 'Db → D', 'C'],
      ['Bb', 'Ab → A', 'G'],
      ['F', 'Eb → E', 'D'],
    ]);
    expect(keyChange('C', 'G')).toMatchObject({ removedPc: 5, addedPc: 6 });
    // Keys two steps apart differ by two notes.
    expect(keyChange('C', 'D')).toBeNull();
  });

  it('matches the chord family the book prints in every key', () => {
    for (const key of GUITAR_KEY_ORDER) {
      const center = getGuitarCenter(key);
      expect(center.triads.map((t) => t.quality)).toEqual(
        DIATONIC_TRIADS.slice(0, 6),
      );
      expect(center.sevenths.slice(0, 7).map((t) => t.quality)).toEqual(
        DIATONIC_SEVENTHS,
      );
    }
    expect(DIATONIC_TRIADS[6]).toBe('dim');
  });

  it('groups degrees by what they do', () => {
    expect(DEGREES.map((d) => FUNCTION_OF_DEGREE[d])).toEqual([
      'home',
      'away',
      'home',
      'away',
      'tension',
      'home',
      'tension',
    ]);
  });

  it('writes Roman numerals', () => {
    expect(
      DEGREES.slice(0, 6).map((d) =>
        romanNumeral(C, d, DIATONIC_TRIADS[d - 1]),
      ),
    ).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi']);
    expect(romanNumeral(C, 7, 'dim')).toBe('vii°');
    expect(
      DEGREES.map((d) => romanNumeral(C, d, DIATONIC_SEVENTHS[d - 1])),
    ).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  });

  it('lists aliases per quality', () => {
    expect(chordAliases('C', 'maj')).toEqual(['Cmaj', 'CM']);
    expect(chordAliases('D', 'min')).toEqual(['Dmin', 'D−']);
    expect(chordAliases('C', 'maj7')).toEqual(['CM7', 'CΔ7', 'CΔ']);
    expect(chordAliases('D', 'min7')).toEqual(['Dmin7', 'D−7']);
    expect(chordAliases('B', 'min7b5')).toEqual([
      'Bø7',
      'Bø',
      'B−7♭5',
      'Bmin7(♭5)',
    ]);
    expect(chordAliases('G', 'dom7')).toEqual([]);
  });

  it('finds the triad hidden in each 7th chord, except on 5', () => {
    expect(DEGREES.map((d) => hiddenTriad(C, d))).toEqual([
      { degree: 3, quality: 'min' },
      { degree: 4, quality: 'maj' },
      { degree: 5, quality: 'maj' },
      { degree: 6, quality: 'min' },
      null,
      { degree: 1, quality: 'maj' },
      { degree: 2, quality: 'min' },
    ]);
  });
});
