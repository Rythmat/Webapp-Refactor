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
import { PolyphonicNoteTracker } from './PolyphonicNoteTracker';
import type { StreamingCaptureLike } from './StreamingAudioCapture';
import { TransitionMatrix } from './TransitionMatrix';
import {
  PIANO_MIN_FREQ,
  PIANO_MAX_FREQ,
  freqToMidi,
  SILENCE_STATE,
  type DetectionMode,
  type TrackedNote,
  type OnsetEvent,
} from './types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface OrchestratorCallbacks {
  onNoteOn?: (event: MidiNoteEvent) => void;
  onNoteOff?: (event: MidiNoteEvent) => void;
}

/**
 * Per-instrument tuning for the detection engine. Defaults reproduce the
 * piano behavior Learn relies on (so omitting options is a no-op change);
 * the Studio's Guitar/Bass-to-MIDI feature passes guitar/bass ranges + FFT
 * sizes here.
 */
export interface OrchestratorOptions {
  minFreq?: number;
  maxFreq?: number;
  fastFftSize?: number;
  hiResFftSize?: number;
  /** Skip the basic-pitch ML peer (saves CPU/latency for mono instruments). */
  disableMl?: boolean;
  /**
   * Use the set-valued PolyphonicNoteTracker for polyphonic mode (Studio
   * guitar chords → multiple simultaneous MIDI notes). When false (default),
   * polyphonic mode keeps the original NMF→HMM single-note path so the Learn
   * section's behavior is unchanged.
   */
  usePolyTracker?: boolean;
  /**
   * Monophonic path only: re-fire a held note (noteOff+noteOn) when a fresh
   * spectral-flux onset arrives while the same pitch continues, so repeated
   * same-pitch articulations (basslines/riffs) aren't silently dropped. Default
   * false → the shared NoteHMM/Learn path is byte-identical.
   */
  retriggerOnOnset?: boolean;
  /**
   * Decimate the hi-res YIN stream: recompute CMNDF only every Nth tick and
   * reuse the last distribution otherwise. Default 1 (every tick) keeps Learn
   * bit-for-bit; the Studio mono path raises it (the 171ms window can't update
   * faster than a few Hz, so this is free accuracy-wise and a big CPU win).
   */
  hiResSkipFactor?: number;
}

interface ResolvedOptions {
  minFreq: number;
  maxFreq: number;
  fastFftSize: number;
  hiResFftSize: number;
  disableMl: boolean;
  usePolyTracker: boolean;
  retriggerOnOnset: boolean;
  hiResSkipFactor: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Throttle interval for the RAF loop (~40Hz). */
const THROTTLE_MS = 25;

/** Minimum confidence for profiling (only observe high-quality detections). */
const PROFILING_CONFIDENCE = 0.8;

/**
 * How long a basic-pitch ML note set stays usable in the Studio poly path.
 * The ML re-infers roughly every ~256ms, so this must stay above that (or ML
 * is nulled every frame), but well below the old 1500ms — a released string
 * lingers in ML's activeKeys until the next inference, so a large window let
 * chords hang up to ~1.5s. ~450ms caps the hang at ~1/3 while keeping ML.
 * Studio-only (this path is gated behind usePolyTracker).
 */
const POLY_ML_STALENESS_MS = 450;

/** Mono re-articulation: min gap (ms) between accepted spectral-flux onsets, so
 *  one pluck = one re-fire (a transient can exceed the flux threshold for a few
 *  frames). Only used when retriggerOnOnset is enabled (Studio mono). */
const MONO_REARTICULATION_MS = 70;

// ── Class ─────────────────────────────────────────────────────────────────

export class ProbabilisticOrchestrator {
  private capture: StreamingCaptureLike;
  private mode: DetectionMode;
  private opts: ResolvedOptions;

  // Layer 1: Multi-resolution input
  private onsetStream: OnsetStream;
  private fastPitchStream: FastPitchStream;
  private hiResPitchStream: HiResPitchStream;
  private nmfDetector: NMFDetector;
  private pianoTemplates: PianoTemplates;

