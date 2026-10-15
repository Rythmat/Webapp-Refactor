import { describe, expect, it } from 'vitest';
import { CHORDS } from '@prism/engine';
import {
  chordInputText,
  nextBeat,
  readChordInput,
  typedChord,
} from '../chordInput';
import { keyFrame } from '../keyFrame';

const label = (text: string) => readChordInput(text)?.label ?? null;

describe('reading a typed chord', () => {
  it('takes plain chords as written', () => {
    expect(label('C')).toBe('C');
    expect(label('Bb')).toBe('Bb');
    expect(label('F#m7')).toBe('F#m7');
  });

  it('understands the ways people write minor', () => {
    expect(label('C-7')).toBe('Cm7');
    expect(label('Cmi7')).toBe('Cm7');
    expect(label('Cmin7')).toBe('Cm7');
  });

  it('understands the ways people write major sevenths', () => {
    expect(label('CM7')).toBe('Cmaj7');
    expect(label('CΔ7')).toBe('Cmaj7');
    expect(label('Cmaj7')).toBe('Cmaj7');
  });

  it('understands the shorthand symbols', () => {
    expect(label('Cø')).toBe('Cm7b5');
    expect(label('C°')).toBe('Cdim');
    expect(label('C+')).toBe('Caug');
  });

  it('takes unicode accidentals and loose case', () => {
    expect(label('b♭7')).toBe('Bb7');
    expect(label('e♯m')).toBe('E#m');
  });

  it('keeps a slash bass, capitalised', () => {
    expect(label('C/e')).toBe('C/E');
    expect(label('Bb/D')).toBe('Bb/D');
  });

  it('refuses what is not a chord', () => {
    expect(label('')).toBeNull();
    expect(label('hello there')).toBeNull();
    expect(label('123')).toBeNull();
  });

  it('refuses a quality the app can’t voice, which it used to store as text', () => {
    expect(label('Cxyz')).toBeNull();
    expect(label('Gblah7')).toBeNull();
    expect(label('Cø7')).toBe('Cm7b5');
  });
});

describe('walking to the next beat', () => {
  const beats = [
    { partIndex: 0, tick: 0 },
    { partIndex: 0, tick: 480 },
    { partIndex: 1, tick: 240 },
    { partIndex: 0, tick: 960 },
  ];

  it('stays in the same part and moves forward', () => {
    expect(nextBeat(beats, { partIndex: 0, tick: 0 })).toEqual({
      partIndex: 0,
      tick: 480,
    });
    expect(nextBeat(beats, { partIndex: 0, tick: 480 })).toEqual({
      partIndex: 0,
      tick: 960,
    });
  });

  it('stops at the end of the part', () => {
    expect(nextBeat(beats, { partIndex: 0, tick: 960 })).toBeNull();
  });
});

// ── What a typed chord writes ──────────────────────────────────────────────
// The lane stores a typed chord in its own dialect (a degree name in a key,
// the letter name, the engine's degreeKey) with the identity the student
// gave it, so Numbers, Roman and MusicXML read it as every other chord.

describe('typedChord', () => {
  const D = keyFrame(2, 'ionian');

  it('names F♯m7♭5 in D as the lane names its chords', () => {
    expect(typedChord('F#m7b5', D)).toMatchObject({
      name: '3 min7b5',
      noteName: 'F# min7b5',
      degreeKey: '3 minor7b5',
      identity: {
        rootPc: 6,
        quality: 'minor7b5',
        bassPc: 6,
        source: 'given',
        label: '3 min7b5',
      },
    });
  });

  it('keeps a slash bass and the student’s spelling', () => {
    expect(typedChord('Bb/D', keyFrame(10, 'ionian'))).toMatchObject({
      name: '1 maj/3',
      noteName: 'Bb maj/D',
      degreeKey: '1 major/3',
      identity: { rootPc: 10, bassPc: 2 },
    });
    expect(typedChord('A#m', keyFrame(0, 'ionian'))?.noteName).toBe('A# min');
  });

  it('writes letter names, and no degreeKey, without a key', () => {
    expect(typedChord('Am7', null)).toMatchObject({
      name: 'A min7',
      noteName: 'A min7',
      identity: { rootPc: 9, quality: 'minor7', label: 'A min7' },
    });
    expect(typedChord('Am7', null)).not.toHaveProperty('degreeKey');
  });

  it('is null for text that names no chord', () => {
    for (const text of ['', 'xyz', 'Cxyz', 'H7']) {
      expect(typedChord(text, D), text).toBeNull();
    }
  });
});

describe('chordInputText', () => {
  const C = keyFrame(0, 'ionian');
  const pitchClasses = (quality: string) =>
    [...new Set(CHORDS[quality].map((i) => ((i % 12) + 12) % 12))].sort(
      (a, b) => a - b,
    );

  it('opens a rename on the chord, as a symbol the box reads back', () => {
    const qualities = Object.keys(CHORDS).filter((q) => !q.includes('/'));
    for (const quality of qualities) {
      const typed = typedChord(
        chordInputText(
          {
            name: 'x',
            noteName: 'x',
            identity: {
              rootPc: 10,
              quality,
              bassPc: 10,
              source: 'given',
              label: 'x',
            },
          },
          C,
        ),
        C,
      );
      // The same notes: 'major7diminished' and 'minor7b5' share theirs.
      expect(typed?.identity.rootPc, quality).toBe(10);
      expect(pitchClasses(typed!.identity.quality), quality).toEqual(
        pitchClasses(quality),
      );
    }
  });

  it('falls back to the letter name without a current identity', () => {
    expect(chordInputText({ name: 'Am', noteName: 'A min' }, C)).toBe('A min');
  });
});
