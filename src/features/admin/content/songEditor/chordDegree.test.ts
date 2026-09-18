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

  it('counts from the tonic major scale in every mode', () => {
    // In C minor, E♭ is still ♭3 (hybrid numbering, not natural minor).
    expect(degreeFromChord('E♭', 60, 'minor')).toBe('♭3 maj');
    expect(degreeFromChord('C', 60, 'aeolian')).toBe('1 maj');
    // A minor: G → ♭7, F → ♭6, E7 → 5 7.
    expect(degreeFromChord('G', 69, 'minor')).toBe('♭7 maj');
    expect(degreeFromChord('F', 69, 'minor')).toBe('♭6 maj');
    expect(degreeFromChord('E7', 69, 'minor')).toBe('5 7');
    // D dorian: F → ♭3, G → 4.
    expect(degreeFromChord('F', 62, 'dorian')).toBe('♭3 maj');
    expect(degreeFromChord('G', 62, 'dorian')).toBe('4 maj');
  });

  it('takes the accidental from the root letter', () => {
    expect(degreeFromChord('D♭', 60, 'major')).toBe('♭2 maj');
    expect(degreeFromChord('C♯', 60, 'major')).toBe('♯1 maj');
    expect(degreeFromChord('F♯dim', 60, 'major')).toBe('♯4 dim');
  });

  it('follows a supplied tonic spelling', () => {
    // A 'D♭ minor' chart spelled from C♯: E is ♭3 of C♯, not ♯2.
    const cSharp = { letterIndex: 0, accidental: 1 };
    expect(degreeFromChord('E', 61, 'minor', cSharp)).toBe('♭3 maj');
    // A stale tonic that no longer matches keyRoot is ignored.
    expect(degreeFromChord('E', 60, 'minor', cSharp)).toBe('3 maj');
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
