// ── The time model ──────────────────────────────────────────────────────────
// How the editor turns ticks into bars and beats, and song time into clip
// time. One place, so no view assumes 4/4 or a 1,920-tick bar again.
//
// - A tick is 1/480 of a quarter note (PPQ 480), whatever the metre.
// - A bar is ticksPerBar(ts): 1,920 in 4/4, 1,440 in 3/4 and 6/8, 1,680 in
//   7/8. The metre is the project's (timeSignatureNumerator/Denominator),
//   saved since milestone 1.3, so every caller passes it: nothing here
//   defaults to 4/4.
// - Song time counts from the start of the song. A MIDI clip's notes are in
//   clip time, from the clip's own tick 0: playback plays each one at
//   clip.startTick + its tick. toSongTick and toClipTick convert.
// - Snapping is bar-relative: a grid restarts at every bar line, so a 1/4
//   grid in 7/8 still lands on the bar lines, and 'Bar' is the metre's bar.
//   In compound metres (6/8, 9/8, 12/8) the beat is the dotted quarter, so
//   the beat grid follows the felt beat.
// - Multi-bar rests (the Lead Sheet's measureRestMap) leave bar indices
//   alone: every stored bar index is a real bar of the song. barSlots lists
//   what the chart draws, a slot per bar or per rest, each with the real bar
//   it starts at.

import {
  TICKS_PER_BEAT,
  ticksPerBar as barTicks,
} from '@/daw/utils/timelineScale';
import { ALL_GRID_VALUES, type AllGridSize } from '@/daw/utils/quantize';

export {
  midiClipLength,
  splitMidiClip,
} from '@/daw/components/Timeline/midiClipCuts';

/** Ticks per quarter note. */
export const PPQ = TICKS_PER_BEAT;

export interface TimeSignature {
  /** Beats per bar. */
  numerator: number;
  /** The beat's note value: 4 = quarter, 8 = eighth. */
  denominator: number;
}

/** The project's metre, from the store's two fields. */
export function timeSignatureOf(state: {
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}): TimeSignature {
  return {
    numerator: state.timeSignatureNumerator,
    denominator: state.timeSignatureDenominator,
  };
}

/** Ticks in one bar of `ts`. */
export function ticksPerBar(ts: TimeSignature): number {
  return barTicks(ts.numerator, ts.denominator);
}

/** Ticks in one written beat of `ts` (its denominator's note value). */
export function ticksPerBeat(ts: TimeSignature): number {
  return (PPQ * 4) / ts.denominator;
}

/**
 * Whether `ts` is compound: 6/8, 9/8, 12/8 (beats of three eighths). The
 * same rule as the notation's meter (src/lib/notation/meter.ts), so the
 * grid and the engraving agree on where the beats are.
 */
export function isCompound(ts: TimeSignature): boolean {
  return ts.denominator === 8 && ts.numerator > 3 && ts.numerator % 3 === 0;
}

/**
 * Ticks in one felt beat: a dotted beat in compound metres (720 in 6/8),
 * otherwise the written beat.
 */
export function feltBeatTicks(ts: TimeSignature): number {
  return isCompound(ts) ? ticksPerBeat(ts) * 3 : ticksPerBeat(ts);
}

/** Felt beats per bar: 2 in 6/8, 3 in 3/4, 7 in 7/8. */
export function feltBeatsPerBar(ts: TimeSignature): number {
  return isCompound(ts) ? ts.numerator / 3 : ts.numerator;
}

/** The song tick bar `bar` (0-based) starts at. */
export function barToTick(bar: number, ts: TimeSignature): number {
  return bar * ticksPerBar(ts);
}

/** The bar (0-based) song tick `tick` falls in. */
export function tickToBar(tick: number, ts: TimeSignature): number {
  return Math.floor(tick / ticksPerBar(ts));
}

/** The song tick the bar holding `tick` starts at. */
export function barStartTick(tick: number, ts: TimeSignature): number {
  return barToTick(tickToBar(tick, ts), ts);
}

/** How many whole bars `ticks` fill, rounded up (an empty span is 0). */
export function barsSpanned(ticks: number, ts: TimeSignature): number {
  return ticks <= 0 ? 0 : Math.ceil(ticks / ticksPerBar(ts));
}

// ── Song time and clip time ────────────────────────────────────────────────

/** The song tick of clip tick `clipTick` in `clip`. */
export function toSongTick(
  clip: { startTick: number },
  clipTick: number,
): number {
  return clip.startTick + clipTick;
}

