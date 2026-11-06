import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import type { Rich, StepRef, TakeFault } from './types';

// ── What a take says ───────────────────────────────────────────────────────
// Scoring already knows what happened: which notes were wrong or missed, how far
// each landed from the beat and how long it was held. This turns that into the one
// thing most worth saying, in words, naming the notes. Pure, so that every fault
// can be tested without playing anything.

/** Ticks at 480 a beat. Past a 32nd note, the whole take is leaning one way. */
const LEANING_TICKS = 60;
const SHORT_RATIO = 0.6;
const LONG_RATIO = 1.4;

export interface TakePart {
  label: string;
  value: number;
}

export interface TakeReport {
  /** Which take this is, so that one result is only answered once. */
  id: number;
  step: StepRef;
  passed: boolean;
  fault: TakeFault | null;
  message: Rich;
  /** 0–1, or null where a run isn't scored. */
  score: number | null;
  parts: readonly TakePart[];
  passMarkPct: number;
}

export interface TakeNotes {
  midi: number;
  onset: number;
  duration: number;
}

export interface TakeTiming {
  /** Played onset − target onset, in ticks: negative is early. */
  meanDevTicks: number | null;
  /** How spread out those are. */
  spreadTicks: number | null;
  /** Held length ÷ written length, over all of them. */
  meanDurationRatio: number | null;
}

const mean = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Each target against the played note of its pitch that's nearest in time. */
export function timingOf(
  targets: readonly TakeNotes[],
  played: readonly TakeNotes[],
): TakeTiming {
  const devs: number[] = [];
  const ratios: number[] = [];
  for (const target of targets) {
    const same = played.filter((note) => note.midi === target.midi);
    if (!same.length) continue;
    const nearest = same.reduce((a, b) =>
      Math.abs(a.onset - target.onset) < Math.abs(b.onset - target.onset)
        ? a
        : b,
    );
    devs.push(nearest.onset - target.onset);
    if (target.duration > 0) ratios.push(nearest.duration / target.duration);
  }
  const meanDev = mean(devs);
  const spread =
    meanDev === null
      ? null
      : Math.sqrt(mean(devs.map((dev) => (dev - meanDev) ** 2)) ?? 0);
  return {
    meanDevTicks: meanDev,
    spreadTicks: spread,
    meanDurationRatio: mean(ratios),
  };
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];

/** "E", "E and G", "E, G and 2 more". */
export function listNames(names: readonly string[]): string {
  const list = unique(names);
  if (list.length <= 1) return list[0] ?? '';
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  if (list.length === 3) return `${list[0]}, ${list[1]} and ${list[2]}`;
  return `${list[0]}, ${list[1]} and ${list.length - 2} more`;
}

export interface FaultInput {
  passed: boolean;
  unclear?: boolean;
  /** Anything at all came in. */
  heard: boolean;
  wrongNames: readonly string[];
  missedNames: readonly string[];
  /** A timing mark means this: it played in time, so timing can be the fault. */
  inTime: boolean;
  timing: TakeTiming | null;
  /** Length is graded. */
  durationGraded: boolean;
  timingAccuracy: number | null;
  durationAccuracy: number | null;
  /** "notes" or "chords", for how the words read. */
  noun: 'notes' | 'chords';
}

/** The one thing most worth fixing, first things first. */
export function faultOf(input: FaultInput): TakeFault | null {
  if (input.passed) return null;
  if (input.unclear) return 'unclear';
  if (!input.heard) return 'silent';
  if (input.wrongNames.length) return 'wrong';
  if (input.missedNames.length) return 'missed';
  if (input.inTime && input.timing) {
    const { meanDevTicks, spreadTicks } = input.timing;
    if (meanDevTicks !== null && meanDevTicks < -LEANING_TICKS) return 'early';
    if (meanDevTicks !== null && meanDevTicks > LEANING_TICKS) return 'late';
    if (spreadTicks !== null && spreadTicks > LEANING_TICKS) return 'uneven';
  }
  if (input.durationGraded && input.timing?.meanDurationRatio != null) {
    if (input.timing.meanDurationRatio < SHORT_RATIO) return 'short';
    if (input.timing.meanDurationRatio > LONG_RATIO) return 'long';
  }
  return 'other';
}

/** The general words for a fault, naming what can be named. */
export function faultMessage(fault: TakeFault, input: FaultInput): Rich {
  switch (fault) {
    case 'silent':
      return 'Nothing came through. Check your instrument is connected, then try again.';
    case 'unclear':
      return 'I couldn’t hear that clearly. Check the setup, then try again.';
    case 'wrong':
      return `${listNames(input.wrongNames)} ${
        unique(input.wrongNames).length > 1 ? 'aren’t' : 'isn’t'
      } in this one. Watch for what’s lit, and take it slower if you need to.`;
    case 'missed':
      return input.noun === 'chords'
        ? `You missed ${listNames(input.missedNames)}. Get the next shape ready before the change arrives.`
        : `You missed ${listNames(input.missedNames)}. Every note counts, so keep going to the end.`;
    case 'early':
      return 'You’re rushing: most of it landed ahead of the beat. Let the click come to you.';
    case 'late':
      return 'You’re dragging: most of it landed behind the beat. Move to the next note sooner.';
    case 'uneven':
      return 'The right notes, but some landed off the beat. Try it slower and count out loud.';
    case 'short':
      return 'You’re letting go too soon. Hold each one for its whole length.';
    case 'long':
      return 'You’re holding on too long. Lift off just as the next one arrives.';
    default:
      return 'Close, but not quite there. Hear it once more and try again.';
  }
}

