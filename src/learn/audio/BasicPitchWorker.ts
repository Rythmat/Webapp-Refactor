// ── BasicPitchWorker ──────────────────────────────────────────────────────
// Web Worker that runs Spotify's basic-pitch ML model for piano note
// detection. Receives raw audio chunks from the main thread, accumulates
// them into a sliding 2-second buffer, and runs inference periodically.
//
// The model outputs onset/frame/contour probabilities for all 88 piano
// keys. We extract the latest frames and post back which keys are active.

import { BasicPitch } from '@spotify/basic-pitch';
import * as tf from '@tensorflow/tfjs';

// ── Constants (from basic-pitch) ─────────────────────────────────────────

const SAMPLE_RATE = 22050;
const WINDOW_SAMPLES = SAMPLE_RATE * 2 - 256; // 43,844 (matches basic-pitch AUDIO_N_SAMPLES)
const MIN_NEW_SAMPLES = Math.floor(SAMPLE_RATE * 0.2); // ~200ms of new audio before re-inference
const ONSET_THRESHOLD = 0.35; // lowered from 0.5 to catch softer attacks
const FRAME_THRESHOLD = 0.3;

// MIDI note 21 (A0) is the lowest piano key; basic-pitch outputs 88 keys starting from A0
const MIDI_OFFSET = 21;

// ── Ring Buffer ──────────────────────────────────────────────────────────

class RingBuffer {
  private buffer: Float32Array;
  private writePos = 0;
  private filled = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  write(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writePos] = samples[i];
      this.writePos = (this.writePos + 1) % this.buffer.length;
    }
    this.filled = Math.min(this.filled + samples.length, this.buffer.length);
  }

  /** Get the full buffer contents in chronological order. */
  read(): Float32Array {
    if (this.filled < this.buffer.length) {
      // Buffer not yet full — return zero-padded
      const out = new Float32Array(this.buffer.length);
      const start = this.buffer.length - this.filled;
      for (let i = 0; i < this.filled; i++) {
        out[start + i] =
          this.buffer[
            (this.writePos - this.filled + i + this.buffer.length) %
              this.buffer.length
          ];
      }
      return out;
    }
    // Buffer full — read in order
    const out = new Float32Array(this.buffer.length);
    for (let i = 0; i < this.buffer.length; i++) {
      out[i] = this.buffer[(this.writePos + i) % this.buffer.length];
    }
    return out;
  }

  isFull(): boolean {
    return this.filled >= this.buffer.length;
  }
}

// ── Simple Linear Resampler ──────────────────────────────────────────────

function resample(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const output = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    const a = input[idx] ?? 0;
    const b = input[Math.min(idx + 1, input.length - 1)] ?? 0;
    output[i] = a + frac * (b - a);
  }
  return output;
}

// ── Worker State ─────────────────────────────────────────────────────────

let basicPitch: BasicPitch | null = null;
let ringBuffer: RingBuffer | null = null;
let newSampleCount = 0;
let inferenceRunning = false;

// ── Message Handler ──────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      // Set TF.js backend
      await tf.setBackend('webgl');
      await tf.ready();

      // Load model from the bundled path
      // The model files are served from node_modules/@spotify/basic-pitch/model/
      // In a bundled app, we need to provide the URL to the model.json
      basicPitch = new BasicPitch(
        '/node_modules/@spotify/basic-pitch/model/model.json',
      );
      // Pre-warm the model by waiting for it to load
      await basicPitch.model;

      ringBuffer = new RingBuffer(WINDOW_SAMPLES);
      newSampleCount = 0;

      (self as unknown as Worker).postMessage({ type: 'ready' });
    } catch (err) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        message: `Failed to init basic-pitch: ${err}`,
      });
    }
    return;
  }

  if (msg.type === 'audio') {
    if (!ringBuffer || !basicPitch) return;

    const samples: Float32Array = msg.samples;
    const sampleRate: number = msg.sampleRate;

    // Resample to 22,050 Hz
    const resampled = resample(samples, sampleRate, SAMPLE_RATE);
    ringBuffer.write(resampled);
    newSampleCount += resampled.length;

    // Run inference when enough new audio has accumulated and buffer is full
    if (
      newSampleCount >= MIN_NEW_SAMPLES &&
      ringBuffer.isFull() &&
      !inferenceRunning
    ) {
      inferenceRunning = true;
      newSampleCount = 0;

      try {
        const audioData = ringBuffer.read();
        const activeKeys: number[] = [];
        const onsetKeys: number[] = [];

        await basicPitch.evaluateModel(
          audioData,
          (frames, onsets, _contours) => {
            // Extract the LATEST frames (most recent audio)
            // Each frame = 256/22050 = ~11.6ms
            // Look at the last ~20 frames (~230ms of the most recent audio)
            const lookbackFrames = Math.min(20, frames.length);
            const startFrame = frames.length - lookbackFrames;

            for (let key = 0; key < 88; key++) {
              // Check for onset in recent frames
              let hasOnset = false;
              let isActive = false;

              for (let f = startFrame; f < frames.length; f++) {
                if (onsets[f][key] > ONSET_THRESHOLD) {
                  hasOnset = true;
                }
                if (frames[f][key] > FRAME_THRESHOLD) {
                  isActive = true;
                }
              }

              const midiNote = key + MIDI_OFFSET;
              if (hasOnset) onsetKeys.push(midiNote);
              if (isActive) activeKeys.push(midiNote);
            }
          },
          () => {}, // percent callback — not needed
        );

        (self as unknown as Worker).postMessage({
          type: 'notes',
          activeKeys,
          onsets: onsetKeys,
        });
      } catch (err) {
        (self as unknown as Worker).postMessage({
          type: 'error',
          message: `Inference error: ${err}`,
        });
      } finally {
        inferenceRunning = false;
      }
    }
    return;
  }

  if (msg.type === 'stop') {
    basicPitch = null;
    ringBuffer = null;
    newSampleCount = 0;
    inferenceRunning = false;
  }
};
