// ── Continuous Assessment Matchers ─────────────────────────────────────────
// Replaces the binary matching in assessmentMatchers.ts with continuous
// scoring on multiple dimensions. Every note gets a 0–1 score instead
// of a binary matched/unmatched.
//
// Scoring dimensions:
//   Pitch:    Gaussian decay from 0 cents deviation
//   Timing:   Gaussian decay from 0 timing deviation (as fraction of beat)
//   Duration: Penalizes both too short and too long
//   Confidence: Detection confidence from the tracker (sqrt-scaled)
//
// Composite: Weighted geometric mean of applicable dimensions.

import type {
  ContinuousNoteScore,
  ContinuousPerformanceScore,
} from '@/learn/audio/v2/types';
import type { AssessmentType } from './assessmentMatchers';
import type { MidiNoteEvent } from './melodyPipeline';

// ── Constants ─────────────────────────────────────────────────────────────

/** Gaussian sigma for pitch scoring: 50 cents = ~half semitone. */
const PITCH_SIGMA_CENTS = 50;

/** Gaussian sigma for timing scoring: 15% of beat duration. */
const TIMING_SIGMA_RATIO = 0.15;

/** Default partial credit for octave equivalence (right pitch class, wrong octave). */
const DEFAULT_OCTAVE_EQUIVALENCE_WEIGHT = 0.5;

/** PPQ ticks per quarter note (from melodyPipeline). */
const TICKS_PER_QUARTER = 480;

// ── Types ─────────────────────────────────────────────────────────────────

export interface ContinuousScoringOptions {
  /** How much credit for right pitch class but wrong octave (0–1). Default 0.5. */
  octaveEquivalenceWeight?: number;

  /** Timing scoring curve. Default 'gaussian'. */
  timingCurve?: 'linear' | 'gaussian';
}

export interface ReceivedNote {
  /** MIDI note number. */
  midi: number;

  /** Onset time in ms (relative to performance start). */
  onsetMs: number;

  /** Duration in ms. */
  durationMs: number;

  /** Detection confidence from the tracker (0–1). */
  confidence: number;
}

// ── Single Note Scoring ───────────────────────────────────────────────────

/**
 * Score a single expected↔received note pair on all dimensions.
 */
