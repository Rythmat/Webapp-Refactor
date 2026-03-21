// ── StreamingAudioCapture ─────────────────────────────────────────────────
// V2 microphone → analyser-node setup for the probabilistic pipeline.
//
// Architecture:
//   getUserMedia(deviceId)
//     → MediaStreamSource
//       → AnalyserNode (FFT=512)   — onset detection (~12ms hops)
//       → AnalyserNode (FFT=2048)  — fast YIN pitch (~46ms latency)
//       → AnalyserNode (FFT=8192)  — hi-res YIN + NMF (~186ms latency)
//
// Key differences from v1 LearnAudioCapture:
//   - FFT=512 onset analyser (was 2048) for sub-frame onset precision
//   - FFT=2048 fast pitch (was 4096) for lower latency
//   - FFT=8192 hi-res (was 16384) because NMF handles polyphonic work

import {
  getAudioInputs,
  type AudioInputDevice,
} from '@/daw/midi/AudioInputEnumerator';

// ── Types ────────────────────────────────────────────────────────────────

export interface StreamingCaptureState {
  isActive: boolean;
  deviceId: string | null;
  deviceLabel: string | null;
  rmsLevel: number; // 0–1 normalized input level
  error: string | null;
}

// ── Class ────────────────────────────────────────────────────────────────

export class StreamingAudioCapture {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Three analyser nodes for multi-resolution input
  private onsetAnalyser: AnalyserNode | null = null;
  private fastPitchAnalyser: AnalyserNode | null = null;
  private hiResAnalyser: AnalyserNode | null = null;

  // Level metering
  private levelBuffer: Float32Array | null = null;
  private _rmsLevel = 0;

  // State
  private _isActive = false;
  private _deviceId: string | null = null;
  private _deviceLabel: string | null = null;
  private _error: string | null = null;
  private _startGeneration = 0;

  // Callbacks
  private onStateChange: ((state: StreamingCaptureState) => void) | null = null;
  private onDisconnect: (() => void) | null = null;

  // ── Static ──────────────────────────────────────────────────────────────

  /** List available audio input devices. */
  static async getDevices(): Promise<AudioInputDevice[]> {
    return getAudioInputs();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Set callback for state changes. */
  setOnStateChange(cb: (state: StreamingCaptureState) => void): void {
    this.onStateChange = cb;
  }

  /** Set callback for device disconnection. */
  setOnDisconnect(cb: () => void): void {
    this.onDisconnect = cb;
  }

  /** Start capturing audio from the specified device. */
  async start(deviceId: string): Promise<void> {
    this.stop();
    const generation = ++this._startGeneration;

    try {
      // Raw audio — no browser processing
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Race guard
      if (this._startGeneration !== generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.stream = stream;

      const ctx = new AudioContext();
      this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      // Onset analyser: FFT=512 for ~12ms hops at 48kHz
      const onset = ctx.createAnalyser();
      onset.fftSize = 512;
      onset.smoothingTimeConstant = 0;
      source.connect(onset);
      this.onsetAnalyser = onset;

      // Fast pitch analyser: FFT=2048 for ~46ms latency at 48kHz
      const fastPitch = ctx.createAnalyser();
      fastPitch.fftSize = 2048;
      fastPitch.smoothingTimeConstant = 0;
      source.connect(fastPitch);
      this.fastPitchAnalyser = fastPitch;

      // Hi-res analyser: FFT=8192 for ~186ms latency at 48kHz
      // Used by both HiResPitchStream and NMFDetector
      const hiRes = ctx.createAnalyser();
      hiRes.fftSize = 8192;
      hiRes.smoothingTimeConstant = 0;
      source.connect(hiRes);
      this.hiResAnalyser = hiRes;

      // Level metering buffer (use onset analyser's time-domain data)
      this.levelBuffer = new Float32Array(onset.fftSize);

      // Track device disconnection
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          this._error = 'Device disconnected';
          this.emitState();
          this.onDisconnect?.();
          this.stop();
        };
      });

      // Resolve device label
      const devices = await getAudioInputs();
      const device = devices.find((d) => d.id === deviceId);
      this._deviceLabel = device?.label ?? `Input ${deviceId.slice(0, 8)}`;

      this._isActive = true;
      this._deviceId = deviceId;
      this._error = null;
      this.emitState();
    } catch (err) {
      this._error =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Could not access audio device';
      this._isActive = false;
      this.emitState();
      this.stop();
    }
  }

  /** Stop capturing and release all resources. */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onsetAnalyser = null;
    this.fastPitchAnalyser = null;
    this.hiResAnalyser = null;
    this.levelBuffer = null;

    const wasActive = this._isActive;
    this._isActive = false;
    this._rmsLevel = 0;
    if (wasActive) this.emitState();
  }

  /** Get onset analyser (FFT=512, for sub-frame onset detection). */
  getOnsetAnalyser(): AnalyserNode | null {
    return this.onsetAnalyser;
  }

  /** Get fast pitch analyser (FFT=2048, for YIN multi-candidate). */
  getFastPitchAnalyser(): AnalyserNode | null {
    return this.fastPitchAnalyser;
  }

  /** Get hi-res analyser (FFT=8192, for HiResPitch and NMF). */
  getHiResAnalyser(): AnalyserNode | null {
    return this.hiResAnalyser;
  }

  /** Compute and return current RMS input level (0–1). */
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

  /** Current state snapshot. */
  getState(): StreamingCaptureState {
    return {
      isActive: this._isActive,
      deviceId: this._deviceId,
      deviceLabel: this._deviceLabel,
      rmsLevel: this._rmsLevel,
      error: this._error,
    };
  }

  get isActive(): boolean {
    return this._isActive;
  }

  /** Get the AudioContext (needed by BasicPitchPeer for AudioWorklet). */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /** Get the source node (needed by BasicPitchPeer for connection). */
  getSourceNode(): MediaStreamAudioSourceNode | null {
    return this.sourceNode;
  }

  private emitState(): void {
    this.onStateChange?.(this.getState());
  }
}
