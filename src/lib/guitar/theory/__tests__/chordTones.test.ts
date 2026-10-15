import { describe, expect, it } from 'vitest';
import {
  chordRootName,
  getGuitarCenter,
} from '@/curriculum/data/guitar/centers';
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
  isSeventhQuality,
  isTriadQuality,
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
  'aug',
  'majb5',
  'sus2b5',
  'maj7',
  'dom7',
  'min7',
  'min7b5',
  'dim7',
  'minMaj7',
  'maj7#5',
  'dom7b5',
  'min6',
  'sus2b5add6',
];

describe('chord tones', () => {
  it('has the formula table for the sixteen qualities', () => {
    expect(QUALITIES.map(formulaText)).toEqual([
      'R 3 5',
      'R ♭3 5',
      'R ♭3 ♭5',
      'R 3 ♯5',
      'R 3 ♭5',
      'R 2 ♭5',
      'R 3 5 7',
      'R 3 5 ♭7',
      'R ♭3 5 ♭7',
      'R ♭3 ♭5 ♭7',
      'R ♭3 ♭5 𝄫7',
      'R ♭3 5 7',
      'R 3 ♯5 7',
      'R 3 ♭5 ♭7',
      'R ♭3 5 6',
      'R 2 ♭5 6',
    ]);
    expect(QUALITIES.map(chordSemitones)).toEqual([
      [0, 4, 7],
      [0, 3, 7],
      [0, 3, 6],
      [0, 4, 8],
      [0, 4, 6],
      [0, 2, 6],
      [0, 4, 7, 11],
      [0, 4, 7, 10],
      [0, 3, 7, 10],
      [0, 3, 6, 10],
      [0, 3, 6, 9],
      [0, 3, 7, 11],
      [0, 4, 8, 11],
      [0, 4, 6, 10],
      [0, 3, 7, 9],
      [0, 2, 6, 9],
    ]);
    // Every chord is three or four notes, and says which.
    expect(QUALITIES.filter(isTriadQuality)).toEqual([
      'maj',
      'min',
      'dim',
      'aug',
      'majb5',
      'sus2b5',
    ]);
    expect(QUALITIES.filter(isSeventhQuality)).toHaveLength(10);
    // The UI's formula strings say the same thing.
    for (const q of QUALITIES) {
      expect(GUITAR_THEORY_STRINGS[`formula.${q}`]).toBe(formulaText(q));
    }
    expect(CHORD_FORMULA.min7b5[6]).toEqual({ label: 'b5', role: 'fifth' });
    expect(QUALITY_TONES.maj).toEqual(['third']);
    expect(QUALITY_TONES.dim).toEqual(['third', 'fifth']);
    expect(QUALITY_TONES.dom7).toEqual(['third', 'seventh']);
    expect(QUALITY_TONES.min7b5).toEqual(['third', 'fifth', 'seventh']);
    // A sus2's 2 takes the 3rd's slot, a 6 the 7th's.
    expect(CHORD_FORMULA.sus2b5[2]).toEqual({ label: '2', role: 'third' });
    expect(CHORD_FORMULA.min6[9]).toEqual({ label: '6', role: 'seventh' });
    expect(CHORD_FORMULA.dim7[9]).toEqual({ label: 'bb7', role: 'seventh' });
  });

  it('writes and speaks the new tone labels', () => {
    expect(toneLabelText('bb7')).toBe('𝄫7');
    expect(toneLabelText('#5')).toBe('♯5');
    expect(spokenToneLabel('bb7')).toBe('double flat 7');
    expect(spokenToneLabel('#5')).toBe('sharp 5');
    expect(spokenToneLabel('b5')).toBe('flat 5');
  });

  it('spells the new chords by their own letters', () => {
    expect(spellChordTones('C', 'dim7')).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
    expect(spellChordTones('C', 'min6')).toEqual(['C', 'Eb', 'G', 'A']);
    expect(spellChordTones('C', 'aug')).toEqual(['C', 'E', 'G#']);
    expect(spellChordTones('C', 'sus2b5add6')).toEqual(['C', 'D', 'Gb', 'A']);
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
        const root = chordRootName(getGuitarCenter(key), degree);
        const triad = DIATONIC_TRIADS[degree - 1];
        const names = [
          ...(triad === 'dim' ? [] : spellChordTones(root, triad)),
          ...spellChordTones(root, DIATONIC_SEVENTHS[degree - 1]),
        ];
        expect(names.join(' '), `${key} ${degree}`).not.toContain('#');
      }
      const center = getGuitarCenter(key);
      for (const shape of [...center.triads, ...center.sevenths]) {
        const tones = shapeTones(
          shape.frets,
          chordRootName(getGuitarCenter(key), shape.degree),
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