export function scoreNoteContinuous(
  expected: MidiNoteEvent,
  received: ReceivedNote,
  tempo: number,
  assessmentType: AssessmentType,
  options?: ContinuousScoringOptions,
): ContinuousNoteScore {
  const octaveWeight =
    options?.octaveEquivalenceWeight ?? DEFAULT_OCTAVE_EQUIVALENCE_WEIGHT;
  const timingCurve = options?.timingCurve ?? 'gaussian';

  const msPerTick = 60000 / tempo / TICKS_PER_QUARTER;
  const beatDurationMs = 60000 / tempo; // duration of one beat in ms

  // ── Pitch scoring ─────────────────────────────────────────────────────

  const semitoneDiff = received.midi - expected.note;
  const centsDiff = Math.abs(semitoneDiff * 100); // semitones → cents
  const octaveEquivalent =
    semitoneDiff !== 0 && received.midi % 12 === expected.note % 12;

  let pitchScore: number;
  if (centsDiff === 0) {
    pitchScore = 1.0; // perfect match
  } else if (octaveEquivalent) {
    pitchScore = octaveWeight; // right pitch class, wrong octave
  } else {
    // Gaussian decay from 0 cents
    pitchScore = Math.exp(-0.5 * (centsDiff / PITCH_SIGMA_CENTS) ** 2);
  }

  // ── Timing scoring ────────────────────────────────────────────────────

  const expectedOnsetMs = expected.onset * msPerTick;
  const timingDeviationMs = received.onsetMs - expectedOnsetMs;
  const timingDeviationRatio =
    beatDurationMs > 0 ? Math.abs(timingDeviationMs) / beatDurationMs : 0;

  let timingScore: number;
  if (timingCurve === 'gaussian') {
    timingScore = Math.exp(
      -0.5 * (timingDeviationRatio / TIMING_SIGMA_RATIO) ** 2,
    );
  } else {
    // Linear: 100% at 0 deviation, 0% at 30% of beat
    timingScore = Math.max(0, 1 - timingDeviationRatio / 0.3);
  }

  // ── Duration scoring ──────────────────────────────────────────────────

  const expectedDurationMs = expected.duration * msPerTick;
  const durationRatio =
    expectedDurationMs > 0 ? received.durationMs / expectedDurationMs : 1;

  // Score = exp(-|ln(ratio)|²) — penalizes both too short and too long
  const lnRatio = Math.log(Math.max(0.01, durationRatio));
  const durationScore = Math.exp(-(lnRatio * lnRatio));

  // ── Confidence weighting ──────────────────────────────────────────────

  const noteConfidence = received.confidence;
  const confidenceWeight = Math.sqrt(Math.max(0, noteConfidence));

  // ── Composite score (weighted geometric mean) ─────────────────────────

  let compositeScore: number;

  switch (assessmentType) {
    case 'pitch_only':
      // Only pitch matters
      compositeScore = pitchScore * confidenceWeight;
      break;

    case 'pitch_order':
      // Pitch matters, order is handled by sequence alignment
      compositeScore = pitchScore * confidenceWeight;
      break;

    case 'pitch_order_timing':
      // Pitch and timing
      compositeScore = Math.sqrt(pitchScore * timingScore) * confidenceWeight;
      break;

    case 'pitch_order_timing_duration':
      // All three dimensions
      compositeScore =
        Math.cbrt(pitchScore * timingScore * durationScore) * confidenceWeight;
      break;

    default:
      compositeScore = pitchScore * confidenceWeight;
  }

  return {
    pitchDistanceCents: centsDiff,
    pitchScore,
    timingDeviationRatio,
    timingScore,
    durationRatio,
    durationScore,
    noteConfidence,
    octaveEquivalent,
    pitchDeviationSemitones: semitoneDiff,
    compositeScore: Math.max(0, Math.min(1, compositeScore)),
  };
}

// ── Performance Scoring ───────────────────────────────────────────────────

/**
 * Score an entire performance: align expected and received notes,
 * compute per-note continuous scores, and aggregate.
 */
export function scorePerformanceContinuous(
  expected: MidiNoteEvent[],
  received: ReceivedNote[],
  tempo: number,
  assessmentType: AssessmentType,
  options?: ContinuousScoringOptions,
): ContinuousPerformanceScore {
  if (expected.length === 0) {
    return {
      overallScore: 1,
      pitchScore: 1,
      timingScore: 1,
      durationScore: 1,
      perNoteScores: [],
      grade: 'A',
      passed: true,
      weakestDimension: 'pitch',
    };
  }

  // For pitch_only: match by pitch class set (order doesn't matter)
  if (assessmentType === 'pitch_only') {
    return scorePitchOnly(expected, received, tempo, options);
  }

  // For ordered assessments: position-by-position matching
  const perNoteScores: ContinuousNoteScore[] = [];

  for (let i = 0; i < expected.length; i++) {
    if (i < received.length) {
      const score = scoreNoteContinuous(
        expected[i],
        received[i],
        tempo,
        assessmentType,
        options,
      );
      perNoteScores.push(score);
    } else {
      // Missing note = zero score
      perNoteScores.push({
        pitchDistanceCents: Infinity,
        pitchScore: 0,
        timingDeviationRatio: Infinity,
        timingScore: 0,
        durationRatio: 0,
        durationScore: 0,
        noteConfidence: 0,
        octaveEquivalent: false,
        pitchDeviationSemitones: 0,
        compositeScore: 0,
      });
    }
  }

  return aggregateScores(perNoteScores, assessmentType);
}

// ── Internal ──────────────────────────────────────────────────────────────

/**
 * Pitch-only scoring: match by pitch class set (order doesn't matter).
 * Each expected pitch class gets the best matching received note's score.
 */