  // Layer 2: Bayesian tracker (monophonic path)
  private observationModel: ObservationModel;
  private noteHMM: NoteHMM;
  private transitionMatrix: TransitionMatrix;

  // Polyphonic path (set-valued note tracker)
  private polyTracker: PolyphonicNoteTracker;

  // performance.now() of the last accepted mono re-articulation onset.
  private lastArticulationTs = 0;

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
    capture: StreamingCaptureLike,
    mode: DetectionMode = 'monophonic',
    options: OrchestratorOptions = {},
  ) {
    this.capture = capture;
    this.mode = mode;
    this.opts = {
      minFreq: options.minFreq ?? PIANO_MIN_FREQ,
      maxFreq: options.maxFreq ?? PIANO_MAX_FREQ,
      fastFftSize: options.fastFftSize ?? 2048,
      hiResFftSize: options.hiResFftSize ?? 8192,
      disableMl: options.disableMl ?? false,
      usePolyTracker: options.usePolyTracker ?? false,
      retriggerOnOnset: options.retriggerOnOnset ?? false,
      hiResSkipFactor: options.hiResSkipFactor ?? 1,
    };

    // Initialize Layer 1 (assume 48kHz for now — reconfigured on start()).
    this.onsetStream = new OnsetStream(512);
    this.fastPitchStream = new FastPitchStream(
      48000,
      this.opts.fastFftSize,
      this.opts.minFreq,
      this.opts.maxFreq,
    );
    this.hiResPitchStream = new HiResPitchStream(
      48000,
      this.opts.hiResFftSize,
      this.opts.minFreq,
      this.opts.maxFreq,
    );

    // Templates + NMF (reconfigured for the real sample rate on start()).
    this.pianoTemplates = new PianoTemplates(48000, this.opts.hiResFftSize);
    this.nmfDetector = new NMFDetector(this.pianoTemplates);

    // Polyphonic tracker gated to this instrument's MIDI range.
    this.polyTracker = new PolyphonicNoteTracker(
      freqToMidi(this.opts.minFreq),
      freqToMidi(this.opts.maxFreq),
    );

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
    this.polyTracker.reset();
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

    // Reconfigure templates + streams for the actual sample rate.
    const ctx = this.capture.getAudioContext();
    if (ctx) {
      const sr = ctx.sampleRate;
      this.pianoTemplates = new PianoTemplates(sr, this.opts.hiResFftSize);
      this.nmfDetector = new NMFDetector(this.pianoTemplates);
      this.fastPitchStream = new FastPitchStream(
        sr,
        this.opts.fastFftSize,
        this.opts.minFreq,
        this.opts.maxFreq,
      );
      this.hiResPitchStream = new HiResPitchStream(
        sr,
        this.opts.hiResFftSize,
        this.opts.minFreq,
        this.opts.maxFreq,
      );
    }
    this.hiResPitchStream.setSkipFactor(this.opts.hiResSkipFactor);
    this.polyTracker.reset();

    // Start ML peer (skipped for mono instruments that opt out to save CPU).
    const source = this.capture.getSourceNode();
    if (ctx && source && !this.opts.disableMl) {
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
    this.polyTracker.reset();
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
    // Studio guitar-poly uses the set-valued tracker; Learn's poly keeps the
    // original NMF→HMM path below.
    if (this.mode === 'polyphonic' && this.opts.usePolyTracker) {
      this.processPolyTick();
      return;
    }

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

    // 4. NMF activation (polyphonic mode only). Studio guitar-poly is handled
    //    by processPolyTick() and never reaches here; this preserves Learn's
    //    existing NMF→HMM polyphonic path unchanged.
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

    // 10. Emit note events on state change. When retriggerOnOnset is enabled
    //     (Studio mono), a fresh onset re-articulates a held same-pitch note.
    const articulation =
      this.opts.retriggerOnOnset && this.isNewArticulation(onset);
    this.handleTrackedNote(tracked, articulation);

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

  /**
   * Polyphonic tick: onset + noise-floor gating + NMF + ML note set → the
   * set-valued PolyphonicNoteTracker, which emits per-note on/off. Skips the
   * mono YIN streams and the single-note HMM entirely.
   */
  private processPolyTick(): void {
    const onsetAnalyser = this.capture.getOnsetAnalyser();
    const hiResAnalyser = this.capture.getHiResAnalyser();

    // 1. Onset (drives immediate attack + velocity boost).
    const onset = onsetAnalyser
      ? this.onsetStream.process(onsetAnalyser)
      : null;

    // 2. Noise-floor update + signal-present gate (false-positive killer).
    let signalPresent = true;
    if (hiResAnalyser) {
      if (!this.freqBuffer) {
        this.freqBuffer = new Float32Array(hiResAnalyser.frequencyBinCount);
      }
      hiResAnalyser.getFloatFrequencyData(
        this.freqBuffer as Float32Array<ArrayBuffer>,
      );
      const sr = hiResAnalyser.context.sampleRate;
      this.noiseFloor.update(this.freqBuffer, sr);
      if (this.noiseFloor.isCalibrated) {
        signalPresent = this.noiseFloor.isSignalPresent(this.freqBuffer, sr);
      }
    }

    // 3. NMF activation (fast, DSP-based polyphony).
    const nmf = hiResAnalyser ? this.nmfDetector.process(hiResAnalyser) : null;

    // 4. ML note set (accurate polyphony; discard if stale).
    const rawMl = this.opts.disableMl ? null : this.mlPeer.getLatestNotes();
    const ml =
      rawMl && performance.now() - rawMl.timestamp < POLY_ML_STALENESS_MS
        ? rawMl
        : null;

    // 5. RMS (velocity + hard silence gate). Fold in the signal-present gate.
    const rms = signalPresent ? this.capture.getState().rmsLevel : 0;

    // 6. Track note set → per-note on/off events.
    const { noteOns, noteOffs } = this.polyTracker.update(
      {
        nmf: nmf?.weights ?? null,
        mlActiveKeys: ml?.activeKeys ?? null,
        mlOnsets: ml?.onsets ?? null,
        rms,
      },
      onset,
    );

    const now = performance.now() / 1000;

    // Emit note-offs first (frees voices before re-triggering).
    for (const note of noteOffs) {
      const start = this.noteStartTimes.get(note);
      this.noteStartTimes.delete(note);
      this.callbacks.onNoteOff?.({
        number: note,
        duration: start ? now - start.time : 0,
        velocity: start?.velocity ?? 0,
        source: 'audio',
      });
    }

    for (const { note, velocity } of noteOns) {
      this.noteStartTimes.set(note, { time: now, velocity, confidence: 1 });
      this.callbacks.onNoteOn?.({
        number: note,
        duration: 0,
        velocity,
        source: 'audio',
      });
    }

    // 7. Update input level for UI.
    this.capture.updateLevel();
  }

  /**
   * Return true at most once per ~MONO_REARTICULATION_MS when a spectral-flux
   * onset arrives — the debounced "new pluck" edge used for mono re-articulation.
   */
  private isNewArticulation(onset: OnsetEvent | null): boolean {
    if (!onset) return false;
    if (onset.timestamp - this.lastArticulationTs >= MONO_REARTICULATION_MS) {
      this.lastArticulationTs = onset.timestamp;
      return true;
    }
    return false;
  }

  /** Handle tracked note state changes → emit MidiNoteEvent callbacks.
   *  `articulation` (Studio mono, retriggerOnOnset) re-fires a held same-pitch
   *  note on a fresh pluck so repeated notes aren't dropped. */
  private handleTrackedNote(
    tracked: TrackedNote | null,
    articulation = false,
  ): void {
    const newNote = tracked?.midiNumber ?? null;

    if (newNote === this.lastNote) {
      // Same pitch held — re-articulate on a fresh onset when enabled.
      if (articulation && newNote !== null && tracked) {
        const now = performance.now() / 1000;
        const start = this.noteStartTimes.get(newNote);
        this.callbacks.onNoteOff?.({
          number: newNote,
          duration: start ? now - start.time : 0,
          velocity: start?.velocity ?? 0,
          source: 'audio',
        });
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
      return; // No pitch change
    }

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
