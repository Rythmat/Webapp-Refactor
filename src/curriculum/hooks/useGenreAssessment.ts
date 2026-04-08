/**
 * useGenreAssessment.ts — Self-contained assessment engine for v2 genre curriculum.
 *
 * No dependency on existing assessment engine.
 */

import { useCallback } from 'react';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
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

const TIMING_TOLERANCE_TICKS = 480; // one quarter note window — generous for L1
const PASS_THRESHOLD = 0.60; // 60% to pass — encouraging for beginners

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

function assessPitchOnly(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  skillTags: string[],
  feedbackText: string,
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

  // Wrong note penalty: scales relative to activity size
  const wrongPenalty =
    wrong.length > 0
      ? wrong.length / (targetMidis.size + wrong.length)
      : 0;

  // Final score: pitch accuracy minus wrong note penalty (weighted 50%)
  const overallScore = Math.max(0, pitchAccuracy - wrongPenalty * 0.5);

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

function assessPitchAndTiming(
  targetNotes: GenreNoteEvent[],
  userNotes: GenreNoteEvent[],
  toleranceTicks: number,
  skillTags: string[],
  feedbackText: string,
): AssessmentResult {
  let pitchScore = 0;
  let timingScore = 0;
  const missed: number[] = [];
  const wrong: number[] = [];

  for (const target of targetNotes) {
    // Find all user notes matching this pitch
    const candidates = userNotes.filter((u) => u.midi === target.midi);

    if (candidates.length === 0) {
      missed.push(target.midi);
      continue;
    }

    // Pick closest in time
    const best = candidates.reduce((a, b) =>
      Math.abs(a.onset - target.onset) < Math.abs(b.onset - target.onset)
        ? a
        : b,
    );

    const timingDelta = Math.abs(best.onset - target.onset);

    // Pitch: binary (right note = 1)
    pitchScore += 1;

    // Timing: graduated (perfect = 1.0, at tolerance = 0.5, beyond = 0)
    if (timingDelta <= toleranceTicks) {
      timingScore += 1 - (timingDelta / toleranceTicks) * 0.5;
    }
  }

  // Wrong notes = played but not matching any target pitch
  const matchedMidis = new Set(targetNotes.map((t) => t.midi));
  userNotes.forEach((u) => {
    if (!matchedMidis.has(u.midi)) wrong.push(u.midi);
  });

  const total = targetNotes.length;
  const pitchAccuracy = total > 0 ? pitchScore / total : 0;
  const timingAccuracy = total > 0 ? timingScore / total : 0;

  // Overall: 60% pitch weight, 40% timing weight
  const overallScore = pitchAccuracy * 0.6 + timingAccuracy * 0.4;
  const passed = overallScore >= PASS_THRESHOLD;

  return {
    passed,
    pitchAccuracy,
    timingAccuracy,
    durationAccuracy: null,
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
          TIMING_TOLERANCE_TICKS,
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
