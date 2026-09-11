import { describe, expect, it } from 'vitest';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { ALL_MODES } from '../modes';
import {
  chordToneNamesInKey,
  getScaleSpellings,
  noteNameInKey,
  respellLeadingChords,
} from '../notes';

const namesInKey = (keyPc: number, mode?: string) =>
  Array.from({ length: 12 }, (_, pc) => noteNameInKey(pc, keyPc, mode));

describe('noteNameInKey', () => {
  // Regression: the tonic alone picked all-sharp names, so G minor read A# / D#.
  it('never spells G minor with sharps on B♭ or E♭', () => {
    expect(noteNameInKey(10, 7, 'aeolian')).toBe('Bb');
    expect(noteNameInKey(3, 7, 'aeolian')).toBe('Eb');
    expect(noteNameInKey(10, 7)).toBe('Bb');
    expect(noteNameInKey(3, 7)).toBe('Eb');
    expect(namesInKey(7, 'aeolian').join(' ')).not.toMatch(/#/);
  });

  it('uses the parent mode for pitches outside the scale', () => {
    // A Phrygian (parent F major): D♭, not C♯.
    expect(noteNameInKey(1, 9, 'phrygian')).toBe('Db');
    // D Dorian (parent C major).
    expect(noteNameInKey(1, 2, 'dorian')).toBe('Db');
  });

  it('follows KEY_NOTE_NAMES without a mode', () => {
    expect(namesInKey(0)).toEqual('C Db D Eb E F F# G Ab A Bb B'.split(' '));
    expect(namesInKey(4)).toEqual('C C# D D# E F F# G G# A Bb B'.split(' '));
    expect(noteNameInKey(5, 6)).toBe('E#');
    expect(noteNameInKey(11, 1)).toBe('Cb');
  });

  it('spells scale tones one letter per degree', () => {
    expect(noteNameInKey(5, 6, 'ionian')).toBe('E#');
    expect(noteNameInKey(11, 8, 'dorian')).toBe('Cb');
  });

  it.each(Object.keys(ALL_MODES))(
    '%s: ASCII names that parse back to their pitch class in every key',
    (mode) => {
      for (let keyPc = 0; keyPc < 12; keyPc++) {
        namesInKey(keyPc, mode).forEach((name, pc) => {
          expect(name).toMatch(/^[A-G](bb|##|b|#)?$/);
          expect(noteNameToPitchClass(name)).toBe(pc);
        });
      }
    },
  );
});

describe('getScaleSpellings', () => {
  it('spells G Aeolian with flats', () => {
    expect([...getScaleSpellings(7, 'aeolian').values()]).toEqual(
      'G A Bb C D Eb F'.split(' '),
    );
  });

  it('keeps double accidentals in scales (ASCII)', () => {
    expect([...getScaleSpellings(1, 'phrygian').values()]).toEqual(
      'Db Ebb Fb Gb Ab Bbb Cb'.split(' '),
    );
  });

  it('is empty for an unknown mode', () => {
    expect(getScaleSpellings(0, 'not-a-mode').size).toBe(0);
  });
});

describe('chordToneNamesInKey', () => {
  it('spells D major in G minor as D F# A, not Gb', () => {
    expect([
      ...chordToneNamesInKey(2, [0, 4, 7], 7, 'aeolian').values(),
    ]).toEqual(['D', 'F#', 'A']);
  });

  it('names the root for the key and stacks letters from it', () => {
    // B♭ major in G minor.
    expect([
      ...chordToneNamesInKey(10, [0, 4, 7], 7, 'aeolian').values(),
    ]).toEqual(['Bb', 'D', 'F']);
  });
});

describe('respellLeadingChords (Priority 1: leading diminished chords)', () => {
  it.each([
    [
      ['Gb dim', 'G min'],
      ['F# dim', 'G min'],
    ],
    [
      ['F# dim', 'F min'],
      ['Gb dim', 'F min'],
    ],
    [
      ['C dim', 'B min'],
      ['C dim', 'B min'],
    ],
    [
      ['C dim', 'Db min'],
      ['C dim', 'Db min'],
    ],
    [
      ['C dim', 'C# min'],
      ['B# dim', 'C# min'],
    ],
    [
      ['Bb dim', 'B min'],
      ['A# dim', 'B min'],
    ],
    [
      ['A# dim', 'A min'],
      ['Bb dim', 'A min'],
    ],
    [
      ['Gb dim7', 'G min7'],
      ['F# dim7', 'G min7'],
    ],
  ])('%j → %j', (input, expected) => {
    expect(respellLeadingChords(input)).toEqual(expected);
  });

  it('respells a chord-tone slash bass with the new root', () => {
    expect(respellLeadingChords(['Gb dim7/Bbb', 'G min'])).toEqual([
      'F# dim7/A',
      'G min',
    ]);
  });

  it('leaves chords that do not lead by a half step, and non-diminished chords', () => {
    const names = ['Gb dim', 'Ab maj', 'Gb maj', 'G min', 'G min'];
    expect(respellLeadingChords(names)).toEqual(names);
  });
});
