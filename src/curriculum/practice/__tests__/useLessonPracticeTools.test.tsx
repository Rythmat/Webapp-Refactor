// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import type { ChordTarget } from '@/curriculum/types/activity.v2';
import {
  ladderAfterPass,
  loopPresets,
  speedLadderText,
  useLessonPracticeTools,
  type SpeedLadderState,
  type UseLessonPracticeToolsOptions,
} from '../useLessonPracticeTools';

afterEach(cleanup);

const CLEAN: AssessmentResult = {
  passed: true,
  pitchAccuracy: 1,
  timingAccuracy: 1,
  durationAccuracy: null,
  overallScore: 1,
  missedNotes: [],
  wrongNotes: [],
  xpEarned: 0,
  skillTagsEarned: [],
  feedbackText: '',
  outcomes: [],
};
const MESSY: AssessmentResult = {
  ...CLEAN,
  passed: false,
  pitchAccuracy: 0.5,
  overallScore: 0.4,
};
const UNHEARD: AssessmentResult = { ...MESSY, unclear: true };

const LADDER_ON: SpeedLadderState = {
  enabled: true,
  currentPct: 70,
  cleanStreak: 0,
  nonCleanStreak: 0,
  lastStep: null,
};

function mapStep(key: string, example: number) {
  const step = buildGuitarAppliedTheoryFundamentalsFlow(key)
    .sections.flatMap((s) => s.steps)
    .find((s) => s.tag.startsWith(`guitar_fund:music_map_ex${example} `));
  if (!step) throw new Error(`no map ${key} ${example}`);
  return step;
}

function renderTools(over: Partial<UseLessonPracticeToolsOptions> = {}) {
  return renderHook(
    (props: UseLessonPracticeToolsOptions) => useLessonPracticeTools(props),
    {
      initialProps: { baseTempo: 100, barsInStep: 4, ...over },
    },
  );
}

describe('speed ladder', () => {
  it('steps up after two clean passes, and never past 100%', () => {
    let ladder = ladderAfterPass(LADDER_ON, true);
    expect(ladder).toMatchObject({ currentPct: 70, cleanStreak: 1 });
    ladder = ladderAfterPass(ladder, true);
    expect(ladder).toMatchObject({
      currentPct: 75,
      cleanStreak: 0,
      lastStep: 'up',
    });

    ladder = { ...LADDER_ON, currentPct: 100, cleanStreak: 1 };
    expect(ladderAfterPass(ladder, true).currentPct).toBe(100);
  });

  it('a pass that is not clean breaks the clean streak', () => {
    const ladder = ladderAfterPass({ ...LADDER_ON, cleanStreak: 1 }, false);
    expect(ladder).toMatchObject({ cleanStreak: 0, nonCleanStreak: 1 });
  });

  it('steps back after three passes that are not clean, never below 70%', () => {
    let ladder: SpeedLadderState = { ...LADDER_ON, currentPct: 85 };
    for (let i = 0; i < 3; i++) ladder = ladderAfterPass(ladder, false);
    expect(ladder).toMatchObject({
      currentPct: 80,
      nonCleanStreak: 0,
      lastStep: 'back',
    });

    ladder = LADDER_ON;
    for (let i = 0; i < 3; i++) ladder = ladderAfterPass(ladder, false);
    expect(ladder).toMatchObject({ currentPct: 70, lastStep: null });
  });

  it('keeps the slowing-down line until the ladder moves up again', () => {
    let ladder: SpeedLadderState = { ...LADDER_ON, currentPct: 80 };
    for (let i = 0; i < 3; i++) ladder = ladderAfterPass(ladder, false);
    ladder = ladderAfterPass(ladder, true);
    expect(ladder.lastStep).toBe('back');
    ladder = ladderAfterPass(ladder, true);
    expect(ladder).toMatchObject({ currentPct: 80, lastStep: 'up' });
  });

  it('shows the rule with its progress', () => {
    expect(speedLadderText({ ...LADDER_ON, cleanStreak: 1 })).toBe(
      '70% → 75% after 2 clean passes · 1/2',
    );
    expect(speedLadderText({ ...LADDER_ON, currentPct: 95 })).toBe(
      '95% → 100% after 2 clean passes · 0/2',
    );
    expect(speedLadderText({ ...LADDER_ON, currentPct: 100 })).toBe(
      '100% · full tempo',
    );
    // Off, it previews the climb from the start.
    expect(
      speedLadderText({ ...LADDER_ON, enabled: false, currentPct: 90 }),
    ).toBe('70% → 75% after 2 clean passes · 0/2');
  });
});

