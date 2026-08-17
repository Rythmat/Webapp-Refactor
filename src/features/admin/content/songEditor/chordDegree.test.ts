import { describe, expect, it } from 'vitest';
import { degreeFromChord } from './chordDegree';

// keyRoot 60 = C4 (pitch class 0), so "C … major/minor" is the tonic.
describe('degreeFromChord', () => {
  it('derives diatonic major-key degrees matching the shipped data', () => {
    expect(degreeFromChord('C', 60, 'major')).toBe('1 maj');
    expect(degreeFromChord('F', 60, 'major')).toBe('4 maj');
    expect(degreeFromChord('G', 60, 'major')).toBe('5 maj');
  });

  it('uses a bare 7 for dominant (not dom7)', () => {
    expect(degreeFromChord('G7', 60, 'major')).toBe('5 7');
    expect(degreeFromChord('C7', 60, 'major')).toBe('1 7');
  });

  it('flats chromatic degrees in a major key', () => {
    expect(degreeFromChord('B♭', 60, 'major')).toBe('♭7 maj');
    expect(degreeFromChord('E♭', 60, 'major')).toBe('♭3 maj');
  });

  it('keeps maj7 / min7 quality tokens', () => {
    expect(degreeFromChord('Cmaj7', 60, 'major')).toBe('1 maj7');
    expect(degreeFromChord('Dmin7', 60, 'major')).toBe('2 min7');
  });

  it('handles slash chords (bass degree appended)', () => {
    expect(degreeFromChord('C/E', 60, 'major')).toBe('1 maj/3');
    expect(degreeFromChord('G/B', 60, 'major')).toBe('5 maj/7');
  });

  it('uses the minor map for minor-family modes', () => {
    // In C minor, E♭ is the natural (unaccidented) 3rd.
    expect(degreeFromChord('E♭', 60, 'minor')).toBe('3 maj');
    expect(degreeFromChord('C', 60, 'aeolian')).toBe('1 maj');
  });

  it('respects a non-C key center', () => {
    // keyRoot 67 = G. In G major, D is the 5th.
    expect(degreeFromChord('D', 67, 'major')).toBe('5 maj');
    expect(degreeFromChord('G', 67, 'major')).toBe('1 maj');
  });

  it('passes through N.C. and defaults unparseable roots', () => {
    expect(degreeFromChord('N.C.', 60, 'major')).toBe('n.c.');
    expect(degreeFromChord('', 60, 'major')).toBe('1 maj');
  });
});
