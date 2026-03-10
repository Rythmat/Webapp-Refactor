// ── OfflineChordAnalyzer ──────────────────────────────────────────────────
// Post-recording chord analysis on a full AudioBuffer.
// Runs frame-by-frame FFT → chromagram → template matching → Viterbi smoothing.
// Produces more accurate chord regions than real-time detection because it
// can look at both past and future frames (bidirectional smoothing).

import { CHORDS } from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

export interface OfflineChordFrame {
  timeMs: number;
  rootPc: number; // 0-11
  quality: string; // key from CHORDS
  confidence: number; // 0-1
}

// ── Constants (matching AudioChordDetector) ──────────────────────────────

const REF_FREQ = 65.4064; // C2
const NUM_OCTAVES = 4;
const BINS_TO_SEARCH = 2;
const RMS_THRESHOLD = 0.005;
const CONFIDENCE_THRESHOLD = 0.4;
const MIN_ACTIVE_PCS = 2;
const ADAPTIVE_NOISE_MARGIN = 10;
const MIN_NOISE_FLOOR = -80;
const H3_WEIGHT = 0.4;
const H5_WEIGHT = 0.15;
const H7_WEIGHT = 0.08;
const DIATONIC_BOOST = 1.25;

// Quality prior: favor common chords, penalize obscure ones
const CHORD_PRIOR: Record<string, number> = {
  major: 1.1,
  minor: 1.1,
  dominant7: 1.05,
  minor7: 1.05,
  major7: 1.05,
  sus4: 1.0,
  sus2: 1.0,
  '5': 1.0,
  Add2: 1.0,
  Add4: 1.0,
  diminished: 0.95,
  augmented: 0.95,
  diminished7: 0.95,
  minor7b5: 0.95,
  major6: 0.95,
  minor6: 0.95,
  dominant7sus4: 0.95,
  dominant7sus2: 0.9,
  major7sus2: 0.9,
  major7sus4: 0.9,
  minormajor7: 0.9,
  dominant9: 0.9,
  major9: 0.9,
  minor9: 0.9,
  major6add9: 0.9,
  minor6add9: 0.9,
  'dominant7#9': 0.85,
  dominant13: 0.85,
  major13: 0.85,
  minor13: 0.85,
  minor7b9: 0.85,
  dominant7b5: 0.85,
  'dominant7#5': 0.85,
  diminishedmajor7: 0.85,
  'minor7#5': 0.85,
  'major7#5': 0.9,
  dominant7b9: 0.9,
  'dominant7#5b9': 0.85,
};

// Parsimony: prefer simpler chords when scores are close
const PARSIMONY_MARGIN = 0.03;

// Offline-specific constants
const FFT_SIZE = 32768; // double resolution — latency doesn't matter offline
const HOP_SIZE = 8192; // 75% overlap → more frames for better Viterbi accuracy

// Viterbi transition probabilities
const SELF_TRANSITION = 0.85; // probability of staying on same chord
const SILENCE_SELF = 0.7; // probability of staying silent

// Tier 1 qualities (same as AudioChordDetector)
const TIER1_QUALITIES = new Set([
  'major',
  'minor',
  'dominant7',
  'minor7',
  'major7',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  '5',
  'diminished7',
  'minor7b5',
  'major6',
  'minor6',
  'Add2',
  'Add4',
  'minormajor7',
  'dominant7sus4',
  'dominant7sus2',
  'major7sus2',
  'major7sus4',
  'dominant9',
  'major9',
  'minor9',
  'dominant7#9',
  'dominant13',
  'major13',
  'minor13',
  'major6add9',
  'minor6add9',
  'minor7b9',
  'dominant7b5',
  'dominant7#5',
  'diminishedmajor7',
  'minor7#5',
  'major7#5',
  'dominant7b9',
  'dominant7#5b9',
]);

const SKIP_QUALITIES = new Set<string>();
for (const key of Object.keys(CHORDS)) {
  if (key.includes('/')) SKIP_QUALITIES.add(key);
}