describe('loop presets', () => {
  it('offers one pass of a map played twice, and halves of a four-bar map', () => {
    const step = mapStep('C', 4);
    const presets = loopPresets({
      barsInStep: 8,
      passes: 2,
      chordTargets: step.chordTargets,
    });
    expect(presets.map((p) => [p.id, p.label, p.loop])).toEqual([
      ['whole-pass', 'Loop one pass of the map', { startBar: 0, endBar: 3 }],
      ['first-half', 'Loop bars 1–2', { startBar: 0, endBar: 1 }],
      ['second-half', 'Loop bars 3–4', { startBar: 2, endBar: 3 }],
    ]);
  });

  it('finds tricky changes, including the one across the repeat', () => {
    // D Ex4 (A, Bm, D, Gmaj7): A → Bm, and Gmaj7 → A across the repeat.
    const step = mapStep('D', 4);
    const tricky = loopPresets({
      barsInStep: 8,
      passes: 2,
      chordTargets: step.chordTargets,
    }).filter((p) => p.id === 'tricky-change');
    expect(tricky).toEqual([
      {
        id: 'tricky-change',
        label: 'Tricky change: A → Bm. Loop these two bars at 70%?',
        loop: { startBar: 0, endBar: 1 },
        pct: 70,
      },
      {
        id: 'tricky-change',
        label: 'Tricky change: Gmaj7 → A. Loop these two bars at 70%?',
        loop: { startBar: 3, endBar: 4 },
        pct: 70,
      },
    ]);
  });

  it('has no tricky change where every change shares a note', () => {
    // G Ex4: Gmaj7, Em7, Am7, D7.
    const step = mapStep('G', 4);
    expect(
      loopPresets({ barsInStep: 8, passes: 2, chordTargets: step.chordTargets })
        .map((p) => p.id)
        .includes('tricky-change'),
    ).toBe(false);
  });

  it('loops two bars for a change inside one bar, and none in a one-bar step', () => {
    const target = (symbol: string, pcs: number[], onsetTick: number) =>
      ({
        rootPc: pcs[0],
        quality: 'major',
        pitchClasses: pcs,
        bassPc: pcs[0],
        onsetTick,
        durationTicks: 460,
        symbol,
        shapeId: symbol,
        attack: 'strum',
      }) satisfies ChordTarget;
    const chords = [target('C', [0, 4, 7], 0), target('Dm', [2, 5, 9], 480)];
    expect(
      loopPresets({ barsInStep: 2, chordTargets: chords }).map((p) => p.loop),
    ).toEqual([{ startBar: 0, endBar: 1 }]);
    expect(loopPresets({ barsInStep: 1, chordTargets: chords })).toEqual([]);
    // A single pass: its last → first change isn't offered.
    const late = [target('C', [0, 4, 7], 1920), target('Dm', [2, 5, 9], 2400)];
    expect(
      loopPresets({ barsInStep: 2, chordTargets: late }).map((p) => p.loop),
    ).toEqual([{ startBar: 0, endBar: 1 }]);
  });
});