function scorePitchOnly(
  expected: MidiNoteEvent[],
  received: ReceivedNote[],
  _tempo: number,
  _options?: ContinuousScoringOptions,
): ContinuousPerformanceScore {
  const expectedPCs = expected.map((e) => e.note % 12);
  const receivedPCs = new Map<number, ReceivedNote>();
  for (const r of received) {
    const pc = r.midi % 12;
    // Keep the highest-confidence detection for each pitch class
    const existing = receivedPCs.get(pc);
    if (!existing || r.confidence > existing.confidence) {
      receivedPCs.set(pc, r);
    }
  }

  const perNoteScores: ContinuousNoteScore[] = expectedPCs.map((pc) => {
    const matched = receivedPCs.get(pc);
    if (matched) {
      // Pitch class matches — full credit (octave doesn't matter for pitch_only)
      return {
        pitchDistanceCents: 0,
        pitchScore: 1,
        timingDeviationRatio: 0,
        timingScore: 1,
        durationRatio: 1,
        durationScore: 1,
        noteConfidence: matched.confidence,
        octaveEquivalent: false,
        pitchDeviationSemitones: 0,
        compositeScore: Math.sqrt(matched.confidence),
      };
    }
    // Not matched
    return {
      pitchDistanceCents: Infinity,
      pitchScore: 0,
      timingDeviationRatio: Infinity,
      timingScore: 0,
      durationRatio: 0,
      durationScore: 0,
      noteConfidence: 0,
      octaveEquivalent: false,
      pitchDeviationSemitones: 0,
      compositeScore: 0,
    };
  });

  return aggregateScores(perNoteScores, 'pitch_only');
}

/**
 * Aggregate per-note scores into a performance score.
 */
function aggregateScores(
  perNoteScores: ContinuousNoteScore[],
  assessmentType: AssessmentType,
): ContinuousPerformanceScore {
  if (perNoteScores.length === 0) {
    return {
      overallScore: 1,
      pitchScore: 1,
      timingScore: 1,
      durationScore: 1,
      perNoteScores: [],
      grade: 'A',
      passed: true,
      weakestDimension: 'pitch',
    };
  }

  // Average each dimension
  let pitchSum = 0;
  let timingSum = 0;
  let durationSum = 0;
  let compositeSum = 0;

  for (const s of perNoteScores) {
    pitchSum += s.pitchScore;
    timingSum += s.timingScore;
    durationSum += s.durationScore;
    compositeSum += s.compositeScore;
  }

  const n = perNoteScores.length;
  const pitchScore = pitchSum / n;
  const timingScore = timingSum / n;
  const durationScore = durationSum / n;
  const overallScore = compositeSum / n;

  // Grade boundaries (same as v1: A≥0.9, B≥0.8, C≥0.7)
  let grade: 'A' | 'B' | 'C' | 'Retry';
  if (overallScore >= 0.9) grade = 'A';
  else if (overallScore >= 0.8) grade = 'B';
  else if (overallScore >= 0.7) grade = 'C';
  else grade = 'Retry';

  // Pass thresholds (same structure as v1)
  let passed: boolean;
  switch (assessmentType) {
    case 'pitch_only':
    case 'pitch_order':
      passed = overallScore >= 0.9; // strict for pitch-only
      break;
    case 'pitch_order_timing':
    case 'pitch_order_timing_duration':
      passed = overallScore >= 0.7; // more forgiving when timing matters
      break;
    default:
      passed = overallScore >= 0.7;
  }

  // Weakest dimension
  const dims: Array<{ name: 'pitch' | 'timing' | 'duration'; score: number }> =
    [
      { name: 'pitch', score: pitchScore },
      { name: 'timing', score: timingScore },
      { name: 'duration', score: durationScore },
    ];
  dims.sort((a, b) => a.score - b.score);
  const weakestDimension = dims[0].name;

  return {
    overallScore,
    pitchScore,
    timingScore,
    durationScore,
    perNoteScores,
    grade,
    passed,
    weakestDimension,
  };
}
