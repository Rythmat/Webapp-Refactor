import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import {
  chartBarCount,
  measureEditPatch,
  type MeasureEditState,
} from '../measureEdits';

// ── + Measure and − Measure ────────────────────────────────────────────────
// One edit to everything on a bar, in the project's metre. They used to
// shift the chord lane alone by a 4/4 bar, leaving sections, repeats, rests,
// fermatas, breaks and the melody behind (leadsheet-07, prism-ui-21).

const BAR_68 = 1440; // 6/8
const ts68 = { numerator: 6, denominator: 8 };

const chord = (id: string, from: number, to: number): ChordRegion => ({
  id,
  startTick: from * BAR_68,
  endTick: to * BAR_68,
  name: id,
  noteName: id,
  color: [1, 2, 3],
});

const note = (startTick: number, durationTicks = 240): MidiNoteEvent => ({
  id: `n${startTick}`,
  note: 72,
  velocity: 90,
  startTick,
  durationTicks,
  channel: 0,
});

const melody = {
  id: 'mel',
  midiClips: [
    // A clip at bar 1 with a note in bar 1 and one in bar 3.
    {
      id: 'm1',
      startTick: BAR_68,
      events: [note(0), note(2 * BAR_68 + 240)],
    },
  ],
} as unknown as Track;

/** Eight bars of 6/8 with something on nearly every bar-indexed field. */
function state(over: Partial<MeasureEditState> = {}): MeasureEditState {
  return {
    timeSignatureNumerator: 6,
    timeSignatureDenominator: 8,
    chordRegions: [chord('A', 0, 2), chord('B', 2, 4), chord('C', 4, 8)],
    leadSheetBars: null,
    sections: [
      {
        id: 'verse',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 4 * BAR_68,
      },
      {
        id: 'chorus',
        type: 'chorus',
        label: 'Chorus',
        startTick: 4 * BAR_68,
        endTick: 8 * BAR_68,
      },
    ],
    leadSheetRepeats: [{ startMeasure: 4, endMeasure: 7 }],
    measureRestMap: { 2: 2 },
    measureFermatas: [7],
    measureRowSizes: [3, 4],
    scoreSystemBreaks: [4],
    scorePageBreaks: [6],
    scoreSystemRuns: [[4, 4]],
    scoreTextMarks: [{ id: 't', measureIdx: 5, kind: 'text', text: 'rit.' }],
    markers: [{ id: 'mk', tick: 5 * BAR_68, name: 'Solo', color: '#fff' }],
    tracks: [melody],
    remoteUsers: new Map(),
    ...over,
  };
}

describe('inserting a bar in 6/8', () => {
  const patch = measureEditPatch(state(), 3, 1, 'mel')!;

  it('moves the chords by a 6/8 bar, and a chord across the insert grows', () => {
    expect(
      patch.chordRegions!.map((r) => [r.id, r.startTick, r.endTick]),
    ).toEqual([
      ['A', 0, 2 * BAR_68],
      // B covers bars 2–3: the new bar 3 lands inside it.
      ['B', 2 * BAR_68, 5 * BAR_68],
      ['C', 5 * BAR_68, 9 * BAR_68],
    ]);
  });

  it('moves every bar-indexed mark at or after it', () => {
    // The verse holds bar 3, so it is a bar longer; the chorus moves on.
    expect(patch.sections!.map((x) => [x.id, x.startTick, x.endTick])).toEqual([
      ['verse', 0, 5 * BAR_68],
      ['chorus', 5 * BAR_68, 9 * BAR_68],
    ]);
    expect(patch.leadSheetRepeats).toEqual([
      { startMeasure: 5, endMeasure: 8 },
    ]);
    // The rest at bars 2–3 holds the insert point, so it is a bar longer.
    expect(patch.measureRestMap).toEqual({ 2: 3 });
    expect(patch.measureFermatas).toEqual([8]);
    expect(patch.scoreSystemBreaks).toEqual([5]);
    expect(patch.scorePageBreaks).toEqual([7]);
    expect(patch.scoreSystemRuns).toEqual([[5, 4]]);
    expect(patch.scoreTextMarks?.[0].measureIdx).toBe(6);
    expect(patch.markers?.[0].tick).toBe(6 * BAR_68);
  });

  it('adds no chart slot inside a rest, and counts the new length', () => {
    expect(patch.measureRowSizes).toEqual([3, 4]);
    expect(patch.leadSheetBars).toBe(9);
  });

  it('moves the melody the sheet shows with its bars', () => {
    const clip = patch.tracks!.find((t) => t.id === 'mel')!.midiClips[0];
    expect(clip.startTick).toBe(BAR_68);
    // The note in bar 3 (song tick 3 bars + 240) is now in bar 4.
    expect(clip.events.map((e) => clip.startTick + e.startTick)).toEqual([
      BAR_68,
      4 * BAR_68 + 240,
    ]);
  });
});

