// ── PitchAnalyzer.ts ─────────────────────────────────────────────────────
// Offline pitch analysis engine. Runs YIN pitch detection on an AudioBuffer
// and groups detections into PitchSegment objects for the vocal pitch editor.

import type { AudioBufferLike } from '@/unison/converters/audioToUnison';
import { yinDetectOffline } from '@/audio/pitch/YinCore';

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
  midiNote: number; // nearest MIDI note (0–127)
  centsOffset: number; // deviation from nearest note (-50 to +50)
  pitchContour: number[]; // per-frame Hz values
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

export function analyzeBuffer(audioBuffer: AudioBufferLike): PitchSegment[] {
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0); // mono / left channel
  const totalSamples = samples.length;

  // Step 1: Run YIN frame-by-frame
  const rawFrames: PitchFrame[] = [];
  for (
    let offset = 0;
    offset + FRAME_LENGTH <= totalSamples;
    offset += HOP_SIZE
  ) {
    const freq = yinDetectOffline(
      samples,
      offset,
      FRAME_LENGTH,
      sampleRate,
      YIN_THRESHOLD,
    );
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
  let segFrames: PitchFrame[] = [];
  let segId = 0;

  const flushSegment = () => {
    if (segFrames.length === 0) return;
    const startMs = segFrames[0].timeMs;
    const endMs =
      segFrames[segFrames.length - 1].timeMs + (HOP_SIZE / sampleRate) * 1000;

    if (endMs - startMs < MIN_SEGMENT_MS) {
      segFrames = [];
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
      segFrames.push(frame);
    }
  }

  // Flush remaining
  flushSegment();

  return segments;
}

export { hzToMidi, midiToHz };
