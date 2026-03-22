// ── ProbabilisticOrchestrator ──────────────────────────────────────────────
// The main loop that connects all six layers of the v2 pipeline.
// Replaces AudioToMidiAdapter.ts.
//
// RAF loop (~40Hz):
//   1. OnsetStream.process(onsetAnalyser) → onset event
//   2. FastPitchStream.process(fastAnalyser) → PitchDistribution
//   3. HiResPitchStream.process(hiResAnalyser) → PitchDistribution (slower)
//   4. NMFDetector.process(hiResAnalyser) → NMFActivation [polyphonic mode]
//   5. BasicPitchPeer.getLatestDistribution() → PitchDistribution [async ML]
//   6. ObservationModel.fuse(...) → unified likelihood
//   7. NoteHMM.update(fused, onset) → TrackedNote
//   8. Emit noteOn/noteOff callbacks (backward-compatible MidiNoteEvent)
//   9. AdaptiveNoiseFloor.update(...) [continuous]
//  10. InstrumentProfiler.observeNote(...) [when confident]

import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { AdaptiveNoiseFloor } from './AdaptiveNoiseFloor';
import { BasicPitchPeer } from './BasicPitchPeer';
import { FastPitchStream } from './FastPitchStream';
import { HiResPitchStream } from './HiResPitchStream';
import { InstrumentProfiler } from './InstrumentProfiler';
import { NMFDetector } from './NMFDetector';
import { NoteHMM } from './NoteHMM';
import { ObservationModel } from './ObservationModel';
import { OnsetStream } from './OnsetStream';
import { PianoTemplates } from './PianoTemplates';
import { StreamingAudioCapture } from './StreamingAudioCapture';
import { TransitionMatrix } from './TransitionMatrix';
import { SILENCE_STATE, type DetectionMode, type TrackedNote } from './types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface OrchestratorCallbacks {
  onNoteOn?: (event: MidiNoteEvent) => void;
  onNoteOff?: (event: MidiNoteEvent) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Throttle interval for the RAF loop (~40Hz). */
const THROTTLE_MS = 25;

/** Minimum confidence for profiling (only observe high-quality detections). */
const PROFILING_CONFIDENCE = 0.8;

// ── Class ─────────────────────────────────────────────────────────────────

export class ProbabilisticOrchestrator {
  private capture: StreamingAudioCapture;
  private mode: DetectionMode;

  // Layer 1: Multi-resolution input
  private onsetStream: OnsetStream;
  private fastPitchStream: FastPitchStream;
  private hiResPitchStream: HiResPitchStream;
  private nmfDetector: NMFDetector;
  private pianoTemplates: PianoTemplates;

  // Layer 2: Bayesian tracker
  private observationModel: ObservationModel;
  private noteHMM: NoteHMM;
  private transitionMatrix: TransitionMatrix;

  // Layer 4: ML peer
  private mlPeer: BasicPitchPeer;

  // Layer 6: Adaptive
  private noiseFloor: AdaptiveNoiseFloor;
  private profiler: InstrumentProfiler;

  // Note state tracking (MIDI → start time + velocity)
  private noteStartTimes = new Map<
    number,
    { time: number; velocity: number; confidence: number }
  >();

  // RAF loop state
  private rafId = 0;
  private lastTickTime = 0;

  // Callbacks
  private callbacks: OrchestratorCallbacks = {};

  // Freq-domain buffer for noise floor updates
  private freqBuffer: Float32Array | null = null;

  // Last tracked note (for change detection)
  private lastNote: number | null = null;

