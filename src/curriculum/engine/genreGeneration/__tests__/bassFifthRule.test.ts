import { describe, expect, it } from 'vitest';
import {
  BASS_LINE_CEILING,
  bassFifthMidi,
  bassFifthPc,
} from '../bassFifthRule';
import { bassPC_toMidi } from '../chordBassNote';
import { chordSymbolTones } from '../chordSymbolTones';

/** The chord as the engine reads it, which is what the rule is given. */
const chord = (symbol: string) => {
  const tones = chordSymbolTones(symbol);
  if (!tones) throw new Error(`unparsed: ${symbol}`);
  return tones;
};

/** Where the bass line's own note sits for a chord, in the bass register. */
const bassNote = (symbol: string) => bassPC_toMidi(chord(symbol).bassPc);

const PC = { C: 0, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, A: 9, Bb: 10 };

describe('the 5 of a slash chord', () => {
  it('is the chord’s fifth, not a fifth above the bass note', () => {
    // Bb/D: the chord is Bb, so the 5 is F. A is a fifth above the D the bass
    // is playing, and is not in the chord at all.
    expect(bassFifthPc(chord('Bb/D'))).toBe(PC.F);
    expect(bassFifthPc(chord('Bb/D'))).not.toBe(PC.A);
  });

  it('puts that F just above the D, where the line already is', () => {
    const d = bassNote('Bb/D');
    expect(bassFifthMidi(chord('Bb/D'), d)).toBe(d + 3);
    // What the generator used to play: a fifth up from the bass note.
    expect(bassFifthMidi(chord('Bb/D'), d)).not.toBe(d + 7);
  });

  it('repeats the bass note when the bass is already on the fifth', () => {
    // Bb/F — the bass note IS the 5, so the line repeats it rather than
    // climbing to a fifth above it (C, which is not a Bb chord tone).
    const f = bassNote('Bb/F');
    expect(bassFifthMidi(chord('Bb/F'), f)).toBe(f);
  });

  it('holds for a minor chord over another bass note', () => {
    // Cm/Eb: the 5 is G. A fifth above Eb is Bb — the ♭7, not the fifth.
    expect(bassFifthPc(chord('Cm/Eb'))).toBe(PC.G);
    const eb = bassNote('Cm/Eb');
    expect(bassFifthMidi(chord('Cm/Eb'), eb)).toBe(eb + 4);
  });

  it('holds for a seventh chord over its third', () => {
    // Bbmaj7/D, the same shape as the Pop flows' Bb/D.
    expect(bassFifthPc(chord('Bbmaj7/D'))).toBe(PC.F);
  });
});

describe('the 5 of a plain chord', () => {
  it('is the fifth above the root, exactly as before', () => {
    const bb = bassNote('Bb');
    expect(bassFifthPc(chord('Bb'))).toBe(PC.F);
    expect(bassFifthMidi(chord('Bb'), bb)).toBe(bb + 7);
  });

  it('follows the chord when its fifth is not perfect', () => {
    // A diminished chord's 5 is flat, and the bass line takes the chord's.
    expect(bassFifthPc(chord('Cdim'))).toBe(PC.Gb);
    const c = bassNote('Cdim');
    expect(bassFifthMidi(chord('Cdim'), c)).toBe(c + 6);
  });

  it('repeats the bass note when the chord has no fifth to give', () => {
    // An altered dominant: the fifth is whatever the voicing says, so the bass
    // does not guess one.
    const g = bassNote('G7alt');
    expect(bassFifthPc(chord('G7alt'))).toBeNull();
    expect(bassFifthMidi(chord('G7alt'), g)).toBe(g);
  });
});

describe('staying in the bass register', () => {
  it('drops an octave rather than climbing past C3', () => {
    // A bass line already near the top of its register, on D.
    const high = bassPC_toMidi(PC.D) + 12;
    expect(high).toBeGreaterThan(BASS_LINE_CEILING - 12);
    const note = bassFifthMidi({ rootPc: PC.C, fifth: 7 }, high);
    expect(note).toBeLessThanOrEqual(BASS_LINE_CEILING);
    // Same pitch class either way — G, the fifth of C.
    expect(((note % 12) + 12) % 12).toBe(PC.G);
  });

  it('never moves the note it was given when there is no fifth', () => {
    expect(bassFifthMidi({ rootPc: PC.C }, 99)).toBe(99);
  });
});
