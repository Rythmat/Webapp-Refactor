import { describe, expect, it } from 'vitest';
import type { SongSection } from '@/curriculum/types/songLibrary';
import { addChordOnBeat } from '../../songChart/chartOps';
import { applyPaletteMark, CHART_PALETTE_ACTIONS } from '../paletteMarks';

/**
 * The Score's palettes on a song chart (owner, 2026-11-12): each mark cell
 * writes the chart's own roadmap mark, and a chord symbol on a slash fits
 * itself between its neighbours.
 */

const chart = (): SongSection[] => [
  {
    id: 'v',
    label: 'Verse',
    bars: [
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [] },
    ],
  },
];
const at = [{ section: 0, bar: 0 }];

describe('the mark cells', () => {
  it('write the chart’s repeat signs, signs and jumps', () => {
    expect(
      applyPaletteMark(chart(), at, 'repeat.start')?.sections[0].bars[0]
        .repeatStart,
    ).toBe(true);
    expect(
      applyPaletteMark(chart(), at, 'jump.segno')?.sections[0].bars[0].segno,
    ).toBe(true);
    const ds = applyPaletteMark(chart(), at, 'jump.dsAlCoda');
    expect(ds?.sections[0].bars[0].jump).toBe('D.S. al Coda');
    expect(ds?.label).toBe('D.S. al Coda');
  });

  it('makes a single barline by taking the repeat signs off', () => {
    const repeated = applyPaletteMark(chart(), at, 'repeat.end')!.sections;
    const single = applyPaletteMark(repeated, at, 'barline.normal')!;
    expect('repeatEnd' in single.sections[0].bars[0]).toBe(false);
  });

  it('leaves out what a chart has no use for, and does nothing unpicked', () => {
    expect(CHART_PALETTE_ACTIONS.has('text.rehearsalMark')).toBe(false);
    expect(CHART_PALETTE_ACTIONS.has('layout.pageBreak')).toBe(false);
    expect(applyPaletteMark(chart(), [], 'repeat.start')).toBeNull();
    expect(applyPaletteMark(chart(), at, 'text.staffText')).toBeNull();
  });
});

describe('a chord on a slash', () => {
  it('lasts to the barline, and stops the chord before it there', () => {
    const out = addChordOnBeat(chart(), 0, 0, 4.5, 4);
    const chords = out[0].bars[0].chords;
    expect(chords.map((c) => [c.beat, c.duration])).toEqual([
      [1, 3.5],
      [4.5, 0.5],
    ]);
  });

  it('lasts to the next chord when there is one', () => {
    const two = addChordOnBeat(chart(), 0, 0, 3, 4);
    const out = addChordOnBeat(two, 0, 0, 2.5, 4);
    expect(out[0].bars[0].chords.map((c) => [c.beat, c.duration])).toEqual([
      [1, 1.5],
      [2.5, 0.5],
      [3, 2],
    ]);
  });

  it('leaves a beat that has a chord alone', () => {
    const before = chart();
    expect(addChordOnBeat(before, 0, 0, 1, 4)[0].bars[0]).toBe(
      before[0].bars[0],
    );
  });
});
