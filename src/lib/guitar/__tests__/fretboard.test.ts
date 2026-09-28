import { describe, expect, it } from 'vitest';
import {
  defaultDiagramStart,
  formatShape,
  fretSpan,
  fretToMidi,
  fretWindow,
  midiAt,
  nearestPosition,
  parseShape,
  positionsFor,
  shapeLowestMidi,
  shapeNotes,
  shapePitchClasses,
  shapePositions,
} from '../fretboard';

describe('fretboard', () => {
  it('tunes E2 A2 D3 G3 B3 E4, string 1 = high E', () => {
    expect([6, 5, 4, 3, 2, 1].map((s) => midiAt(s as 1, 0))).toEqual([
      40, 45, 50, 55, 59, 64,
    ]);
    expect(midiAt(6, 3)).toBe(43);
    expect(fretToMidi({ string: 1, fret: 0 })).toBe(64);
  });

  it('parses shape strings from string 6 to string 1', () => {
    expect(parseShape('X-3-2-0-1-0')).toEqual([null, 3, 2, 0, 1, 0]);
    expect(formatShape(parseShape('X-10-12-11-12-X'))).toBe('X-10-12-11-12-X');
    expect(() => parseShape('X-3-2-0-1')).toThrow();
    expect(() => parseShape('X-3-2-0-1-q')).toThrow();
  });

  it('sounds open C as C3 E3 G3 C4 E4', () => {
    expect(shapeNotes('X-3-2-0-1-0').map((n) => n.midi)).toEqual([
      48, 52, 55, 60, 64,
    ]);
    expect(shapePositions('X-3-2-0-1-0')[0]).toEqual({ string: 5, fret: 3 });
    expect(shapePitchClasses('X-3-2-0-1-0')).toEqual([0, 4, 7]);
    expect(shapeLowestMidi('X-3-2-0-1-0')).toBe(48);
  });

  it('measures fret span and a default diagram window', () => {
    expect(fretSpan('X-3-2-0-1-0')).toBe(2);
    expect(fretSpan('0-2-2-0-0-0')).toBe(0);
    expect(defaultDiagramStart('X-3-2-0-1-0')).toBe(1);
    expect(defaultDiagramStart('X-5-7-5-6-X')).toBe(4);
    expect(defaultDiagramStart('X-X-0-X-X-X')).toBe(1);
  });

  it('finds every position of a pitch', () => {
    expect(positionsFor(60)).toEqual([
      { string: 6, fret: 20 },
      { string: 5, fret: 15 },
      { string: 4, fret: 10 },
      { string: 3, fret: 5 },
      { string: 2, fret: 1 },
    ]);
    expect(positionsFor(39)).toEqual([]);
  });

  it('places a wrong note inside the step window', () => {
    expect(nearestPosition(60, { min: 4, max: 8 })).toEqual({
      string: 3,
      fret: 5,
    });
    expect(nearestPosition(10, { min: 0, max: 5 })).toBeNull();
  });

  it('draws a stable window from the nut or one fret below the lowest', () => {
    expect(fretWindow(shapePositions('X-3-2-0-1-0'))).toEqual({
      min: 0,
      max: 5,
    });
    expect(fretWindow(shapePositions('X-5-7-5-6-X'))).toEqual({
      min: 4,
      max: 9,
    });
    expect(
      fretWindow([{ string: 1, fret: 22 }], { minSpan: 5, maxFret: 22 }),
    ).toEqual({ min: 17, max: 22 });
    expect(fretWindow([])).toEqual({ min: 0, max: 5 });
  });
});
