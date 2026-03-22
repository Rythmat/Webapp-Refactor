// ── useContinuousFeedback ─────────────────────────────────────────────────
// Real-time continuous feedback during play-along activities.
// Replaces the binary correct/wrong feedback from useLiveFeedback with
// quality labels: perfect, good, ok, miss.
//
// This hook consumes the same expected events but produces richer output
// using the continuous scoring system.

import { useState, useCallback, useRef, useMemo } from 'react';
import type { ContinuousNoteFeedback } from '@/learn/audio/v2/types';
import {
  scoreNoteContinuous,
  type ReceivedNote,
} from '../engine/continuousMatchers';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import type { AssessmentType } from '../types/activity';

// ── Types ────────────────────────────────────────────────────────────────

export type Quality = 'perfect' | 'good' | 'ok' | 'miss';

export interface ContinuousFeedbackState {
  /** All feedback events so far. */
  feedbackEvents: ContinuousNoteFeedback[];
  /** Running composite score (0–1). */
  compositeScore: number;
  /** Current streak of non-miss notes. */
  streak: number;
  /** Best streak achieved. */
  bestStreak: number;
  /** Total notes evaluated. */
  totalEvaluated: number;
  /** Quality distribution. */
  qualityCounts: Record<Quality, number>;
}

// ── Constants ────────────────────────────────────────────────────────────

const TICKS_PER_QUARTER = 480;

/** Quality thresholds (applied to composite score). */
const QUALITY_THRESHOLDS: Array<{ min: number; label: Quality }> = [
  { min: 0.95, label: 'perfect' },
  { min: 0.8, label: 'good' },
  { min: 0.5, label: 'ok' },
  { min: 0, label: 'miss' },
];

function scoreToQuality(score: number): Quality {
  for (const { min, label } of QUALITY_THRESHOLDS) {
    if (score >= min) return label;
  }
  return 'miss';
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Continuous feedback hook for real-time assessment during play-along.
 *
 * @param expectedEvents — The expected MIDI note events
 * @param assessmentType — Type of assessment (affects which dimensions are scored)
 * @param tempo — Tempo in BPM (for tick→ms conversion)
 */
export function useContinuousFeedback(
  expectedEvents: MidiNoteEvent[],
  assessmentType: AssessmentType = 'pitch_only',
  tempo: number = 120,
) {
  const [feedbackEvents, setFeedbackEvents] = useState<
    ContinuousNoteFeedback[]
  >([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const nextExpectedIdxRef = useRef(0);
  const compositeAccRef = useRef(0);
  const totalCountRef = useRef(0);
  const qualityCountsRef = useRef<Record<Quality, number>>({
    perfect: 0,
    good: 0,
    ok: 0,
    miss: 0,
  });

  const ticksToMs = useCallback(
    (ticks: number) => (ticks / TICKS_PER_QUARTER) * (60000 / tempo),
    [tempo],
  );

  /**
   * Evaluate a single incoming note against the expected sequence.
   * Call this for each note-on event during playback.
   *
   * @param receivedMidi — MIDI note number
   * @param currentTickMs — Current time in ms relative to performance start
   * @param durationMs — Note duration in ms (from note-off)
   * @param confidence — Detection confidence from tracker (0–1)
   */
  const evaluateNote = useCallback(
    (
      receivedMidi: number,
      currentTickMs: number,
      durationMs: number = 0,
      confidence: number = 1,
    ): ContinuousNoteFeedback | null => {
      const idx = nextExpectedIdxRef.current;
      if (idx >= expectedEvents.length) return null;

      const expected = expectedEvents[idx];
      const expectedOnsetMs = ticksToMs(expected.onset);
      const deviationMs = currentTickMs - expectedOnsetMs;

      const received: ReceivedNote = {
        midi: receivedMidi,
        onsetMs: currentTickMs,
        durationMs,
        confidence,
      };

      const score = scoreNoteContinuous(
        expected,
        received,
        tempo,
        assessmentType,
      );

      const quality = scoreToQuality(score.compositeScore);

      const feedback: ContinuousNoteFeedback = {
        noteIdx: idx,
        score,
        quality,
        deviationMs,
        timestamp: performance.now(),
      };

      // Update accumulators
      totalCountRef.current++;
      compositeAccRef.current += score.compositeScore;
      qualityCountsRef.current[quality]++;

      if (quality !== 'miss') {
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
      }

      nextExpectedIdxRef.current = idx + 1;
      setFeedbackEvents((prev) => [...prev, feedback]);

      return feedback;
    },
    [expectedEvents, assessmentType, tempo, ticksToMs],
  );

  /** Reset the feedback state for a new attempt. */
  const reset = useCallback(() => {
    setFeedbackEvents([]);
    setStreak(0);
    setBestStreak(0);
    nextExpectedIdxRef.current = 0;
    compositeAccRef.current = 0;
    totalCountRef.current = 0;
    qualityCountsRef.current = { perfect: 0, good: 0, ok: 0, miss: 0 };
  }, []);

  const compositeScore = useMemo(() => {
    if (totalCountRef.current === 0) return 1;
    return compositeAccRef.current / totalCountRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackEvents]);

  const state: ContinuousFeedbackState = {
    feedbackEvents,
    compositeScore,
    streak,
    bestStreak,
    totalEvaluated: totalCountRef.current,
    qualityCounts: { ...qualityCountsRef.current },
  };

  return { state, evaluateNote, reset };
}
