/**
 * useGenreAssessment.ts — Self-contained assessment engine for v2 genre curriculum.
 *
 * Pitch-only (OOT) scoring is exact-MIDI and self-contained (timing/duration
 * don't apply to Out-of-Time activities by design). Timing/duration scoring
 * (IT) delegates the per-note math to continuousMatchers.ts — the same
 * Gaussian pitch/timing-decay + duration-ratio engine built for the v2
 * continuous-feedback system — rather than re-deriving it here.
 *
 * Guitar passes an AssessmentPolicy: octave-tolerant notes (mic input) or
 * chords judged by pitch-class identity, with per-target outcomes and an
 * "unclear" verdict. Without a policy every path below runs exactly as before.
 */

import { useCallback } from 'react';
import {
  IDENTITY_MATCH,
  IDENTITY_PASS,
  chordIdentityScore,
} from '@/learn/audio/guitar/chordIdentity';
import {
  scoreNoteContinuous,
  type ReceivedNote,
} from '../engine/continuousMatchers';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import type { AssessmentType } from '../types/activity';
import type { ChordTarget } from '../types/activity.v2';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AssessmentResult {
  passed: boolean;
  pitchAccuracy: number; // 0-1
  timingAccuracy: number | null; // 0-1, null for OOT
  durationAccuracy: number | null;
  overallScore: number; // 0-1
  missedNotes: number[]; // midi values
  wrongNotes: number[]; // midi values student played incorrectly
  xpEarned: number;
  skillTagsEarned: string[];
  feedbackText: string; // step.successFeedback if passed, generic message if not
  /** Per target, in target order. Only the guitar policy paths fill it. */
  outcomes?: TargetOutcome[];
  /**
   * "Couldn't hear clearly": over half the targets were unclear. `passed` is
   * false, but the caller must not record it as a failure.
   */
  unclear?: boolean;
  /** A pass the student counted themselves (selfReportedResult). */
  selfReported?: true;
}

export interface TargetOutcome {
  /** Index into the scored targets: targetNotes, or the policy's chordTargets. */
  targetIndex: number;
  onsetTick: number;
  /**
   * 'wrong': something else was played for it — another note or chord, part
   * of the chord, or the right note in the wrong octave.
   */
  status: 'hit' | 'missed' | 'wrong' | 'unclear';
  /** In time only: played onset − target onset (negative = early). */
  timingDevTicks?: number;
  /** In time with duration graded: held length ÷ target length, as scored. */
  durationRatio?: number;
}

/** A chord the student played, on the same tick timeline as the targets. */
export interface UserChordEvent {
  rootPc: number;
  quality: string;
  pcs: number[];
  onset: number;
  duration: number;
  confidence: number;
  source: 'audio' | 'midi';
}

/**
 * Guitar scoring. `unclearTargetIndexes` (into targetNotes, or chordTargets
 * for chords) are targets the input couldn't judge; they are left out of the
 * score rather than counted as missed. Chord results leave missedNotes and
 * wrongNotes empty (audio chords carry no MIDI): outcomes name the chords.
 */
export type AssessmentPolicy =
  | {
      kind: 'notes';
      match: 'exact' | 'octave_tolerant';
      /** Credit for the right note an octave off; capped at 0.7. */
      octaveCredit?: number;
      unclearTargetIndexes?: number[];
    }
  | {
      kind: 'chords';
      chordTargets: ChordTarget[];
      userChords: UserChordEvent[];
      unclearTargetIndexes?: number[];
    };

// ── Constants ────────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 0.6; // 60% to pass — encouraging for beginners
const TICKS_PER_BEAT = 480; // PPQ

// ── Shared helpers ───────────────────────────────────────────────────────────

/** Wrong-note penalty: scales relative to activity size, weighted 50%. */
function applyWrongNotePenalty(
  baseScore: number,
  targetCount: number,
  wrongCount: number,
): number {
  if (wrongCount === 0) return baseScore;
  const wrongPenalty = wrongCount / (targetCount + wrongCount);
  return Math.max(0, baseScore - wrongPenalty * 0.5);
}

// ── Assessment functions ─────────────────────────────────────────────────────

