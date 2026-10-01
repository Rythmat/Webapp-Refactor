import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import { placeLessonChords } from '@/curriculum/notation/lessonChordSymbols';
import type { ChordTarget } from '@/curriculum/types/activity.v2';

/** Bars to loop: 0-based, both ends included. */
export interface LoopRange {
  startBar: number;
  endBar: number;
}

/** "Loop bar 3", "Loop bars 3–4" (1-based, as the student counts). */
export function loopLabel(loop: LoopRange): string {
  return loop.startBar === loop.endBar
    ? `Loop bar ${loop.startBar + 1}`
    : theoryString('pt.loopHalf', {
        from: loop.startBar + 1,
        to: loop.endBar + 1,
      });
}

export interface LoopableStepContent<
  N extends { onset: number; duration: number },
> {
  targetNotes: readonly N[];
  chordTargets?: readonly ChordTarget[];
  /** Per bar, looping, as the step writes them (placeLessonChords). */
  chordSymbols?: readonly string[];
}

export interface SliceOptions {
  /** Bars added on each side of the loop, inside the step. */
  padBars?: 0 | 1;
  ticksPerBar?: number;
}

export interface SlicedStep<N> extends LoopRange {
  targetNotes: N[];
  chordTargets?: ChordTarget[];
  chordSymbols?: string[];
  /** Bars in the slice, pad included. */
  bars: number;
}

const DEFAULT_TICKS_PER_BAR = 1920;

/** Bars the step's content fills; at least one. */
export function stepBarCount(
  content: LoopableStepContent<{ onset: number; duration: number }>,
  ticksPerBar = DEFAULT_TICKS_PER_BAR,
): number {
  const ends = [
    ...content.targetNotes.map((n) => n.onset + n.duration),
    ...(content.chordTargets ?? []).map((c) => c.onsetTick + c.durationTicks),
  ];
  return Math.max(1, Math.ceil(Math.max(0, ...ends) / ticksPerBar));
}

/**
 * The loop widened by the pad and kept inside the step. It never wraps: a pad
 * before bar 1 or after the last bar is simply dropped.
 */
export function paddedLoopRange(
  loop: LoopRange,
  padBars: 0 | 1,
  stepBars: number,
): LoopRange {
  const last = stepBars - 1;
  const startBar = Math.min(Math.max(0, loop.startBar), last);
  const endBar = Math.min(Math.max(startBar, loop.endBar), last);
  return {
    startBar: Math.max(0, startBar - padBars),
    endBar: Math.min(last, endBar + padBars),
  };
}

/**
 * The part of a step a practice loop plays, re-based to tick 0: the notes and
 * chord targets whose onset falls inside the (padded) bars, their lengths
 * cut at the loop's end, and the chord symbols over those bars. Notes still
 * ringing from before the loop are left out — the loop starts on its own
 * downbeat.
 */
export function sliceStepForLoop<N extends { onset: number; duration: number }>(
  content: LoopableStepContent<N>,
  loop: LoopRange,
  { padBars = 0, ticksPerBar = DEFAULT_TICKS_PER_BAR }: SliceOptions = {},
): SlicedStep<N> {
  const stepBars = stepBarCount(content, ticksPerBar);
  const range = paddedLoopRange(loop, padBars, stepBars);
  const start = range.startBar * ticksPerBar;
  const end = (range.endBar + 1) * ticksPerBar;
  const inside = (tick: number) => tick >= start && tick < end;

  const targetNotes = content.targetNotes
    .filter((n) => inside(n.onset))
    .map((n) => ({
      ...n,
      onset: n.onset - start,
      duration: Math.min(n.duration, end - n.onset),
    }));

  const chordTargets = content.chordTargets
    ?.filter((c) => inside(c.onsetTick))
    .map((c) => ({
      ...c,
      onsetTick: c.onsetTick - start,
      durationTicks: Math.min(c.durationTicks, end - c.onsetTick),
    }));

  // Placed over the whole step exactly as the lesson places them, so a step
  // with more symbols than bars keeps the ones drawn over the loop.
  const chordSymbols = content.chordSymbols
    ? placeLessonChords(content.chordSymbols, {
        bars: stepBars,
        ticksPerBar,
        onsets: [...new Set(content.targetNotes.map((n) => n.onset))].sort(
          (a, b) => a - b,
        ),
        ...(content.targetNotes.length
          ? {
              contentEndTick: Math.max(
                ...content.targetNotes.map((n) => n.onset + n.duration),
              ),
            }
          : {}),
      })
        .filter((chord) => inside(chord.startTick))
        .map((chord) => chord.label)
    : undefined;

  return {
    ...range,
    bars: range.endBar - range.startBar + 1,
    targetNotes,
    ...(chordTargets ? { chordTargets } : {}),
    ...(chordSymbols ? { chordSymbols } : {}),
  };
}