const TONE_WEIGHTS: Record<string, number[]> = {
  major: [1.0, 0.6, 0.8],
  minor: [1.0, 0.6, 0.8],
  // Guitar drop voicings place the 7th on prominent strings,
  // so 7th weight is raised from 0.5 → 0.65 (Beato Book pp. 101-173)
  dominant7: [1.0, 0.6, 0.8, 0.65],
  minor7: [1.0, 0.6, 0.8, 0.65],
  major7: [1.0, 0.6, 0.8, 0.65],
  diminished: [1.0, 0.6, 0.6],
  augmented: [1.0, 0.6, 0.6],
  sus2: [1.0, 0.6, 0.8],
  sus4: [1.0, 0.7, 0.8],
  '5': [1.0, 0.9],
  diminished7: [1.0, 0.6, 0.6, 0.65],
  minor7b5: [1.0, 0.6, 0.6, 0.65],
  major6: [1.0, 0.6, 0.8, 0.65],
  minor6: [1.0, 0.6, 0.8, 0.65],
  Add2: [1.0, 0.5, 0.6, 0.8],
  Add4: [1.0, 0.6, 0.5, 0.8],
  minormajor7: [1.0, 0.6, 0.8, 0.65],
  dominant7sus4: [1.0, 0.7, 0.8, 0.65],
  dominant7sus2: [1.0, 0.6, 0.8, 0.65],
  major7sus2: [1.0, 0.6, 0.8, 0.65],
  major7sus4: [1.0, 0.7, 0.8, 0.65],
  // 9th chords (7th weight raised from 0.4 → 0.55)
  dominant9: [1.0, 0.6, 0.7, 0.55, 0.35],
  major9: [1.0, 0.6, 0.7, 0.55, 0.35],
  minor9: [1.0, 0.6, 0.7, 0.55, 0.35],
  'dominant7#9': [1.0, 0.6, 0.7, 0.55, 0.35],
  minor7b9: [1.0, 0.6, 0.7, 0.55, 0.35],
  // 6/9 chords (6th weight raised to 0.65)
  major6add9: [1.0, 0.6, 0.8, 0.65, 0.35],
  minor6add9: [1.0, 0.6, 0.8, 0.65, 0.35],
  dominant7b5: [1.0, 0.6, 0.6, 0.65],
  'dominant7#5': [1.0, 0.6, 0.6, 0.65],
  // New Beato fundamental types
  diminishedmajor7: [1.0, 0.6, 0.6, 0.65],
  'minor7#5': [1.0, 0.6, 0.6, 0.65],
  'major7#5': [1.0, 0.6, 0.6, 0.65],
  dominant7b9: [1.0, 0.6, 0.7, 0.55, 0.35],
  'dominant7#5b9': [1.0, 0.6, 0.6, 0.55, 0.35],
  // 13th chords unchanged
  dominant13: [1.0, 0.6, 0.6, 0.4, 0.3, 0.3],
  major13: [1.0, 0.6, 0.6, 0.4, 0.3, 0.3],
  minor13: [1.0, 0.6, 0.6, 0.4, 0.3, 0.3],
};

// ── Template type ────────────────────────────────────────────────────────

interface ChordTemplate {
  rootPc: number;
  quality: string;
  profile: Float64Array;
  profileMag: number;
}

// ── Pre-computed data ────────────────────────────────────────────────────

const NOTE_FREQUENCIES = Array.from(
  { length: 12 },
  (_, i) => REF_FREQ * Math.pow(2, i / 12),
);

const TEMPLATES: ChordTemplate[] = buildTemplates();

function buildTemplates(): ChordTemplate[] {
  const templates: ChordTemplate[] = [];
  for (const [quality, intervals] of Object.entries(CHORDS)) {
    if (SKIP_QUALITIES.has(quality) || !TIER1_QUALITIES.has(quality)) continue;
    const weights = TONE_WEIGHTS[quality];
    const pcsArr = intervals.map((iv) => ((iv % 12) + 12) % 12);
    for (let root = 0; root < 12; root++) {
      const profile = new Float64Array(12);
      for (let t = 0; t < pcsArr.length; t++) {
        const bin = (pcsArr[t] + root) % 12;
        const w = weights ? (weights[t] ?? 0.5) : 1;
        profile[bin] = Math.max(profile[bin], w);
      }
      let mag = 0;
      for (let i = 0; i < 12; i++) mag += profile[i] * profile[i];
      templates.push({
        rootPc: root,
        quality,
        profile,
        profileMag: Math.sqrt(mag),
      });
    }
  }
  return templates;
}