function getFailureFeedback(missed: number[], wrong: number[]): string {
  if (wrong.length > 0 && missed.length > 0) {
    return `${wrong.length} wrong note${wrong.length > 1 ? 's' : ''} and ${missed.length} missed. Try again.`;
  }
  if (wrong.length > 0) {
    return `${wrong.length} wrong note${wrong.length > 1 ? 's' : ''} — only play the highlighted notes.`;
  }
  if (missed.length > 0) {
    return `${missed.length} note${missed.length > 1 ? 's' : ''} missed — make sure to play every highlighted note.`;
  }
  return 'Not quite — try again.';
}

export function assessPitchOnly(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  skillTags: string[] = [],
  feedbackText: string = '',
): AssessmentResult {
  const targetMidis = new Set(targetNotes.map((n) => n.midi));
  const userMidis = new Set(userNotes.map((n) => n.midi));

  // Notes student should have played
  const correct = [...targetMidis].filter((m) => userMidis.has(m));
  const missed = [...targetMidis].filter((m) => !userMidis.has(m));

  // Notes student played that were NOT targets — wrong notes
  const wrong = [...userMidis].filter((m) => !targetMidis.has(m));

  // Pitch accuracy: correct / total target notes
  const pitchAccuracy =
    targetMidis.size > 0 ? correct.length / targetMidis.size : 0;

  const overallScore = applyWrongNotePenalty(
    pitchAccuracy,
    targetMidis.size,
    wrong.length,
  );

  // Must hit all targets AND have reasonable score to pass
  const passed = overallScore >= 0.75 && missed.length === 0;

  return {
    passed,
    pitchAccuracy,
    timingAccuracy: null,
    durationAccuracy: null,
    overallScore,
    missedNotes: missed,
    wrongNotes: wrong,
    xpEarned: Math.round(overallScore * 10),
    skillTagsEarned: passed ? skillTags : [],
    feedbackText: passed ? feedbackText : getFailureFeedback(missed, wrong),
  };
}

export function assessPitchAndTiming(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  tempo: number,
  assessmentType: 'pitch_order_timing' | 'pitch_order_timing_duration',
  skillTags: string[] = [],
  feedbackText: string = '',
): AssessmentResult {
  const gradeDuration = assessmentType === 'pitch_order_timing_duration';
  const msPerTick = 60000 / tempo / TICKS_PER_BEAT;

  const missed: number[] = [];
  const pitchScores: number[] = [];
  const timingScores: number[] = [];
  const durationScores: number[] = [];

  for (const target of targetNotes) {
    // Find all user notes matching this pitch, pick the one closest in time —
    // robust to an interspersed wrong note, since matching is pitch-first.
    const candidates = userNotes.filter((u) => u.midi === target.midi);

    if (candidates.length === 0) {
      missed.push(target.midi);
      continue;
    }

    const best = candidates.reduce((a, b) =>
      Math.abs(a.onset - target.onset) < Math.abs(b.onset - target.onset)
        ? a
        : b,
    );

    const expected: MidiNoteEvent = {
      note: target.midi,
      onset: target.onset,
      duration: target.duration,
    };
    const received: ReceivedNote = {
      midi: best.midi,
      onsetMs: best.onset * msPerTick,
      durationMs: best.duration * msPerTick,
      confidence: 1, // real MIDI input — exact, no detection ambiguity
    };
    const score = scoreNoteContinuous(
      expected,
      received,
      tempo,
      assessmentType,
    );

    pitchScores.push(score.pitchScore);
    timingScores.push(score.timingScore);
    durationScores.push(score.durationScore);
  }

  // Wrong notes = played but never matched to any target pitch
  const matchedMidis = new Set(targetNotes.map((t) => t.midi));
  const wrong = userNotes
    .filter((u) => !matchedMidis.has(u.midi))
    .map((u) => u.midi);

  const total = targetNotes.length;
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  // Missed notes contribute 0 to every dimension — divide by total, not
  // by the (possibly shorter) matched-note count.
  const pitchAccuracy = total > 0 ? sum(pitchScores) / total : 0;
  const timingAccuracy = total > 0 ? sum(timingScores) / total : 0;
  const durationAccuracy = gradeDuration
    ? total > 0
      ? sum(durationScores) / total
      : 0
    : null;

  // Same arithmetic-weighted blend as before (pitch-heaviest), just extended
  // with a duration term when it's actually graded. Deliberately not the
  // engine's own geometric composite — that would silently raise difficulty
  // for existing content beyond what changing the math for math's sake should do.
  const baseScore = gradeDuration
    ? pitchAccuracy * 0.5 + timingAccuracy * 0.3 + (durationAccuracy ?? 0) * 0.2
    : pitchAccuracy * 0.6 + timingAccuracy * 0.4;

  const overallScore = applyWrongNotePenalty(baseScore, total, wrong.length);
  const passed = overallScore >= PASS_THRESHOLD;

  return {
    passed,
    pitchAccuracy,
    timingAccuracy,
    durationAccuracy,
    overallScore,
    missedNotes: missed,
    wrongNotes: wrong,
    xpEarned: Math.round(overallScore * 30),
    skillTagsEarned: passed ? skillTags : [],
    feedbackText: passed
      ? feedbackText
      : overallScore > 0.4
        ? 'Good effort — a few notes to clean up. Try again.'
        : 'Not quite — try again.',
  };
}

