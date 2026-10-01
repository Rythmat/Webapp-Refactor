/**
 * swing.ts — 16th-note swing for genre play-alongs.
 *
 * Swing is a percentage: where the off-beat 16th of each 8th-note pair lands,
 * as a share of the pair. 50 is straight, 66 is a triplet feel. Only the
 * off-beat 16ths move; downbeats and 8th notes stay put.
 *
 * Applied to the backing and to the student's target notes alike, so the
 * grading hears the same groove the drums are playing.
 *
 * Older flow params carry `swing: 0` or `swing: 1` as flags; anything below 50
 * plays straight.
 */

import type { ActivityStepV2 } from '../../types/activity.v2';

export const STRAIGHT = 50;
const MAX_SWING = 75;
const PAIR_TICKS = 240; // an 8th note at PPQ 480
const OFFBEAT = 120;
/** How far a note may sit from the off-beat 16th and still count as one. */
const OFFBEAT_WINDOW = 30;

/** A swing value as a playable percentage (legacy flags read as straight). */
export function swingPercent(value: number | undefined): number {
  if (value == null || value < STRAIGHT) return STRAIGHT;
  return Math.min(value, MAX_SWING);
}

/** The swing a step plays at: its own, else the flow's. */
export function stepSwing(
  step: Pick<ActivityStepV2, 'swing'> | null | undefined,
  flowSwing: number | undefined,
): number {
  return swingPercent(step?.swing ?? flowSwing);
}

/** Where a note starting at `onset` lands with swing applied. */
export function swingOnset(onset: number, swing: number): number {
  if (swing <= STRAIGHT) return onset;
  const pos = ((onset % PAIR_TICKS) + PAIR_TICKS) % PAIR_TICKS;
  if (Math.abs(pos - OFFBEAT) > OFFBEAT_WINDOW) return onset;
  return onset + Math.round((PAIR_TICKS * swing) / 100 - OFFBEAT);
}

/** Swing a list of notes; returns the same array when straight. */
export function applySwing<T extends { onset: number }>(
  notes: readonly T[],
  swing: number,
): readonly T[] {
  if (swing <= STRAIGHT) return notes;
  return notes.map((note) => {
    const onset = swingOnset(note.onset, swing);
    return onset === note.onset ? note : { ...note, onset };
  });
}
