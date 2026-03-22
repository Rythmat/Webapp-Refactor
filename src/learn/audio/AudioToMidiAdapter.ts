// ── AudioToMidiAdapter ──────────────────────────────────────────────────
// Converts audio detection results (from PianoPitchDetector and
// PianoPolyphonicDetector) into MidiNoteEvent streams compatible with
// the Learn section's activity components.
//
// Dual-path architecture:
//   Fast path: Onset detector + YIN pitch (main thread, ~125ms latency)
//   ML path:   basic-pitch CNN in Web Worker (~700ms, pitch correction)

import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { BasicPitchBridge } from './BasicPitchBridge';
import { LearnAudioCapture } from './LearnAudioCapture';
import { OnsetDetector } from './OnsetDetector';
import { PianoPitchDetector } from './PianoPitchDetector';
import { PianoPolyphonicDetector } from './PianoPolyphonicDetector';

// ── Types ────────────────────────────────────────────────────────────────

export type DetectionMode = 'monophonic' | 'polyphonic';

export interface AudioToMidiCallbacks {
  onNoteOn?: (event: MidiNoteEvent) => void;
  onNoteOff?: (event: MidiNoteEvent) => void;
}

// ── Class ────────────────────────────────────────────────────────────────

export class AudioToMidiAdapter {
  private capture: LearnAudioCapture;
  private pitchDetector: PianoPitchDetector;
  private polyDetector: PianoPolyphonicDetector;
  private onsetDetector: OnsetDetector;
  private mlBridge: BasicPitchBridge;
  private mode: DetectionMode;

  // Note state tracking (note number → start time in seconds)
  private noteStartTimes = new Map<
    number,
    { time: number; velocity: number }
  >();

  // RAF loop
  private rafId = 0;
  private lastTickTime = 0;
  private readonly THROTTLE_MS = 25; // ~40Hz analysis rate

  // Onset detection state
  private onsetTriggered = false;

  // Audio tap for ML bridge (ScriptProcessorNode)
  private audioTapNode: ScriptProcessorNode | null = null;

  // Callbacks
  private callbacks: AudioToMidiCallbacks = {};

  constructor(capture: LearnAudioCapture, mode: DetectionMode = 'monophonic') {
    this.capture = capture;
    this.mode = mode;
    this.pitchDetector = new PianoPitchDetector(4096);
    this.polyDetector = new PianoPolyphonicDetector();
    this.onsetDetector = new OnsetDetector(2048);
    this.mlBridge = new BasicPitchBridge();

    // Wire up ML correction callback
    this.mlBridge.setOnCorrection((activeKeys, onsets) => {
      this.handleMLCorrection(activeKeys, onsets);
    });

    // Wire up pitch detector callback
    this.pitchDetector.setCallback((event) => {
      if (this.mode !== 'monophonic') return;
      const now = performance.now() / 1000;

      if (event.type === 'noteOn') {
        this.noteStartTimes.set(event.midiNumber, {
          time: now,
          velocity: event.velocity,
        });
        this.callbacks.onNoteOn?.({
          number: event.midiNumber,
          duration: 0,
          velocity: event.velocity,
        });
      } else {
        const start = this.noteStartTimes.get(event.midiNumber);
        const duration = start ? now - start.time : 0;
        this.noteStartTimes.delete(event.midiNumber);
        this.callbacks.onNoteOff?.({
          number: event.midiNumber,
          duration,
          velocity: start?.velocity ?? 0,
        });
      }
    });

    // Wire up polyphonic detector callback
    this.polyDetector.setCallback((event) => {
      if (this.mode !== 'polyphonic') return;
      const now = performance.now() / 1000;

      if (event.type === 'noteOn') {
        this.noteStartTimes.set(event.midiNumber, {
          time: now,
          velocity: event.velocity,
        });
        this.callbacks.onNoteOn?.({
          number: event.midiNumber,
          duration: 0,
          velocity: event.velocity,
        });
      } else {
        const start = this.noteStartTimes.get(event.midiNumber);
        const duration = start ? now - start.time : 0;
        this.noteStartTimes.delete(event.midiNumber);
        this.callbacks.onNoteOff?.({
          number: event.midiNumber,
          duration,
          velocity: start?.velocity ?? 0,
        });
      }
    });
  }

  /** Set detection mode. */
  setMode(mode: DetectionMode): void {
    if (mode === this.mode) return;
    this.releaseAllNotes();
    this.mode = mode;
    this.pitchDetector.reset();
    this.polyDetector.reset();
  }

  /** Set event callbacks. */
  setCallbacks(callbacks: AudioToMidiCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Set key context for chord detection and diatonic pitch bias. */
  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.polyDetector.setKeyContext(rootPc, modeIntervals);
    this.pitchDetector.setKeyContext(rootPc, modeIntervals);
  }

  /** Clear key context. */
  clearKeyContext(): void {
    this.polyDetector.clearKeyContext();
    this.pitchDetector.clearKeyContext();
  }

  /** Set expected MIDI notes for verification mode. Null = open-ended detection. */
  setExpectedNotes(notes: number[] | null): void {
    this.polyDetector.setExpectedNotes(notes);
    this.pitchDetector.setExpectedNotes(notes);
  }

