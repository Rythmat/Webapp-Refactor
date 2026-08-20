/**
 * useGenreAssessment.ts — Self-contained assessment engine for v2 genre curriculum.
 *
 * Pitch-only (OOT) scoring is exact-MIDI and self-contained (timing/duration
 * don't apply to Out-of-Time activities by design). Timing/duration scoring
 * (IT) delegates the per-note math to continuousMatchers.ts — the same
 * Gaussian pitch/timing-decay + duration-ratio engine built for the v2
 * continuous-feedback system — rather than re-deriving it here.
 */

import { useCallback } from 'react';
import {
  scoreNoteContinuous,
  type ReceivedNote,
} from '../engine/continuousMatchers';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import type { AssessmentType } from '../types/activity';

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
}

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
    ): AssessmentResult => {
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