export interface ReportInput {
  id: number;
  step: StepRef;
  result: AssessmentResult;
  targets: readonly TakeNotes[];
  played: readonly TakeNotes[];
  inTime: boolean;
  passMarkPct: number;
  noteName: (midi: number) => string;
  /** Chords that were missed or wrong, when it's chords being judged. */
  chordNames?: { missed: readonly string[]; wrong: readonly string[] };
  /** Something came in, for input that isn't notes (a strummed chord). */
  heard?: boolean;
}

/** A genre or fretted take, as scored by useGenreAssessment. */
export function reportOfAssessment(input: ReportInput): TakeReport {
  const { result, targets, played, inTime, noteName, chordNames } = input;
  const usable = inTime
    ? (timingFromOutcomes(result) ?? timingOf(targets, played))
    : null;
  const facts: FaultInput = {
    passed: result.passed,
    unclear: result.unclear,
    heard: input.heard ?? played.length > 0,
    wrongNames: chordNames?.wrong ?? result.wrongNotes.map(noteName),
    missedNames: chordNames?.missed ?? result.missedNotes.map(noteName),
    inTime,
    timing: usable,
    durationGraded: result.durationAccuracy !== null,
    timingAccuracy: result.timingAccuracy,
    durationAccuracy: result.durationAccuracy,
    noun: chordNames ? 'chords' : 'notes',
  };
  const fault = faultOf(facts);
  const unscored =
    result.selfReported || fault === 'unclear' || fault === 'silent';
  return {
    id: input.id,
    step: input.step,
    passed: result.passed,
    fault,
    message: fault ? faultMessage(fault, facts) : result.feedbackText,
    // A number means nothing for a take that was counted by hand or never heard.
    score: unscored ? null : result.overallScore,
    parts: unscored
      ? []
      : [
          {
            label: chordNames ? 'Chords' : 'Notes',
            value: result.pitchAccuracy,
          },
          ...(result.timingAccuracy !== null
            ? [{ label: 'Timing', value: result.timingAccuracy }]
            : []),
          ...(result.durationAccuracy !== null
            ? [{ label: 'Length', value: result.durationAccuracy }]
            : []),
        ],
    passMarkPct: input.passMarkPct,
  };
}

/** Fretted takes come with each target's own timing already worked out. */
function timingFromOutcomes(result: AssessmentResult): TakeTiming | null {
  const outcomes = result.outcomes?.filter((o) => o.status === 'hit');
  if (!outcomes?.length) return null;
  const devs = outcomes.flatMap((o) =>
    o.timingDevTicks === undefined ? [] : [o.timingDevTicks],
  );
  const meanDev = mean(devs);
  return {
    meanDevTicks: meanDev,
    spreadTicks:
      meanDev === null
        ? null
        : Math.sqrt(mean(devs.map((dev) => (dev - meanDev) ** 2)) ?? 0),
    meanDurationRatio: mean(
      outcomes.flatMap((o) =>
        o.durationRatio === undefined ? [] : [o.durationRatio],
      ),
    ),
  };
}

/** What a play-along run reports, with the notes behind its count. */
export interface RunDetail {
  missedMidis: readonly number[];
  wrongMidis: readonly number[];
  timing: TakeTiming | null;
}

/** A Theory play-along run, as PlayAlong grades it. */
export function reportOfRun(input: {
  id: number;
  step: StepRef;
  hits: number;
  total: number;
  required: number;
  passed: boolean;
  passMarkPct: number;
  detail?: RunDetail;
  noteName: (midi: number) => string;
  successMessage: Rich;
}): TakeReport {
  const { detail, noteName } = input;
  const facts: FaultInput = {
    passed: input.passed,
    heard: input.hits > 0 || (detail?.wrongMidis.length ?? 0) > 0,
    wrongNames: [],
    missedNames: (detail?.missedMidis ?? []).map(noteName),
    inTime: true,
    timing: detail?.timing ?? null,
    durationGraded: false,
    timingAccuracy: null,
    durationAccuracy: null,
    noun: 'notes',
  };
  // Wrong notes don't count against a run, so they're only what's worth saying
  // when they are what went wrong.
  const wrongFirst =
    !input.passed &&
    (detail?.wrongMidis.length ?? 0) > input.total - input.hits;
  if (wrongFirst && detail) {
    facts.wrongNames = detail.wrongMidis.map(noteName);
  }
  const fault = faultOf(facts);
  return {
    id: input.id,
    step: input.step,
    passed: input.passed,
    fault,
    message: fault
      ? fault === 'missed' && !detail
        ? `You played ${input.hits} of ${input.total}, and ${input.required} pass. Keep going to the end.`
        : faultMessage(fault, facts)
      : input.successMessage,
    score:
      input.total > 0 && fault !== 'silent' ? input.hits / input.total : null,
    parts: [],
    passMarkPct: input.passMarkPct,
  };
}

/** A step played through at its own pace, which can't be failed. */
export function reportOfHold(input: {
  id: number;
  step: StepRef;
  message: Rich;
}): TakeReport {
  return {
    id: input.id,
    step: input.step,
    passed: true,
    fault: null,
    message: input.message,
    score: null,
    parts: [],
    passMarkPct: 100,
  };
}
