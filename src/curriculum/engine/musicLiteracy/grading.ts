/**
 * Grading a Music Literacy step: the student's notes in the response bars
 * against the response's notes, on the step's timeline (ticks from the first
 * count-in click, as stepNotes places them).
 *
 * ONLY THE RESPONSE COUNTS
 * A note played along with the words or the call is the student joining in,
 * not their answer, so it's dropped before anything is scored. The window
 * opens an eighth early, so a keen first note still counts.
 *
 * ONE NOTE, ONE TARGET
 * Each target is scored with the house in-time maths (assessPitchAndTiming:
 * exact pitch, Gaussian timing). Left to itself that function lets every
 * target pick its own closest same-pitch note, so one C would answer all
 * three of "1 1 1" and pass. Here a played note answers one target at most,
 * the closest pairs first, and only within a beat of it; a note that answers
 * none is an extra, penalised as the house penalises a wrong note.
 */

import type { LiteracyStep } from '@/content/musicLiteracy/schemas';
import {
  applyWrongNotePenalty,
  assessPitchAndTiming,
  type AssessmentResult,
  type TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import { stepPassMark } from '@/curriculum/practice/practiceDefaults';
import type { StepTimeline, TimedNote } from './literacy';

/** A note the student played, on the step's timeline. */
export interface PlayedNote {
  midi: number;
  onset: number;
  /** 0 while it's still held. */
  duration: number;
}

/** How early (ticks) the first answer may come: an eighth. */
export const RESPONSE_EARLY_TICKS = 240;

/** A right note further than this (ticks) from a target doesn't answer it. */
export const MATCH_WINDOW_TICKS = 480;

/** The house in-time pass mark, in percent (60). */
export const IN_TIME_PASS_MARK = Math.round(
  stepPassMark('pitch_order_timing') * 100,
);

/** The step's own pass mark, or the house in-time mark. */
export function passMarkOf(step: Pick<LiteracyStep, 'passMark'>): number {
  return step.passMark ?? IN_TIME_PASS_MARK;
}

/** The ticks the student's answer is heard in. */
export function responseWindow(timeline: StepTimeline): {
  start: number;
  end: number;
} {
  return {
    start: timeline.response.start - RESPONSE_EARLY_TICKS,
    end: timeline.response.start + timeline.response.length,
  };
}

export function inResponse<T extends { onset: number }>(
  played: readonly T[],
  timeline: StepTimeline,
): T[] {
  const { start, end } = responseWindow(timeline);
  return played.filter((note) => note.onset >= start && note.onset < end);
}

/**
 * Which played note answers each target (null: none), closest pairs first,
 * each note used once; the rest are extras.
 */
export function pairResponse<T extends { midi: number; onset: number }>(
  targets: readonly Pick<TimedNote, 'midi' | 'onset'>[],
  played: readonly T[],
): { pairs: (T | null)[]; extras: T[] } {
  const candidates: { target: number; note: number; distance: number }[] = [];
  targets.forEach((target, t) =>
    played.forEach((note, n) => {
      const distance = Math.abs(note.onset - target.onset);
      if (note.midi === target.midi && distance <= MATCH_WINDOW_TICKS) {
        candidates.push({ target: t, note: n, distance });
      }
    }),
  );
  candidates.sort((a, b) => a.distance - b.distance || a.target - b.target);

  const pairs: (T | null)[] = targets.map(() => null);
  const used = new Set<number>();
  for (const { target, note } of candidates) {
    if (pairs[target] !== null || used.has(note)) continue;
    pairs[target] = played[note];
    used.add(note);
  }
  return { pairs, extras: played.filter((_, n) => !used.has(n)) };
}

export interface LiteracyResult extends AssessmentResult {
  /** The overall score as the result shows it, 0–100. */
  percent: number;
  passMark: number;
  /** Per target: the note that answered it. */
  pairs: (PlayedNote | null)[];
  /** Notes in the response that answered nothing. */
  extras: PlayedNote[];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Timing this good (0–1) reads as "on time". */
const ON_TIME = 0.8;

function feedback(
  missed: number,
  extras: number,
  timing: number,
  passed: boolean,
): string {
  if (passed) {
    if (missed > 0 || extras > 0) {
      return 'Passed. Next time, play just the notes of the call.';
    }
    return timing >= ON_TIME
      ? 'Right notes, right on time.'
      : 'Right notes. Now land each one on its beat.';
  }
  if (missed > 0 && extras > 0) {
    return `${missed} missed and ${extras} extra. Listen once more, then answer in the next bar.`;
  }
  if (missed > 0) {
    return `${missed} note${missed > 1 ? 's' : ''} missed. Play every note of the call back, in time.`;
  }
  return 'The right notes, but off the beat: answer in time, on the beats after the call.';
}

/**
 * The student's answer, graded. `played` is everything they played during
 * the run; the response window is taken here.
 */
export function gradeResponse(
  targets: readonly TimedNote[],
  played: readonly PlayedNote[],
  {
    timeline,
    tempo,
    passMark,
  }: { timeline: StepTimeline; tempo: number; passMark: number },
): LiteracyResult {
  const { pairs, extras } = pairResponse(targets, inResponse(played, timeline));

  const pitch: number[] = [];
  const timing: number[] = [];
  const outcomes: TargetOutcome[] = targets.map((target, i) => {
    const pair = pairs[i];
    const scored = assessPitchAndTiming(
      [target],
      pair ? [pair] : [],
      tempo,
      'pitch_order_timing',
    );
    pitch.push(scored.pitchAccuracy);
    timing.push(scored.timingAccuracy ?? 0);
    return pair
      ? {
          targetIndex: i,
          onsetTick: target.onset,
          status: 'hit',
          timingDevTicks: pair.onset - target.onset,
        }
      : { targetIndex: i, onsetTick: target.onset, status: 'missed' };
  });

  const pitchAccuracy = mean(pitch);
  const timingAccuracy = mean(timing);
  // The house in-time blend (pitch-heaviest), then its wrong-note penalty.
  const overallScore = applyWrongNotePenalty(
    pitchAccuracy * 0.6 + timingAccuracy * 0.4,
    targets.length,
    extras.length,
  );
  const percent = Math.round(overallScore * 100);
  const passed = percent >= passMark;
  const missedNotes = targets.filter((_, i) => !pairs[i]).map((t) => t.midi);

  return {
    passed,
    pitchAccuracy,
    timingAccuracy,
    durationAccuracy: null,
    overallScore,
    missedNotes,
    wrongNotes: extras.map((note) => note.midi),
    xpEarned: Math.round(overallScore * 30),
    skillTagsEarned: [],
    feedbackText: feedback(
      missedNotes.length,
      extras.length,
      timingAccuracy,
      passed,
    ),
    outcomes,
    percent,
    passMark,
    pairs,
    extras,
  };
}

/**
 * Whether a key the student presses now is right, for the keyboard's colour:
 * in the response window, the pitch of the target nearest in time; before it,
 * any pitch of the figure.
 */
export function isRightNote(
  midi: number,
  tick: number | null,
  targets: readonly Pick<TimedNote, 'midi' | 'onset'>[],
  timeline: StepTimeline,
): boolean {
  const { start, end } = responseWindow(timeline);
  if (tick === null || tick < start || tick >= end || targets.length === 0) {
    return targets.some((target) => target.midi === midi);
  }
  const nearest = targets.reduce((a, b) =>
    Math.abs(b.onset - tick) < Math.abs(a.onset - tick) ? b : a,
  );
  return nearest.midi === midi;
}
