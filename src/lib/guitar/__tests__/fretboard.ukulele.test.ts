import { describe, expect, it } from 'vitest';
import {
  defaultDiagramStart,
  fretSpan,
  fretToMidi,
  parseShape,
  positionsFor,
  shapeLowestMidi,
  shapeNotes,
  shapePitchClasses,
  shapePositions,
} from '@/lib/guitar/fretboard';
import {
  frettedInstrument,
  GUITAR,
  openMidi,
  stringsByPitch,
  UKULELE,
} from '@/lib/guitar/instrument';

describe('ukulele fretboard maths', () => {
  it('tunes G4 C4 E4 A4, the G re-entrant', () => {
    expect(
      [4, 3, 2, 1].map((s) => openMidi(s as 1 | 2 | 3 | 4, UKULELE)),
    ).toEqual([67, 60, 64, 69]);
    expect(UKULELE.stringNames).toEqual(['A', 'E', 'C', 'G']);
    expect(stringsByPitch(UKULELE)).toEqual([3, 2, 4, 1]);
    expect(stringsByPitch(GUITAR)).toEqual(GUITAR.stringsLowToHigh);
    expect(frettedInstrument('ukulele')).toBe(UKULELE);
  });

  it('reads shapes written G-C-E-A, as the book prints them', () => {
    // C major 0-0-0-3: G C E C.
    expect(shapeNotes('0-0-0-3', UKULELE).map((n) => n.midi)).toEqual([
      67, 60, 64, 72,
    ]);
    expect(shapePitchClasses('0-0-0-3', UKULELE)).toEqual([0, 4, 7]);
    // A minor 2-0-0-0: A C E A.
    expect(shapePitchClasses('2-0-0-0', UKULELE)).toEqual([0, 4, 9]);
    // The lowest pitch is the C string, not the first-written G.
    expect(shapeLowestMidi('0-0-0-3', UKULELE)).toBe(60);
    expect(shapePositions('X-2-3-2', UKULELE)).toEqual([
      { string: 3, fret: 2 },
      { string: 2, fret: 3 },
      { string: 1, fret: 2 },
    ]);
  });

  it('rejects a shape with the wrong string count', () => {
    expect(() => parseShape('X-3-2-0-1-0', UKULELE)).toThrow(/4 strings/);
    expect(() => parseShape('0-0-0-3')).toThrow(/6 strings/);
  });

  it('measures spans and diagram windows on four strings', () => {
    expect(fretSpan('3-2-1-1', UKULELE)).toBe(2);
    expect(defaultDiagramStart('0-0-0-3', UKULELE)).toBe(1);
    expect(defaultDiagramStart('8-6-6-6', UKULELE)).toBe(5);
  });

  it('finds every place a pitch sits, in written string order', () => {
    // A4 (69): G string 2, E string 5, open A — and C string 9.
    expect(positionsFor(69, undefined, UKULELE)).toEqual([
      { string: 4, fret: 2 },
      { string: 3, fret: 9 },
      { string: 2, fret: 5 },
      { string: 1, fret: 0 },
    ]);
    expect(fretToMidi({ string: 3, fret: 7 }, UKULELE)).toBe(67);
  });
});
