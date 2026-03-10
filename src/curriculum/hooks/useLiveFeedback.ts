/**
 * Phase 24 — Live Feedback Hook.
 *
 * Compares real-time MIDI input against expected events during
 * play-along and assessment activities. Emits per-note feedback
 * events for the UI to render (correct/wrong/early/late).
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import type { AssessmentType } from '../types/activity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackStatus = 'correct' | 'wrong' | 'early' | 'late';

export interface NoteFeedback {
  /** Index of the expected note */
  noteIdx: number;
  /** Feedback status */
  status: FeedbackStatus;
  /** Timing deviation in ms (positive = late, negative = early) */
  deviationMs: number;
  /** Timestamp when this feedback was generated */
  timestamp: number;
}

export interface LiveFeedbackState {
  /** All feedback events so far */
  feedbackEvents: NoteFeedback[];
  /** Running accuracy percentage */
  accuracy: number;
  /** Current streak of correct notes */
  streak: number;
  /** Best streak achieved */
  bestStreak: number;
  /** Total notes evaluated */
  totalEvaluated: number;
  /** Total correct notes */
  totalCorrect: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default timing tolerance in ms */
const DEFAULT_TOLERANCE_MS = 200;

/** Pitch class comparison (mod 12) */
function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Live feedback hook for real-time assessment during play-along.
 *
 * @param expectedEvents - The expected MIDI note events
 * @param assessmentType - Type of assessment (affects tolerance)
 * @param tempo - Tempo in BPM (for tick→ms conversion)
 */
export function useLiveFeedback(
  expectedEvents: MidiNoteEvent[],
  assessmentType: AssessmentType = 'pitch_only',
  tempo: number = 120,
) {
  const [feedbackEvents, setFeedbackEvents] = useState<NoteFeedback[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const nextExpectedIdxRef = useRef(0);
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);

  // Tolerance based on assessment type
  const toleranceMs = useMemo(() => {
    switch (assessmentType) {
      case 'pitch_only':
      case 'pitch_order':
        return Infinity; // No timing requirement
      case 'pitch_order_timing':
        return DEFAULT_TOLERANCE_MS;
      case 'pitch_order_timing_duration':
        return DEFAULT_TOLERANCE_MS;
    }
  }, [assessmentType]);

  // Ticks to ms conversion
  const ticksToMs = useCallback(
    (ticks: number) => (ticks / 480) * (60000 / tempo),
    [tempo],
  );

  /**
   * Evaluate a single incoming note against the expected sequence.
   * Call this for each MIDI note-on event during playback.
   */
  const evaluateNote = useCallback(
    (receivedMidi: number, currentTickMs: number): NoteFeedback | null => {
      const idx = nextExpectedIdxRef.current;
      if (idx >= expectedEvents.length) return null;

      const expected = expectedEvents[idx];
      const expectedMs = ticksToMs(expected.onset);
      const deviationMs = currentTickMs - expectedMs;

      let status: FeedbackStatus;

      // Check pitch
      const pitchCorrect =
        assessmentType === 'pitch_only'
          ? pitchClass(receivedMidi) === pitchClass(expected.note)
          : receivedMidi === expected.note;

      if (!pitchCorrect) {
        status = 'wrong';
      } else if (toleranceMs === Infinity) {
        status = 'correct';
      } else if (Math.abs(deviationMs) <= toleranceMs) {
        status = deviationMs < -toleranceMs / 2 ? 'early' : 'correct';
      } else {
        status = deviationMs > 0 ? 'late' : 'early';
      }

      const feedback: NoteFeedback = {
        noteIdx: idx,
        status,
        deviationMs,
        timestamp: Date.now(),
      };

      // Update counters
      totalCountRef.current++;
      if (status === 'correct') {
        correctCountRef.current++;
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
    [expectedEvents, assessmentType, toleranceMs, ticksToMs],
  );

  /**
   * Reset the feedback state for a new attempt.
   */
  const reset = useCallback(() => {
    setFeedbackEvents([]);
    setStreak(0);
    setBestStreak(0);
    nextExpectedIdxRef.current = 0;
    correctCountRef.current = 0;
    totalCountRef.current = 0;
  }, []);

  const accuracy = useMemo(() => {
    if (totalCountRef.current === 0) return 100;
    return Math.round((correctCountRef.current / totalCountRef.current) * 100);
  }, [feedbackEvents]); // recalc when feedbackEvents changes

  const state: LiveFeedbackState = {
    feedbackEvents,
    accuracy,
    streak,
    bestStreak,
    totalEvaluated: totalCountRef.current,
    totalCorrect: correctCountRef.current,
  };

  return { state, evaluateNote, reset };
}
