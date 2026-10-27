import { describe, expect, it } from 'vitest';
import {
  fretToMidi,
  midiAt,
  nearestPosition,
  positionsFor,
} from '@/lib/guitar/fretboard';
import {
  BASS,
  GUITAR,
  isOnInstrument,
  openMidi,
} from '@/lib/guitar/instrument';

describe('bass fretboard maths', () => {
  it('tunes four strings E1 A1 D2 G2, string 1 the highest', () => {
    expect([4, 3, 2, 1].map((s) => openMidi(s as 1 | 2 | 3 | 4, BASS))).toEqual(
      [28, 33, 38, 43],
    );
    expect(BASS.stringNames).toEqual(['G', 'D', 'A', 'E']);
  });

  it('sounds a position an octave and more below the same guitar spot', () => {
    // A string, 3rd fret: C2 on bass; string 3 is G on guitar.
    expect(midiAt(3, 3, BASS)).toBe(36);
    expect(fretToMidi({ string: 4, fret: 3 }, BASS)).toBe(31);
    expect(midiAt(3, 3)).toBe(58);
  });

  it('has no strings 5 and 6', () => {
    expect(() => midiAt(5, 0, BASS)).toThrow(/no string 5/);
    expect(isOnInstrument({ string: 6, fret: 1 }, BASS)).toBe(false);
    expect(isOnInstrument({ string: 6, fret: 1 }, GUITAR)).toBe(true);
  });

  it('finds every place a pitch sits, low string first', () => {
    // D2 (38): E string 10, A string 5, open D.
    expect(positionsFor(38, undefined, BASS)).toEqual([
      { string: 4, fret: 10 },
      { string: 3, fret: 5 },
      { string: 2, fret: 0 },
    ]);
    expect(positionsFor(27, undefined, BASS)).toEqual([]);
    expect(positionsFor(43 + 21, undefined, BASS)).toEqual([]);
  });

  it('puts a stray pitch nearest the hand', () => {
    expect(nearestPosition(38, { min: 3, max: 7 }, BASS)).toEqual({
      string: 3,
      fret: 5,
    });
  });
});
