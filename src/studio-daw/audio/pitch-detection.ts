/**
 * Audio-to-MIDI conversion using autocorrelation pitch detection.
 * Handles monophonic audio (single melody/vocal lines).
 */

import type { MidiClipData, MidiNote } from './midi-engine';

interface PitchFrame {
  time: number;       // seconds
  frequency: number;  // Hz, 0 = silent/unvoiced
  confidence: number; // 0-1
  rms: number;        // amplitude
}

/**
 * YIN-based autocorrelation pitch detection for a single frame.
 * Returns detected frequency in Hz, or 0 if unvoiced.
 */
function detectPitchYIN(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = 0.15,
): { frequency: number; confidence: number } {
  const halfLen = Math.floor(buffer.length / 2);
  const yinBuffer = new Float32Array(halfLen);

  // Step 1: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Step 3: Absolute threshold — find first dip below threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < halfLen; tau++) {
    if (yinBuffer[tau] < threshold) {
      // Find the local minimum
      while (tau + 1 < halfLen && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    return { frequency: 0, confidence: 0 };
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  const s0 = tauEstimate > 0 ? yinBuffer[tauEstimate - 1] : yinBuffer[tauEstimate];
  const s1 = yinBuffer[tauEstimate];
  const s2 = tauEstimate + 1 < halfLen ? yinBuffer[tauEstimate + 1] : yinBuffer[tauEstimate];

  let betterTau = tauEstimate;
  const denom = 2 * s1 - s2 - s0;
  if (denom !== 0) {
    betterTau = tauEstimate + (s0 - s2) / (2 * denom);
  }

  const frequency = sampleRate / betterTau;
  const confidence = 1 - s1;

  // Sanity check: typical musical range 50Hz - 4000Hz
  if (frequency < 50 || frequency > 4000) {
    return { frequency: 0, confidence: 0 };
  }

  return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
}

/**
 * Calculate RMS amplitude for a buffer segment.
 */
function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Convert frequency to MIDI note number.
 * A4 = 440Hz = MIDI 69
 */
function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

/**
 * Analyze an AudioBuffer and detect pitch frames.
 */
function analyzePitchFrames(
  buffer: AudioBuffer,
  windowSize: number = 2048,
  hopSize: number = 512,
): PitchFrame[] {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const frames: PitchFrame[] = [];

  for (let offset = 0; offset + windowSize <= channelData.length; offset += hopSize) {
    const window = channelData.subarray(offset, offset + windowSize);
    const time = offset / sampleRate;
    const rms = calculateRMS(window);

    // Skip silence
    if (rms < 0.01) {
      frames.push({ time, frequency: 0, confidence: 0, rms });
      continue;
    }

    const { frequency, confidence } = detectPitchYIN(window, sampleRate);
    frames.push({ time, frequency, confidence, rms });
  }

  return frames;
}

/**
 * Group consecutive pitch frames with the same MIDI note into note events.
 */
function framesToNotes(
  frames: PitchFrame[],
  minConfidence: number = 0.5,
  minDuration: number = 0.05, // minimum note duration in seconds
): MidiNote[] {
  const notes: MidiNote[] = [];
  let currentNote: number | null = null;
  let noteStart = 0;
  let noteVelocity = 0;
  let noteFrameCount = 0;

  for (const frame of frames) {
    const midiNote = frame.frequency > 0 && frame.confidence >= minConfidence
      ? frequencyToMidi(frame.frequency)
      : null;

    if (midiNote !== null && midiNote === currentNote) {
      // Continue current note
      noteVelocity = Math.max(noteVelocity, frame.rms);
      noteFrameCount++;
    } else {
      // End previous note if any
      if (currentNote !== null && noteFrameCount > 0) {
        const duration = frame.time - noteStart;
        if (duration >= minDuration) {
          notes.push({
            note: currentNote,
            startTime: noteStart,
            duration,
            velocity: Math.min(127, Math.max(30, Math.round(noteVelocity * 300))),
            channel: 0,
          });
        }
      }

      // Start new note
      if (midiNote !== null) {
        currentNote = midiNote;
        noteStart = frame.time;
        noteVelocity = frame.rms;
        noteFrameCount = 1;
      } else {
        currentNote = null;
        noteFrameCount = 0;
      }
    }
  }

  // Final note
  if (currentNote !== null && noteFrameCount > 0 && frames.length > 0) {
    const lastFrame = frames[frames.length - 1];
    const duration = lastFrame.time - noteStart;
    if (duration >= minDuration) {
      notes.push({
        note: currentNote,
        startTime: noteStart,
        duration,
        velocity: Math.min(127, Math.max(30, Math.round(noteVelocity * 300))),
        channel: 0,
      });
    }
  }

  return notes;
}

/**
 * Convert an AudioBuffer to MIDI note data.
 * Returns a MidiClipData structure that can be used to create a MIDI track.
 */
export async function convertAudioToMidi(
  buffer: AudioBuffer,
  options?: {
    /** MIDI program to assign (default: 0 = Acoustic Grand Piano) */
    program?: number;
    /** Minimum pitch confidence threshold 0-1 (default: 0.5) */
    minConfidence?: number;
    /** Minimum note duration in seconds (default: 0.05) */
    minNoteDuration?: number;
  },
): Promise<MidiClipData> {
  const program = options?.program ?? 0;
  const minConfidence = options?.minConfidence ?? 0.5;
  const minNoteDuration = options?.minNoteDuration ?? 0.05;

  // Run pitch detection (CPU intensive, but runs synchronously — keep it simple)
  const frames = analyzePitchFrames(buffer);
  const notes = framesToNotes(frames, minConfidence, minNoteDuration);

  return {
    notes,
    program,
    bankMSB: 0,
    bankLSB: 0,
    totalDuration: buffer.duration,
  };
}
