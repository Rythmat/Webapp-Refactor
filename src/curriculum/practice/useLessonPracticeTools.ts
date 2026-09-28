import { useCallback, useMemo, useReducer, useState } from 'react';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import type { AssessmentType } from '@/curriculum/types/activity';
import type { ChordTarget } from '@/curriculum/types/activity.v2';
import {
  SPEED_LADDER_DEFAULTS,
  isCleanPass,
  type LoopPresetId,
} from './practiceDefaults';
import type { LoopRange } from './sliceStepForLoop';

// ── Lesson practice tools ──────────────────────────────────────────────────
// Loop bars, the speed-trainer ladder and a pass counter for one step. The
// container restarts practice after each looped pass, scores it silently and
// hands the result to onPracticePass; those passes never reach progress.

/** The lesson's tempo limits, as GenreLessonContainerV2 clamps them. */
const MIN_TEMPO = 40;
const MAX_TEMPO = 200;
const DEFAULT_TICKS_PER_BAR = 1920;

export interface SpeedLadderState {
  enabled: boolean;
  /** Percent of the step's tempo the loop plays at. */
  currentPct: number;
  cleanStreak: number;
  nonCleanStreak: number;
  /** The ladder's last move; 'back' shows the slowing-down line. */
  lastStep: 'up' | 'back' | null;
}

export interface PracticeToolsState {
  loop: LoopRange | null;
  padBars: 0 | 1;
  ladder: SpeedLadderState;
  /** Practice passes since the loop was set. */
  passCount: number;
}

export interface LoopPreset {
  id: LoopPresetId;
  label: string;
  loop: LoopRange;
  /** Tempo percent the preset suggests; none keeps the ladder as it is. */
  pct?: number;
}

export interface UseLessonPracticeToolsOptions {
  /** The step's tempo: 100% on the ladder. */
  baseTempo: number;
  barsInStep: number;
  chordTargets?: readonly ChordTarget[];
  /** Times the step plays its material: a Music Map step plays it twice. */
  passes?: number;
  /** Sets the pass mark a clean pass must meet. */
  assessment?: AssessmentType;
  /** A new value (another step or activity) clears every tool. */
  resetKey?: string | number;
  ticksPerBar?: number;
}

export interface LessonPracticeTools extends PracticeToolsState {
  /** baseTempo at the ladder's percent (100% when it is off), 40–200. */
  effectiveTempo: number;
  ladderText: string;
  presets: LoopPreset[];
  /** Null clears. With `pct`, the ladder starts there (a preset, a suggestion). */
  setLoop: (loop: LoopRange | null, pct?: number) => void;
  clearLoop: () => void;
  setPad: (padBars: 0 | 1) => void;
  toggleLadder: () => void;
  resetLadder: () => void;
  /** After each silently scored looped practice pass. */
  onPracticePass: (result: AssessmentResult) => void;
}

const LADDER_START: SpeedLadderState = {
  enabled: false,
  currentPct: SPEED_LADDER_DEFAULTS.startPct,
  cleanStreak: 0,
  nonCleanStreak: 0,
  lastStep: null,
};

const INITIAL_STATE: PracticeToolsState = {
  loop: null,
  padBars: 0,
  ladder: LADDER_START,
  passCount: 0,
};

const clampPct = (pct: number) =>
  Math.min(
    SPEED_LADDER_DEFAULTS.targetPct,
    Math.max(SPEED_LADDER_DEFAULTS.startPct, pct),
  );

/** A step up or back, kept within start and target. */
function moveTo(ladder: SpeedLadderState, pct: number): SpeedLadderState {
  const currentPct = clampPct(pct);
  return {
    ...ladder,
    currentPct,
    cleanStreak: 0,
    nonCleanStreak: 0,
    lastStep:
      currentPct > ladder.currentPct
        ? 'up'
        : currentPct < ladder.currentPct
          ? 'back'
          : ladder.lastStep,
  };
}

/**
 * The ladder after one pass: up a step after enough clean passes in a row,
 * back a step after enough that weren't, always within start and target.
 */
