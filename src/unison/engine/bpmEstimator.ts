/**
 * BPM Estimator — onset-based tempo detection from AudioBuffer.
 *
 * Algorithm:
 * 1. Compute RMS envelope at ~100Hz
 * 2. Detect onsets via RMS rises > threshold
 * 3. Compute inter-onset intervals (IOIs)
 * 4. Cluster IOIs into BPM histogram bins
 * 5. Pick dominant bin, resolve octave ambiguity
 */

// ── Constants ────────────────────────────────────────────────────────────────

const ENVELOPE_HOP = 441; // ~100Hz at 44.1kHz
const ONSET_THRESHOLD_DB = 6; // dB rise to trigger onset
const MIN_ONSET_GAP_MS = 100; // debounce: ignore onsets closer than 100ms
const BPM_MIN = 30;
const BPM_MAX = 300;
const PREFERRED_LOW = 70; // prefer tempos in 70-160 range
const PREFERRED_HIGH = 160;

// ── Types ────────────────────────────────────────────────────────────────────

export interface BpmEstimate {
  bpm: number;
  confidence: number; // 0-1
}

// ── Main Function ────────────────────────────────────────────────────────────

/**
 * Estimate BPM from an AudioBuffer using onset detection + IOI histogram.
 * Returns { bpm, confidence }. Falls back to 120 BPM with 0 confidence
 * if not enough onsets are detected.
 */
export function estimateBpm(
  samples: Float32Array,
  sampleRate: number,
): BpmEstimate {
  // Step 1: Compute RMS envelope
  const envelope = computeRmsEnvelope(samples, ENVELOPE_HOP);

  // Step 2: Detect onsets
  const onsetTimesMs = detectOnsets(envelope, sampleRate, ENVELOPE_HOP);

  if (onsetTimesMs.length < 4) {
    return { bpm: 120, confidence: 0 };
  }

  // Step 3: Compute inter-onset intervals
  const iois: number[] = [];
  for (let i = 1; i < onsetTimesMs.length; i++) {
    const ioiMs = onsetTimesMs[i] - onsetTimesMs[i - 1];
    if (ioiMs > 0) iois.push(ioiMs);
  }

  if (iois.length < 3) {
    return { bpm: 120, confidence: 0 };
  }

  // Step 4: Build BPM histogram
  const numBins = BPM_MAX - BPM_MIN + 1;
  const histogram = new Float64Array(numBins);

  for (const ioiMs of iois) {
    // Each IOI can map to multiple BPM candidates (integer ratios)
    for (const multiplier of [1, 2, 3, 4]) {
      const bpm = (60000 * multiplier) / ioiMs;
      if (bpm >= BPM_MIN && bpm <= BPM_MAX) {
        const bin = Math.round(bpm - BPM_MIN);
        if (bin >= 0 && bin < numBins) {
          // Weight by 1/multiplier (direct beats weigh more)
          histogram[bin] += 1 / multiplier;
        }
      }
    }
  }

  // Smooth histogram with a narrow Gaussian (±3 BPM)
  const smoothed = gaussianSmooth(histogram, 3);

  // Step 5: Find dominant peak
  let bestBin = 0;
  let bestScore = 0;

  for (let i = 0; i < numBins; i++) {
    let score = smoothed[i];
    // Prefer tempos in the natural range (70-160 BPM)
    const bpm = i + BPM_MIN;
    if (bpm >= PREFERRED_LOW && bpm <= PREFERRED_HIGH) {
      score *= 1.3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestBin = i;
    }
  }

  const rawBpm = bestBin + BPM_MIN;

  // Step 6: Resolve octave ambiguity
  const bpm = resolveOctave(rawBpm, smoothed);

  // Confidence: ratio of dominant bin to total histogram mass.
  // The ×3 scaling compensates for histogram spread — a perfectly periodic
  // signal concentrates ~33% of mass in the peak bin after Gaussian smoothing,
  // so ×3 normalises that to confidence ≈ 1.0. Clamped to [0, 1].
  const totalMass = smoothed.reduce((a, b) => a + b, 0);
  const peakMass = smoothed[Math.round(bpm - BPM_MIN)] ?? 0;
  const confidence =
    totalMass > 0
      ? Math.min(1, Math.round((peakMass / totalMass) * 3 * 100) / 100)
      : 0;

  return { bpm: Math.round(bpm), confidence };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeRmsEnvelope(samples: Float32Array, hop: number): Float32Array {
  const numFrames = Math.floor(samples.length / hop);
  const envelope = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    const start = i * hop;
    const end = Math.min(start + hop, samples.length);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += samples[j] * samples[j];
    }
    envelope[i] = Math.sqrt(sum / (end - start));
  }

  return envelope;
}

function detectOnsets(
  envelope: Float32Array,
  sampleRate: number,
  hop: number,
): number[] {
  const onsets: number[] = [];
  const thresholdLinear = Math.pow(10, ONSET_THRESHOLD_DB / 20);
  const minGapFrames = Math.floor(
    ((MIN_ONSET_GAP_MS / 1000) * sampleRate) / hop,
  );

  // Track local minimum for rise detection
  let localMin = envelope[0];
  let lastOnsetFrame = -minGapFrames;

  for (let i = 1; i < envelope.length; i++) {
    if (envelope[i] < localMin) {
      localMin = envelope[i];
    }

    // Check for significant rise above local minimum
    if (
      localMin > 0 &&
      envelope[i] / localMin >= thresholdLinear &&
      i - lastOnsetFrame >= minGapFrames
    ) {
      const timeMs = ((i * hop) / sampleRate) * 1000;
      onsets.push(timeMs);
      lastOnsetFrame = i;
      localMin = envelope[i]; // reset local min after onset
    }

    // Slowly decay local minimum tracking (prevents getting stuck on silence)
    if (envelope[i] > localMin * 1.5) {
      localMin = envelope[i] * 0.8;
    }
  }

  return onsets;
}

function gaussianSmooth(data: Float64Array, sigma: number): Float64Array {
  const result = new Float64Array(data.length);
  const kernelSize = Math.ceil(sigma * 3);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let weightSum = 0;
    for (let j = -kernelSize; j <= kernelSize; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        const weight = Math.exp(-(j * j) / (2 * sigma * sigma));
        sum += data[idx] * weight;
        weightSum += weight;
      }
    }
    result[i] = weightSum > 0 ? sum / weightSum : 0;
  }

  return result;
}

function resolveOctave(rawBpm: number, histogram: Float64Array): number {
  // Check half and double tempo
  const candidates = [rawBpm, rawBpm / 2, rawBpm * 2].filter(
    (b) => b >= BPM_MIN && b <= BPM_MAX,
  );

  let bestBpm = rawBpm;
  let bestScore = -Infinity;

  for (const bpm of candidates) {
    const bin = Math.round(bpm - BPM_MIN);
    if (bin < 0 || bin >= histogram.length) continue;

    let score = histogram[bin];
    // Prefer natural range
    if (bpm >= PREFERRED_LOW && bpm <= PREFERRED_HIGH) {
      score *= 1.5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}
