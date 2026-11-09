import { describe, expect, it } from 'vitest';
import { chordName as connectionChordName } from '../ChordConnectionGame';
import {
  chordName as pressChordName,
  jazzChordName,
  noteNamer,
  withOctave,
} from '../ChordPressGame';
import { noteNameInKey } from '../MajorArcanum/constants';

const ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

describe('the Arcade spells as the rest of the app', () => {
  it('roots every chord on the twelve key centers in Chord Press and Chord Connection', () => {
    for (const chordName of [pressChordName, connectionChordName])
      expect(ROOTS.map((_, pc) => chordName(pc, 'min7'))).toEqual(
        ROOTS.map((r) => `${r} Minor 7`),
      );
    expect(jazzChordName(8, 'min')).toBe('A♭−');
  });

  it('names Chord Press’s missing tones as the chord spells them', () => {
    // D♭ minor is D♭ F♭ A♭; E major's third is G♯.
    const dbMinor = noteNamer(1, [0, 3, 7]);
    expect([1, 4, 8].map(dbMinor)).toEqual(['D♭', 'F♭', 'A♭']);
    expect(noteNamer(4, [0, 4, 7])(8)).toBe('G♯');
    // A note outside the chord, as the root's key spells it.
    expect(noteNamer(5, [0, 4, 7])(10)).toBe('B♭');
    // With octaves, as the target hint shows them: F♭4 sounds as E4.
    expect(withOctave('F♭', 64)).toBe('F♭4');
    expect(withOctave('C♭', 59)).toBe('C♭4');
    expect(withOctave('B♯', 60)).toBe('B♯3');
  });

  it('spells Major Arcanum’s notes in the key they fall in', () => {
    expect(noteNameInKey(66, 2)).toBe('F♯'); // D major
    expect(noteNameInKey(70, 5)).toBe('B♭'); // F major
    expect(noteNameInKey(65, 6)).toBe('E♯'); // F♯ major
    expect(noteNameInKey(61, 1)).toBe('D♭'); // D♭ major
    expect(noteNameInKey(71, 11)).toBe('B');
  });
});
