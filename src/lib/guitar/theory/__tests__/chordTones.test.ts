import { describe, expect, it } from 'vitest';
import {
  GUITAR_ATLAS_BOOK_ONE,
  chordRootName,
} from '@/curriculum/data/guitar/bookOne';
import { GUITAR_THEORY_STRINGS } from '@/curriculum/data/guitar/theoryNotes';
import type {
  BookChordQuality,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import {
  CHORD_FORMULA,
  QUALITY_TONES,
  chordSemitones,
  formulaText,
  shapeToneLabels,
  shapeTones,
  spellChordTones,
  spokenToneLabel,
  toneLabelText,
} from '../chordTones';
import { DIATONIC_SEVENTHS, DIATONIC_TRIADS } from '../keyTheory';
import type { KeyDegree } from '../types';

const DEGREES: KeyDegree[] = [1, 2, 3, 4, 5, 6, 7];
const QUALITIES: BookChordQuality[] = [
  'maj',
  'min',
  'dim',
  'maj7',
  'dom7',
  'min7',
  'min7b5',
];

describe('chord tones', () => {
  it('has the formula table for the seven qualities', () => {
    expect(QUALITIES.map(formulaText)).toEqual([
      'R 3 5',
      'R ♭3 5',
      'R ♭3 ♭5',
      'R 3 5 7',
      'R 3 5 ♭7',
      'R ♭3 5 ♭7',
      'R ♭3 ♭5 ♭7',
    ]);
    expect(QUALITIES.map(chordSemitones)).toEqual([
      [0, 4, 7],
      [0, 3, 7],
      [0, 3, 6],
      [0, 4, 7, 11],
      [0, 4, 7, 10],
      [0, 3, 7, 10],
      [0, 3, 6, 10],
    ]);
    // The UI's formula strings say the same thing.
    for (const q of QUALITIES) {
      expect(GUITAR_THEORY_STRINGS[`formula.${q}`]).toBe(formulaText(q));
    }
    expect(CHORD_FORMULA.min7b5[6]).toEqual({ label: 'b5', role: 'fifth' });
    expect(QUALITY_TONES.maj).toEqual(['third']);
    expect(QUALITY_TONES.dim).toEqual(['third', 'fifth']);
    expect(QUALITY_TONES.dom7).toEqual(['third', 'seventh']);
    expect(QUALITY_TONES.min7b5).toEqual(['third', 'fifth', 'seventh']);
  });

  it('labels each string of a shape, low to high', () => {
    expect(shapeToneLabels('X-3-2-0-1-0', 0, 'maj')).toEqual([
      'R',
      '3',
      '5',
      'R',
      '3',
    ]);
    expect(shapeToneLabels('X-5-7-5-6-X', 2, 'min7')).toEqual([
      'R',
      '5',
      'b7',
      'b3',
    ]);
    expect(shapeToneLabels('3-X-4-4-3-X', 7, 'maj7')).toEqual([
      'R',
      '7',
      '3',
      '5',
    ]);
    expect(shapeToneLabels('1-0-2-2-1-0', 5, 'maj7')).toEqual([
      'R',
      '3',
      '7',
      '3',
      '5',
      '7',
    ]);
    // A shape that is not the chord: Cm7 read as C minor.
    expect(shapeToneLabels('X-3-5-3-4-X', 0, 'min')).toContain(null);
  });

  it('spells chord tones by stacking letters', () => {
    expect(spellChordTones('Gb', 'maj')).toEqual(['Gb', 'Bb', 'Db']);
    expect(spellChordTones('E#', 'min7b5')).toEqual(['E#', 'G#', 'B', 'D#']);
    expect(spellChordTones('C#', 'dom7')).toEqual(['C#', 'E#', 'G#', 'B']);
    expect(spellChordTones('B♭', 'min7')).toEqual(['Bb', 'Db', 'F', 'Ab']);
  });

  it('never names a sharp in the flat keys', () => {
    const flatKeys: GuitarKeyName[] = ['Db', 'Ab', 'Eb', 'Bb', 'F'];
    for (const key of flatKeys) {
      for (const degree of DEGREES) {
        const root = chordRootName(key, degree);
        const triad = DIATONIC_TRIADS[degree - 1];
        const names = [
          ...(triad === 'dim' ? [] : spellChordTones(root, triad)),
          ...spellChordTones(root, DIATONIC_SEVENTHS[degree - 1]),
        ];
        expect(names.join(' '), `${key} ${degree}`).not.toContain('#');
      }
      const center = GUITAR_ATLAS_BOOK_ONE[key];
      for (const shape of [...center.triads, ...center.sevenths]) {
        const tones = shapeTones(
          shape.frets,
          chordRootName(key, shape.degree),
          shape.quality,
        );
        expect(tones, `${key} ${shape.frets}`).not.toBeNull();
        for (const tone of tones ?? []) {
          expect(tone.noteName, `${key} ${shape.frets}`).not.toContain('#');
        }
      }
    }
  });

  it('builds shape tones with spelled names and quality-tone flags', () => {
    const tones = shapeTones('X-5-7-5-6-X', 'D', 'min7');
    expect(tones?.map((t) => [t.string, t.label, t.noteName])).toEqual([
      [5, 'R', 'D'],
      [4, '5', 'A'],
      [3, 'b7', 'C'],
      [2, 'b3', 'F'],
    ]);
    expect(tones?.filter((t) => t.isQualityTone).map((t) => t.role)).toEqual([
      'seventh',
      'third',
    ]);
    expect(shapeTones('X-7-9-7-8-X', 'F', 'min7')).toBeNull();
  });

  it('renders and speaks labels', () => {
    expect(toneLabelText('b7')).toBe('♭7');
    expect(toneLabelText('R')).toBe('R');
    expect(spokenToneLabel('R')).toBe('root');
    expect(spokenToneLabel('b3')).toBe('flat 3');
    expect(spokenToneLabel('b5')).toBe('flat 5');
    expect(spokenToneLabel('7')).toBe('7');
  });
});
