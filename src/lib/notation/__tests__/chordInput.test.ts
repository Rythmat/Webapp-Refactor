import { describe, expect, it } from 'vitest';
import { nextBeat, readChordInput } from '@/daw/components/Score/chordInput';

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
