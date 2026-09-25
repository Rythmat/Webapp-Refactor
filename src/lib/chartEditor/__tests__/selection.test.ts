import { describe, expect, it } from 'vitest';
import {
  chartBars,
  chartChords,
  clampSelection,
  clickBar,
  clickChord,
  isBarSelected,
  NO_SELECTION,
  selectAll,
  selectionSize,
  type ChartLike,
} from '../selection';

/** Verse of 2 bars (1 chord, 2 chords), Chorus of 2 bars (1 chord each). */
const chart: ChartLike = {
  sections: [
    { bars: [{ chords: ['C'] }, { chords: ['F', 'G'] }] },
    { bars: [{ chords: ['Am'] }, { chords: ['E'] }] },
  ],
};
const bar = (section: number, b: number) => ({ section, bar: b });

describe('reading order', () => {
  it('numbers bars and chords straight through the sections', () => {
    expect(chartBars(chart)).toEqual([
      bar(0, 0),
      bar(0, 1),
      bar(1, 0),
      bar(1, 1),
    ]);
    expect(chartChords(chart)).toHaveLength(5);
  });
});

describe('clicking a bar', () => {
  it('selects just that bar', () => {
    const s = clickBar(chart, NO_SELECTION, bar(0, 1));
    expect(s).toMatchObject({ kind: 'bars', refs: [bar(0, 1)] });
  });

  it('shift-click takes the run between, across a section boundary', () => {
    // The phrase a player sees does not stop because the chart changed staff.
    let s = clickBar(chart, NO_SELECTION, bar(0, 1));
    s = clickBar(chart, s, bar(1, 1), { shift: true });
    expect(s.kind === 'bars' && s.refs).toEqual([
      bar(0, 1),
      bar(1, 0),
      bar(1, 1),
    ]);
  });

  it('shift-click backwards takes the same run', () => {
    let s = clickBar(chart, NO_SELECTION, bar(1, 1));
    s = clickBar(chart, s, bar(0, 1), { shift: true });
    expect(s.kind === 'bars' && s.refs).toEqual([
      bar(0, 1),
      bar(1, 0),
      bar(1, 1),
    ]);
  });

  it('keeps the anchor, so a run can be widened and narrowed', () => {
    let s = clickBar(chart, NO_SELECTION, bar(0, 0));
    s = clickBar(chart, s, bar(1, 1), { shift: true });
    expect(selectionSize(s)).toBe(4);
    s = clickBar(chart, s, bar(0, 1), { shift: true });
    expect(selectionSize(s)).toBe(2);
    expect(s.kind === 'bars' && s.anchor).toEqual(bar(0, 0));
  });

  it('toggle adds and removes one, keeping reading order', () => {
    let s = clickBar(chart, NO_SELECTION, bar(1, 0));
    s = clickBar(chart, s, bar(0, 0), { toggle: true });
    expect(s.kind === 'bars' && s.refs).toEqual([bar(0, 0), bar(1, 0)]);
    s = clickBar(chart, s, bar(1, 0), { toggle: true });
    expect(s.kind === 'bars' && s.refs).toEqual([bar(0, 0)]);
  });

  it('toggling the last one off selects nothing', () => {
    let s = clickBar(chart, NO_SELECTION, bar(0, 0));
    s = clickBar(chart, s, bar(0, 0), { toggle: true });
    expect(s).toEqual(NO_SELECTION);
  });

  it('a plain click starts again', () => {
    let s = clickBar(chart, NO_SELECTION, bar(0, 0));
    s = clickBar(chart, s, bar(1, 1), { shift: true });
    s = clickBar(chart, s, bar(1, 0));
    expect(s).toMatchObject({ anchor: bar(1, 0), refs: [bar(1, 0)] });
  });

  it('ignores a bar that is not there', () => {
    const s = clickBar(chart, NO_SELECTION, bar(9, 9));
    expect(s).toBe(NO_SELECTION);
  });

  it('switches kind when a chord is clicked after bars', () => {
    const s = clickBar(chart, NO_SELECTION, bar(0, 0));
    const c = clickChord(chart, s, { section: 0, bar: 1, chord: 1 });
    expect(c.kind).toBe('chords');
    expect(selectionSize(c)).toBe(1);
  });
});

describe('clicking a chord', () => {
  it('shift-click runs across bars and sections', () => {
    let s = clickChord(chart, NO_SELECTION, { section: 0, bar: 1, chord: 0 });
    s = clickChord(chart, s, { section: 1, bar: 0, chord: 0 }, { shift: true });
    expect(s.kind === 'chords' && s.refs).toEqual([
      { section: 0, bar: 1, chord: 0 },
      { section: 0, bar: 1, chord: 1 },
      { section: 1, bar: 0, chord: 0 },
    ]);
  });

  it('toggles one chord out of a run', () => {
    let s = clickChord(chart, NO_SELECTION, { section: 0, bar: 0, chord: 0 });
    s = clickChord(chart, s, { section: 1, bar: 1, chord: 0 }, { shift: true });
    expect(selectionSize(s)).toBe(5);
    s = clickChord(
      chart,
      s,
      { section: 0, bar: 1, chord: 1 },
      { toggle: true },
    );
    expect(selectionSize(s)).toBe(4);
  });
});

describe('select all', () => {
  it('takes every bar by default', () => {
    expect(selectionSize(selectAll(chart, NO_SELECTION))).toBe(4);
  });

  it('takes every chord when chords are what is selected', () => {
    const s = clickChord(chart, NO_SELECTION, { section: 0, bar: 0, chord: 0 });
    expect(selectionSize(selectAll(chart, s))).toBe(5);
  });

  it('selects nothing in an empty chart', () => {
    expect(selectAll({ sections: [] }, NO_SELECTION)).toEqual(NO_SELECTION);
  });
});

describe('after the chart changes underneath', () => {
  const smaller: ChartLike = { sections: [{ bars: [{ chords: ['C'] }] }] };

  it('drops references to bars that are gone', () => {
    let s = clickBar(chart, NO_SELECTION, bar(0, 0));
    s = clickBar(chart, s, bar(1, 1), { shift: true });
    const clamped = clampSelection(smaller, s);
    expect(clamped.kind === 'bars' && clamped.refs).toEqual([bar(0, 0)]);
  });

  it('moves the anchor when the anchor itself is gone', () => {
    let s = clickBar(chart, NO_SELECTION, bar(1, 1));
    s = clickBar(chart, s, bar(0, 0), { shift: true });
    const clamped = clampSelection(smaller, s);
    expect(clamped.kind === 'bars' && clamped.anchor).toEqual(bar(0, 0));
  });

  it('selects nothing when it all went', () => {
    const s = clickBar(chart, NO_SELECTION, bar(1, 1));
    expect(clampSelection({ sections: [] }, s)).toEqual(NO_SELECTION);
  });

  it('is a no-op on an empty selection', () => {
    expect(clampSelection(chart, NO_SELECTION)).toEqual(NO_SELECTION);
  });

  it('keeps isBarSelected honest', () => {
    const s = clickBar(chart, NO_SELECTION, bar(0, 1));
    expect(isBarSelected(s, bar(0, 1))).toBe(true);
    expect(isBarSelected(s, bar(0, 0))).toBe(false);
  });
});
