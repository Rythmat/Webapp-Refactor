import { describe, expect, it } from 'vitest';
import { chordName, displayChordName } from '../BoardChoiceGame';

const ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

describe('Board Choice’s chord names', () => {
  it('spells every root as the app spells a key center, whatever the quality', () => {
    expect(ROOTS.map((_, pc) => chordName(pc, 'maj'))).toEqual(
      ROOTS.map((r) => `${r} Major`),
    );
    expect(ROOTS.map((_, pc) => chordName(pc, 'min7'))).toEqual(
      ROOTS.map((r) => `${r} Minor 7`),
    );
    expect(chordName(8, 'dim')).toBe('A♭ Diminished');
    expect(chordName(3, '7')).toBe('E♭ Dominant 7');
  });

  it('writes the same root in a jazz chord symbol', () => {
    expect(displayChordName({ rootPc: 1, type: 'min7' }, '', 'jazz')).toBe(
      'D♭−7',
    );
    expect(displayChordName({ rootPc: 10, type: 'maj' }, '', 'jazz')).toBe(
      'B♭',
    );
    expect(displayChordName({ rootPc: 6, type: 'min' }, '', 'jazz')).toBe(
      'F♯−',
    );
  });

  it('never writes an ASCII sharp or flat', () => {
    for (let pc = 0; pc < 12; pc++)
      for (const type of ['maj', 'min', 'dim', '7', 'maj7', 'min7'] as const) {
        expect(chordName(pc, type)).not.toMatch(/[A-G](#|b)/);
        expect(
          displayChordName({ rootPc: pc, type }, chordName(pc, type), 'jazz'),
        ).not.toMatch(/[A-G](#|b)/);
      }
  });
});