/** The clip tick of song tick `songTick` in `clip` (negative before it). */
export function toClipTick(
  clip: { startTick: number },
  songTick: number,
): number {
  return songTick - clip.startTick;
}

// ── Snapping ───────────────────────────────────────────────────────────────

/**
 * The grid's step in ticks under `ts`: 'Bar' (1/1) is the metre's bar, and
 * in a compound metre the quarter-note grid is the felt (dotted) beat.
 * Every other value is its note length.
 */
export function gridStepTicks(size: AllGridSize, ts: TimeSignature): number {
  if (size === '1/1') return ticksPerBar(ts);
  if (size === '1/4' && isCompound(ts)) return feltBeatTicks(ts);
  return ALL_GRID_VALUES[size];
}

export interface SnapGrid {
  /** False lets a tick through untouched (whole ticks, never below 0). */
  enabled: boolean;
  /** The step in ticks (gridStepTicks). */
  step: number;
  ts: TimeSignature;
}

/** The timeline's snap grid, from the store. */
export function timelineSnapGrid(state: {
  timelineSnapEnabled: boolean;
  timelineGridSize: AllGridSize;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}): SnapGrid {
  const ts = timeSignatureOf(state);
  return {
    enabled: state.timelineSnapEnabled,
    step: gridStepTicks(state.timelineGridSize, ts),
    ts,
  };
}

/**
 * `tick` on the nearest grid line, counted from the bar line before it, so
 * a step that doesn't divide the bar (a quarter in 7/8) still lands on every
 * bar line: the bar's last line rounds to the next bar line when that is
 * nearer. Never below 0; whole ticks either way.
 */
export function snapTicks(tick: number, grid: SnapGrid): number {
  if (!grid.enabled || grid.step <= 1) return Math.max(0, Math.round(tick));
  const bar = ticksPerBar(grid.ts);
  const start = Math.floor(tick / bar) * bar;
  const within = tick - start;
  let snapped = start + Math.round(within / grid.step) * grid.step;
  // The bar line after this bar is a grid line too.
  if (start + bar - tick < Math.abs(snapped - tick)) snapped = start + bar;
  return Math.max(0, Math.min(snapped, start + bar));
}

// ── Bars on the chart: multi-bar rests ─────────────────────────────────────

/** A place on the chart: one bar, or a multi-bar rest standing for several. */
export interface BarSlot {
  /** The real bar (0-based) the slot starts at. */
  realIndex: number;
  /** How many real bars it stands for: 1, or a rest's length. */
  bars: number;
  /** True for a multi-bar rest. */
  rest: boolean;
}

/**
 * The slots a chart of `barCount` real bars draws: one per bar, except that
 * a multi-bar rest at real bar i (restMap[i] = n, n ≥ 2) is one slot that
 * swallows bars i to i + n − 1. Bar numbers, playhead, selection and every
 * stored index use realIndex; the slot's position is layout only.
 */
export function barSlots(
  barCount: number,
  restMap: Readonly<Record<number, number>> | null | undefined,
): BarSlot[] {
  const slots: BarSlot[] = [];
  let bar = 0;
  while (bar < barCount) {
    const rest = restMap?.[bar] ?? 0;
    if (rest >= 2) {
      slots.push({ realIndex: bar, bars: rest, rest: true });
      bar += rest;
    } else {
      slots.push({ realIndex: bar, bars: 1, rest: false });
      bar += 1;
    }
  }
  return slots;
}

/** The slot (position in `slots`) holding real bar `bar`, or -1. */
export function slotOfBar(slots: readonly BarSlot[], bar: number): number {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (bar >= s.realIndex && bar < s.realIndex + s.bars) return i;
  }
  return -1;
}

// ── Inserting and deleting bars ────────────────────────────────────────────

/**
 * Where bar `index` goes after `count` bars are inserted before bar `at`
 * (count > 0) or bars [at, at − count) are deleted (count < 0): null when a
 * delete removes it.
 */
export function shiftBarIndex(
  index: number,
  at: number,
  count: number,
): number | null {
  if (index < at) return index;
  if (count >= 0) return index + count;
  if (index < at - count) return null;
  return index + count;
}

/**
 * Where song tick `tick` goes after `count` bars are inserted at (or
 * deleted from) bar `at`: a tick inside deleted bars lands where they were.
 */
export function shiftTickForBars(
  tick: number,
  at: number,
  count: number,
  ts: TimeSignature,
): number {
  const bar = ticksPerBar(ts);
  const from = at * bar;
  if (tick < from) return tick;
  if (count >= 0) return tick + count * bar;
  const removedEnd = from - count * bar;
  if (tick < removedEnd) return from;
  return tick + count * bar;
}
