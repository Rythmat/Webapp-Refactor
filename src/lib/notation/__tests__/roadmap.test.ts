import { describe, expect, it } from 'vitest';
import {
  breaksFromRowSizes,
  hasRepeatAt,
  nextSectionLabel,
  repeatEndSet,
  repeatStartSet,
  rowSizesFromBreaks,
  withRepeatEnd,
  withRepeatStart,
  withoutRepeatAt,
} from '@/daw/components/Score/roadmap';

describe('section labels', () => {
  it('runs A, B, C … and skips what is taken', () => {
    expect(nextSectionLabel([])).toBe('A');
    expect(nextSectionLabel([{ measureIdx: 0, label: 'A' }])).toBe('B');
    expect(
      nextSectionLabel([
        { measureIdx: 0, label: 'A' },
        { measureIdx: 4, label: 'Chorus' },
        { measureIdx: 8, label: 'B' },
      ]),
    ).toBe('C');
  });

  it('doubles letters past Z, as MuseScore does', () => {
    const sections = Array.from({ length: 26 }, (_, i) => ({
      measureIdx: i,
      label: String.fromCharCode(65 + i),
    }));
    expect(nextSectionLabel(sections)).toBe('AA');
  });
});

describe('system breaks', () => {
  it('reads even rows when nothing is customised', () => {
    expect([...breaksFromRowSizes(null, 4, 12)]).toEqual([4, 8]);
  });

  it('reads custom rows, then falls back to even ones', () => {
    expect([...breaksFromRowSizes([6, 2], 4, 16)]).toEqual([6, 8, 12]);
  });

  // "Reset layout" clears the stored row sizes, which is what null means.
  it('goes back to even systems once the custom rows are cleared', () => {
    const custom = [...breaksFromRowSizes([6, 2], 4, 16)];
    expect(custom).toEqual([6, 8, 12]);
    expect([...breaksFromRowSizes(null, 4, 16)]).toEqual([4, 8, 12]);
  });

  it('gives the default bars per line back whatever the old rows were', () => {
    for (const rows of [[6, 2], [1], [9, 7], [3, 3, 3, 3, 4]]) {
      expect([...breaksFromRowSizes(rows, 4, 16)]).not.toEqual([4, 8, 12]);
      expect([...breaksFromRowSizes(null, 4, 16)]).toEqual([4, 8, 12]);
    }
  });

  it('honours a bars-per-line other than four after a reset', () => {
    expect([...breaksFromRowSizes(null, 2, 8)]).toEqual([2, 4, 6]);
  });

  it('round-trips breaks through row sizes', () => {
    const breaks = breaksFromRowSizes(null, 4, 12);
    breaks.add(6);
    expect(rowSizesFromBreaks(breaks, 12)).toEqual([4, 2, 2, 4]);
    expect([...breaksFromRowSizes([4, 2, 2, 4], 4, 12)]).toEqual([4, 6, 8]);
  });
});

describe('repeats', () => {
  it('opens a repeat that runs to the end', () => {
    const repeats = withRepeatStart([], 4, 16);
    expect(repeats).toEqual([{ startMeasure: 4, endMeasure: 15 }]);
    expect([...repeatStartSet(repeats)]).toEqual([4]);
    expect([...repeatEndSet(repeats)]).toEqual([15]);
  });

  it('stops an open repeat before the next one', () => {
    const repeats = withRepeatStart(withRepeatStart([], 8, 16), 2, 16);
    expect(repeats).toEqual([
      { startMeasure: 2, endMeasure: 7 },
      { startMeasure: 8, endMeasure: 15 },
    ]);
  });

  it('ends a running repeat where a new one opens', () => {
    const repeats = withRepeatStart(withRepeatStart([], 1, 16), 3, 16);
    expect(repeats).toEqual([
      { startMeasure: 1, endMeasure: 2 },
      { startMeasure: 3, endMeasure: 15 },
    ]);
  });

  it('trims the repeat it belongs to when closed', () => {
    const repeats = withRepeatEnd(withRepeatStart([], 4, 16), 8);
    expect(repeats).toEqual([{ startMeasure: 4, endMeasure: 7 }]);
  });

  it('closes from the top when nothing is open', () => {
    expect(withRepeatEnd([], 4)).toEqual([{ startMeasure: 0, endMeasure: 3 }]);
  });

  it('clears a repeat from either end', () => {
    const repeats = [{ startMeasure: 4, endMeasure: 7 }];
    expect(hasRepeatAt(repeats, 4)).toBe(true);
    expect(hasRepeatAt(repeats, 8)).toBe(true);
    expect(hasRepeatAt(repeats, 6)).toBe(false);
    expect(withoutRepeatAt(repeats, 8)).toEqual([]);
    expect(withoutRepeatAt(repeats, 4)).toEqual([]);
  });
});
