// ── ChordAnalysisStream ──────────────────────────────────────────────────
// Drives an AudioChordDetector off one analyser at Studio's ~20 Hz rate,
// without the DAW. useAudioChordDetection finds its analyser through the
// Studio store; Learn's guitar input hands one in directly, so this loop
// must never import '@/daw/store' or trackEngineRegistry.
//
// Each analysed frame reports the voted chord (what Studio shows live), the
// raw per-frame match before the vote, and the frame's chroma. The vote lags a
// strum by ~350-500 ms, so fast chord changes are judged from the raw matches.

import {
  AudioChordDetector,
  type AudioChordResult,
} from './AudioChordDetector';

/** Studio's analysis rate (useAudioChordDetection THROTTLE_MS): ~20 Hz. */
export const CHORD_STREAM_THROTTLE_MS = 50;
/** The detector's FFT size — its analyser must match (16384 = 341 ms @ 48k). */
export const CHORD_ANALYSER_FFT_SIZE = 16384;

export interface ChordStreamFrame {
  /** When the analyser was read (performance.now() timeline). */
  perfMs: number;
  /** The detector's voted, hold-smoothed chord — Studio's live chord. */
  result: AudioChordResult | null;
  /** This frame's template match before the vote (getLastFrameMatch). */
  frameMatch: AudioChordResult | null;
  /** This frame's normalised chroma (getLastChroma), null when silent. */
  chroma: Float64Array | null;
}

export class ChordAnalysisStream {
  private readonly detector = new AudioChordDetector(
    CHORD_ANALYSER_FFT_SIZE,
    'guitar',
  );
  private lastStepMs = -Infinity;
  private rafId = 0;

  constructor(
    private readonly analyser: AnalyserNode,
    private readonly onFrame: (frame: ChordStreamFrame) => void,
  ) {}

  /** Run on its own animation-frame loop; a caller with a loop calls step(). */
  start(): void {
    if (this.rafId) return;
    const tick = (time: number) => {
      this.rafId = requestAnimationFrame(tick);
      this.step(time);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /** Analyse and report one frame, unless the last was under the throttle ago. */
  step(nowMs: number): void {
    if (nowMs - this.lastStepMs < CHORD_STREAM_THROTTLE_MS) return;
    this.lastStepMs = nowMs;
    const result = this.detector.analyze(this.analyser);
    this.onFrame({
      perfMs: nowMs,
      result,
      frameMatch: this.detector.getLastFrameMatch(),
      chroma: this.detector.getLastChroma(),
    });
  }

  /** Diatonic prior for the lesson key (the detector boosts in-key roots). */
  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.detector.setKeyContext(rootPc, modeIntervals);
  }

  clearKeyContext(): void {
    this.detector.clearKeyContext();
  }

  /** Clear the vote and hold (a new take or input); the key is kept. */
  reset(): void {
    this.detector.reset();
    this.lastStepMs = -Infinity;
  }
}