// ── FFT (Radix-2 Cooley-Tukey) ──────────────────────────────────────────

function fftMagnitudeDb(samples: Float64Array): Float64Array {
  const N = samples.length;
  // Bit-reversal permutation
  const real = new Float64Array(N);
  const imag = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let j = 0;
    let x = i;
    for (let k = 1; k < N; k <<= 1) {
      j = (j << 1) | (x & 1);
      x >>= 1;
    }
    real[j] = samples[i];
  }

  // Cooley-Tukey butterfly
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const angle = (-2 * Math.PI) / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < half; j++) {
        const cos = Math.cos(angle * j);
        const sin = Math.sin(angle * j);
        const tr = real[i + j + half] * cos - imag[i + j + half] * sin;
        const ti = real[i + j + half] * sin + imag[i + j + half] * cos;
        real[i + j + half] = real[i + j] - tr;
        imag[i + j + half] = imag[i + j] - ti;
        real[i + j] += tr;
        imag[i + j] += ti;
      }
    }
  }

  // Compute magnitude in dB (first N/2 bins)
  const halfN = N / 2;
  const mag = new Float64Array(halfN);
  for (let i = 0; i < halfN; i++) {
    const m = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / N;
    mag[i] = 20 * Math.log10(m + 1e-10);
  }
  return mag;
}

// ── Hann window ──────────────────────────────────────────────────────────

