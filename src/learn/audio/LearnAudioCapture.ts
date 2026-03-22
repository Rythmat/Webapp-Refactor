// ── LearnAudioCapture ────────────────────────────────────────────────────
// Lightweight microphone → analyser-node setup for the Learn section.
//
// Unlike DAW instrument adapters (GuitarFxAdapter, VocalFxAdapter), this
// class has no effects chain, no recording, and no DAW store coupling.
// It opens/closes with the activity lifecycle and provides analyser nodes
// for the piano detectors.
//
// Architecture:
//   getUserMedia(deviceId)
//     → MediaStreamSource
//       → AnalyserNode (FFT=2048)   — onset detection (~42ms latency)
//       → AnalyserNode (FFT=16384)  — YIN monophonic (~340ms latency)
//       → AnalyserNode (FFT=16384)  — chromagram polyphonic (~341ms latency)

import {
  getAudioInputs,
  type AudioInputDevice,
} from '@/daw/midi/AudioInputEnumerator';

// ── Types ────────────────────────────────────────────────────────────────

export interface LearnAudioCaptureState {
  isActive: boolean;
  deviceId: string | null;
  deviceLabel: string | null;
  rmsLevel: number; // 0–1 normalized input level
  error: string | null;
}

// ── Class ────────────────────────────────────────────────────────────────

export class LearnAudioCapture {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Three analyser nodes for different detection needs
  private onsetAnalyser: AnalyserNode | null = null;
  private pitchAnalyser: AnalyserNode | null = null;
  private chromaAnalyser: AnalyserNode | null = null;

  // Level metering
  private levelBuffer: Float32Array | null = null;
  private _rmsLevel = 0;

  // State
  private _isActive = false;
  private _deviceId: string | null = null;
  private _deviceLabel: string | null = null;
  private _error: string | null = null;
  private _startGeneration = 0; // guards against rapid start() race conditions

  // Callbacks
  private onStateChange: ((state: LearnAudioCaptureState) => void) | null =
    null;
  private onDisconnect: (() => void) | null = null;

  /** List available audio input devices. */
  static async getDevices(): Promise<AudioInputDevice[]> {
    return getAudioInputs();
  }

  /** Set callback for state changes. */
  setOnStateChange(cb: (state: LearnAudioCaptureState) => void): void {
    this.onStateChange = cb;
  }

  /** Set callback for device disconnection. */
  setOnDisconnect(cb: () => void): void {
    this.onDisconnect = cb;
  }

  /** Start capturing audio from the specified device. */
  async start(deviceId: string): Promise<void> {
    // Stop any existing capture
    this.stop();
    const generation = ++this._startGeneration;

    try {
      // Use raw audio without browser processing — echo cancellation,
      // noise suppression, and auto gain control distort the piano signal
      // and interfere with pitch/chord detection.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Another start() was called while we were awaiting — abandon this one
      if (this._startGeneration !== generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.stream = stream;

      const ctx = new AudioContext();
      this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      // Create onset analyser (small FFT for fast onset detection)
      const onset = ctx.createAnalyser();
      onset.fftSize = 2048;
      onset.smoothingTimeConstant = 0.3;
      source.connect(onset);
      this.onsetAnalyser = onset;

      // Create pitch analyser (FFT=4096 for ~85ms latency at 48kHz)
      const pitch = ctx.createAnalyser();
      pitch.fftSize = 4096;
      pitch.smoothingTimeConstant = 0;
      source.connect(pitch);
      this.pitchAnalyser = pitch;

      // Create chroma analyser (FFT for chromagram/chord detection)
      // 16384 = ~341ms latency (halved from 32768's ~683ms)
      const chroma = ctx.createAnalyser();
      chroma.fftSize = 16384;
      chroma.smoothingTimeConstant = 0.3;
      source.connect(chroma);
      this.chromaAnalyser = chroma;

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
    this.pitchAnalyser = null;
    this.chromaAnalyser = null;
    this.levelBuffer = null;

    const wasActive = this._isActive;
    this._isActive = false;
    this._rmsLevel = 0;
    if (wasActive) this.emitState();
  }

  /** Get the onset analyser node (FFT=2048, for fast onset detection). */
  getOnsetAnalyser(): AnalyserNode | null {
    return this.onsetAnalyser;
  }

  /** Get the pitch analyser node (FFT=16384, for YIN monophonic detection). */
  getPitchAnalyser(): AnalyserNode | null {
    return this.pitchAnalyser;
  }

  /** Get the chroma analyser node (FFT=16384, for chromagram/chord detection). */
  getChromaAnalyser(): AnalyserNode | null {
    return this.chromaAnalyser;
  }

  /** Compute and return current RMS input level (0–1). Call at display rate. */
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
    // Normalize to 0–1 range (typical mic RMS tops out around 0.5)
    this._rmsLevel = Math.min(1, rms * 2);
    return this._rmsLevel;
  }

  /** Current state snapshot. */
  getState(): LearnAudioCaptureState {
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

  /** Get the AudioContext (needed by AudioToMidiAdapter for audio tapping). */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /** Get the source node (needed by AudioToMidiAdapter for audio tapping). */
  getSourceNode(): MediaStreamAudioSourceNode | null {
    return this.sourceNode;
  }

  private emitState(): void {
    this.onStateChange?.(this.getState());
  }
}