  /** Start the analysis RAF loop and ML bridge. */
  start(): void {
    if (this.rafId) return;
    this.lastTickTime = 0;

    // Start ML bridge (loads model in Web Worker)
    this.mlBridge.start();

    // Set up audio tap to feed ML bridge
    this.setupAudioTap();

    const tick = (time: number) => {
      this.rafId = requestAnimationFrame(tick);

      // Throttle to ~40Hz
      if (time - this.lastTickTime < this.THROTTLE_MS) return;
      this.lastTickTime = time;

      if (!this.capture.isActive) return;

      // Run onset detection on every tick (fast, FFT=2048)
      const onsetAnalyser = this.capture.getOnsetAnalyser();
      if (onsetAnalyser) {
        this.onsetTriggered = this.onsetDetector.process(onsetAnalyser);
      }

      if (this.mode === 'monophonic') {
        const analyser = this.capture.getPitchAnalyser();
        if (analyser) {
          this.pitchDetector.analyze(analyser, this.onsetTriggered);
        }
      } else {
        const analyser = this.capture.getChromaAnalyser();
        if (analyser) {
          this.polyDetector.analyze(analyser, this.capture.getState().rmsLevel);
        }
      }

      // Update input level for UI
      this.capture.updateLevel();
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /** Stop the analysis RAF loop and ML bridge. */
  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.teardownAudioTap();
    this.mlBridge.stop();
    this.releaseAllNotes();
    this.pitchDetector.reset();
    this.polyDetector.reset();
    this.onsetDetector.reset();
  }

  /** Get currently active MIDI notes. */
  getActiveNotes(): number[] {
    return Array.from(this.noteStartTimes.keys());
  }

  /** Get current RMS input level (0–1). */
  getInputLevel(): number {
    return this.capture.getState().rmsLevel;
  }

  // ── ML Correction ──────────────────────────────────────────────────────

  /**
   * Handle ML correction from basic-pitch. If the ML model detects a
   * different note than the fast path, emit a correction (noteOff + noteOn).
   */
  private handleMLCorrection(activeKeys: number[], onsets: number[]): void {
    if (this.mode !== 'monophonic') return;

    const currentNote = this.pitchDetector.getCurrentNote();

    // Case 1: Fast path has no note but ML has a strong onset — trust ML
    if (currentNote === null && onsets.length === 1) {
      const mlNote = onsets[0];
      const now = performance.now() / 1000;
      this.noteStartTimes.set(mlNote, { time: now, velocity: 64 });
      this.callbacks.onNoteOn?.({ number: mlNote, duration: 0, velocity: 64 });
      return;
    }

    if (currentNote === null) return;

    // Case 2: Fast path and ML disagree — correct if plausible
    if (onsets.length === 1 && onsets[0] !== currentNote) {
      const mlNote = onsets[0];
      const diff = Math.abs(mlNote - currentNote);

      // Accept correction for: octave (12), perfect 5th (7), perfect 4th (5),
      // major 3rd (4), minor 3rd (3), or any interval if expected notes are set
      // and the ML note matches an expected note
      const isHarmonicError =
        diff === 12 || diff === 7 || diff === 5 || diff === 4 || diff === 3;
      const isExpectedCorrection =
        this.pitchDetector['expectedNotes']?.has(mlNote) ?? false;

      if (isHarmonicError || isExpectedCorrection) {
        const now = performance.now() / 1000;

        // Emit noteOff for wrong note
        const start = this.noteStartTimes.get(currentNote);
        if (start) {
          this.noteStartTimes.delete(currentNote);
          this.callbacks.onNoteOff?.({
            number: currentNote,
            duration: now - start.time,
            velocity: start.velocity,
          });
        }

        // Emit noteOn for corrected note
        this.noteStartTimes.set(mlNote, {
          time: now,
          velocity: start?.velocity ?? 64,
        });
        this.callbacks.onNoteOn?.({
          number: mlNote,
          duration: 0,
          velocity: start?.velocity ?? 64,
        });
      }
    }
  }

  // ── Audio Tap for ML Bridge ────────────────────────────────────────────

  private setupAudioTap(): void {
    const ctx = this.capture.getAudioContext();
    const source = this.capture.getSourceNode();
    if (!ctx || !source) return;

    try {
      // Use ScriptProcessorNode to tap raw audio samples
      // (AudioWorklet would be better but requires more setup)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      // ScriptProcessorNode requires connection to destination to process
      processor.connect(ctx.destination);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        this.mlBridge.feedAudio(input, ctx.sampleRate);
      };

      this.audioTapNode = processor;
    } catch {
      // ScriptProcessorNode may not be available — ML bridge won't work
      // but fast path still functions
    }
  }

  private teardownAudioTap(): void {
    if (this.audioTapNode) {
      this.audioTapNode.disconnect();
      this.audioTapNode.onaudioprocess = null;
      this.audioTapNode = null;
    }
  }

  private releaseAllNotes(): void {
    const now = performance.now() / 1000;
    for (const [noteNumber, start] of this.noteStartTimes) {
      this.callbacks.onNoteOff?.({
        number: noteNumber,
        duration: now - start.time,
        velocity: start.velocity,
      });
    }
    this.noteStartTimes.clear();
  }
}
