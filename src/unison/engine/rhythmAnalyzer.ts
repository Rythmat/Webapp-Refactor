/**
 * Rhythm analysis: subdivision detection (straight vs triplet) and swing amount.
 *
 * Input: MidiNoteEvent[] + PPQ (ticks per quarter note) + existing BPM
 * Output: RhythmAnalysis
 *
 * Pipeline:
 *   1. BPM and time signature come from the DAW (user-set or MIDI import)
 *   2. Quantize note onsets to 16th-note and triplet grids
 *   3. Count which grid has lower total deviation → subdivision
 *   4. Measure even-to-odd 8th-note timing ratio → swing amount
 */

import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { RhythmAnalysis, Subdivision } from '../types/schema';

// ── Core ──────────────────────────────────────────────────────────────────────

export function analyzeRhythm(
  events: MidiNoteEvent[],
  ppq: number,
  bpm: number,
  timeSignatureNumerator = 4,
  timeSignatureDenominator = 4,
): RhythmAnalysis {
  if (events.length === 0) {
    return {
      bpm,
      bpmConfidence: 1.0,
      timeSignatureNumerator,
      timeSignatureDenominator,
      subdivision: 'straight',
      swingAmount: 0,
    };
  }

  const subdivision = detectSubdivision(events, ppq);
  const swingAmount = detectSwing(events, ppq);

  return {
    bpm,
    bpmConfidence: 1.0, // from DAW, high confidence
    timeSignatureNumerator,
    timeSignatureDenominator,
    subdivision,
    swingAmount,
  };
}

// ── Subdivision Detection ─────────────────────────────────────────────────────

/**
 * Compare total quantization error against straight (16th) vs triplet grids.
 * Lower error = better fit.
 */
function detectSubdivision(events: MidiNoteEvent[], ppq: number): Subdivision {
  const sixteenthGrid = ppq / 4; // ticks per 16th note
  const tripletGrid = ppq / 3; // ticks per 8th-note triplet

  let straightError = 0;
  let tripletError = 0;

  for (const ev of events) {
    const tick = ev.startTick;

    // Distance to nearest straight grid point
    const straightNearest = Math.round(tick / sixteenthGrid) * sixteenthGrid;
    straightError += Math.abs(tick - straightNearest);

    // Distance to nearest triplet grid point
    const tripletNearest = Math.round(tick / tripletGrid) * tripletGrid;
    tripletError += Math.abs(tick - tripletNearest);
  }

  // Normalize by number of events
  const avgStraight = straightError / events.length;
  const avgTriplet = tripletError / events.length;

  // If both are close, it's mixed; otherwise pick the lower error
  const ratio =
    avgStraight === 0 && avgTriplet === 0
      ? 1
      : Math.min(avgStraight, avgTriplet) / Math.max(avgStraight, avgTriplet);

  if (ratio > 0.85) return 'mixed';
  return avgStraight <= avgTriplet ? 'straight' : 'triplet';
}

// ── Swing Detection ───────────────────────────────────────────────────────────

/**
 * Swing is measured as the timing ratio between consecutive 8th notes.
 * Perfect straight = 0.5 (even split), full swing ≈ 0.67 (2:1 ratio).
 * Returns 0..1 where 0 = no swing, 1 = maximum swing.
 */
function detectSwing(events: MidiNoteEvent[], ppq: number): number {
  const eighthNote = ppq / 2;
  const pairs: Array<{ even: number; odd: number }> = [];

  // Sort by start tick
  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);

  // Find pairs of consecutive notes that fall roughly on 8th-note boundaries
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i].startTick;
    const next = sorted[i + 1].startTick;

    // Check if current note is near an even 8th-note position (on-beat)
    const beatPos = curr / eighthNote;
    const nearEvenEighth = Math.abs(beatPos - Math.round(beatPos)) < 0.2;
    const isOnEvenEighth = nearEvenEighth && Math.round(beatPos) % 2 === 0;

    if (isOnEvenEighth) {
      const gap = next - curr;
      // Only consider pairs within roughly one beat
      if (gap > 0 && gap < ppq * 1.5) {
        pairs.push({ even: curr, odd: next });
      }
    }
  }

  if (pairs.length < 2) return 0;

  // Calculate average ratio: time-to-odd / total-pair-duration
  let ratioSum = 0;
  for (const pair of pairs) {
    const toOdd = pair.odd - pair.even;
    ratioSum += toOdd / ppq; // normalize by quarter note
  }

  const avgRatio = ratioSum / pairs.length;

  // Map ratio to swing amount:
  // 0.5 = no swing (straight 8ths) → swingAmount = 0
  // 0.667 = full swing (2:1) → swingAmount = 1.0
  const swing = Math.max(0, Math.min(1, (avgRatio - 0.5) / 0.167));
  return Math.round(swing * 100) / 100;
}
