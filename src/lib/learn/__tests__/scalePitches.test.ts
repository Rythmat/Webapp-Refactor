import { describe, expect, it } from 'vitest';
import {
  alteredDegrees,
  parentOf,
  pitchClassesOf,
  stepPattern,
  thirdsStars,
} from '../scalePitches';

describe('pitchClassesOf', () => {
  it('reads a mode, a family mode and a scale by their tile slugs', () => {
    expect(pitchClassesOf('lydian')).toEqual([0, 2, 4, 6, 7, 9, 11]);
    expect(pitchClassesOf('harmonicminor')).toEqual([0, 2, 3, 5, 7, 8, 11]);
    expect(pitchClassesOf('minorblues')).toEqual([0, 3, 5, 6, 7, 10]);
    expect(pitchClassesOf('nonsense')).toBeNull();
  });
});

describe('alteredDegrees', () => {
  it('names what sets a mode apart from major', () => {
    expect(alteredDegrees(pitchClassesOf('lydian')!)).toEqual([
      { pc: 6, label: '♯4' },
    ]);
    expect(
      alteredDegrees(pitchClassesOf('dorian')!).map((a) => a.label),
    ).toEqual(['♭3', '♭7']);
    expect(alteredDegrees(pitchClassesOf('ionian')!)).toEqual([]);
  });

  it("reads Locrian's 5 as flat, and a blues scale's notes outside major", () => {
    expect(
      alteredDegrees(pitchClassesOf('locrian')!).map((a) => a.label),
    ).toContain('♭5');
    expect(
      alteredDegrees(pitchClassesOf('minorblues')!).map((a) => a.label),
    ).toEqual(['♭3', '♭5', '♭7']);
  });
});

describe('stepPattern', () => {
  it('spells the steps round to the octave', () => {
    expect(stepPattern([0, 2, 4, 5, 7, 9, 11])).toEqual([
      'W',
      'W',
      'H',
      'W',
      'W',
      'W',
      'H',
    ]);
    // Harmonic minor's augmented 2nd.
    expect(stepPattern(pitchClassesOf('harmonicminor')!)).toContain('1½');
  });
});

describe('thirdsStars', () => {
  it('stacks seven notes in thirds as one star, six as two triangles', () => {
    expect(thirdsStars([0, 2, 4, 5, 7, 9, 11])).toEqual([
      [0, 4, 7, 11, 2, 5, 9],
    ]);
    expect(thirdsStars([0, 2, 4, 6, 8, 10])).toEqual([
      [0, 4, 8],
      [2, 6, 10],
    ]);
  });
});

describe('parentOf', () => {
  it('finds the scale a mode is a mode of, and which mode it is', () => {
    // C Lydian: G major's 4th mode, 5 above G.
    expect(parentOf('lydian')).toEqual({ above: 5, name: 'major', mode: 4 });
    expect(parentOf('ionian')).toEqual({ above: 0, name: 'major', mode: 1 });
    // Phrygian Dominant: harmonic minor's 5th, 7 above its root.
    expect(parentOf('phrygianDominant')).toEqual({
      above: 7,
      name: 'harmonic minor',
      mode: 5,
    });
  });

  it("takes a pentatonic scale's parent from its parent mode", () => {
    // Minor pentatonic is Aeolian's: its relative major, 9 below.
    expect(parentOf('minorpentatonic')).toEqual({
      above: 9,
      name: 'major',
      mode: null,
    });
  });
});