// ── Guitar policies ──────────────────────────────────────────────────────────

/**
 * At most 0.7: the out-of-time pass mark is 0.75, and a whole scale played an
 * octave off must not pass.
 */
const MAX_OCTAVE_CREDIT = 0.7;
/** A target this long relative to the gap before the next one is meant to ring. */
const LET_RING_RATIO = 0.75;
const UNCLEAR_FEEDBACK =
  "Couldn't hear that clearly — check your setup and try again.";

type Status = TargetOutcome['status'];

const sumOf = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Closest onset wins; ties go to the later candidate, as in piano's IT. */
function closestTo<T extends { onset: number }>(
  candidates: T[],
  onset: number,
) {
  return candidates.reduce((a, b) =>
    Math.abs(a.onset - onset) < Math.abs(b.onset - onset) ? a : b,
  );
}

/**
 * assessPitchAndTiming's averages and blend. Missed targets add 0 to every
 * dimension, so each sum is divided by all `total` scored targets.
 */
function blendInTime(
  total: number,
  gradeDuration: boolean,
  pitchScores: number[],
  timingScores: number[],
  durationScores: number[],
) {
  const mean = (values: number[]) => (total > 0 ? sumOf(values) / total : 0);
  const pitchAccuracy = mean(pitchScores);
  const timingAccuracy = mean(timingScores);
  const durationAccuracy = gradeDuration ? mean(durationScores) : null;
  const baseScore = gradeDuration
    ? pitchAccuracy * 0.5 + timingAccuracy * 0.3 + (durationAccuracy ?? 0) * 0.2
    : pitchAccuracy * 0.6 + timingAccuracy * 0.4;
  return { pitchAccuracy, timingAccuracy, durationAccuracy, baseScore };
}

/** Valid, distinct unclear indexes. */
function unclearSet(indexes: number[] | undefined, targetCount: number) {
  return new Set(
    (indexes ?? []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < targetCount,
    ),
  );
}

/** Over half the targets unclear: a non-verdict instead of a fail. */
function withUnclearVerdict(
  result: AssessmentResult,
  unclearCount: number,
  targetCount: number,
): AssessmentResult {
  if (unclearCount * 2 <= targetCount) return result;
  return {
    ...result,
    passed: false,
    unclear: true,
    xpEarned: 0,
    skillTagsEarned: [],
    feedbackText: UNCLEAR_FEEDBACK,
  };
}

/**
 * In time, a missed target with a wrong note or chord nearest to it was
 * played wrong rather than skipped.
 */
function markWrongTargets(
  outcomes: TargetOutcome[],
  wrongOnsets: number[],
): void {
  if (outcomes.length === 0) return;
  for (const onset of wrongOnsets) {
    const nearest = outcomes.reduce((a, b) =>
      Math.abs(b.onsetTick - onset) < Math.abs(a.onsetTick - onset) ? b : a,
    );
    if (nearest.status === 'missed') nearest.status = 'wrong';
  }
}

function outcome(
  targetIndex: number,
  onsetTick: number,
  status: Status,
): TargetOutcome {
  return { targetIndex, onsetTick, status };
}

function creditStatus(credit: number): Status {
  return credit >= 1 ? 'hit' : credit > 0 ? 'wrong' : 'missed';
}