describe('deleting bars', () => {
  it('pulls everything after them back and drops what was on them', () => {
    const patch = measureEditPatch(state(), 4, -1, 'mel')!;
    expect(
      patch.chordRegions!.map((r) => [r.id, r.startTick, r.endTick]),
    ).toEqual([
      ['A', 0, 2 * BAR_68],
      ['B', 2 * BAR_68, 4 * BAR_68],
      ['C', 4 * BAR_68, 7 * BAR_68],
    ]);
    // The chorus loses the deleted bar, its first, and keeps the rest.
    expect(patch.sections!.map((x) => [x.id, x.startTick, x.endTick])).toEqual([
      ['verse', 0, 4 * BAR_68],
      ['chorus', 4 * BAR_68, 7 * BAR_68],
    ]);
    expect(patch.leadSheetRepeats).toEqual([
      { startMeasure: 4, endMeasure: 6 },
    ]);
    expect(patch.measureFermatas).toEqual([6]);
    expect(patch.scoreTextMarks?.[0].measureIdx).toBe(4);
    expect(patch.markers?.[0].tick).toBe(4 * BAR_68);
    expect(patch.leadSheetBars).toBe(7);
    // Bar 4 was a slot of the second row.
    expect(patch.measureRowSizes).toEqual([3, 3]);
  });

  it('shortens a rest it cuts into and cuts a note sounding into the bars', () => {
    const patch = measureEditPatch(
      state({
        tracks: [
          {
            ...melody,
            midiClips: [
              { id: 'm', startTick: 0, events: [note(BAR_68 - 240, 480)] },
            ],
          } as Track,
        ],
      }),
      1,
      -2,
      'mel',
    )!;
    // The rest at bars 2–3 loses bar 2 and starts at bar 1.
    expect(patch.measureRestMap).toEqual({ 1: 1 });
    const [cut] = patch.tracks![0].midiClips[0].events;
    expect([cut.startTick, cut.durationTicks]).toEqual([BAR_68 - 240, 240]);
  });

  it('never deletes the last bar, nor past the end', () => {
    expect(measureEditPatch(state(), 8, -1)).toBeNull();
    const one = state({
      chordRegions: [chord('A', 0, 1)],
      leadSheetBars: 1,
      sections: [],
      measureRestMap: null,
      measureFermatas: null,
      measureRowSizes: null,
    });
    // A blank chart shows four bars: three can go, the fourth stays.
    expect(measureEditPatch(one, 0, -4)?.leadSheetBars).toBe(1);
  });

  it('counts the bars the song’s sections cover as the chart’s (2.13)', () => {
    // The verse and chorus run to bar 8; the chords stop there too, but a
    // section past them keeps its bars on the chart.
    const longer = state({
      chordRegions: [chord('A', 0, 2)],
      sections: [
        {
          id: 'outro',
          type: 'outro',
          label: 'Outro',
          startTick: 0,
          endTick: 12 * BAR_68,
        },
      ],
    });
    expect(
      chartBarCount(longer.chordRegions, null, ts68, longer.sections),
    ).toBe(12);
    // Deleting the last two bars leaves ten.
    expect(measureEditPatch(longer, 10, -2)?.leadSheetBars).toBe(10);
  });
});

describe('adding bars at the end', () => {
  it('grows the chart past its last chord, the chords as they were', () => {
    const s = state({ measureRestMap: null, measureRowSizes: null });
    const patch = measureEditPatch(s, Number.POSITIVE_INFINITY, 2)!;
    expect(patch.chordRegions).toEqual(s.chordRegions);
    expect(patch.leadSheetBars).toBe(10);
    expect(
      chartBarCount(patch.chordRegions!, patch.leadSheetBars!, {
        numerator: 6,
        denominator: 8,
      }),
    ).toBe(10);
  });

  it('puts the new bars in the last row of the chart', () => {
    const patch = measureEditPatch(
      state({ measureRestMap: null }),
      Number.POSITIVE_INFINITY,
      1,
    )!;
    expect(patch.measureRowSizes).toEqual([3, 5]);
  });
});

it('leaves a melody a collaborator holds alone', () => {
  const patch = measureEditPatch(
    state({
      remoteUsers: new Map([
        ['peer', { selectedTrackId: 'mel' }],
      ]) as unknown as MeasureEditState['remoteUsers'],
    }),
    0,
    1,
    'mel',
  )!;
  expect(patch.tracks).toBeUndefined();
  expect(patch.sections?.[0].startTick).toBe(BAR_68);
});

describe("the chart's rows when several bars go in", () => {
  // Rows of three slots (bars 1, 2 and the rest at 3–4) and four (bars
  // 5–8): bar 5 (index 4) starts the second row.
  const rows = (at: number, count: number) =>
    measureEditPatch(state(), at, count)!.measureRowSizes;

  it('puts one bar, + Measure, in the row it lands in, as before', () => {
    expect(rows(4, 1)).toEqual([3, 5]);
    expect(rows(5, 1)).toEqual([3, 5]);
    expect(rows(0, 1)).toEqual([4, 4]);
  });

  it('puts several bars between two rows in rows of their own, the last one holding what is left', () => {
    expect(rows(4, 8)).toEqual([3, 4, 4, 4]);
    expect(rows(4, 6)).toEqual([3, 4, 2, 4]);
    expect(rows(0, 2)).toEqual([2, 3, 4]);
  });

  it('widens the row when several bars go in inside it', () => {
    expect(rows(5, 6)).toEqual([3, 10]);
    // Inside the rest, no slot is added.
    expect(rows(3, 4)).toEqual([3, 4]);
  });
});
