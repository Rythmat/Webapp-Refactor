/**
 * Convert audio data into a UnisonDocument.
 *
 * Bridges existing audio analysis infrastructure (OfflineChordAnalyzer,
 * PitchAnalyzer) into the UNISON pipeline via sessionToUnison().
 */

import {
  analyzeChords,
  offlineFramesToSnapshots,
} from '@/daw/audio/OfflineChordAnalyzer';
import {
  analyzeBuffer as analyzePitch,
  type PitchSegment,
} from '@/daw/audio/pitch-analysis/PitchAnalyzer';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { deriveChordRegionsFromAudioSnapshots } from '@/daw/store/prismSlice';
import { estimateBpm } from '../engine/bpmEstimator';
import { analyzeMix } from '../engine/mixAnalyzer';
import { analyzeTimbre } from '../engine/timbreAnalyzer';
import type { UnisonDocument } from '../types/schema';
import { sessionToUnison, type SessionSnapshot } from './sessionToUnison';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal AudioBuffer-like interface. Allows testing without Web Audio API.
 */
export interface AudioBufferLike {
  sampleRate: number;
  numberOfChannels?: number;
  getChannelData(channel: number): Float32Array;
}

export interface AudioToUnisonOptions {
  bpm?: number;
  title?: string;
  filename?: string;
  keyRootPc?: number;
  modeIntervals?: number[];
}

const PPQ = 480;

// ── Main Converter ───────────────────────────────────────────────────────────

/**
 * Convert an AudioBuffer (or AudioBufferLike) into a UnisonDocument.
 *
 * Pipeline:
 * 1. Estimate BPM (if not provided)
 * 2. Detect chords via OfflineChordAnalyzer
 * 3. Convert to ChordRegions
 * 4. Extract melody via PitchAnalyzer
 * 5. Build SessionSnapshot → sessionToUnison()
 */
export function audioToUnison(
  audioBuffer: AudioBufferLike,
  options?: AudioToUnisonOptions,
): UnisonDocument {
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);

  // Step 1: Estimate BPM
  const bpmResult = options?.bpm
    ? { bpm: options.bpm, confidence: 1 }
    : estimateBpm(samples, sampleRate);
  const bpm = bpmResult.bpm;

  // Step 2: Detect chords (FFT → Viterbi smoothing)
  const chordFrames = analyzeChords(
    audioBuffer,
    options?.keyRootPc,
    options?.modeIntervals,
    bpm,
  );

  // Step 3: Convert chord frames to snapshots → ChordRegions
  const snapshots = offlineFramesToSnapshots(chordFrames, 0, bpm, sampleRate);
  // rootMidi is required for chord naming — default to C3 when no key provided.
  // SessionSnapshot.rootNote is left null so UNISON key detection can override.
  const rootPc = options?.keyRootPc ?? 0;
  const chordRegions = deriveChordRegionsFromAudioSnapshots(
    snapshots,
    rootPc + 48,
    'ionian',
  );

  // Step 4: Extract melody via pitch detection
  const melodySegments = analyzePitch(audioBuffer);
  const melodyEvents = pitchSegmentsToEvents(melodySegments, bpm);

  // Step 5: Build SessionSnapshot
  const tracks: SessionSnapshot['tracks'] = [];

  // Add melody track if we detected pitch segments
  if (melodyEvents.length > 0) {
    tracks.push({
      id: 'audio-melody',
      name: 'Detected Melody',
      type: 'midi',
      instrument: '',
      midiClips: [{ events: melodyEvents }],
    });
  }

  // Add a "harmony" track from chord snapshots (for UNISON event listing)
  const harmonyEvents = snapshotsToEvents(snapshots, bpm);
  if (harmonyEvents.length > 0) {
    tracks.push({
      id: 'audio-harmony',
      name: 'Detected Chords',
      type: 'midi',
      instrument: '',
      midiClips: [{ events: harmonyEvents }],
    });
  }

  const snapshot: SessionSnapshot = {
    tracks,
    chordRegions,
    bpm,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    rootNote: options?.keyRootPc ?? null,
    mode: 'ionian',
    title: options?.title ?? options?.filename ?? 'Audio Import',
  };

  // Step 6: Run full UNISON analysis pipeline
  const doc = sessionToUnison(snapshot);
  doc.metadata.source = 'audio';
  if (options?.filename) {
    doc.metadata.sourceFilename = options.filename;
  }

  // Enrich rhythm with BPM confidence from our estimator
  if (!options?.bpm) {
    doc.rhythm.bpmConfidence = bpmResult.confidence;
  }

  // Step 7: Timbre analysis from raw audio
  doc.timbre = analyzeTimbre(audioBuffer);

  // Step 8: Mix analysis (stereo field, dynamics, spectral balance, loudness)
  doc.mix = analyzeMix(audioBuffer);

  return doc;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert PitchSegments (from YIN analysis) to tick-based MidiNoteEvents.
 */
function pitchSegmentsToEvents(
  segments: PitchSegment[],
  bpm: number,
): MidiNoteEvent[] {
  const msToTick = (bpm * PPQ) / 60000;

  return segments
    .filter((seg) => seg.midiNote >= 0 && seg.midiNote <= 127)
    .map((seg) => ({
      note: seg.midiNote,
      velocity: 80,
      startTick: Math.round(seg.startTimeMs * msToTick),
      durationTicks: Math.max(
        1,
        Math.round((seg.endTimeMs - seg.startTimeMs) * msToTick),
      ),
      channel: 1,
    }));
}

/**
 * Convert chord snapshots to MidiNoteEvents for the harmony track.
 */
function snapshotsToEvents(
  snapshots: { tick: number; notes: number[] }[],
  _bpm: number,
): MidiNoteEvent[] {
  const events: MidiNoteEvent[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    const nextTick =
      i < snapshots.length - 1 ? snapshots[i + 1].tick : snap.tick + PPQ;
    const duration = Math.max(1, nextTick - snap.tick);

    for (const note of snap.notes) {
      events.push({
        note,
        velocity: 80,
        startTick: snap.tick,
        durationTicks: duration,
        channel: 1,
      });
    }
  }

  return events;
}