/**
 * Notes, out of time. With `octaveCredit` null this is assessPitchOnly's
 * maths exactly; otherwise a target played an octave off earns that credit
 * and a note is wrong only if no target is at its pitch or an octave away.
 * A played pitch that is itself a target never stands in for another target
 * an octave away: scales and arpeggios span octaves, so otherwise one shifted
 * an octave (or missing its top note) would still pass.
 */
function assessNotesPitchOnly(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  octaveCredit: number | null,
  unclear: Set<number>,
  skillTags: string[],
  feedbackText: string,
): AssessmentResult {
  const targetMidis = new Set(
    targetNotes.filter((_, i) => !unclear.has(i)).map((n) => n.midi),
  );
  const allTargetMidis = new Set(targetNotes.map((n) => n.midi));
  const userMidis = new Set(userNotes.map((n) => n.midi));
  const standIns = new Set(
    [...userMidis].filter((m) => !allTargetMidis.has(m)),
  );
  const nearOctave = (midi: number, set: Set<number>) =>
    octaveCredit !== null && (set.has(midi - 12) || set.has(midi + 12));

  const credit = new Map(
    [...targetMidis].map((m) => [
      m,
      userMidis.has(m) ? 1 : nearOctave(m, standIns) ? octaveCredit! : 0,
    ]),
  );
  const missed = [...targetMidis].filter((m) => credit.get(m) === 0);
  const wrong = [...userMidis].filter(
    (m) => !allTargetMidis.has(m) && !nearOctave(m, allTargetMidis),
  );

  const pitchAccuracy =
    targetMidis.size > 0 ? sumOf([...credit.values()]) / targetMidis.size : 0;
  const overallScore = applyWrongNotePenalty(
    pitchAccuracy,
    targetMidis.size,
    wrong.length,
  );
  const passed = overallScore >= 0.75 && missed.length === 0;

  return withUnclearVerdict(
    {
      passed,
      pitchAccuracy,
      timingAccuracy: null,
      durationAccuracy: null,
      overallScore,
      missedNotes: missed,
      wrongNotes: wrong,
      xpEarned: Math.round(overallScore * 10),
      skillTagsEarned: passed ? skillTags : [],
      feedbackText: passed ? feedbackText : getFailureFeedback(missed, wrong),
      outcomes: targetNotes.map((n, i) =>
        outcome(
          i,
          n.onset,
          unclear.has(i) ? 'unclear' : creditStatus(credit.get(n.midi)!),
        ),
      ),
    },
    unclear.size,
    targetNotes.length,
  );
}

/**
 * Notes, in time. With `octaveCredit` null this is assessPitchAndTiming's
 * maths exactly; otherwise notes an octave off are candidates too, scored at
 * that pitch credit by scoreNoteContinuous.
 */
function assessNotesInTime(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  tempo: number,
  assessmentType: 'pitch_order_timing' | 'pitch_order_timing_duration',
  octaveCredit: number | null,
  unclear: Set<number>,
  skillTags: string[],
  feedbackText: string,
): AssessmentResult {
  const gradeDuration = assessmentType === 'pitch_order_timing_duration';
  const msPerTick = 60000 / tempo / TICKS_PER_BEAT;
  const options =
    octaveCredit === null
      ? undefined
      : { octaveEquivalenceWeight: octaveCredit };
  const matches = (user: GenreNoteEvent, target: GenreNoteEvent) =>
    user.midi === target.midi ||
    (octaveCredit !== null && Math.abs(user.midi - target.midi) === 12);

  const missed: number[] = [];
  const pitchScores: number[] = [];
  const timingScores: number[] = [];
  const durationScores: number[] = [];
  const outcomes = targetNotes.map((target, i): TargetOutcome => {
    if (unclear.has(i)) return outcome(i, target.onset, 'unclear');
    const candidates = userNotes.filter((u) => matches(u, target));
    if (candidates.length === 0) {
      missed.push(target.midi);
      return outcome(i, target.onset, 'missed');
    }
    const best = closestTo(candidates, target.onset);
    const score = scoreNoteContinuous(
      { note: target.midi, onset: target.onset, duration: target.duration },
      {
        midi: best.midi,
        onsetMs: best.onset * msPerTick,
        durationMs: best.duration * msPerTick,
        confidence: 1,
      },
      tempo,
      assessmentType,
      options,
    );
    pitchScores.push(score.pitchScore);
    timingScores.push(score.timingScore);
    durationScores.push(score.durationScore);
    return {
      ...outcome(i, target.onset, creditStatus(score.pitchScore)),
      timingDevTicks: best.onset - target.onset,
      ...(gradeDuration ? { durationRatio: score.durationRatio } : {}),
    };
  });

  const wrongNotes = userNotes.filter(
    (u) => !targetNotes.some((t) => matches(u, t)),
  );
  markWrongTargets(
    outcomes,
    wrongNotes.map((u) => u.onset),
  );

  const total = targetNotes.length - unclear.size;
  const { pitchAccuracy, timingAccuracy, durationAccuracy, baseScore } =
    blendInTime(
      total,
      gradeDuration,
      pitchScores,
      timingScores,
      durationScores,
    );
  const overallScore = applyWrongNotePenalty(
    baseScore,
    total,
    wrongNotes.length,
  );
  const passed = overallScore >= PASS_THRESHOLD;

  return withUnclearVerdict(
    {
      passed,
      pitchAccuracy,
      timingAccuracy,
      durationAccuracy,
      overallScore,
      missedNotes: missed,
      wrongNotes: wrongNotes.map((u) => u.midi),
      xpEarned: Math.round(overallScore * 30),
      skillTagsEarned: passed ? skillTags : [],
      feedbackText: passed
        ? feedbackText
        : overallScore > 0.4
          ? 'Good effort — a few notes to clean up. Try again.'
          : 'Not quite — try again.',
      outcomes,
    },
    unclear.size,
    targetNotes.length,
  );
}

