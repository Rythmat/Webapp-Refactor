/**
 * Key and mode detection using the Krumhansl-Schmuckler algorithm
 * with extensions for all 35 heptatonic modes.
 *
 * Pipeline:
 *   1. Build pitch-class histogram weighted by duration × velocity
 *   2. Correlate against K-S major/minor profiles for 24 keys
 *   3. For top candidates, test all 35 modes for best diatonic fit
 *   4. Return best match + alternates with confidence
 */

import { ALL_MODES, MODE_DISPLAY } from '@/daw/prism-engine/data/modes';
import { noteNameInKey } from '@/daw/prism-engine/data/notes';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { KeyDetection, AlternateKey } from '../types/schema';

// ── Krumhansl-Kessler key profiles ─────────────────────────────────────────

/** Major key profile (Krumhansl & Kessler, 1982) */
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];

/** Minor key profile (Krumhansl & Kessler, 1982) */
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

// ── Core ───────────────────────────────────────────────────────────────────

/**
 * Detect the key and mode of a collection of MIDI note events.
 */
export function detectKey(events: MidiNoteEvent[]): KeyDetection {
  if (events.length === 0) {
    return emptyResult();
  }

  // Step 1: Build weighted pitch-class histogram
  const histogram = buildHistogram(events);

  // Step 2: Correlate against all 24 major/minor keys
  const candidates = correlateAllKeys(histogram);

  // Step 3: For top candidates, find best mode from ALL_MODES
  const results = refineModes(histogram, candidates.slice(0, 6));

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  const best = results[0];
  const alternates: AlternateKey[] = results.slice(1, 4).map((r) => ({
    rootPc: r.rootPc,
    rootName: r.rootName,
    mode: r.mode,
    modeDisplay: r.modeDisplay,
    confidence: r.confidence,
  }));

  return {
    rootPc: best.rootPc,
    rootName: best.rootName,
    mode: best.mode,
    modeDisplay: best.modeDisplay,
    confidence: best.confidence,
    alternateKeys: alternates,
  };
}

// ── Histogram ──────────────────────────────────────────────────────────────

function buildHistogram(events: MidiNoteEvent[]): Float64Array {
  const hist = new Float64Array(12);
  for (const ev of events) {
    const pc = ev.note % 12;
    hist[pc] += ev.durationTicks * (ev.velocity / 127);
  }
  return hist;
}

// ── K-S Correlation ────────────────────────────────────────────────────────

interface KeyCandidate {
  rootPc: number;
  isMajor: boolean;
  correlation: number;
}

function correlateAllKeys(histogram: Float64Array): KeyCandidate[] {
  const candidates: KeyCandidate[] = [];

  for (let root = 0; root < 12; root++) {
    const rotated = rotateHistogram(histogram, root);
    candidates.push({
      rootPc: root,
      isMajor: true,
      correlation: pearsonCorrelation(rotated, MAJOR_PROFILE),
    });
    candidates.push({
      rootPc: root,
      isMajor: false,
      correlation: pearsonCorrelation(rotated, MINOR_PROFILE),
    });
  }

  candidates.sort((a, b) => b.correlation - a.correlation);
  return candidates;
}

function rotateHistogram(histogram: Float64Array, root: number): Float64Array {
  const rotated = new Float64Array(12);
  for (let i = 0; i < 12; i++) {
    rotated[i] = histogram[(i + root) % 12];
  }
  return rotated;
}

function pearsonCorrelation(x: Float64Array, y: number[]): number {
  const n = x.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const varX = n * sumX2 - sumX * sumX;
  const varY = n * sumY2 - sumY * sumY;
  // Uniform distribution (all values equal) → no correlation signal
  if (varX <= 0 || varY <= 0) return 0;
  return (n * sumXY - sumX * sumY) / Math.sqrt(varX * varY);
}

// ── Mode Refinement ────────────────────────────────────────────────────────

interface ModeResult {
  rootPc: number;
  rootName: string;
  mode: string;
  modeDisplay: string;
  confidence: number;
}

/**
 * For each K-S candidate root, test all 35 modes and return the best fit.
 * Diatonic fit: sum of histogram weights for pitch classes that fall on
 * scale degrees, normalized by total weight.
 */
function refineModes(
  histogram: Float64Array,
  candidates: KeyCandidate[],
): ModeResult[] {
  const totalWeight = histogram.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return [];

  const seen = new Set<string>();
  const results: ModeResult[] = [];

  for (const cand of candidates) {
    for (const [modeKey, intervals] of Object.entries(ALL_MODES)) {
      const pcs = new Set(intervals.map((i) => (i + cand.rootPc) % 12));

      // Diatonic fit: proportion of histogram weight on scale tones
      let diatonicWeight = 0;
      for (const pc of pcs) {
        diatonicWeight += histogram[pc];
      }
      const fit = diatonicWeight / totalWeight;

      // Tonic emphasis: extra weight if the root PC is the most common
      const rootWeight = histogram[cand.rootPc] / totalWeight;
      const tonicBonus = rootWeight * 0.15;

      // Combine K-S correlation with diatonic fit
      const ksNorm = (cand.correlation + 1) / 2; // normalize -1..1 to 0..1
      const confidence = ksNorm * 0.4 + fit * 0.45 + tonicBonus;

      const key = `${cand.rootPc}:${modeKey}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const display = MODE_DISPLAY[modeKey] ?? modeKey;
      results.push({
        rootPc: cand.rootPc,
        rootName: noteNameInKey(cand.rootPc, cand.rootPc),
        mode: modeKey,
        modeDisplay: display,
        confidence: Math.min(1, Math.max(0, confidence)),
      });
    }
  }

  return results;
}

// ── Fallback ───────────────────────────────────────────────────────────────

function emptyResult(): KeyDetection {
  return {
    rootPc: 0,
    rootName: 'C',
    mode: 'ionian',
    modeDisplay: 'Ionian',
    confidence: 0,
    alternateKeys: [],
  };
}
