/**
 * Phase 11 — Assessment Matchers.
 *
 * Four escalating assessment types that compare student MIDI input
 * against expected note events:
 *   1. pitch_only       — correct pitch classes, any order
 *   2. pitch_order      — correct pitches in correct order
 *   3. pitch_order_timing — correct pitches, order, and timing (±200ms)
 *   4. pitch_order_timing_duration — all above + duration accuracy (±300ms)
 */

import type { MidiNoteEvent } from './melodyPipeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssessmentType =
  | 'pitch_only'
  | 'pitch_order'
  | 'pitch_order_timing'
  | 'pitch_order_timing_duration';

export interface NoteMatchResult {
  /** Index in expected array */
  expectedIndex: number;
  /** Whether this note was matched */
  matched: boolean;
  /** The received note that matched (if any) */
  receivedNote?: MidiNoteEvent;
  /** Timing deviation in ms (if timing assessed) */
  timingDeviationMs?: number;
  /** Duration deviation in ms (if duration assessed) */
  durationDeviationMs?: number;
}

export interface MatchResult {
  /** Per-note match details */
  noteResults: NoteMatchResult[];
  /** Number of correctly matched notes */
  correctCount: number;
  /** Total expected notes */
  totalExpected: number;
  /** Percentage correct (0-100) */
  accuracy: number;
  /** Average timing deviation in ms (if applicable) */
  avgTimingDeviationMs?: number;
  /** Average duration deviation in ms (if applicable) */
  avgDurationDeviationMs?: number;
}

// ---------------------------------------------------------------------------
// Matchers
// ---------------------------------------------------------------------------

/**
 * Match by pitch class only — order doesn't matter.
 * Student must play the correct set of pitch classes (mod 12).
 */
export function matchPitchOnly(
  expected: MidiNoteEvent[],
  received: MidiNoteEvent[],
): MatchResult {
  const expectedPCs = expected.map((e) => e.note % 12);
  const receivedPCs = new Set(received.map((r) => r.note % 12));

  const noteResults: NoteMatchResult[] = expectedPCs.map((pc, i) => ({
    expectedIndex: i,
    matched: receivedPCs.has(pc),
  }));

  const correctCount = noteResults.filter((r) => r.matched).length;

  return {
    noteResults,
    correctCount,
    totalExpected: expected.length,
    accuracy: expected.length > 0 ? (correctCount / expected.length) * 100 : 0,
  };
}

/**
 * Match by pitch in order — correct notes in correct sequence.
 * Uses the actual MIDI note values (not just pitch classes).
 */
export function matchPitchOrder(
  expected: MidiNoteEvent[],
  received: MidiNoteEvent[],
): MatchResult {
  const noteResults: NoteMatchResult[] = expected.map((exp, i) => {
    const rec = received[i];
    const matched = rec !== undefined && rec.note === exp.note;
    return {
      expectedIndex: i,
      matched,
      receivedNote: rec,
    };
  });

  const correctCount = noteResults.filter((r) => r.matched).length;

  return {
    noteResults,
    correctCount,
    totalExpected: expected.length,
    accuracy: expected.length > 0 ? (correctCount / expected.length) * 100 : 0,
  };
}

/**
 * Match by pitch, order, and timing (±tolerance).
 * Each note must be the correct pitch, in order, and within timing tolerance.
 *
 * @param timingToleranceMs - Maximum allowed timing deviation (default 200ms)
 * @param tempo - Tempo in BPM (used to convert ticks to ms)
 */
export function matchPitchOrderTiming(
  expected: MidiNoteEvent[],
  received: MidiNoteEvent[],
  tempo: number,
  timingToleranceMs: number = 200,
): MatchResult {
  const msPerTick = 60000 / tempo / 480;

  const noteResults: NoteMatchResult[] = expected.map((exp, i) => {
    const rec = received[i];
    if (!rec) {
      return { expectedIndex: i, matched: false };
    }

    const pitchMatch = rec.note === exp.note;
    const expectedOnsetMs = exp.onset * msPerTick;
    const receivedOnsetMs = rec.onset * msPerTick;
    const timingDeviationMs = Math.abs(receivedOnsetMs - expectedOnsetMs);
    const timingMatch = timingDeviationMs <= timingToleranceMs;

    return {
      expectedIndex: i,
      matched: pitchMatch && timingMatch,
      receivedNote: rec,
      timingDeviationMs,
    };
  });

  const correctCount = noteResults.filter((r) => r.matched).length;
  const timingDeviations = noteResults
    .filter((r) => r.timingDeviationMs !== undefined)
    .map((r) => r.timingDeviationMs!);
  const avgTimingDeviationMs =
    timingDeviations.length > 0
      ? timingDeviations.reduce((a, b) => a + b, 0) / timingDeviations.length
      : undefined;

  return {
    noteResults,
    correctCount,
    totalExpected: expected.length,
    accuracy: expected.length > 0 ? (correctCount / expected.length) * 100 : 0,
    avgTimingDeviationMs,
  };
}

/**
 * Match by pitch, order, timing, and duration.
 * Full assessment: correct pitch, order, timing (±200ms), and duration (±300ms).
 *
 * @param tempo - Tempo in BPM
 * @param timingToleranceMs - Max timing deviation (default 200ms)
 * @param durationToleranceMs - Max duration deviation (default 300ms)
 */
export function matchPitchOrderTimingDuration(
  expected: MidiNoteEvent[],
  received: MidiNoteEvent[],
  tempo: number,
  timingToleranceMs: number = 200,
  durationToleranceMs: number = 300,
): MatchResult {
  const msPerTick = 60000 / tempo / 480;

  const noteResults: NoteMatchResult[] = expected.map((exp, i) => {
    const rec = received[i];
    if (!rec) {
      return { expectedIndex: i, matched: false };
    }

    const pitchMatch = rec.note === exp.note;
    const expectedOnsetMs = exp.onset * msPerTick;
    const receivedOnsetMs = rec.onset * msPerTick;
    const timingDeviationMs = Math.abs(receivedOnsetMs - expectedOnsetMs);
    const timingMatch = timingDeviationMs <= timingToleranceMs;

    const expectedDurMs = exp.duration * msPerTick;
    const receivedDurMs = rec.duration * msPerTick;
    const durationDeviationMs = Math.abs(receivedDurMs - expectedDurMs);
    const durationMatch = durationDeviationMs <= durationToleranceMs;

    return {
      expectedIndex: i,
      matched: pitchMatch && timingMatch && durationMatch,
      receivedNote: rec,
      timingDeviationMs,
      durationDeviationMs,
    };
  });

  const correctCount = noteResults.filter((r) => r.matched).length;

  const timingDeviations = noteResults
    .filter((r) => r.timingDeviationMs !== undefined)
    .map((r) => r.timingDeviationMs!);
  const avgTimingDeviationMs =
    timingDeviations.length > 0
      ? timingDeviations.reduce((a, b) => a + b, 0) / timingDeviations.length
      : undefined;

  const durationDeviations = noteResults
    .filter((r) => r.durationDeviationMs !== undefined)
    .map((r) => r.durationDeviationMs!);
  const avgDurationDeviationMs =
    durationDeviations.length > 0
      ? durationDeviations.reduce((a, b) => a + b, 0) /
        durationDeviations.length
      : undefined;

  return {
    noteResults,
    correctCount,
    totalExpected: expected.length,
    accuracy: expected.length > 0 ? (correctCount / expected.length) * 100 : 0,
    avgTimingDeviationMs,
    avgDurationDeviationMs,
  };
}