  constructor(
    capture: StreamingAudioCapture,
    mode: DetectionMode = 'monophonic',
  ) {
    this.capture = capture;
    this.mode = mode;

    // Initialize Layer 1
    this.onsetStream = new OnsetStream(512);
    this.fastPitchStream = new FastPitchStream(48000, 2048);
    this.hiResPitchStream = new HiResPitchStream(48000, 8192);

    // Templates + NMF (assume 48kHz, 8192 FFT for now — will reconfigure on start)
    this.pianoTemplates = new PianoTemplates(48000, 8192);
    this.nmfDetector = new NMFDetector(this.pianoTemplates);

    // Initialize Layer 2
    this.transitionMatrix = new TransitionMatrix();
    this.observationModel = new ObservationModel(
      mode === 'monophonic'
        ? { fast: 1.0, hiRes: 0.8, ml: 0.3, nmf: 0.0 }
        : { fast: 0.3, hiRes: 0.5, ml: 0.3, nmf: 1.0 },
    );
    this.noteHMM = new NoteHMM(this.transitionMatrix);

    // Initialize Layer 4
    this.mlPeer = new BasicPitchPeer();

    // Initialize Layer 6
    this.noiseFloor = new AdaptiveNoiseFloor();
    this.profiler = new InstrumentProfiler();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Set event callbacks. */
  setCallbacks(callbacks: OrchestratorCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Set detection mode. */
  setMode(mode: DetectionMode): void {
    if (mode === this.mode) return;
    this.releaseAllNotes();
    this.mode = mode;

    // Adjust observation weights for mode
    this.observationModel.setStreamWeights(
      mode === 'monophonic'
        ? { fast: 1.0, hiRes: 0.8, ml: 0.3, nmf: 0.0 }
        : { fast: 0.3, hiRes: 0.5, ml: 0.3, nmf: 1.0 },
    );

    this.noteHMM.reset();
    this.nmfDetector.reset();
  }

  /** Set key context for diatonic priors in the HMM. */
  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.transitionMatrix.setKeyContext(rootPc, modeIntervals);
  }

  /** Clear key context. */
  clearKeyContext(): void {
    this.transitionMatrix.clearKeyContext();
  }

  /** Set expected MIDI notes (10x transition boost in HMM). */
  setExpectedNotes(notes: number[] | null): void {
    this.transitionMatrix.setExpectedNotes(notes);

    // Also restrict NMF to expected keys when in polyphonic mode
    if (this.mode === 'polyphonic') {
      this.nmfDetector.setActiveKeys(notes);
    }
  }

  /** Start the analysis RAF loop and ML peer. */
  async start(): Promise<void> {
    if (this.rafId) return;
    this.lastTickTime = 0;

    // Reconfigure templates for actual sample rate
    const ctx = this.capture.getAudioContext();
    if (ctx) {
      const sr = ctx.sampleRate;
      this.pianoTemplates = new PianoTemplates(sr, 8192);
      this.nmfDetector = new NMFDetector(this.pianoTemplates);
      this.fastPitchStream = new FastPitchStream(sr, 2048);
      this.hiResPitchStream = new HiResPitchStream(sr, 8192);
    }

    // Start ML peer
    const source = this.capture.getSourceNode();
    if (ctx && source) {
      await this.mlPeer.start(ctx, source);
    }

    // Start RAF loop
    const tick = (time: number) => {
      this.rafId = requestAnimationFrame(tick);

      // Throttle to ~40Hz
      if (time - this.lastTickTime < THROTTLE_MS) return;
      this.lastTickTime = time;

      if (!this.capture.isActive) return;

      this.processTick();
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /** Stop the analysis loop and release resources. */
  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.mlPeer.stop();
    this.releaseAllNotes();
    this.noteHMM.reset();
    this.onsetStream.reset();
    this.fastPitchStream.reset();
    this.hiResPitchStream.reset();
    this.nmfDetector.reset();
    this.noiseFloor.reset();
  }

  /** Get currently active MIDI notes. */
  getActiveNotes(): number[] {
    return Array.from(this.noteStartTimes.keys());
  }

  /** Get current RMS input level (0–1). */
  getInputLevel(): number {
    return this.capture.getState().rmsLevel;
  }

  /** Get the adaptive noise floor instance (for diagnostics / calibration). */
  getNoiseFloor(): AdaptiveNoiseFloor {
    return this.noiseFloor;
  }

  /** Get note confidences for UI display. */
  getNoteConfidences(): Map<number, number> {
    const result = new Map<number, number>();
    for (const [note, state] of this.noteStartTimes) {
      result.set(note, state.confidence);
    }
    return result;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Process one tick of the RAF loop. */
  private processTick(): void {
    const onsetAnalyser = this.capture.getOnsetAnalyser();
    const fastAnalyser = this.capture.getFastPitchAnalyser();
    const hiResAnalyser = this.capture.getHiResAnalyser();

    // 1. Onset detection
    const onset = onsetAnalyser
      ? this.onsetStream.process(onsetAnalyser)
      : null;

    // 2. Fast pitch distribution
    const fastDist = fastAnalyser
      ? this.fastPitchStream.process(fastAnalyser)
      : null;

    // 3. Hi-res pitch distribution (may be null if no new data)
    const hiResDist = hiResAnalyser
      ? this.hiResPitchStream.process(hiResAnalyser)
      : null;

    // 4. NMF activation (polyphonic mode only)
    const nmfActivation =
      this.mode === 'polyphonic' && hiResAnalyser
        ? this.nmfDetector.process(hiResAnalyser)
        : null;

    // 5. Update noise floor BEFORE fusion (so gating uses current-frame data)
    if (hiResAnalyser) {
      if (!this.freqBuffer) {
        this.freqBuffer = new Float32Array(hiResAnalyser.frequencyBinCount);
      }
      hiResAnalyser.getFloatFrequencyData(
        this.freqBuffer as Float32Array<ArrayBuffer>,
      );
      this.noiseFloor.update(this.freqBuffer, hiResAnalyser.context.sampleRate);

      // Propagate adaptive silence threshold to pitch streams
      if (this.noiseFloor.isCalibrated) {
        const adaptiveRms = this.noiseFloor.getNoiseFloorRms();
        if (adaptiveRms > 0) {
          this.fastPitchStream.setAdaptiveSilenceThreshold(adaptiveRms * 1.5);
          this.hiResPitchStream.setAdaptiveSilenceThreshold(adaptiveRms * 1.5);
        }
      }
    }

    // 6. ML distribution (async, may be null; discard if stale >500ms)
    const rawMlDist = this.mlPeer.getLatestDistribution();
    const mlDist =
      rawMlDist && performance.now() - rawMlDist.timestamp < 500
        ? rawMlDist
        : null;

    // 7. Fuse observations
    const fused = this.observationModel.fuse(
      fastDist,
      hiResDist,
      mlDist,
      nmfActivation,
    );

    // 7b. Noise floor gating: if calibrated and no tonal content above
    //     noise floor, gradually boost silence probability
    if (
      hiResAnalyser &&
      this.freqBuffer &&
      this.noiseFloor.isCalibrated &&
      !this.noiseFloor.isSignalPresent(
        this.freqBuffer,
        hiResAnalyser.context.sampleRate,
      )
    ) {
      // Gradual boost instead of hard threshold — avoids killing notes
      fused[SILENCE_STATE] = Math.min(0.9, fused[SILENCE_STATE] + 0.3);
    }

    // 8. RMS for velocity estimation
    const rms = this.capture.getState().rmsLevel;

    // 9. HMM update → TrackedNote
    const tracked = this.noteHMM.update(fused, onset, rms);

    // 10. Emit note events on state change
    this.handleTrackedNote(tracked);

    // 11. Instrument profiling (when confident)
    if (
      tracked &&
      tracked.confidence >= PROFILING_CONFIDENCE &&
      hiResAnalyser &&
      this.freqBuffer &&
      !this.profiler.isCalibrated
    ) {
      this.profiler.observeNote(
        tracked.midiNumber,
        this.freqBuffer,
        hiResAnalyser.context.sampleRate,
      );

      // Apply profiled corrections to templates once calibrated
      if (this.profiler.isCalibrated) {
        const ctx = this.capture.getAudioContext();
        if (ctx) {
          this.profiler.applyToTemplates(this.pianoTemplates, ctx.sampleRate);
        }
      }
    }

    // 12. Update input level for UI
    this.capture.updateLevel();
  }

  /** Handle tracked note state changes → emit MidiNoteEvent callbacks. */
  private handleTrackedNote(tracked: TrackedNote | null): void {
    const newNote = tracked?.midiNumber ?? null;

    if (newNote === this.lastNote) return; // No change

    // Note-off for previous note
    if (this.lastNote !== null) {
      const start = this.noteStartTimes.get(this.lastNote);
      const now = performance.now() / 1000;
      const duration = start ? now - start.time : 0;
      this.noteStartTimes.delete(this.lastNote);

      this.callbacks.onNoteOff?.({
        number: this.lastNote,
        duration,
        velocity: start?.velocity ?? 0,
        source: 'audio',
      });
    }

    // Note-on for new note
    if (newNote !== null && tracked) {
      const now = performance.now() / 1000;
      this.noteStartTimes.set(newNote, {
        time: now,
        velocity: tracked.velocity,
        confidence: tracked.confidence,
      });

      this.callbacks.onNoteOn?.({
        number: newNote,
        duration: 0,
        velocity: tracked.velocity,
        source: 'audio',
      });
    }

    this.lastNote = newNote;
  }

  /** Release all held notes. */
  private releaseAllNotes(): void {
    const now = performance.now() / 1000;
    for (const [noteNumber, start] of this.noteStartTimes) {
      this.callbacks.onNoteOff?.({
        number: noteNumber,
        duration: now - start.time,
        velocity: start.velocity,
        source: 'audio',
      });
    }
    this.noteStartTimes.clear();
    this.lastNote = null;
  }
}
