import { describe, expect, it } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { ChordTarget, TargetNote } from '@/curriculum/types/activity.v2';
import {
  loopLabel,
  paddedLoopRange,
  sliceStepForLoop,
  stepBarCount,
} from '../sliceStepForLoop';

const BAR = 1920;

const note = (midi: number, onset: number, duration: number): TargetNote => ({
  midi,
  onset,
  duration,
  fretPosition: { string: 5, fret: 3 },
});

function chord(symbol: string, onsetTick: number, durationTicks: number) {
  return {
    rootPc: 0,
    quality: 'major',
    pitchClasses: [0, 4, 7],
    bassPc: 0,
    onsetTick,
    durationTicks,
    symbol,
    shapeId: `C/triad/${symbol}`,
    attack: 'strum',
  } satisfies ChordTarget;
}

/** Four bars, one whole-bar chord each; the last bar's note rings past it. */
const fourBars = {
  targetNotes: [
    note(48, 0, BAR - 20),
    note(50, BAR, BAR - 20),
    note(52, 2 * BAR, BAR - 20),
    note(53, 3 * BAR, BAR - 20),
  ],
  chordTargets: [
    chord('C', 0, BAR - 20),
    chord('Dm', BAR, BAR - 20),
    chord('Em', 2 * BAR, BAR - 20),
    chord('F', 3 * BAR, BAR - 20),
  ],
  chordSymbols: ['C', 'Dm', 'Em', 'F'],
};

describe('sliceStepForLoop', () => {
  it('re-bases the notes, chord targets and symbols inside the loop', () => {
    const slice = sliceStepForLoop(fourBars, { startBar: 1, endBar: 2 });
    expect(slice).toMatchObject({ startBar: 1, endBar: 2, bars: 2 });
    expect(slice.targetNotes).toEqual([
      note(50, 0, BAR - 20),
      note(52, BAR, BAR - 20),
    ]);
    expect(slice.chordTargets?.map((c) => [c.symbol, c.onsetTick])).toEqual([
      ['Dm', 0],
      ['Em', BAR],
    ]);
    expect(slice.chordSymbols).toEqual(['Dm', 'Em']);
  });

  it('keeps the other note fields', () => {
    const slice = sliceStepForLoop(fourBars, { startBar: 3, endBar: 3 });
    expect(slice.targetNotes[0].fretPosition).toEqual({ string: 5, fret: 3 });
  });

  it('pads a bar on each side', () => {
    const slice = sliceStepForLoop(
      fourBars,
      { startBar: 1, endBar: 1 },
      { padBars: 1 },
    );
    expect(slice).toMatchObject({ startBar: 0, endBar: 2, bars: 3 });
    expect(slice.targetNotes.map((n) => n.onset)).toEqual([0, BAR, 2 * BAR]);
    expect(slice.chordSymbols).toEqual(['C', 'Dm', 'Em']);
  });

  it('never wraps the pad around the step', () => {
    const first = sliceStepForLoop(
      fourBars,
      { startBar: 0, endBar: 0 },
      { padBars: 1 },
    );
    expect(first).toMatchObject({ startBar: 0, endBar: 1, bars: 2 });
    expect(first.chordSymbols).toEqual(['C', 'Dm']);

    const last = sliceStepForLoop(
      fourBars,
      { startBar: 3, endBar: 3 },
      { padBars: 1 },
    );
    expect(last).toMatchObject({ startBar: 2, endBar: 3, bars: 2 });
    expect(last.targetNotes.map((n) => [n.midi, n.onset])).toEqual([
      [52, 0],
      [53, BAR],
    ]);
  });

  it('cuts lengths at the loop end and drops notes that start before it', () => {
    const content = {
      targetNotes: [note(48, 0, 2 * BAR), note(50, BAR - 480, 960)],
    };
    const slice = sliceStepForLoop(content, { startBar: 0, endBar: 0 });
    expect(slice.targetNotes).toEqual([
      note(48, 0, BAR),
      note(50, BAR - 480, 480),
    ]);
    // Still ringing into bar 2, but it started in bar 1: not in bar 2's loop.
    expect(
      sliceStepForLoop(content, { startBar: 1, endBar: 1 }).targetNotes,
    ).toEqual([]);
  });

  it('clips chord targets at the loop end', () => {
    const slice = sliceStepForLoop(
      { targetNotes: [], chordTargets: [chord('C', 960, BAR)] },
      { startBar: 0, endBar: 0 },
    );
    expect(slice.chordTargets).toEqual([chord('C', 960, 960)]);
  });

  it('keeps per-bar symbols looping as the step places them', () => {
    // Two symbols over four bars: C Dm C Dm.
    const slice = sliceStepForLoop(
      { ...fourBars, chordSymbols: ['C', 'Dm'] },
      { startBar: 2, endBar: 3 },
    );
    expect(slice.chordSymbols).toEqual(['C', 'Dm']);
  });

  it('keeps the symbols drawn over the loop when they outnumber the bars', () => {
    // Four chords, a half note each, over two bars.
    const content = {
      targetNotes: [0, 960, 1920, 2880].map((onset, i) =>
        note(48 + i, onset, 940),
      ),
      chordSymbols: ['F', 'Dm', 'C', 'Em'],
    };
    expect(
      sliceStepForLoop(content, { startBar: 1, endBar: 1 }).chordSymbols,
    ).toEqual(['C', 'Em']);
  });

  it('leaves out fields the step has none of', () => {
    const slice = sliceStepForLoop(
      { targetNotes: fourBars.targetNotes },
      { startBar: 0, endBar: 1 },
    );
    expect(slice).not.toHaveProperty('chordTargets');
    expect(slice).not.toHaveProperty('chordSymbols');
  });

  it('slices one pass out of a Music Map played twice', () => {
    const step = buildGuitarAppliedTheoryFundamentalsFlow('C')
      .sections.flatMap((s) => s.steps)
      .find((s) => s.tag.startsWith('guitar_fund:music_map_ex4 '))!;
    const content = {
      targetNotes: step.targetNotes ?? [],
      chordTargets: step.chordTargets,
      chordSymbols: step.chordSymbols,
    };
    expect(stepBarCount(content)).toBe(8);
    const second = sliceStepForLoop(content, { startBar: 4, endBar: 7 });
    const first = sliceStepForLoop(content, { startBar: 0, endBar: 3 });
    expect(second.targetNotes).toEqual(first.targetNotes);
    expect(second.chordTargets).toEqual(first.chordTargets);
    expect(second.chordSymbols).toEqual(['Fmaj7', 'G7', 'Cmaj7', 'Dm7']);
  });
});

describe('loop helpers', () => {
  it('counts the bars the content fills', () => {
    expect(stepBarCount({ targetNotes: [] })).toBe(1);
    expect(stepBarCount(fourBars)).toBe(4);
    expect(
      stepBarCount({ targetNotes: [], chordTargets: [chord('C', BAR, 10)] }),
    ).toBe(2);
  });

  it('keeps a padded loop inside the step', () => {
    expect(paddedLoopRange({ startBar: 2, endBar: 3 }, 1, 8)).toEqual({
      startBar: 1,
      endBar: 4,
    });
    expect(paddedLoopRange({ startBar: 6, endBar: 9 }, 0, 8)).toEqual({
      startBar: 6,
      endBar: 7,
    });
  });

  it('labels loops as the student counts bars', () => {
    expect(loopLabel({ startBar: 2, endBar: 2 })).toBe('Loop bar 3');
    expect(loopLabel({ startBar: 2, endBar: 3 })).toBe('Loop bars 3–4');
  });
});
