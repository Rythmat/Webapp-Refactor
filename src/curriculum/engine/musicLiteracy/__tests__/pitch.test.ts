import { describe, expect, it } from 'vitest';
import {
  LITERACY_DEGREES,
  LITERACY_SCALE_DEGREES,
  LITERACY_TONICS,
} from '@/content/musicLiteracy/schemas';
import {
  DEGREE_SEMITONES,
  modalDegree,
  noteMidi,
  notePitch,
  scaleSemitones,
  tonicMidi,
  writtenDegree,
} from '../pitch';

/**
 * Modal numbering: in scale numbering a degree is the mode's, so minor's
 * 3, 6 and 7 are ♭3, ♭6 and ♭7 (natural minor); chromatic numbering, Part
 * 1's, reads every label as it is.
 */

describe('modal numbering', () => {
  it('flats minor’s 3, 6 and 7 in scale numbering, and nothing else', () => {
    expect(
      LITERACY_SCALE_DEGREES.map((d) => modalDegree(d, 'minor', 'scale')),
    ).toEqual(['1', '2', 'b3', '4', '5', 'b6', 'b7']);
    expect(
      LITERACY_SCALE_DEGREES.map((d) => modalDegree(d, 'major', 'scale')),
    ).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('reads every label as written in chromatic numbering, in either mode', () => {
    for (const degree of LITERACY_DEGREES) {
      expect(modalDegree(degree, 'minor', 'chromatic')).toBe(degree);
      expect(modalDegree(degree, 'minor')).toBe(degree);
    }
  });

  it('places a written note in the student’s key and mode', () => {
    const cMinor = { tonic: 'C', mode: 'minor' } as const;
    const three = { degree: '3' } as const;
    expect(notePitch(three, cMinor, 'scale')).toBe(63);
    expect(notePitch(three, cMinor, 'chromatic')).toBe(64);
    // The 7 below the 1, in A minor: G3.
    expect(
      notePitch(
        { degree: '7', octave: -1 },
        { tonic: 'A', mode: 'minor' },
        'scale',
      ),
    ).toBe(55);
    // Chromatic numbering is Part 1's maths exactly.
    for (const tonic of LITERACY_TONICS)
      for (const degree of LITERACY_DEGREES)
        expect(notePitch({ degree, octave: 1 }, { tonic, mode: 'minor' })).toBe(
          noteMidi({ degree, octave: 1 }, tonicMidi(tonic)),
        );
  });

  it('writes a pitch back the lesson’s way', () => {
    expect(writtenDegree(3, 'minor', 'scale')).toEqual({ degree: '3' });
    expect(writtenDegree(3, 'minor')).toEqual({ degree: 'b3' });
    expect(writtenDegree(-2, 'minor', 'scale')).toEqual({
      degree: '7',
      octave: -1,
    });
    expect(writtenDegree(16, 'major', 'scale')).toEqual({
      degree: '3',
      octave: 1,
    });
    // Out of the mode, scale numbering falls back to the chromatic label.
    expect(writtenDegree(6, 'major', 'scale')).toEqual({ degree: '#4' });
    for (const degree of LITERACY_SCALE_DEGREES)
      expect(
        writtenDegree(scaleSemitones(degree, 'minor'), 'minor', 'scale'),
      ).toEqual({ degree });
  });

  it('keeps the 1 in F♯3–F4, and the melodies’ low 5 to 5 above on C3–C5', () => {
    for (const tonic of LITERACY_TONICS) {
      const one = tonicMidi(tonic);
      expect(one).toBeGreaterThanOrEqual(54);
      expect(one).toBeLessThanOrEqual(65);
      expect(one - 12 + DEGREE_SEMITONES['5']).toBeGreaterThanOrEqual(48);
      expect(one + DEGREE_SEMITONES['5']).toBeLessThanOrEqual(72);
    }
  });
});