function identity(target: ChordTarget, played: UserChordEvent): number {
  return chordIdentityScore(
    { pcs: target.pitchClasses, rootPc: target.rootPc },
    played,
  );
}

/** Chords that pair with no target at all are wrong chords. */
function wrongChords(
  chordTargets: ChordTarget[],
  userChords: UserChordEvent[],
): UserChordEvent[] {
  return userChords.filter(
    (u) => !chordTargets.some((t) => identity(t, u) >= IDENTITY_MATCH),
  );
}

/**
 * `partialSymbols`: chords strummed with a tone missing or one extra (an
 * identity between IDENTITY_MATCH and IDENTITY_PASS) — played, not missed.
 */
function chordFailureFeedback(
  missedSymbols: string[],
  partialSymbols: string[],
  wrongCount: number,
  overallScore: number,
): string {
  const missed = [...new Set(missedSymbols)].join(', ');
  const partial = [...new Set(partialSymbols)];
  const wrong = `${wrongCount} wrong chord${wrongCount > 1 ? 's' : ''}`;
  if (missed && wrongCount > 0) {
    return `${wrong}, and ${missed} missed. Try again.`;
  }
  if (missed) return `Missed ${missed} — make sure to strum every chord shown.`;
  if (wrongCount > 0) return `${wrong} — only strum the chords shown.`;
  if (partial.length > 0) {
    return `${partial.join(', ')} ${partial.length > 1 ? "weren't" : "wasn't"} clean — check the shape string by string.`;
  }
  return overallScore > 0.4
    ? 'Good effort — a few chords to clean up. Try again.'
    : 'Not quite — try again.';
}

/**
 * Chords, out of time: each target takes its best identity score over
 * everything strummed and is hit at IDENTITY_PASS. The penalty and pass rule
 * match assessPitchOnly (every target hit, overall ≥ 0.75).
 */