function hannWindow(frame: Float32Array, N: number): Float64Array {
  const out = new Float64Array(N);
  const len = Math.min(frame.length, N);
  for (let i = 0; i < len; i++) {
    out[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  }
  return out;
}

// ── Per-frame analysis (chromagram → template match) ─────────────────────

interface FrameScores {
  scores: Float64Array; // score per template index (+ 1 for silence)
  bestIdx: number;
  bestScore: number;
}

function analyzeFrame(
  fftDb: Float64Array,
  sampleRate: number,
  fftSize: number,
  diatonicPCs: Set<number> | null,
): FrameScores {
  const binWidth = sampleRate / fftSize;
  const chroma = new Float64Array(12);
  const numStates = TEMPLATES.length + 1; // +1 for silence
  const scores = new Float64Array(numStates);

  // Adaptive noise floor
  const loBin = Math.max(1, Math.round(60 / binWidth));
  const hiBin = Math.min(fftDb.length - 1, Math.round(2000 / binWidth));
  const noiseSamples: number[] = [];
  const step = Math.max(1, Math.floor((hiBin - loBin) / 100));
  for (let k = loBin; k <= hiBin; k += step) {
    noiseSamples.push(fftDb[k]);
  }
  noiseSamples.sort((a, b) => a - b);
  const medianDb = noiseSamples[Math.floor(noiseSamples.length / 2)] ?? -80;
  const noiseFloor = Math.max(
    medianDb + ADAPTIVE_NOISE_MARGIN,
    MIN_NOISE_FLOOR,
  );

  // Build chromagram
  for (let pc = 0; pc < 12; pc++) {
    let sum = 0;
    for (let octave = 0; octave < NUM_OCTAVES; octave++) {
      const freq = NOTE_FREQUENCIES[pc] * Math.pow(2, octave);
      const centerBin = Math.round(freq / binWidth);
      const minBin = Math.max(0, centerBin - BINS_TO_SEARCH);
      const maxBin = Math.min(fftDb.length - 1, centerBin + BINS_TO_SEARCH);
      let peakDb = -Infinity;
      for (let k = minBin; k <= maxBin; k++) {
        if (fftDb[k] > peakDb) peakDb = fftDb[k];
      }
      if (peakDb > noiseFloor) sum += peakDb - noiseFloor;
    }
    chroma[pc] = sum;
  }

  // Harmonic suppression (strongest-first)
  const raw = new Float64Array(chroma);
  const sorted = Array.from({ length: 12 }, (_, i) => i);
  sorted.sort((a, b) => raw[b] - raw[a]);
  for (const pc of sorted) {
    if (raw[pc] < 1e-10) continue;
    chroma[(pc + 7) % 12] = Math.max(
      0,
      chroma[(pc + 7) % 12] - raw[pc] * H3_WEIGHT,
    );
    chroma[(pc + 4) % 12] = Math.max(
      0,
      chroma[(pc + 4) % 12] - raw[pc] * H5_WEIGHT,
    );
    chroma[(pc + 10) % 12] = Math.max(
      0,
      chroma[(pc + 10) % 12] - raw[pc] * H7_WEIGHT,
    );
  }

  // Count active PCs
  let maxChroma = 0;
  for (let i = 0; i < 12; i++) if (chroma[i] > maxChroma) maxChroma = chroma[i];
  let activePCs = 0;
  if (maxChroma > 1e-10) {
    const thresh = maxChroma * 0.2;
    for (let i = 0; i < 12; i++) if (chroma[i] > thresh) activePCs++;
  }

  // Silence state gets a base score
  scores[numStates - 1] = activePCs < MIN_ACTIVE_PCS ? 0.8 : 0.1;

  if (activePCs < MIN_ACTIVE_PCS) {
    return { scores, bestIdx: numStates - 1, bestScore: scores[numStates - 1] };
  }

  // L2 normalize
  let sumSq = 0;
  for (let i = 0; i < 12; i++) sumSq += chroma[i] * chroma[i];
  const mag = Math.sqrt(sumSq);
  if (mag > 1e-10) {
    for (let i = 0; i < 12; i++) chroma[i] /= mag;
  }

  // Match templates
  let bestIdx = numStates - 1;
  let bestScore = scores[numStates - 1];

  for (let t = 0; t < TEMPLATES.length; t++) {
    const tmpl = TEMPLATES[t];
    let dot = 0;
    for (let i = 0; i < 12; i++) dot += chroma[i] * tmpl.profile[i];
    let score = dot / tmpl.profileMag;
    // Quality prior: favor common chords
    score *= CHORD_PRIOR[tmpl.quality] ?? 0.8;
    if (diatonicPCs && diatonicPCs.has(tmpl.rootPc)) {
      score *= DIATONIC_BOOST;
    }
    scores[t] = score >= CONFIDENCE_THRESHOLD ? score : 0;
    if (scores[t] > bestScore) {
      bestScore = scores[t];
      bestIdx = t;
    }
  }

  // Parsimony: if a simpler chord with the same root is within margin, prefer it
  if (bestIdx < numStates - 1) {
    const bestTmpl = TEMPLATES[bestIdx];
    const bestIntervals = CHORDS[bestTmpl.quality];
    if (bestIntervals && bestIntervals.length > 3) {
      for (let t = 0; t < TEMPLATES.length; t++) {
        if (t === bestIdx) continue;
        const tmpl = TEMPLATES[t];
        if (tmpl.rootPc !== bestTmpl.rootPc) continue;
        const intervals = CHORDS[tmpl.quality];
        if (!intervals || intervals.length >= bestIntervals.length) continue;
        if (scores[t] >= bestScore - PARSIMONY_MARGIN) {
          bestScore = scores[t];
          bestIdx = t;
          break;
        }
      }
    }
  }

  return { scores, bestIdx, bestScore };
}

// ── Viterbi smoothing ───────────────────────────────────────────────────

// Diatonic transition boost: transitions between two diatonic chords get higher probability
const DIATONIC_TRANSITION = 0.12;
// On downbeat frames, lower self-transition to allow chord changes more freely
const DOWNBEAT_SELF_TRANSITION = 0.75;

function viterbiSmooth(
  frameScores: FrameScores[],
  frameTimes: number[],
  diatonicPCs: Set<number> | null,
  bpm?: number,
): number[] {
  if (frameScores.length === 0) return [];

  const T = frameScores.length;
  const S = frameScores[0].scores.length; // numTemplates + 1 (silence)
  const otherTransition = (1 - SELF_TRANSITION) / (S - 1);
  const diatonicOther = diatonicPCs ? DIATONIC_TRANSITION : otherTransition;

  // Log-domain Viterbi for numerical stability
  const logSelf = Math.log(SELF_TRANSITION);
  const logDownbeatSelf = Math.log(DOWNBEAT_SELF_TRANSITION);
  const logOther = Math.log(otherTransition);
  const logDiatonicOther = Math.log(diatonicOther);
  const logSilenceSelf = Math.log(SILENCE_SELF);
  const logSilenceOther = Math.log((1 - SILENCE_SELF) / (S - 1));
  const silenceIdx = S - 1;

  // Pre-compute beat grid for beat-position-aware transitions
  const beatDurationMs = bpm ? (60 / bpm) * 1000 : 0;

  // Forward pass: viterbi[t][s] = best log-probability ending in state s at frame t
  const viterbi = new Float64Array(S);
  const backPtr = new Int32Array(T * S); // flattened [T][S]

  // Initialize t=0
  for (let s = 0; s < S; s++) {
    viterbi[s] = Math.log(Math.max(frameScores[0].scores[s], 1e-10));
  }

  const prevViterbi = new Float64Array(S);

  for (let t = 1; t < T; t++) {
    prevViterbi.set(viterbi);

    // Check if this frame falls near a beat boundary (within half a hop)
    const isNearBeat =
      beatDurationMs > 0 &&
      frameTimes[t] % beatDurationMs < beatDurationMs * 0.15;

    for (let s = 0; s < S; s++) {
      const emission = Math.log(Math.max(frameScores[t].scores[s], 1e-10));
      let bestPrev = -Infinity;
      let bestPrevIdx = 0;

      // Get diatonic status of target state
      const sDiatonic =
        s < silenceIdx && diatonicPCs
          ? diatonicPCs.has(TEMPLATES[s].rootPc)
          : false;

      for (let ps = 0; ps < S; ps++) {
        let trans: number;
        if (ps === s) {
          // Self-transition: lower on beat boundaries to allow changes
          trans =
            ps === silenceIdx
              ? logSilenceSelf
              : isNearBeat
                ? logDownbeatSelf
                : logSelf;
        } else if (ps === silenceIdx) {
          trans = logSilenceOther;
        } else {
          // Boost diatonic-to-diatonic transitions
          const psDiatonic = diatonicPCs
            ? diatonicPCs.has(TEMPLATES[ps].rootPc)
            : false;
          trans = sDiatonic && psDiatonic ? logDiatonicOther : logOther;
        }
        const v = prevViterbi[ps] + trans;
        if (v > bestPrev) {
          bestPrev = v;
          bestPrevIdx = ps;
        }
      }

      viterbi[s] = bestPrev + emission;
      backPtr[t * S + s] = bestPrevIdx;
    }
  }

  // Backtrace
  const path = new Array<number>(T);
  let bestFinal = -Infinity;
  let bestFinalIdx = 0;
  for (let s = 0; s < S; s++) {
    if (viterbi[s] > bestFinal) {
      bestFinal = viterbi[s];
      bestFinalIdx = s;
    }
  }
  path[T - 1] = bestFinalIdx;
  for (let t = T - 2; t >= 0; t--) {
    path[t] = backPtr[(t + 1) * S + path[t + 1]];
  }

  return path;
}

// ── Beat-aware chord quantization ────────────────────────────────────────
// Snaps chord boundaries to the nearest beat position and merges short segments.
// Onset compensation pulls boundaries back by 0.25 beats to account for attack lag.

const ONSET_COMPENSATION_RATIO = 0.05;
const MIN_SEGMENT_BEATS = 0.5; // merge segments shorter than half a beat

function quantizeToBeats(
  frames: OfflineChordFrame[],
  bpm: number,
): OfflineChordFrame[] {
  if (frames.length === 0 || bpm <= 0) return frames;

  const beatDurationMs = (60 / bpm) * 1000;
  const compensationMs = beatDurationMs * ONSET_COMPENSATION_RATIO;
  const minSegmentMs = beatDurationMs * MIN_SEGMENT_BEATS;

  // Step 1: Identify chord change points and build segments
  interface Segment {
    startMs: number;
    endMs: number;
    rootPc: number;
    quality: string;
    confidence: number;
  }
  const segments: Segment[] = [];

  let segStart = 0;
  for (let i = 1; i < frames.length; i++) {
    if (
      frames[i].rootPc !== frames[segStart].rootPc ||
      frames[i].quality !== frames[segStart].quality
    ) {
      segments.push({
        startMs: frames[segStart].timeMs,
        endMs: frames[i].timeMs,
        rootPc: frames[segStart].rootPc,
        quality: frames[segStart].quality,
        confidence: frames[segStart].confidence,
      });
      segStart = i;
    }
  }
  // Final segment
  segments.push({
    startMs: frames[segStart].timeMs,
    endMs: frames[frames.length - 1].timeMs + (HOP_SIZE / 48000) * 1000,
    rootPc: frames[segStart].rootPc,
    quality: frames[segStart].quality,
    confidence: frames[segStart].confidence,
  });

  // Step 2: Snap segment boundaries to nearest beat, with onset compensation
  for (let i = 0; i < segments.length; i++) {
    const raw = segments[i].startMs - compensationMs;
    const nearestBeat =
      Math.round(Math.max(0, raw) / beatDurationMs) * beatDurationMs;
    segments[i].startMs = nearestBeat;
  }
  // Fix end times to match next segment's start
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].endMs = segments[i + 1].startMs;
  }

  // Step 3: Merge short segments into their longer neighbor
  const merged: Segment[] = [];
  for (const seg of segments) {
    if (merged.length > 0 && seg.endMs - seg.startMs < minSegmentMs) {
      // Merge into previous segment
      merged[merged.length - 1].endMs = seg.endMs;
    } else if (
      merged.length > 0 &&
      seg.startMs === merged[merged.length - 1].startMs
    ) {
      // Overlapping start — keep the one with higher confidence
      if (seg.confidence > merged[merged.length - 1].confidence) {
        merged[merged.length - 1] = seg;
      }
    } else {
      merged.push({ ...seg });
    }
  }

  // Step 4: Expand back to per-beat frames
  const result: OfflineChordFrame[] = [];
  for (const seg of merged) {
    for (let t = seg.startMs; t < seg.endMs; t += beatDurationMs) {
      result.push({
        timeMs: t,
        rootPc: seg.rootPc,
        quality: seg.quality,
        confidence: seg.confidence,
      });
    }
    // Ensure at least one frame per segment
    if (
      result.length === 0 ||
      result[result.length - 1].rootPc !== seg.rootPc ||
      result[result.length - 1].quality !== seg.quality
    ) {
      result.push({
        timeMs: seg.startMs,
        rootPc: seg.rootPc,
        quality: seg.quality,
        confidence: seg.confidence,
      });
    }
  }

  return result;
}