export function ladderAfterPass(
  ladder: SpeedLadderState,
  clean: boolean,
): SpeedLadderState {
  const { stepPct, stepBackPct, cleanPassesToStepUp, stepBackAfterNonClean } =
    SPEED_LADDER_DEFAULTS;
  if (clean) {
    const cleanStreak = ladder.cleanStreak + 1;
    return cleanStreak >= cleanPassesToStepUp
      ? moveTo(ladder, ladder.currentPct + stepPct)
      : { ...ladder, cleanStreak, nonCleanStreak: 0 };
  }
  const nonCleanStreak = ladder.nonCleanStreak + 1;
  return nonCleanStreak >= stepBackAfterNonClean
    ? moveTo(ladder, ladder.currentPct - stepBackPct)
    : { ...ladder, cleanStreak: 0, nonCleanStreak };
}

/** The rule on screen, e.g. "70% → 75% after 2 clean passes · 1/2". */
export function speedLadderText(ladder: SpeedLadderState): string {
  const { startPct, stepPct, targetPct, cleanPassesToStepUp } =
    SPEED_LADDER_DEFAULTS;
  // Off, it previews the climb it would start.
  const from = ladder.enabled ? ladder.currentPct : startPct;
  if (from >= targetPct) return `${targetPct}% · full tempo`;
  return theoryString('pt.ladder', {
    from,
    to: Math.min(targetPct, from + stepPct),
    n: cleanPassesToStepUp,
    done: ladder.enabled ? ladder.cleanStreak : 0,
  });
}

const sharesNoPitchClass = (a: ChordTarget, b: ChordTarget) =>
  !a.pitchClasses.some((pc) => b.pitchClasses.includes(pc));

/**
 * Loops worth offering for a step:
 * - whole-pass: one pass, when the step plays its material more than once;
 * - first-half / second-half: halves of a pass of four bars or more;
 * - tricky-change: the two bars around a change between chords that share no
 *   notes, at the ladder's start. A map played twice includes the change
 *   across its repeat (last bar → first). A single pass has no bar after its
 *   last to loop into, so its wrap is left out.
 */
export function loopPresets({
  barsInStep,
  passes = 1,
  chordTargets = [],
  ticksPerBar = DEFAULT_TICKS_PER_BAR,
}: Pick<
  UseLessonPracticeToolsOptions,
  'barsInStep' | 'passes' | 'chordTargets' | 'ticksPerBar'
>): LoopPreset[] {
  const repeats = passes > 1 && barsInStep % passes === 0;
  const passBars = repeats ? barsInStep / passes : barsInStep;
  const presets: LoopPreset[] = [];

  if (repeats) {
    presets.push({
      id: 'whole-pass',
      label: theoryString('pt.loopWholeMap'),
      loop: { startBar: 0, endBar: passBars - 1 },
    });
  }
  if (passBars >= 4 && passBars % 2 === 0) {
    const half = passBars / 2;
    presets.push(
      {
        id: 'first-half',
        label: theoryString('pt.loopHalf', { from: 1, to: half }),
        loop: { startBar: 0, endBar: half - 1 },
      },
      {
        id: 'second-half',
        label: theoryString('pt.loopHalf', { from: half + 1, to: passBars }),
        loop: { startBar: half, endBar: passBars - 1 },
      },
    );
  }

  // A one-bar step has no two bars to loop: practising it is the loop.
  if (barsInStep < 2) return presets;
  const ordered = [...chordTargets].sort((a, b) => a.onsetTick - b.onsetTick);
  const seen = new Set<string>();
  const barOf = (target: ChordTarget) =>
    Math.floor(target.onsetTick / ticksPerBar);
  for (let i = 0; i + 1 < ordered.length; i++) {
    const [a, b] = [ordered[i], ordered[i + 1]];
    // Later passes repeat the first pass's changes.
    if (barOf(a) >= passBars || !sharesNoPitchClass(a, b)) continue;
    // Two bars at least, even for a change inside one bar.
    const startBar = Math.min(barOf(a), barsInStep - 2);
    const loop = {
      startBar,
      endBar: Math.min(Math.max(barOf(b), startBar + 1), barsInStep - 1),
    };
    const key = `${loop.startBar}-${loop.endBar}`;
    if (seen.has(key)) continue;
    seen.add(key);
    presets.push({
      id: 'tricky-change',
      label: theoryString('pt.tricky', {
        chordA: a.symbol,
        chordB: b.symbol,
        tempo: SPEED_LADDER_DEFAULTS.startPct,
      }),
      loop,
      pct: SPEED_LADDER_DEFAULTS.startPct,
    });
  }
  return presets;
}