function assessChordsPitchOnly(
  chordTargets: ChordTarget[],
  userChords: UserChordEvent[],
  unclear: Set<number>,
  skillTags: string[],
  feedbackText: string,
): AssessmentResult {
  const missedSymbols: string[] = [];
  const partialSymbols: string[] = [];
  const bestScores: number[] = [];
  const outcomes = chordTargets.map((target, i): TargetOutcome => {
    if (unclear.has(i)) return outcome(i, target.onsetTick, 'unclear');
    const best = Math.max(0, ...userChords.map((u) => identity(target, u)));
    bestScores.push(best);
    if (best >= IDENTITY_PASS) return outcome(i, target.onsetTick, 'hit');
    if (best >= IDENTITY_MATCH) {
      partialSymbols.push(target.symbol);
      return outcome(i, target.onsetTick, 'wrong');
    }
    missedSymbols.push(target.symbol);
    return outcome(i, target.onsetTick, 'missed');
  });
  const wrong = wrongChords(chordTargets, userChords);

  const total = bestScores.length;
  const pitchAccuracy = total > 0 ? sumOf(bestScores) / total : 0;
  const overallScore = applyWrongNotePenalty(
    pitchAccuracy,
    total,
    wrong.length,
  );
  const passed =
    overallScore >= 0.75 &&
    missedSymbols.length === 0 &&
    partialSymbols.length === 0;

  return withUnclearVerdict(
    {
      passed,
      pitchAccuracy,
      timingAccuracy: null,
      durationAccuracy: null,
      overallScore,
      missedNotes: [],
      wrongNotes: [],
      xpEarned: Math.round(overallScore * 10),
      skillTagsEarned: passed ? skillTags : [],
      feedbackText: passed
        ? feedbackText
        : chordFailureFeedback(
            missedSymbols,
            partialSymbols,
            wrong.length,
            overallScore,
          ),
      outcomes,
    },
    unclear.size,
    chordTargets.length,
  );
}

/**
 * The gap a target's duration is compared with for "let ring": to the next
 * onset, or for the last one the gap before it.
 */
function ringGap(onsets: number[], target: ChordTarget): number {
  const k = onsets.indexOf(target.onsetTick);
  if (k < onsets.length - 1) return onsets[k + 1] - onsets[k];
  return k > 0 ? onsets[k] - onsets[k - 1] : target.durationTicks;
}

/**
 * Chords, in time. Candidates are strums at IDENTITY_MATCH or better, closest
 * onset first (non-exclusive, as piano's notes are). Timing and duration are
 * scoreNoteContinuous's; the pitch term is the identity score. "Let ring": a
 * target lasting ≥ 0.75 of the gap to the next one isn't penalised for
 * ringing on (held ratio capped at 1), while shorter — staccato — targets
 * keep symmetric scoring, so they must be muted.
 */
function assessChordsInTime(
  chordTargets: ChordTarget[],
  userChords: UserChordEvent[],
  tempo: number,
  assessmentType: 'pitch_order_timing' | 'pitch_order_timing_duration',
  unclear: Set<number>,
  skillTags: string[],
  feedbackText: string,
): AssessmentResult {
  const gradeDuration = assessmentType === 'pitch_order_timing_duration';
  const msPerTick = 60000 / tempo / TICKS_PER_BEAT;
  const onsets = [...new Set(chordTargets.map((t) => t.onsetTick))].sort(
    (a, b) => a - b,
  );

  const missedSymbols: string[] = [];
  const partialSymbols: string[] = [];
  const pitchScores: number[] = [];
  const timingScores: number[] = [];
  const durationScores: number[] = [];
  const outcomes = chordTargets.map((target, i): TargetOutcome => {
    if (unclear.has(i)) return outcome(i, target.onsetTick, 'unclear');
    const candidates = userChords
      .map((u) => ({ ...u, identity: identity(target, u) }))
      .filter((u) => u.identity >= IDENTITY_MATCH);
    if (candidates.length === 0) {
      missedSymbols.push(target.symbol);
      return outcome(i, target.onsetTick, 'missed');
    }
    const best = closestTo(candidates, target.onsetTick);
    const letRing =
      target.durationTicks >= LET_RING_RATIO * ringGap(onsets, target);
    const heldTicks = letRing
      ? Math.min(best.duration, target.durationTicks)
      : best.duration;
    const score = scoreNoteContinuous(
      { note: 0, onset: target.onsetTick, duration: target.durationTicks },
      {
        midi: 0,
        onsetMs: best.onset * msPerTick,
        durationMs: heldTicks * msPerTick,
        confidence: best.confidence,
      },
      tempo,
      assessmentType,
    );
    pitchScores.push(best.identity);
    timingScores.push(score.timingScore);
    durationScores.push(score.durationScore);
    const hit = best.identity >= IDENTITY_PASS;
    if (!hit) partialSymbols.push(target.symbol);
    return {
      ...outcome(i, target.onsetTick, hit ? 'hit' : 'wrong'),
      timingDevTicks: best.onset - target.onsetTick,
      ...(gradeDuration ? { durationRatio: score.durationRatio } : {}),
    };
  });
  const wrong = wrongChords(chordTargets, userChords);
  markWrongTargets(
    outcomes,
    wrong.map((u) => u.onset),
  );

  const total = chordTargets.length - unclear.size;
  const { pitchAccuracy, timingAccuracy, durationAccuracy, baseScore } =
    blendInTime(
      total,
      gradeDuration,
      pitchScores,
      timingScores,
      durationScores,
    );
  const overallScore = applyWrongNotePenalty(baseScore, total, wrong.length);
  const passed = overallScore >= PASS_THRESHOLD;

  return withUnclearVerdict(
    {
      passed,
      pitchAccuracy,
      timingAccuracy,
      durationAccuracy,
      overallScore,
      missedNotes: [],
      wrongNotes: [],
      xpEarned: Math.round(overallScore * 30),
      skillTagsEarned: passed ? skillTags : [],
      feedbackText: passed
        ? feedbackText
        : chordFailureFeedback(
            missedSymbols,
            partialSymbols,
            wrong.length,
            overallScore,
          ),
      outcomes,
    },
    unclear.size,
    chordTargets.length,
  );
}