// ── Downbeat alignment optimization ──────────────────────────────────────
// Tries small time shifts and picks the one where most chord changes fall on
// downbeats (beat 1 of each measure). Returns optimal shift in ms.

const DOWNBEAT_ON_WEIGHT = 2; // reward for chord change on downbeat
const DOWNBEAT_OFF_PENALTY = 1; // penalty for chord change off downbeat

function optimizeDownbeatAlignment(
  frames: OfflineChordFrame[],
  bpm: number,
  timeSignature: number = 4,
): number {
  if (frames.length < 2 || bpm <= 0) return 0;

  const beatDurationMs = (60 / bpm) * 1000;
  const measureDurationMs = beatDurationMs * timeSignature;

  // Find chord change points
  const changeTimesMs: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    if (
      frames[i].rootPc !== frames[i - 1].rootPc ||
      frames[i].quality !== frames[i - 1].quality
    ) {
      changeTimesMs.push(frames[i].timeMs);
    }
  }

  if (changeTimesMs.length === 0) return 0;

  // Try shifts of 0..(timeSignature-1) beats
  let bestShift = 0;
  let bestScore = -Infinity;

  for (let shiftBeats = 0; shiftBeats < timeSignature; shiftBeats++) {
    const shiftMs = shiftBeats * beatDurationMs;
    let score = 0;

    for (const changeMs of changeTimesMs) {
      const shifted = changeMs + shiftMs;
      const posInMeasure = shifted % measureDurationMs;
      // Is this change on a downbeat? (within 15% tolerance of beat 1)
      const isDownbeat =
        posInMeasure < beatDurationMs * 0.15 ||
        posInMeasure > measureDurationMs - beatDurationMs * 0.15;

      if (isDownbeat) {
        score += DOWNBEAT_ON_WEIGHT;
      } else {
        score -= DOWNBEAT_OFF_PENALTY;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestShift = shiftMs;
    }
  }

  return bestShift;
}

