/**
 * Phase 25 — Audio Assessment Bridge.
 *
 * Bridges audio pitch detection with the assessment engine.
 * Converts detected pitches from the audio stream into MidiNoteEvent[]
 * format that the assessment matchers can evaluate.
 *
 * When in audio mode, timing tolerance is widened by 1.5× since
 * audio detection inherently has lower precision than MIDI input.
 */

import type { AssessmentType } from '../types/activity';
import type { MidiNoteEvent } from './melodyPipeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedPitch {
  /** Detected MIDI note number */
  midi: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Timestamp in ms since detection started */
  timestampMs: number;
}

export interface AudioAssessmentConfig {
  /** Minimum confidence threshold (0-1) */
  minConfidence: number;
  /** Minimum note duration to register (ms) */
  minDurationMs: number;
  /** Whether to use monophonic detection (melody) or polyphonic (chords) */
  mode: 'monophonic' | 'polyphonic';
}

const DEFAULT_CONFIG: AudioAssessmentConfig = {
  minConfidence: 0.8,
  minDurationMs: 50,
  mode: 'monophonic',
};

// ---------------------------------------------------------------------------
// Audio tolerance multiplier
// ---------------------------------------------------------------------------

/** Audio detection widens timing tolerance by this factor */
export const AUDIO_TOLERANCE_MULTIPLIER = 1.5;

/**
 * Get the adjusted timing tolerance for audio input mode.
 */
export function getAudioTimingTolerance(baseToleranceMs: number): number {
  return baseToleranceMs * AUDIO_TOLERANCE_MULTIPLIER;
}

// ---------------------------------------------------------------------------
// Pitch detection → MIDI events
// ---------------------------------------------------------------------------

/**
 * Convert a stream of detected pitches into MidiNoteEvent[] format.
 *
 * Groups consecutive detections of the same pitch into single events
 * with onset and duration. Filters by confidence threshold.
 *
 * @param detectedPitches - Array of detected pitches from audio analysis
 * @param tempo - Tempo in BPM (for ms→tick conversion)
 * @param config - Detection configuration
 * @returns Array of MidiNoteEvent compatible with assessment matchers
 */
export function detectedPitchesToMidiEvents(
  detectedPitches: DetectedPitch[],
  tempo: number,
  config: AudioAssessmentConfig = DEFAULT_CONFIG,
): MidiNoteEvent[] {
  const msPerTick = 60000 / tempo / 480;
  const events: MidiNoteEvent[] = [];

  // Filter by confidence
  const confident = detectedPitches.filter(
    (p) => p.confidence >= config.minConfidence,
  );
  if (confident.length === 0) return [];

  // Group consecutive same-pitch detections into events
  let currentNote = confident[0].midi;
  let startMs = confident[0].timestampMs;
  let endMs = startMs;

  for (let i = 1; i < confident.length; i++) {
    const pitch = confident[i];

    if (pitch.midi === currentNote) {
      // Continue the current note
      endMs = pitch.timestampMs;
    } else {
      // New note — finalize the previous one
      const durationMs = endMs - startMs;
      if (durationMs >= config.minDurationMs) {
        events.push({
          note: currentNote,
          onset: Math.round(startMs / msPerTick),
          duration: Math.max(1, Math.round(durationMs / msPerTick)),
        });
      }
      currentNote = pitch.midi;
      startMs = pitch.timestampMs;
      endMs = startMs;
    }
  }

  // Finalize last note
  const lastDurationMs = endMs - startMs;
  if (lastDurationMs >= config.minDurationMs || confident.length === 1) {
    events.push({
      note: currentNote,
      onset: Math.round(startMs / msPerTick),
      duration: Math.max(
        1,
        Math.round(Math.max(lastDurationMs, config.minDurationMs) / msPerTick),
      ),
    });
  }

  return events;
}

/**
 * Determine which assessment type adjustments to apply for audio input.
 * Audio mode should generally use the same assessment type but with
 * widened tolerances via the AUDIO_TOLERANCE_MULTIPLIER.
 */
export function getAudioAssessmentType(
  baseType: AssessmentType,
): AssessmentType {
  // For audio input, we keep the same type but the caller
  // should use getAudioTimingTolerance() for wider tolerance
  return baseType;
}
