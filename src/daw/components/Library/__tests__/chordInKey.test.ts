import { describe, expect, it } from 'vitest';
import { chordDescription, chordModeContext } from '../chordInKey';

const MAJOR = [0, 4, 7];
const MINOR = [0, 3, 7];
const MIN7 = [0, 3, 7, 10];

const inC = (chordRootPc: number, quality: string, intervals: number[]) =>
  chordModeContext({
    chordRootPc,
    quality,
    intervals,
    rootNote: 0,
    mode: 'ionian',
    tonicName: 'C',
  });

describe('chordModeContext in C major', () => {
  it('reads the 5 chord as the 5th degree, not the 1st', () => {
    const g = inC(7, 'major', MAJOR);
    expect(g.degreeSentence).toBe('Built on the 5th degree of C major');
    expect(g.chordRootMode).toBe('mixolydian');
    expect(g.parentRootPc).toBe(0);
    expect(g.isSessionParent).toBe(true);
    expect(chordDescription('major', g)).toBe(
      'Built on the 5th degree of C major',
    );
  });

  it('places the 4 chord in Lydian', () => {
    const f = inC(5, 'major', MAJOR);
    expect(f.chordRootMode).toBe('lydian');
    expect(f.degreeSentence).toBe('Built on the 4th degree of C major');
  });

  it('reads A min7 as A Aeolian with C major as its parent, not A Dorian', () => {
    const am7 = inC(9, 'minor7', MIN7);
    expect(am7.chordRootMode).toBe('aeolian');
    expect(am7.sessionMode).toBe('ionian');
    expect(am7.isSessionParent).toBe(true);
    expect(chordDescription('minor7', am7)).toMatch(
      /^Built on the 6th degree of C major\. /,
    );
  });

  it('falls back to the quality for chords outside the key', () => {
    const e = inC(4, 'major', MAJOR); // G♯ isn't in C major
    expect(e.degreeSentence).toBeNull();
    expect(e.chordRootMode).toBe('ionian');
    expect(chordDescription('major', e)).toBe(
      'A major triad: root, major 3rd and 5th',
    );
  });
});

describe('chordModeContext in other keys', () => {
  it('counts degrees from a flat tonic (B♭ major, E♭ is the 4)', () => {
    const eb = chordModeContext({
      chordRootPc: 3,
      quality: 'major',
      intervals: MAJOR,
      rootNote: 10,
      mode: 'ionian',
      tonicName: 'B♭',
    });
    expect(eb.degreeSentence).toBe('Built on the 4th degree of B♭ major');
  });

  it('counts from the modal tonic, with the parent kept separate', () => {
    const dm = chordModeContext({
      chordRootPc: 2,
      quality: 'minor7',
      intervals: MIN7,
      rootNote: 2,
      mode: 'dorian',
      tonicName: 'D',
    });
    expect(dm.chordRootMode).toBe('dorian');
    expect(dm.degreeSentence).toBe('Built on the 1st degree of D Dorian');
    expect(dm.parentRootPc).toBe(0);
    expect(dm.parentMode).toBe('ionian');
    expect(dm.isSessionParent).toBe(false);
  });

  it('names a minor key as minor', () => {
    const g = chordModeContext({
      chordRootPc: 7,
      quality: 'major',
      intervals: MAJOR,
      rootNote: 9,
      mode: 'aeolian',
      tonicName: 'A',
    });
    expect(g.degreeSentence).toBe('Built on the 7th degree of A minor');
    const d = chordModeContext({
      chordRootPc: 2,
      quality: 'minor',
      intervals: MINOR,
      rootNote: 9,
      mode: 'aeolian',
      tonicName: 'A',
    });
    expect(d.chordRootMode).toBe('dorian');
  });
});
