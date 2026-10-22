/**
 * Grading a Music Literacy step: the student's notes in the response bars
 * against the response's notes, on the step's timeline (ticks from the first
 * count-in click, as stepNotes places them).
 *
 * ONLY THE RESPONSE COUNTS
 * The words and the call are the teacher's turn (MY TURN): Atlas, and
 * perhaps a teacher at the keyboard playing along with it, or the student
 * joining in. Nothing played then is an answer, so it's dropped before
 * anything is scored, and no key is shown wrong for it. The window opens
 * an eighth early, so a keen first note still counts; a note of the call
 * played along in that eighth (a pickup into the answer) is still the
 * call's, when it's nearer that call note than any answer of its pitch.
 *
 * ONE NOTE, ONE TARGET
 * Each target is scored with the house in-time maths (assessPitchAndTiming:
 * exact pitch, Gaussian timing). Left to itself that function lets every
 * target pick its own closest same-pitch note, so one C would answer all
 * three of "1 1 1" and pass. Here a played note answers one target at most,
 * the closest pairs first, and only within a beat of it; a note that answers
 * none is an extra, penalised as the house penalises a wrong note.
 *
 * THE CHALLENGE (passes.ts)
 * "Go again and play ALL the notes!": the same run, every note of the words,
 * the call and the response a target, graded by the same maths and the same
 * pass rule. Each segment is paired on its own, so a note played in the
 * words never answers a call target: a segment's notes are those from an
 * eighth before it starts (its first syllable, for words with a pickup) to
 * an eighth before the next one does. In the challenge the teacher's turn
 * is graded, so a wrong key there is wrong (isRightNote's challenge mode).
 */

