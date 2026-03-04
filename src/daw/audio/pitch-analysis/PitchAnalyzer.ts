// ── PitchAnalyzer.ts ─────────────────────────────────────────────────────
// Offline pitch analysis engine. Runs YIN pitch detection on an AudioBuffer
// and groups detections into PitchSegment objects for the vocal pitch editor.

// ── Types ────────────────────────────────────────────────────────────────

export interface PitchFrame {
  timeMs: number;
  frequency: number; // Hz, 0 = unvoiced
}

export interface PitchSegment {
  id: string;
  startTimeMs: number;
  endTimeMs: number;
  medianFreqHz: number;
  midiNote: number;        // nearest MIDI note (0–127)
  centsOffset: number;     // deviation from nearest note (-50 to +50)
  pitchContour: number[];  // per-frame Hz values
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hzToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── YIN Pitch Detection (offline version) ────────────────────────────────
// Ported from pitch-correction-processor.js YinDetector class.

function yinDetect(
  buffer: Float32Array,
  offset: number,
  frameLength: number,
  sampleRate: number,
  threshold: number,
): number {
  const halfLen = Math.floor(frameLength / 2);
  const diff = new Float32Array(halfLen);
  const cmndf = new Float32Array(halfLen);

  // Step 1: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const d = buffer[offset + i] - buffer[offset + i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  // Step 3: Absolute threshold
  const minPeriod = Math.floor(sampleRate / 2000); // 2000 Hz max
  const maxPeriod = Math.floor(sampleRate / 50);    // 50 Hz min

  let tauEstimate = -1;
  for (let tau = minPeriod; tau < Math.min(maxPeriod, halfLen); tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 < halfLen && cmndf[tau + 1] < cmndf[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return 0;

  // Step 4: Parabolic interpolation
  const t = tauEstimate;
  if (t > 0 && t < halfLen - 1) {
    const s0 = cmndf[t - 1];
    const s1 = cmndf[t];
    const s2 = cmndf[t + 1];
    const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
    if (Math.abs(shift) < 1) {
      return sampleRate / (t + shift);
    }
  }

  return sampleRate / t;
}

// ── Median Filter ────────────────────────────────────────────────────────

function medianFilter(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const window: number[] = [];
    for (let j = start; j < end; j++) {
      window.push(values[j]);
    }
    result.push(median(window));
  }
  return result;
}

// ── Main Analysis Function ───────────────────────────────────────────────

const FRAME_LENGTH = 2048;
const HOP_SIZE = 512;
const YIN_THRESHOLD = 0.15;
const MIN_SEGMENT_MS = 30;
const CENTS_GROUPING = 50; // max cents difference to merge frames

export function analyzeBuffer(audioBuffer: AudioBuffer): PitchSegment[] {
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0); // mono / left channel
  const totalSamples = samples.length;

  // Step 1: Run YIN frame-by-frame
  const rawFrames: PitchFrame[] = [];
  for (let offset = 0; offset + FRAME_LENGTH <= totalSamples; offset += HOP_SIZE) {
    const freq = yinDetect(samples, offset, FRAME_LENGTH, sampleRate, YIN_THRESHOLD);
    rawFrames.push({
      timeMs: ((offset + FRAME_LENGTH / 2) / sampleRate) * 1000,
      frequency: freq,
    });
  }

  // Step 2: Median-filter the raw frequencies (window = 5)
  const rawFreqs = rawFrames.map((f) => f.frequency);
  const filtered = medianFilter(rawFreqs, 5);
  const frames: PitchFrame[] = rawFrames.map((f, i) => ({
    timeMs: f.timeMs,
    frequency: filtered[i],
  }));

  // Step 3: Group consecutive voiced frames with similar pitch into segments
  const segments: PitchSegment[] = [];
  let segStart = -1;
  let segFrames: PitchFrame[] = [];
  let segId = 0;

  const flushSegment = () => {
    if (segFrames.length === 0) return;
    const startMs = segFrames[0].timeMs;
    const endMs = segFrames[segFrames.length - 1].timeMs + (HOP_SIZE / sampleRate) * 1000;

    if (endMs - startMs < MIN_SEGMENT_MS) {
      segFrames = [];
      segStart = -1;
      return;
    }

    const freqs = segFrames.map((f) => f.frequency);
    const medFreq = median(freqs);
    const midi = hzToMidi(medFreq);
    const nearestMidi = Math.round(midi);
    const centsOff = (midi - nearestMidi) * 100;

    segments.push({
      id: `seg-${segId++}`,
      startTimeMs: startMs,
      endTimeMs: endMs,
      medianFreqHz: medFreq,
      midiNote: nearestMidi,
      centsOffset: Math.round(centsOff),
      pitchContour: freqs,
    });

    segFrames = [];
    segStart = -1;
  };

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.frequency <= 0) {
      // Unvoiced → flush current segment
      flushSegment();
      continue;
    }

    if (segFrames.length === 0) {
      // Start new segment
      segStart = i;
      segFrames.push(frame);
      continue;
    }

    // Check if this frame belongs to the current segment
    const currentMidi = hzToMidi(frame.frequency);
    const segMedianMidi = hzToMidi(median(segFrames.map((f) => f.frequency)));
    const centsDiff = Math.abs(currentMidi - segMedianMidi) * 100;

    if (centsDiff <= CENTS_GROUPING) {
      segFrames.push(frame);
    } else {
      // Pitch jumped — flush and start new
      flushSegment();
      segStart = i;
      segFrames.push(frame);
    }
  }

  // Flush remaining
  flushSegment();

  return segments;
}

export { hzToMidi, midiToHz };
