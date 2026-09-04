/**
 * useGenreAssessment tests — pitch/timing/duration/wrong-note scoring.
 */

import { describe, it, expect } from 'vitest';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
import {
  assessPitchOnly,
  assessPitchAndTiming,
} from '../hooks/useGenreAssessment';

const TEMPO = 120; // BPM → msPerTick = 1.041667

function n(midi: number, onset: number, duration: number): GenreNoteEvent {
  return { midi, onset, duration };
}

// C4 E4 G4 at quarter-note intervals (480 ticks/beat)
const target: GenreNoteEvent[] = [
  n(60, 0, 480),
  n(64, 480, 480),
  n(67, 960, 480),
];

describe('assessPitchOnly (Out-of-Time)', () => {
  it('scores 100% for exact pitches in any order, no timing/duration graded', () => {
    const played = [n(67, 999, 10), n(60, 0, 10), n(64, 500, 10)]; // order/timing irrelevant
    const result = assessPitchOnly(target, played);
    expect(result.overallScore).toBe(1);
    expect(result.pitchAccuracy).toBe(1);
    expect(result.timingAccuracy).toBeNull();
    expect(result.durationAccuracy).toBeNull();
    expect(result.wrongNotes).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('penalizes a wrong/extra note even though timing is not graded', () => {
    const played = [...target, n(61, 1440, 480)]; // extra wrong note (Db)
    const result = assessPitchOnly(target, played);
    expect(result.wrongNotes).toEqual([61]);
    expect(result.overallScore).toBeLessThan(1);
    expect(result.pitchAccuracy).toBe(1); // pitch dimension itself unaffected
  });

  it('exact-octave matching — same pitch class, wrong octave, does not count as correct', () => {
    const played = [n(72, 0, 10), n(64, 480, 10), n(67, 960, 10)]; // C5 instead of C4
    const result = assessPitchOnly(target, played);
    expect(result.missedNotes).toEqual([60]);
    expect(result.pitchAccuracy).toBeCloseTo(2 / 3);
  });
});

describe('assessPitchAndTiming — pitch_order_timing (In-Time)', () => {
  it('scores near-1 for exact pitch + exact onset', () => {
    const played = target.map((t) => ({ ...t }));
    const result = assessPitchAndTiming(
      target,
      played,
      TEMPO,
      'pitch_order_timing',
    );
    expect(result.overallScore).toBeGreaterThan(0.95);
    expect(result.pitchAccuracy).toBe(1);
    expect(result.timingAccuracy).toBeGreaterThan(0.95);
    expect(result.durationAccuracy).toBeNull(); // not graded for this type
    expect(result.passed).toBe(true);
  });

  it('penalizes sloppy timing via real Gaussian decay, not a step function', () => {
    // Each note played a full beat (480 ticks) late.
    const played = target.map((t) => ({ ...t, onset: t.onset + 480 }));
    const result = assessPitchAndTiming(
      target,
      played,
      TEMPO,
      'pitch_order_timing',
    );
    expect(result.pitchAccuracy).toBe(1);
    expect(result.timingAccuracy).toBeLessThan(0.3);
    expect(result.overallScore).toBeLessThan(0.7);
  });

  it('penalizes a wrong/extra note played during an IT activity (previously a no-op)', () => {
    const played = [...target, n(61, 1440, 480)];
    const clean = assessPitchAndTiming(
      target,
      target,
      TEMPO,
      'pitch_order_timing',
    );
    const withWrongNote = assessPitchAndTiming(
      target,
      played,
      TEMPO,
      'pitch_order_timing',
    );
    expect(withWrongNote.wrongNotes).toEqual([61]);
    expect(withWrongNote.overallScore).toBeLessThan(clean.overallScore);
  });

  it('missed notes drag the score down proportionally, not by exclusion', () => {
    const played = [target[0]]; // only played the first of three notes
    const result = assessPitchAndTiming(
      target,
      played,
      TEMPO,
      'pitch_order_timing',
    );
    expect(result.missedNotes).toEqual([64, 67]);
    expect(result.pitchAccuracy).toBeCloseTo(1 / 3);
  });
});

describe('assessPitchAndTiming — pitch_order_timing_duration (In-Time + duration)', () => {
  it('populates durationAccuracy (previously always null)', () => {
    const played = target.map((t) => ({ ...t }));
    const result = assessPitchAndTiming(
      target,
      played,
      TEMPO,
      'pitch_order_timing_duration',
    );
    expect(result.durationAccuracy).not.toBeNull();
    expect(result.durationAccuracy!).toBeGreaterThan(0.95);
    expect(result.overallScore).toBeGreaterThan(0.9);
  });

  it('penalizes notes held far too short or too long', () => {
    const played = target.map((t) => ({ ...t, duration: t.duration / 6 })); // way too short
    const result = assessPitchAndTiming(
      target,
      played,
      TEMPO,
      'pitch_order_timing_duration',
    );
    expect(result.durationAccuracy!).toBeLessThan(0.5);
    expect(result.overallScore).toBeLessThan(0.9);
  });
});