type Action =
  | { type: 'reset' }
  | { type: 'setLoop'; loop: LoopRange | null; pct?: number }
  | { type: 'setPad'; padBars: 0 | 1 }
  | { type: 'toggleLadder' }
  | { type: 'resetLadder' }
  /** `clean` null: couldn't hear the pass, so the ladder doesn't move. */
  | { type: 'pass'; clean: boolean | null };

function reducer(
  state: PracticeToolsState,
  action: Action,
): PracticeToolsState {
  switch (action.type) {
    case 'reset':
      return INITIAL_STATE;
    case 'setLoop': {
      const { loop, pct } = action;
      return {
        ...state,
        loop: loop && {
          startBar: Math.min(loop.startBar, loop.endBar),
          endBar: Math.max(loop.startBar, loop.endBar),
        },
        passCount: 0,
        ladder:
          pct === undefined
            ? {
                ...state.ladder,
                cleanStreak: 0,
                nonCleanStreak: 0,
                lastStep: null,
              }
            : { ...LADDER_START, enabled: true, currentPct: clampPct(pct) },
      };
    }
    case 'setPad':
      return { ...state, padBars: action.padBars };
    case 'toggleLadder':
      return {
        ...state,
        ladder: { ...LADDER_START, enabled: !state.ladder.enabled },
      };
    case 'resetLadder':
      return {
        ...state,
        ladder: { ...LADDER_START, enabled: state.ladder.enabled },
      };
    case 'pass':
      return {
        ...state,
        passCount: state.passCount + 1,
        ladder:
          state.ladder.enabled && action.clean !== null
            ? ladderAfterPass(state.ladder, action.clean)
            : state.ladder,
      };
  }
}

export function useLessonPracticeTools({
  baseTempo,
  barsInStep,
  chordTargets,
  passes = 1,
  assessment = 'pitch_only',
  resetKey,
  ticksPerBar = DEFAULT_TICKS_PER_BAR,
}: UseLessonPracticeToolsOptions): LessonPracticeTools {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Reset while rendering, so the new step never sees the last one's loop.
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    dispatch({ type: 'reset' });
  }

  const setLoop = useCallback(
    (loop: LoopRange | null, pct?: number) =>
      dispatch({ type: 'setLoop', loop, pct }),
    [],
  );
  const clearLoop = useCallback(
    () => dispatch({ type: 'setLoop', loop: null }),
    [],
  );
  const setPad = useCallback(
    (padBars: 0 | 1) => dispatch({ type: 'setPad', padBars }),
    [],
  );
  const toggleLadder = useCallback(
    () => dispatch({ type: 'toggleLadder' }),
    [],
  );
  const resetLadder = useCallback(() => dispatch({ type: 'resetLadder' }), []);
  const onPracticePass = useCallback(
    (result: AssessmentResult) =>
      dispatch({
        type: 'pass',
        clean: result.unclear ? null : isCleanPass(result, assessment),
      }),
    [assessment],
  );

  const presets = useMemo(
    () => loopPresets({ barsInStep, passes, chordTargets, ticksPerBar }),
    [barsInStep, passes, chordTargets, ticksPerBar],
  );

  // A loop past the end of the step (its content changed) no longer applies.
  const loop = state.loop && state.loop.endBar < barsInStep ? state.loop : null;
  const pct = state.ladder.enabled ? state.ladder.currentPct : 100;

  return {
    ...state,
    loop,
    effectiveTempo: Math.min(
      MAX_TEMPO,
      Math.max(MIN_TEMPO, Math.round((baseTempo * pct) / 100)),
    ),
    ladderText: speedLadderText(state.ladder),
    presets,
    setLoop,
    clearLoop,
    setPad,
    toggleLadder,
    resetLadder,
    onPracticePass,
  };
}
