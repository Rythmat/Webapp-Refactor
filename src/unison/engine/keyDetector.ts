/**
 * Key and mode detection using the Krumhansl-Schmuckler algorithm
 * with extensions for all 35 heptatonic modes.
 *
 * Pipeline:
 *   1. Build pitch-class histogram weighted by duration × velocity
 *   2. Correlate against K-S major/minor profiles for 24 keys
 *   3. For top candidates, test all 35 modes for best diatonic fit, and
 *      weigh the tonic evidence: the bass (the lowest note at each onset),
 *      and the bass the music starts and ends on. Relative keys (C major,
 *      A minor, D Dorian) share their notes, so the bass is what tells them
 *      apart (2026-10-21: they used to score within a point of each other).
 *   4. Return best match + alternates; the confidence rises with the fit and
 *      with how far the best key leads the next one.
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

  // Step 1: Build weighted pitch-class histogram, and the bass's
  const histogram = buildHistogram(events);
  const bass = bassEvidence(events);

  // Step 2: Correlate against all 24 major/minor keys
  const candidates = correlateAllKeys(histogram);

  // Step 3: For top candidates, find best mode from ALL_MODES
  const results = refineModes(histogram, candidates.slice(0, 6), bass);

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  const best = results[0];

  // Step 4: how sure. The fit says how well one scale explains the notes;
  // the lead over the best other tonic says how clearly this tonic is the
  // home (choosing between modes of one tonic is the fit's job, so a
  // near-identical mode on the same tonic never makes it unsure).
  const otherTonic = results.find((r) => r.rootPc !== best.rootPc);
  const lead = otherTonic ? best.score - otherTonic.score : LEAD_FOR_CERTAINTY;
  const leadFactor = clamp01(lead / LEAD_FOR_CERTAINTY);
  const bestConfidence = clamp01(best.fit ** 2 * (0.6 + 0.4 * leadFactor));
  for (const r of results) {
    // Others are as sure as they come close to the best.
    r.confidence =
      r === best
        ? bestConfidence
        : clamp01(
            bestConfidence *
              (1 - (best.score - r.score) / (2 * LEAD_FOR_CERTAINTY)),
          );
  }

  // Alternates: other tonics first (the keys a student might mean), then
  // other modes of this tonic.
  const alternatesInOrder = [
    ...results.filter((r) => r.rootPc !== best.rootPc),
    ...results.filter((r) => r !== best && r.rootPc === best.rootPc),
  ];
  const alternates: AlternateKey[] = alternatesInOrder.slice(0, 3).map((r) => ({
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

/** A best key this far ahead of the next one is as certain as its fit. */
const LEAD_FOR_CERTAINTY = 0.08;

// ── Histogram ──────────────────────────────────────────────────────────────

function buildHistogram(events: MidiNoteEvent[]): Float64Array {
  const hist = new Float64Array(12);
  for (const ev of events) {
    const pc = ev.note % 12;
    hist[pc] += ev.durationTicks * (ev.velocity / 127);
  }
  return hist;
}

// ── The bass ───────────────────────────────────────────────────────────────

/** Onsets this close (in ticks) sound together: one chord, one bass note. */
const ONSET_SLOP = 30;

interface BassEvidence {
  /** Per pitch class, the bass's weight (duration × velocity), 0–1 of its most. */
  share: Float64Array;
  /** The bass of the first and the last onsets, or -1. */
  first: number;
  last: number;
}

/**
 * The lowest note at each onset, weighted as the histogram is, and the bass
 * the music starts and ends on: the tonic's best evidence.
 */
function bassEvidence(events: MidiNoteEvent[]): BassEvidence {
  const share = new Float64Array(12);
  const sorted = [...events].sort(
    (a, b) => a.startTick - b.startTick || a.note - b.note,
  );
  let first = -1;
  let last = -1;
  let i = 0;
  while (i < sorted.length) {
    const start = sorted[i].startTick;
    let low = sorted[i];
    let j = i + 1;
    while (j < sorted.length && sorted[j].startTick - start <= ONSET_SLOP) {
      if (sorted[j].note < low.note) low = sorted[j];
      j++;
    }
    const pc = low.note % 12;
    share[pc] += low.durationTicks * (low.velocity / 127);
    if (first < 0) first = pc;
    last = pc;
    i = j;
  }
  const most = Math.max(...share);
  if (most > 0) for (let pc = 0; pc < 12; pc++) share[pc] /= most;
  return { share, first, last };
}

/** How strongly the bass says `rootPc` is the tonic, 0–1. */
function tonicEvidence(bass: BassEvidence, rootPc: number): number {
  return (
    bass.share[rootPc] * 0.5 +
    (bass.first === rootPc ? 0.2 : 0) +
    (bass.last === rootPc ? 0.3 : 0)
  );
}

// ── K-S Correlation ────────────────────────────────────────────────────────

export interface KeyCandidate {
  rootPc: number;
  isMajor: boolean;
  correlation: number;
}

/**
 * The 24 major and minor keys ranked by how well the notes' weighted
 * pitch classes correlate with the Krumhansl-Kessler profiles, best first:
 * detectKey's first step, without its mode refinement. A clip's key label
 * reads this (src/daw/harmony/clipKey.ts).
 */
export function rankMajorMinorKeys(events: MidiNoteEvent[]): KeyCandidate[] {
  if (events.length === 0) return [];
  return correlateAllKeys(buildHistogram(events));
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
  /** How well the key explains the notes and the bass (ranking). */
  score: number;
  /** The share of the notes' weight on the scale's tones. */
  fit: number;
  /** 0–1, set once every key is scored (detectKey). */
  confidence: number;
}

/** The modes a song is most often in: the rest must fit clearly better. */
const COMMON_MODES = new Set([
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
  'harmonicMinor',
  'melodicMinor',
]);
const RARE_MODE_HANDICAP = 0.04;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * For each K-S candidate root, test all 35 modes and return the best fit.
 * Diatonic fit: sum of histogram weights for pitch classes that fall on
 * scale degrees, normalized by total weight.
 */
function refineModes(
  histogram: Float64Array,
  candidates: KeyCandidate[],
  bass: BassEvidence,
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

      // Tonic emphasis: how much the root sounds, and how much the bass
      // rests on it (and starts and ends there)
      const rootWeight = histogram[cand.rootPc] / totalWeight;
      const tonic = tonicEvidence(bass, cand.rootPc);

      // Combine K-S correlation, diatonic fit and the tonic's evidence. A
      // scale that leaves notes out fits less (a pentatonic or a 6-note
      // mode is never the 7-note key's equal).
      const ksNorm = (cand.correlation + 1) / 2; // normalize -1..1 to 0..1
      const score =
        ksNorm * 0.3 +
        fit * 0.4 +
        rootWeight * 0.1 +
        tonic * 0.2 -
        (COMMON_MODES.has(modeKey) ? 0 : RARE_MODE_HANDICAP);

      const key = `${cand.rootPc}:${modeKey}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const display = MODE_DISPLAY[modeKey] ?? modeKey;
      results.push({
        rootPc: cand.rootPc,
        rootName: noteNameInKey(cand.rootPc, cand.rootPc),
        mode: modeKey,
        modeDisplay: display,
        score,
        fit,
        confidence: 0,
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