function assessWithPolicy(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  assessmentType: AssessmentType,
  skillTags: string[],
  feedbackText: string,
  tempo: number,
  policy: AssessmentPolicy,
): AssessmentResult {
  const inTime =
    assessmentType === 'pitch_order_timing' ||
    assessmentType === 'pitch_order_timing_duration';

  if (policy.kind === 'chords') {
    const { chordTargets, userChords } = policy;
    const unclear = unclearSet(
      policy.unclearTargetIndexes,
      chordTargets.length,
    );
    return inTime
      ? assessChordsInTime(
          chordTargets,
          userChords,
          tempo,
          assessmentType,
          unclear,
          skillTags,
          feedbackText,
        )
      : assessChordsPitchOnly(
          chordTargets,
          userChords,
          unclear,
          skillTags,
          feedbackText,
        );
  }

  const octaveCredit =
    policy.match === 'octave_tolerant'
      ? Math.min(
          Math.max(policy.octaveCredit ?? MAX_OCTAVE_CREDIT, 0),
          MAX_OCTAVE_CREDIT,
        )
      : null;
  const unclear = unclearSet(policy.unclearTargetIndexes, targetNotes.length);
  return inTime
    ? assessNotesInTime(
        targetNotes,
        userNotes,
        tempo,
        assessmentType,
        octaveCredit,
        unclear,
        skillTags,
        feedbackText,
      )
    : assessNotesPitchOnly(
        targetNotes,
        userNotes,
        octaveCredit,
        unclear,
        skillTags,
        feedbackText,
      );
}

/**
 * "Count it myself": a pass the student vouches for after detection failed
 * them, so detection never blocks progress. Nothing was measured, so it
 * scores and earns nothing.
 */
export function selfReportedResult(feedbackText: string): AssessmentResult {
  return {
    passed: true,
    pitchAccuracy: 0,
    timingAccuracy: null,
    durationAccuracy: null,
    overallScore: 0,
    missedNotes: [],
    wrongNotes: [],
    xpEarned: 0,
    skillTagsEarned: [],
    feedbackText,
    selfReported: true,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGenreAssessment() {
  const assess = useCallback(
    (
      targetNotes: GenreNoteEvent[],
      userNotes: GenreNoteEvent[],
      assessmentType: AssessmentType,
      skillTags: string[] = [],
      feedbackText: string = '',
      tempo: number = 120,
      policy?: AssessmentPolicy,
    ): AssessmentResult => {
      if (policy) {
        return assessWithPolicy(
          targetNotes,
          userNotes,
          assessmentType,
          skillTags,
          feedbackText,
          tempo,
          policy,
        );
      }

      if (assessmentType === 'pitch_only') {
        return assessPitchOnly(targetNotes, userNotes, skillTags, feedbackText);
      }

      if (
        assessmentType === 'pitch_order_timing' ||
        assessmentType === 'pitch_order_timing_duration'
      ) {
        return assessPitchAndTiming(
          targetNotes,
          userNotes,
          tempo,
          assessmentType,
          skillTags,
          feedbackText,
        );
      }

      // Default: pitch only
      return assessPitchOnly(targetNotes, userNotes, skillTags, feedbackText);
    },
    [],
  );

  return { assess };
}
