import { describe, expect, it } from 'vitest';
import {
  formatChord,
  formatChordLabel,
  formatProgression,
  parseChord,
} from '..';

const A_MINOR = { keyRootPc: 9, mode: 'aeolian' };
const D_DORIAN = { keyRootPc: 2, mode: 'dorian' };

// Degree labels the app shows count from the key's tonic; the engine's degree
// keys (Prism's stringSeq) count from the parent major.
describe('degrees counted from the tonic vs the parent', () => {
  it('reads degree labels from the tonic', () => {
    expect(parseChord('1 min7')).toEqual({ tonicDegree: '1', quality: 'min7' });
    expect(formatChordLabel('1 min7', 'roman', A_MINOR)).toBe('i7');
    expect(formatChordLabel('1 min7', 'jazz', A_MINOR)).toBe('A−7');
    expect(formatChordLabel('♭3 maj', 'roman', A_MINOR)).toBe('♭III');
    expect(formatChordLabel('♭3 maj', 'jazz', A_MINOR)).toBe('C');
    expect(formatChordLabel('♭7 maj', 'jazz', A_MINOR)).toBe('G');
    expect(formatChordLabel('4 maj', 'jazz', D_DORIAN)).toBe('G');
  });

  it('counts a degree bass from the tonic too', () => {
    expect(formatChordLabel('1 min/♭3', 'jazz', A_MINOR)).toBe('A−/C');
    expect(formatChordLabel('1 min/♭3', 'roman', A_MINOR)).toBe('i/♭3');
  });

  it('keeps parent-major degrees for engine degree keys', () => {
    // In A aeolian the parent is C major: "1 major" is C, "6 minor7" is A.
    expect(
      formatChord({ degree: '1 major', quality: 'major' }, 'roman', A_MINOR),
    ).toBe('♭III');
    expect(
      formatChord({ degree: '6 minor7', quality: 'minor7' }, 'jazz', A_MINOR),
    ).toBe('A−7');
  });

  it('rewrites a tonic-relative progression in a minor key', () => {
    expect(formatProgression('1 min - ♭6 maj - ♭7 maj', 'roman', A_MINOR)).toBe(
      'i - ♭VI - ♭VII',
    );
  });

  it('is the same in a major key either way', () => {
    const C = { keyRootPc: 0, mode: 'ionian' };
    expect(formatChordLabel('2 min7', 'jazz', C)).toBe('D−7');
    expect(
      formatChord({ degree: '2 minor7', quality: 'minor7' }, 'jazz', C),
    ).toBe('D−7');
  });
});
