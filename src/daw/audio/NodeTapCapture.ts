// ── NodeTapCapture ─────────────────────────────────────────────────────────
// A capture source for the v2 detection engine (ProbabilisticOrchestrator) that
// taps an EXISTING AudioNode instead of opening its own microphone.
//
// The Studio's GuitarFxAdapter already owns the live instrument stream and
// exposes its clean pre-amp signal via getPitchDetectSourceNode(). NodeTapCapture
// builds the same three multi-resolution analysers StreamingAudioCapture builds
// (onset / fast / hi-res), but off that shared node — so we get Guitar/Bass-to-MIDI
// without a second getUserMedia and without touching the DAW audio graph.
//
// CRITICAL: unlike StreamingAudioCapture, stop() NEVER closes the AudioContext
// (it's the shared DAW context — closing it would tear down the whole engine).
// It only disconnects this capture's own analyser edges.

import type { StreamingCaptureLike } from '@/learn/audio/v2/StreamingAudioCapture';
import type { PitchDetectProfile } from './instrumentPitchProfiles';

export class NodeTapCapture implements StreamingCaptureLike {
  private sourceNode: AudioNode;
  private audioContext: AudioContext;

  private onsetAnalyser: AnalyserNode | null = null;
  private fastPitchAnalyser: AnalyserNode | null = null;
  private hiResAnalyser: AnalyserNode | null = null;

  private levelBuffer: Float32Array | null = null;
  private _rmsLevel = 0;
  private _isActive = false;

  constructor(sourceNode: AudioNode, profile: PitchDetectProfile) {
    this.sourceNode = sourceNode;
    // channelGain is a native node; its context is the native AudioContext,
    // which is exactly what BasicPitchPeer's AudioWorklet needs.
    this.audioContext = sourceNode.context as AudioContext;

    const ctx = this.audioContext;

    // Onset analyser — sub-frame onset precision.
    const onset = ctx.createAnalyser();
    onset.fftSize = profile.onsetFftSize;
    onset.smoothingTimeConstant = 0;
    this.sourceNode.connect(onset);
    this.onsetAnalyser = onset;

    // Fast pitch analyser — low-latency YIN path.
    const fast = ctx.createAnalyser();
    fast.fftSize = profile.fastFftSize;
    fast.smoothingTimeConstant = 0;
    this.sourceNode.connect(fast);
    this.fastPitchAnalyser = fast;

    // Hi-res analyser — YIN + NMF frequency resolution.
    const hiRes = ctx.createAnalyser();
    hiRes.fftSize = profile.hiResFftSize;
    hiRes.smoothingTimeConstant = 0;
    this.sourceNode.connect(hiRes);
    this.hiResAnalyser = hiRes;

    this.levelBuffer = new Float32Array(onset.fftSize);
    this._isActive = true;
  }

  // ── StreamingCaptureLike ──────────────────────────────────────────────────

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /** The tapped node itself — BasicPitchPeer connects its capture worklet here. */
  getSourceNode(): AudioNode | null {
    return this._isActive ? this.sourceNode : null;
  }

  getOnsetAnalyser(): AnalyserNode | null {
    return this.onsetAnalyser;
  }

  getFastPitchAnalyser(): AnalyserNode | null {
    return this.fastPitchAnalyser;
  }

  getHiResAnalyser(): AnalyserNode | null {
    return this.hiResAnalyser;
  }

  getState(): { rmsLevel: number } {
    return { rmsLevel: this._rmsLevel };
  }

  updateLevel(): number {
    if (!this.onsetAnalyser || !this.levelBuffer) {
      this._rmsLevel = 0;
      return 0;
    }
    this.onsetAnalyser.getFloatTimeDomainData(
      this.levelBuffer as Float32Array<ArrayBuffer>,
    );
    let sum = 0;
    for (let i = 0; i < this.levelBuffer.length; i++) {
      sum += this.levelBuffer[i] * this.levelBuffer[i];
    }
    const rms = Math.sqrt(sum / this.levelBuffer.length);
    this._rmsLevel = Math.min(1, rms * 2);
    return this._rmsLevel;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // ── Teardown ──────────────────────────────────────────────────────────────

  /**
   * Disconnect only this capture's analyser edges from the tapped node. The
   * AudioContext and the tapped node itself are owned elsewhere and are left
   * untouched — this must never close the shared DAW context.
   */
  stop(): void {
    for (const analyser of [
      this.onsetAnalyser,
      this.fastPitchAnalyser,
      this.hiResAnalyser,
    ]) {
      if (!analyser) continue;
      // Remove the sourceNode → analyser edge selectively (leaves the node's
      // other connections — muteGain, chord analyser, etc. — intact).
      try {
        this.sourceNode.disconnect(analyser);
      } catch {
        /* edge may already be gone */
      }
      try {
        analyser.disconnect();
      } catch {
        /* no outputs */
      }
    }
    this.onsetAnalyser = null;
    this.fastPitchAnalyser = null;
    this.hiResAnalyser = null;
    this.levelBuffer = null;
    this._rmsLevel = 0;
    this._isActive = false;
  }
}
