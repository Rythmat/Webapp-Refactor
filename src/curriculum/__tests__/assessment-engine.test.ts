/**
 * Phase 11 — Assessment Engine tests.
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from '../engine/assessmentEngine';
import {
  matchPitchOnly,
  matchPitchOrder,
  matchPitchOrderTiming,
  matchPitchOrderTimingDuration,
} from '../engine/assessmentMatchers';
import { calculateScore } from '../engine/assessmentScoring';
import type { MidiNoteEvent } from '../engine/melodyPipeline';

// Helper to create note events
function n(note: number, onset: number, duration: number): MidiNoteEvent {
  return { note, onset, duration };
}

const TEMPO = 120; // BPM → msPerTick = 1.041667

// Sample expected melody: C4 E4 G4 at quarter-note intervals
const expected: MidiNoteEvent[] = [
  n(60, 0, 480), // C4 at beat 1
  n(64, 480, 480), // E4 at beat 2
  n(67, 960, 480), // G4 at beat 3
];

// ---------------------------------------------------------------------------
// matchPitchOnly
// ---------------------------------------------------------------------------
describe('matchPitchOnly', () => {
  it('100% when all pitch classes present (any order)', () => {
    const received = [n(67, 0, 100), n(60, 100, 100), n(64, 200, 100)]; // G C E
    const result = matchPitchOnly(expected, received);
    expect(result.accuracy).toBe(100);
    expect(result.correctCount).toBe(3);
  });

  it('works with octave equivalence', () => {
    const received = [n(72, 0, 100), n(76, 100, 100), n(55, 200, 100)]; // C5 E5 G3
    const result = matchPitchOnly(expected, received);
    expect(result.accuracy).toBe(100);
  });

  it('partial match when some notes missing', () => {
    const received = [n(60, 0, 100)]; // Only C
    const result = matchPitchOnly(expected, received);
    expect(result.correctCount).toBe(1);
    expect(result.accuracy).toBeCloseTo(33.33, 0);
  });

  it('0% when no notes match', () => {
    const received = [n(61, 0, 100), n(63, 100, 100)]; // C# Eb
    const result = matchPitchOnly(expected, received);
    expect(result.accuracy).toBe(0);
  });

  it('handles empty received', () => {
    const result = matchPitchOnly(expected, []);
    expect(result.accuracy).toBe(0);
    expect(result.correctCount).toBe(0);
  });

  it('handles empty expected', () => {
    const result = matchPitchOnly([], [n(60, 0, 100)]);
    expect(result.accuracy).toBe(0);
    expect(result.totalExpected).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// matchPitchOrder
// ---------------------------------------------------------------------------
describe('matchPitchOrder', () => {
  it('100% when exact notes in order', () => {
    const received = [n(60, 0, 100), n(64, 100, 100), n(67, 200, 100)];
    const result = matchPitchOrder(expected, received);
    expect(result.accuracy).toBe(100);
  });

  it('0% when correct notes in wrong order', () => {
    const received = [n(67, 0, 100), n(60, 100, 100), n(64, 200, 100)]; // G C E
    const result = matchPitchOrder(expected, received);
    expect(result.accuracy).toBe(0); // None match at their position
  });

  it('partial match when some positions correct', () => {
    const received = [n(60, 0, 100), n(63, 100, 100), n(67, 200, 100)]; // C Eb G
    const result = matchPitchOrder(expected, received);
    expect(result.correctCount).toBe(2); // C and G correct
  });

  it('handles fewer received than expected', () => {
    const received = [n(60, 0, 100)]; // Only first note
    const result = matchPitchOrder(expected, received);
    expect(result.correctCount).toBe(1);
    expect(result.totalExpected).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// matchPitchOrderTiming
// ---------------------------------------------------------------------------
describe('matchPitchOrderTiming', () => {
  it('100% when notes match with exact timing', () => {
    const received = [n(60, 0, 480), n(64, 480, 480), n(67, 960, 480)];
    const result = matchPitchOrderTiming(expected, received, TEMPO);
    expect(result.accuracy).toBe(100);
  });

  it('tolerates timing within ±200ms', () => {
    // At 120 BPM, msPerTick ≈ 1.04167, so 200ms ≈ 192 ticks
    const received = [
      n(60, 50, 480), // ~52ms early — within tolerance
      n(64, 580, 480), // ~104ms late — within tolerance
      n(67, 960, 480), // exact
    ];
    const result = matchPitchOrderTiming(expected, received, TEMPO);
    expect(result.accuracy).toBe(100);
  });

  it('fails notes outside timing tolerance', () => {
    const received = [
      n(60, 0, 480), // exact
      n(64, 800, 480), // ~333ms late — outside tolerance
      n(67, 960, 480), // exact
    ];
    const result = matchPitchOrderTiming(expected, received, TEMPO);
    expect(result.correctCount).toBe(2);
  });

  it('reports average timing deviation', () => {
    const received = [n(60, 0, 480), n(64, 480, 480), n(67, 960, 480)];
    const result = matchPitchOrderTiming(expected, received, TEMPO);
    expect(result.avgTimingDeviationMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// matchPitchOrderTimingDuration
// ---------------------------------------------------------------------------
describe('matchPitchOrderTimingDuration', () => {
  it('100% when everything matches', () => {
    const received = [n(60, 0, 480), n(64, 480, 480), n(67, 960, 480)];
    const result = matchPitchOrderTimingDuration(expected, received, TEMPO);
    expect(result.accuracy).toBe(100);
  });

  it('fails notes with wrong duration', () => {
    const received = [
      n(60, 0, 480), // exact
      n(64, 480, 100), // duration way off (480 vs 100 → ~396ms diff)
      n(67, 960, 480), // exact
    ];
    const result = matchPitchOrderTimingDuration(expected, received, TEMPO);
    expect(result.correctCount).toBe(2); // Second note fails duration check
  });

  it('tolerates duration within ±300ms', () => {
    // 300ms ≈ 288 ticks at 120 BPM
    const received = [
      n(60, 0, 350), // ~135ms shorter — within tolerance
      n(64, 480, 600), // ~125ms longer — within tolerance
      n(67, 960, 480), // exact
    ];
    const result = matchPitchOrderTimingDuration(expected, received, TEMPO);
    expect(result.accuracy).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateScore
// ---------------------------------------------------------------------------
describe('calculateScore', () => {
  it('grade A for ≥90% accuracy', () => {
    const matchResult = matchPitchOnly(expected, [
      n(60, 0, 100),
      n(64, 100, 100),
      n(67, 200, 100),
    ]);
    const score = calculateScore(matchResult, 'pitch_only');
    expect(score.grade).toBe('A');
    expect(score.passed).toBe(true);
  });

  it('grade retry for <70% accuracy', () => {
    const matchResult = matchPitchOnly(expected, [n(60, 0, 100)]);
    const score = calculateScore(matchResult, 'pitch_only');
    expect(score.grade).toBe('retry');
    expect(score.passed).toBe(false); // pitch_only requires 100%
  });

  it('pitch_order_timing passes at 80%', () => {
    // 2/3 correct = 66.7% → fail
    const partial = {
      noteResults: [
        { expectedIndex: 0, matched: true },
        { expectedIndex: 1, matched: true },
        { expectedIndex: 2, matched: false },
      ],
      correctCount: 2,
      totalExpected: 3,
      accuracy: 66.67,
      avgTimingDeviationMs: 50,
    };
    const score = calculateScore(partial, 'pitch_order_timing', TEMPO);
    expect(score.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluate (integration)
// ---------------------------------------------------------------------------
describe('evaluate', () => {
  it('returns complete result for pitch_only', () => {
    const received = [n(60, 0, 100), n(64, 100, 100), n(67, 200, 100)];
    const result = evaluate(expected, received, 'pitch_only');
    expect(result.type).toBe('pitch_only');
    expect(result.score.passed).toBe(true);
    expect(result.score.grade).toBe('A');
    expect(result.matchResult.correctCount).toBe(3);
  });

  it('returns complete result for pitch_order_timing', () => {
    const received = [n(60, 0, 480), n(64, 480, 480), n(67, 960, 480)];
    const result = evaluate(expected, received, 'pitch_order_timing', TEMPO);
    expect(result.type).toBe('pitch_order_timing');
    expect(result.score.passed).toBe(true);
  });

  it('respects custom tolerances', () => {
    const received = [
      n(60, 0, 480),
      n(64, 580, 480), // ~104ms late
      n(67, 960, 480),
    ];
    // With tight tolerance of 50ms, second note should fail
    const result = evaluate(
      expected,
      received,
      'pitch_order_timing',
      TEMPO,
      50,
    );
    expect(result.score.accuracy).toBeLessThan(100);
  });
});
