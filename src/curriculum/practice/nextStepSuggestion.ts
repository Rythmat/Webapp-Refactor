import type {
  AssessmentResult,
  TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import { SPEED_LADDER_DEFAULTS } from './practiceDefaults';
import { loopLabel, type LoopRange } from './sliceStepForLoop';

export type MistakeKind = 'missed' | 'wrong' | 'early' | 'late' | 'unclear';

/**
 * A hit this far off the beat is marked early or late: a sixteenth. Finer
 * than that is the spread of a strum across six strings, not the student's
 * timing.
 */
export const EARLY_LATE_TOLERANCE_TICKS = 120;

const DEFAULT_TICKS_PER_BAR = 1920;
/** A suggested loop steps this far below the tempo of the take. */
const SUGGESTION_SLOWDOWN_PCT = 10;

/** What went wrong with a target, or null for a clean hit. */
export function outcomeMistake(
  outcome: TargetOutcome,
  toleranceTicks = EARLY_LATE_TOLERANCE_TICKS,
): MistakeKind | null {
  if (outcome.status !== 'hit') return outcome.status;
  const dev = outcome.timingDevTicks;
  if (dev === undefined || Math.abs(dev) <= toleranceTicks) return null;
  return dev < 0 ? 'early' : 'late';
}

export interface NextStepSuggestion {
  label: string;
  loop: LoopRange;
  /** Ladder percent to loop at. */
  pct: number;
}

/**
 * The one concrete thing to do after a take: loop the two bars where the most
 * targets were missed or played wrong (the earliest pair on a tie), slower.
 * Early and late hits only break ties, or choose the bars when every target
 * landed. After a full-tempo take the loop starts at the ladder's start;
 * after a slower one, ten points below it, never under the start. Unclear
 * targets don't count — looping them fixes nothing — and a take that couldn't
 * be heard, or was self-reported, gets no suggestion.
 */
export function nextStepSuggestion(
  result: AssessmentResult,
  {
    bars,
    tempoPct,
    ticksPerBar = DEFAULT_TICKS_PER_BAR,
  }: { bars: number; tempoPct: number; ticksPerBar?: number },
): NextStepSuggestion | null {
  if (result.unclear || result.selfReported || !result.outcomes) return null;
  if (bars < 1) return null;

  const wrongPerBar = new Array<number>(bars).fill(0);
  const offBeatPerBar = new Array<number>(bars).fill(0);
  for (const outcome of result.outcomes) {
    const kind = outcomeMistake(outcome);
    const bar = Math.floor(outcome.onsetTick / ticksPerBar);
    if (!kind || kind === 'unclear' || bar < 0 || bar >= bars) continue;
    const perBar =
      kind === 'early' || kind === 'late' ? offBeatPerBar : wrongPerBar;
    perBar[bar]++;
  }

  const span = Math.min(2, bars);
  const inWindow = (perBar: number[], startBar: number) =>
    perBar.slice(startBar, startBar + span).reduce((a, b) => a + b, 0);
  let best = { startBar: 0, wrong: 0, offBeat: 0 };
  for (let startBar = 0; startBar + span <= bars; startBar++) {
    const wrong = inWindow(wrongPerBar, startBar);
    const offBeat = inWindow(offBeatPerBar, startBar);
    if (
      wrong > best.wrong ||
      (wrong === best.wrong && offBeat > best.offBeat)
    ) {
      best = { startBar, wrong, offBeat };
    }
  }
  if (best.wrong + best.offBeat === 0) return null;

  const { startPct, targetPct } = SPEED_LADDER_DEFAULTS;
  const pct =
    tempoPct >= targetPct
      ? startPct
      : Math.max(startPct, tempoPct - SUGGESTION_SLOWDOWN_PCT);
  const loop = { startBar: best.startBar, endBar: best.startBar + span - 1 };
  return { label: `${loopLabel(loop)} at ${pct}%`, loop, pct };
}