describe('useLessonPracticeTools', () => {
  it('starts with no loop and the ladder off at full tempo', () => {
    const { result } = renderTools({ baseTempo: 90 });
    expect(result.current).toMatchObject({
      loop: null,
      padBars: 0,
      passCount: 0,
      effectiveTempo: 90,
      ladderText: '70% → 75% after 2 clean passes · 0/2',
    });
    expect(result.current.ladder.enabled).toBe(false);
  });

  it('sets, orders and clears the loop and pad', () => {
    const { result } = renderTools();
    act(() => result.current.setLoop({ startBar: 3, endBar: 1 }));
    expect(result.current.loop).toEqual({ startBar: 1, endBar: 3 });
    act(() => result.current.setPad(1));
    expect(result.current.padBars).toBe(1);
    act(() => result.current.clearLoop());
    expect(result.current.loop).toBeNull();
  });

  it('climbs the ladder from practice passes and sets the tempo', () => {
    const { result } = renderTools({
      baseTempo: 100,
      assessment: 'pitch_order_timing',
    });
    act(() => result.current.toggleLadder());
    expect(result.current.effectiveTempo).toBe(70);
    act(() => result.current.onPracticePass(CLEAN));
    expect(result.current.ladderText).toBe(
      '70% → 75% after 2 clean passes · 1/2',
    );
    act(() => result.current.onPracticePass(CLEAN));
    expect(result.current.effectiveTempo).toBe(75);
    expect(result.current.passCount).toBe(2);
  });

  it("holds each pass to the step's own pass mark", () => {
    // Clean in time (60%), short of the 75% out of time.
    const fair = { ...CLEAN, pitchAccuracy: 0.9, overallScore: 0.65 };
    const inTime = renderTools({ assessment: 'pitch_order_timing' });
    act(() => inTime.result.current.toggleLadder());
    act(() => inTime.result.current.onPracticePass(fair));
    expect(inTime.result.current.ladder.cleanStreak).toBe(1);

    const outOfTime = renderTools({ assessment: 'pitch_only' });
    act(() => outOfTime.result.current.toggleLadder());
    act(() => outOfTime.result.current.onPracticePass(fair));
    expect(outOfTime.result.current.ladder).toMatchObject({
      cleanStreak: 0,
      nonCleanStreak: 1,
    });
  });

  it("doesn't move the ladder on a pass it couldn't hear", () => {
    const { result } = renderTools();
    act(() => result.current.toggleLadder());
    act(() => result.current.onPracticePass(CLEAN));
    act(() => result.current.onPracticePass(UNHEARD));
    expect(result.current.ladder.cleanStreak).toBe(1);
    expect(result.current.passCount).toBe(2);
    act(() => result.current.onPracticePass(MESSY));
    expect(result.current.ladder).toMatchObject({
      cleanStreak: 0,
      nonCleanStreak: 1,
    });
  });

  it('counts passes with the ladder off without moving it', () => {
    const { result } = renderTools();
    act(() => result.current.onPracticePass(CLEAN));
    act(() => result.current.onPracticePass(CLEAN));
    expect(result.current.passCount).toBe(2);
    expect(result.current.ladder.cleanStreak).toBe(0);
    expect(result.current.effectiveTempo).toBe(100);
  });

  it('clamps the tempo to 40–200', () => {
    const slow = renderTools({ baseTempo: 50 });
    act(() => slow.result.current.toggleLadder());
    expect(slow.result.current.effectiveTempo).toBe(40);
    expect(renderTools({ baseTempo: 240 }).result.current.effectiveTempo).toBe(
      200,
    );
  });

  it('starts the ladder where a preset or suggestion asks', () => {
    const { result } = renderTools({ baseTempo: 80 });
    act(() => result.current.setLoop({ startBar: 1, endBar: 2 }, 85));
    expect(result.current.ladder).toMatchObject({
      enabled: true,
      currentPct: 85,
    });
    expect(result.current.effectiveTempo).toBe(68);
    act(() => result.current.setLoop({ startBar: 0, endBar: 1 }, 20));
    expect(result.current.ladder.currentPct).toBe(70);
  });

  it('restarts the ladder from 70% on reset and toggle', () => {
    const { result } = renderTools();
    act(() => result.current.setLoop({ startBar: 0, endBar: 1 }, 90));
    act(() => result.current.resetLadder());
    expect(result.current.ladder).toMatchObject({
      enabled: true,
      currentPct: 70,
    });
    act(() => result.current.toggleLadder());
    expect(result.current.ladder.enabled).toBe(false);
    expect(result.current.effectiveTempo).toBe(100);
  });

  it('a new loop restarts the pass count and the streaks', () => {
    const { result } = renderTools();
    act(() => result.current.toggleLadder());
    act(() => result.current.onPracticePass(CLEAN));
    act(() => result.current.setLoop({ startBar: 2, endBar: 3 }));
    expect(result.current.passCount).toBe(0);
    expect(result.current.ladder.cleanStreak).toBe(0);
  });

  it('clears everything when the reset key changes', () => {
    const { result, rerender } = renderTools({ resetKey: 'a' });
    act(() => result.current.setLoop({ startBar: 1, endBar: 2 }, 80));
    act(() => result.current.setPad(1));
    rerender({ baseTempo: 100, barsInStep: 4, resetKey: 'b' });
    expect(result.current).toMatchObject({
      loop: null,
      padBars: 0,
      passCount: 0,
    });
    expect(result.current.ladder.enabled).toBe(false);
  });

  it('drops a loop that runs past the step', () => {
    const { result, rerender } = renderTools();
    act(() => result.current.setLoop({ startBar: 2, endBar: 3 }));
    rerender({ baseTempo: 100, barsInStep: 2 });
    expect(result.current.loop).toBeNull();
  });

  it('lists the presets for the step', () => {
    const step = mapStep('C', 3);
    const { result } = renderTools({
      barsInStep: 4,
      passes: 2,
      chordTargets: step.chordTargets,
    });
    expect(result.current.presets.map((p) => [p.id, p.loop])).toEqual([
      ['whole-pass', { startBar: 0, endBar: 1 }],
      ['tricky-change', { startBar: 0, endBar: 1 }],
      ['tricky-change', { startBar: 1, endBar: 2 }],
    ]);
  });
});