// ── Main analysis function ──────────────────────────────────────────────

export function analyzeChords(
  audioBuffer: AudioBuffer,
  keyRootPc?: number,
  modeIntervals?: number[],
  bpm?: number,
): OfflineChordFrame[] {
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);
  const totalSamples = samples.length;

  // Build diatonic set if key context available
  const diatonicPCs =
    keyRootPc != null && modeIntervals
      ? new Set(modeIntervals.map((iv) => (keyRootPc + iv) % 12))
      : null;

  // Step 1: Extract per-frame chord scores
  const allFrameScores: FrameScores[] = [];
  const frameTimes: number[] = [];

  for (let offset = 0; offset + FFT_SIZE <= totalSamples; offset += HOP_SIZE) {
    // RMS silence check
    let rmsSum = 0;
    for (let i = offset; i < offset + FFT_SIZE; i++) {
      rmsSum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(rmsSum / FFT_SIZE);

    const timeMs = (offset / sampleRate) * 1000;
    frameTimes.push(timeMs);

    if (rms <= RMS_THRESHOLD) {
      // Silence frame
      const numStates = TEMPLATES.length + 1;
      const scores = new Float64Array(numStates);
      scores[numStates - 1] = 0.9; // high silence probability
      allFrameScores.push({ scores, bestIdx: numStates - 1, bestScore: 0.9 });
      continue;
    }

    // Window and FFT
    const frame = samples.subarray(offset, offset + FFT_SIZE);
    const windowed = hannWindow(frame, FFT_SIZE);
    const fftDb = fftMagnitudeDb(windowed);

    // Analyze frame
    const frameResult = analyzeFrame(fftDb, sampleRate, FFT_SIZE, diatonicPCs);
    allFrameScores.push(frameResult);
  }

  if (allFrameScores.length === 0) return [];

  // Step 2: Viterbi smoothing with musically-informed transitions
  const path = viterbiSmooth(allFrameScores, frameTimes, diatonicPCs, bpm);
  const silenceIdx = TEMPLATES.length;

  // Step 3: Convert path to OfflineChordFrame[]
  const frames: OfflineChordFrame[] = [];
  for (let i = 0; i < path.length; i++) {
    const stateIdx = path[i];
    if (stateIdx === silenceIdx) continue; // skip silence frames

    const tmpl = TEMPLATES[stateIdx];
    frames.push({
      timeMs: frameTimes[i],
      rootPc: tmpl.rootPc,
      quality: tmpl.quality,
      confidence: allFrameScores[i].scores[stateIdx],
    });
  }

  // Step 4: Beat-aware post-processing (when BPM is available)
  if (bpm && bpm > 0) {
    return quantizeToBeats(frames, bpm);
  }

  return frames;
}

// ── Convert offline frames to snapshot format ────────────────────────────
// Maps OfflineChordFrame[] to { tick, notes }[] for deriveChordRegionsFromAudioSnapshots()

export function offlineFramesToSnapshots(
  frames: OfflineChordFrame[],
  clipStartTick: number,
  bpm: number,
  _sampleRate: number,
): { tick: number; notes: number[] }[] {
  if (frames.length === 0) return [];

  // Optimize downbeat alignment before converting to ticks
  const downbeatShiftMs = optimizeDownbeatAlignment(frames, bpm);

  // Convert timeMs to ticks: tick = timeMs * (bpm * 480) / 60000
  const msToTick = (bpm * 480) / 60000;

  return frames.map((f) => {
    const tick =
      clipStartTick + Math.round((f.timeMs + downbeatShiftMs) * msToTick);
    const base = 60 + f.rootPc;
    const intervals: number[] | undefined = CHORDS[f.quality];
    const notes = intervals
      ? intervals
          .map((iv: number) => base + iv)
          .sort((a: number, b: number) => a - b)
      : [base];
    return { tick, notes };
  });
}
