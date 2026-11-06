/**
 * swing.ts — swing for genre play-alongs.
 *
 * Swing is a percentage: where the off-beat note of each pair lands, as a
 * share of the pair. 50 is straight, 66 is a triplet feel. Only the off-beat
 * notes move; downbeats stay put.
 *
 * What swings is the step's `swingUnit`: '16n' (the default) moves the
 * off-beat 16th of each 8th, as Hip Hop swings, and 8th notes stay put; '8n'
 * moves the off-beat 8th of each beat, as jazz swings, and 16ths and written
 * triplets stay straight. A swung 8th keeps its end, so the pair plays long,
 * short.
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

/** What swings: the off-beat 16th of each 8th, or the off-beat 8th of each beat. */
export type SwingUnit = '16n' | '8n';

/** The pair that swings, in ticks at PPQ 480, by unit. */
const PAIR_TICKS: Record<SwingUnit, number> = { '16n': 240, '8n': 480 };
/** How far a note may sit from the off-beat and still count as one. */
const OFFBEAT_WINDOW: Record<SwingUnit, number> = { '16n': 30, '8n': 60 };
/** The shortest a swung 8th is cut to when it keeps its end. */
const MIN_DURATION = 60;

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

/** What a step swings: its own unit, else 16ths. */
export function stepSwingUnit(
  step: Pick<ActivityStepV2, 'swingUnit'> | null | undefined,
): SwingUnit {
  return step?.swingUnit ?? '16n';
}

/** Where a note starting at `onset` lands with swing applied. */
export function swingOnset(
  onset: number,
  swing: number,
  unit: SwingUnit = '16n',
): number {
  if (swing <= STRAIGHT) return onset;
  const pair = PAIR_TICKS[unit];
  const offbeat = pair / 2;
  const pos = ((onset % pair) + pair) % pair;
  if (Math.abs(pos - offbeat) > OFFBEAT_WINDOW[unit]) return onset;
  return onset + Math.round((pair * swing) / 100 - offbeat);
}

/** Swing a list of notes; returns the same array when straight. */
export function applySwing<T extends { onset: number }>(
  notes: readonly T[],
  swing: number,
  unit: SwingUnit = '16n',
): readonly T[] {
  if (swing <= STRAIGHT) return notes;
  return notes.map((note) => {
    const onset = swingOnset(note.onset, swing, unit);
    if (onset === note.onset) return note;
    const duration = (note as { duration?: unknown }).duration;
    // A swung 8th keeps its end: the off-beat note plays short.
    if (unit === '8n' && typeof duration === 'number') {
      const kept = Math.max(MIN_DURATION, duration - (onset - note.onset));
      return { ...note, onset, duration: kept };
    }
    return { ...note, onset };
  });
}
