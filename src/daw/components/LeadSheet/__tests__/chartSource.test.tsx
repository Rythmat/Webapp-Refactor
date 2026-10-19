// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SongSection } from '@/daw/model/sections';
import { useStore, type AllSlices } from '@/daw/store';
import { chartSourceOf, useStudioChartSource } from '../SendToSetList';
import { chartFromStudio } from '../toSetListChart';

// ── The set list gets the chart the sheet draws (milestone 2.13) ───────────
// The chord chart runs past its last chord to the end of the song's sections
// (chartExtraBars). Both of the set list's sources left that out, so a
// Chorus drawn after the last chord was dropped from the copy.

const BAR = 1920;

const sec = (
  id: string,
  label: string,
  type: SongSection['type'],
  from: number,
  to: number,
): SongSection => ({
  id,
  label,
  type,
  startTick: from * BAR,
  endTick: to * BAR,
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    // Four bars of chords; the Chorus runs on, chordless, to bar 12.
    chordRegions: Array.from({ length: 4 }, (_, i) => ({
      id: `c${i}`,
      startTick: i * BAR,
      endTick: (i + 1) * BAR,
      name: '1 maj',
      noteName: 'C maj',
      color: [1, 1, 1] as [number, number, number],
    })),
    sections: [
      sec('v', 'Verse', 'verse', 0, 4),
      sec('c', 'Chorus', 'chorus', 4, 12),
    ],
    leadSheetBars: null,
    measureRestMap: null,
  } as Partial<AllSlices>);
});

afterEach(cleanup);

const shape = (source: Parameters<typeof chartFromStudio>[0]) =>
  chartFromStudio(source).sections.map((s) => [s.label, s.bars.length]);

describe('the chart sent to a set list', () => {
  it('runs as far as the sections, read off the store at once', () => {
    expect(shape(chartSourceOf(useStore.getState()))).toEqual([
      ['Verse', 4],
      ['Chorus', 8],
    ]);
  });

  it('runs as far as the sections, read by the send dialog', () => {
    const { result } = renderHook(() => useStudioChartSource());
    expect(shape(result.current)).toEqual([
      ['Verse', 4],
      ['Chorus', 8],
    ]);
  });

  it('keeps bars added past the last chord', () => {
    useStore.setState({
      sections: [],
      leadSheetBars: 6,
    } as Partial<AllSlices>);
    expect(shape(chartSourceOf(useStore.getState()))).toEqual([['', 6]]);
  });
});