import type { LiteracyStep } from '@/content/musicLiteracy/schemas';
import {
  applyWrongNotePenalty,
  assessPitchAndTiming,
  type AssessmentResult,
  type TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import type { StepNotes, StepTimeline, TimedNote } from './literacy';
import type { RunSegment } from './run';

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

/**
 * Music Literacy's pass mark, in percent. Higher than the house in-time 60:
 * the series is about steady time, and under the house blend the right
 * notes played anywhere near the beat already reach 60.
 */
export const LITERACY_PASS_MARK = 70;

/**
 * Timing (percent) a pass also needs, whatever the overall score: generous
 * for beginners, but the right notes off the beat don't pass.
 */
export const TIMING_FLOOR = 50;

/** The step's own pass mark, or the series mark (a step of any kind). */
export function passMarkOf(step: LiteracyStep | { passMark?: number }): number {
  return ('passMark' in step ? step.passMark : undefined) ?? LITERACY_PASS_MARK;
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

type Placed = Pick<TimedNote, 'midi' | 'onset'>;

/** The step's call and response, for telling the call's notes from answers. */
export interface ResponseFigure {
  call: readonly Placed[];
  response: readonly Placed[];
}

/** Ticks from `note` to the nearest of `list` at its pitch (Infinity: none). */
const nearest = (note: Placed, list: readonly Placed[]) =>
  Math.min(
    ...list
      .filter((n) => n.midi === note.midi)
      .map((n) => Math.abs(n.onset - note.onset)),
  );

/**
 * The notes the student answered with: those in the response window. Given
 * the figure, a note in the window's early eighth that is a call note played
 * along (nearer it than any answer of its pitch) is left out too.
 */
export function inResponse<T extends Placed>(
  played: readonly T[],
  timeline: StepTimeline,
  figure?: ResponseFigure,
): T[] {
  const { start, end } = responseWindow(timeline);
  return played.filter((note) => {
    if (note.onset < start || note.onset >= end) return false;
    if (!figure || note.onset >= timeline.response.start) return true;
    return !(nearest(note, figure.call) < nearest(note, figure.response));
  });
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
export const ON_TIME = 0.8;

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

/** What a scoring of paired targets comes to, before its feedback words. */
interface Scored {
  pitchAccuracy: number;
  timingAccuracy: number;
  overallScore: number;
  percent: number;
  passed: boolean;
  outcomes: TargetOutcome[];
  missedNotes: number[];
}

/**
 * The house in-time maths over paired targets: each scored on its own
 * (exact pitch, Gaussian timing), the blend pitch-heaviest, the wrong-note
 * penalty for the extras, then the pass rule (the mark, and the timing
 * floor).
 */
function scorePairs(
  targets: readonly TimedNote[],
  pairs: readonly (PlayedNote | null)[],
  extras: number,
  tempo: number,
  passMark: number,
): Scored {
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
    extras,
  );
  const percent = Math.round(overallScore * 100);
  return {
    pitchAccuracy,
    timingAccuracy,
    overallScore,
    percent,
    passed: meetsPassRule(percent, timingAccuracy, passMark),
    outcomes,
    missedNotes: targets.filter((_, i) => !pairs[i]).map((t) => t.midi),
  };
}

/** The pass rule: the mark overall, and the timing floor (0–1 timing). */
export const meetsPassRule = (
  percent: number,
  timingAccuracy: number,
  passMark: number,
): boolean =>
  percent >= passMark && Math.round(timingAccuracy * 100) >= TIMING_FLOOR;

/**
 * The student's answer, graded. `played` is everything they played during
 * the run; the response window is taken here. With the step's `call`, a
 * call note played along at the window's edge isn't taken for an answer.
 */
export function gradeResponse(
  targets: readonly TimedNote[],
  played: readonly PlayedNote[],
  {
    timeline,
    tempo,
    passMark,
    call,
  }: {
    timeline: StepTimeline;
    tempo: number;
    passMark: number;
    call?: readonly TimedNote[];
  },
): LiteracyResult {
  const answers = inResponse(
    played,
    timeline,
    call && { call, response: targets },
  );
  const { pairs, extras } = pairResponse(targets, answers);
  const scored = scorePairs(targets, pairs, extras.length, tempo, passMark);
  return {
    passed: scored.passed,
    pitchAccuracy: scored.pitchAccuracy,
    timingAccuracy: scored.timingAccuracy,
    durationAccuracy: null,
    overallScore: scored.overallScore,
    missedNotes: scored.missedNotes,
    wrongNotes: extras.map((note) => note.midi),
    xpEarned: Math.round(scored.overallScore * 30),
    skillTagsEarned: [],
    feedbackText: feedback(
      scored.missedNotes.length,
      extras.length,
      scored.timingAccuracy,
      scored.passed,
    ),
    outcomes: scored.outcomes,
    percent: scored.percent,
    passMark,
    pairs,
    extras,
  };
}

// ── The challenge ──────────────────────────────────────────────────────────

/** A note the challenge grades: every note of the step, by its segment. */
export interface ChallengeTarget extends TimedNote {
  segment: RunSegment;
}

/** The challenge's targets: the words, the call and the response, in order. */
export function challengeTargets(
  notes: Pick<StepNotes, 'words' | 'call' | 'response'>,
): ChallengeTarget[] {
  return (['words', 'call', 'response'] as const).flatMap((segment) =>
    notes[segment].map((note) => ({ ...note, segment })),
  );
}

const SEGMENTS: readonly RunSegment[] = ['words', 'call', 'response'];

/**
 * Where each segment's played notes are taken from: an eighth before it
 * starts (a pickup's first syllable, for the words) to an eighth before
 * the next one does; the response's to the end of its bars.
 */
export function challengeWindows(
  timeline: StepTimeline,
  targets: readonly Pick<ChallengeTarget, 'segment' | 'onset'>[],
): Record<RunSegment, { start: number; end: number }> {
  const firstWord = Math.min(
    timeline.words.start,
    ...targets.filter((t) => t.segment === 'words').map((t) => t.onset),
  );
  const call = timeline.call.start - RESPONSE_EARLY_TICKS;
  const response = timeline.response.start - RESPONSE_EARLY_TICKS;
  const words = Math.min(firstWord - RESPONSE_EARLY_TICKS, call);
  return {
    words: { start: words, end: call },
    call: { start: call, end: response },
    response: {
      start: response,
      end: timeline.response.start + timeline.response.length,
    },
  };
}

/** The ticks the challenge hears: its words' window to the response's end. */
export function challengeWindow(
  timeline: StepTimeline,
  targets: readonly Pick<ChallengeTarget, 'segment' | 'onset'>[],
): { start: number; end: number } {
  const windows = challengeWindows(timeline, targets);
  return { start: windows.words.start, end: windows.response.end };
}

export interface LiteracyChallengeResult extends LiteracyResult {
  /** How each segment went: its targets, how many were hit, its extras. */
  segments: Record<
    RunSegment,
    { targets: number; hit: number; extras: number }
  >;
}

function challengeFeedback(
  missed: number,
  extras: number,
  timing: number,
  passed: boolean,
): string {
  if (passed) {
    if (missed > 0 || extras > 0) {
      return 'Challenge passed! Next time, every note and nothing extra.';
    }
    return timing >= ON_TIME
      ? 'Every note, right on time. Challenge complete!'
      : 'Challenge passed! Now land every note on its beat.';
  }
  if (missed > 0) {
    return `${missed} note${missed > 1 ? 's' : ''} missed. Play along with every note, the words and the call too.`;
  }
  if (extras > 0) {
    return `${extras} extra note${extras > 1 ? 's' : ''}. Play just the notes Atlas plays, then your answer.`;
  }
  return 'The right notes, but off the beat: play along in time with Atlas.';
}

/**
 * The challenge, graded: every target (challengeTargets) against what the
 * student played over the whole run. Each segment pairs only its own
 * notes (challengeWindows), one note to one target; notes in no segment's
 * window (the count-in before the words) aren't heard. Same maths and pass
 * rule as `gradeResponse`; `pairs` follows the targets' order.
 */
export function gradeChallenge(
  targets: readonly ChallengeTarget[],
  played: readonly PlayedNote[],
  {
    timeline,
    tempo,
    passMark,
  }: { timeline: StepTimeline; tempo: number; passMark: number },
): LiteracyChallengeResult {
  const windows = challengeWindows(timeline, targets);
  const pairs: (PlayedNote | null)[] = targets.map(() => null);
  const extras: PlayedNote[] = [];
  const segments = {} as LiteracyChallengeResult['segments'];
  for (const segment of SEGMENTS) {
    const { start, end } = windows[segment];
    const indices = targets.flatMap((t, i) =>
      t.segment === segment ? [i] : [],
    );
    const heard = played.filter((n) => n.onset >= start && n.onset < end);
    const paired = pairResponse(
      indices.map((i) => targets[i]),
      heard,
    );
    indices.forEach((target, k) => {
      pairs[target] = paired.pairs[k];
    });
    extras.push(...paired.extras);
    segments[segment] = {
      targets: indices.length,
      hit: paired.pairs.filter(Boolean).length,
      extras: paired.extras.length,
    };
  }
  const scored = scorePairs(targets, pairs, extras.length, tempo, passMark);
  return {
    passed: scored.passed,
    pitchAccuracy: scored.pitchAccuracy,
    timingAccuracy: scored.timingAccuracy,
    durationAccuracy: null,
    overallScore: scored.overallScore,
    missedNotes: scored.missedNotes,
    wrongNotes: extras.map((note) => note.midi),
    xpEarned: Math.round(scored.overallScore * 30),
    skillTagsEarned: [],
    feedbackText: challengeFeedback(
      scored.missedNotes.length,
      extras.length,
      scored.timingAccuracy,
      scored.passed,
    ),
    outcomes: scored.outcomes,
    percent: scored.percent,
    passMark,
    pairs,
    extras,
    segments,
  };
}

/** How `isRightNote` judges. */
export interface RightNoteOptions {
  /**
   * The challenge: `targets` are every note (challengeTargets), and the
   * teacher's turn is graded too, so a wrong key there is wrong.
   */
  challenge?: boolean;
}

/**
 * Whether a key pressed now is right, for the keyboard's color: in the
 * response window, the pitch of the target nearest in time. Before it, in a
 * run, it's the teacher's turn and nothing is wrong: a teacher playing along
 * on the keyboard, or the student joining in, lights right, never gray. Out
 * of a run (null) and after the answer, any pitch of the figure.
 *
 * In the challenge every segment is the student's: from the words' window
 * on, a key is right when it's the pitch of the nearest target in the
 * segment it's played in (before that, the count-in, nothing is wrong).
 */
export function isRightNote(
  midi: number,
  tick: number | null,
  targets: readonly (Placed & { segment?: RunSegment })[],
  timeline: StepTimeline,
  { challenge = false }: RightNoteOptions = {},
): boolean {
  const any = () => targets.some((target) => target.midi === midi);
  if (challenge) {
    const tagged = targets.map((t) => ({
      ...t,
      segment: t.segment ?? ('response' as const),
    }));
    const windows = challengeWindows(timeline, tagged);
    if (tick !== null && tick < windows.words.start) return true;
    if (tick === null || tick >= windows.response.end || !targets.length) {
      return any();
    }
    const segment =
      SEGMENTS.find((s) => tick >= windows[s].start && tick < windows[s].end) ??
      'response';
    const inSegment = tagged.filter((t) => t.segment === segment);
    return nearestPitch(inSegment.length ? inSegment : tagged, tick) === midi;
  }
  const { start, end } = responseWindow(timeline);
  if (tick !== null && tick < start) return true;
  if (tick === null || tick >= end || targets.length === 0) return any();
  return nearestPitch(targets, tick) === midi;
}

/** The pitch of the target nearest `tick`. */
const nearestPitch = (targets: readonly Placed[], tick: number) =>
  targets.reduce((a, b) =>
    Math.abs(b.onset - tick) < Math.abs(a.onset - tick) ? b : a,
  ).midi;
