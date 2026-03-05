// ── WahPedal ──────────────────────────────────────────────────────────────
// Envelope-follower auto-wah with selectable filter type (LP/BP/HP),
// envelope-modulated frequency and resonance, and wet/dry mix.

import type { PedalProcessor } from './PedalProcessor';

const FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'bandpass', 'highpass'];

export class WahPedal implements PedalProcessor {
  readonly type = 'wah';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private filter: BiquadFilterNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private levelGain: GainNode;
  private analyser: AnalyserNode;
  private analyserData: Float32Array;
  private enabled = true;

  // Envelope follower state
  private sensitivity = 5; // 0.1–10
  private attackCoeff = 0.3; // per-frame smoothing coefficient
  private decayCoeff = 0.05;
  private baseFreq = 1000; // Hz
  private freqEnvAmt = 2000; // Hz
  private baseQ = 5;
  private resEnvAmt = 0;
  private envelope = 0; // current envelope value 0–1
  private rafId = 0;

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    // Analyser for envelope follower (reads input RMS)
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyserData = new Float32Array(this.analyser.fftSize);

    // Filter (switchable LP/BP/HP)
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 5;

    // Dry/wet mix
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.3;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.7;

    // Output level
    this.levelGain = ctx.createGain();
    this.levelGain.gain.value = 0.7;

    // Compute default attack/decay coefficients (~60fps)
    this.attackCoeff = this.computeCoeff(0.001 + 0.3 * 0.099);
    this.decayCoeff = this.computeCoeff(0.01 + 0.5 * 0.99);

    this.wireEnabled();
    this.startEnvelopeFollower();
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }
  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.inputNode.disconnect();
    this.bypassNode.disconnect();
    this.filter.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.levelGain.disconnect();
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    if (params.sensitivity !== undefined) {
      // 0-1 → 0.1 to 10
      this.sensitivity = 0.1 + params.sensitivity * 9.9;
    }
    if (params.attack !== undefined) {
      // 0-1 → 1ms to 100ms
      this.attackCoeff = this.computeCoeff(0.001 + params.attack * 0.099);
    }
    if (params.decay !== undefined) {
      // 0-1 → 10ms to 1000ms
      this.decayCoeff = this.computeCoeff(0.01 + params.decay * 0.99);
    }
    if (params.filterType !== undefined) {
      const idx = Math.round(params.filterType);
      this.filter.type = FILTER_TYPES[idx] ?? 'bandpass';
    }
    if (params.frequency !== undefined) {
      // 0-1 → 100 to 5000 Hz (exponential)
      this.baseFreq = 100 * Math.pow(50, params.frequency);
    }
    if (params.level !== undefined) {
      this.levelGain.gain.value = params.level;
    }
    if (params.freqEnvAmt !== undefined) {
      // 0-1 → 0 to 4000 Hz
      this.freqEnvAmt = params.freqEnvAmt * 4000;
    }
    if (params.resonance !== undefined) {
      // 0-1 → Q 0.5 to 20
      this.baseQ = 0.5 + params.resonance * 19.5;
    }
    if (params.resEnvAmt !== undefined) {
      // 0-1 → 0 to 15 Q
      this.resEnvAmt = params.resEnvAmt * 15;
    }
    if (params.mix !== undefined) {
      this.dryGain.gain.value = 1 - params.mix;
      this.wetGain.gain.value = params.mix;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.analyser.disconnect();
    this.filter.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.levelGain.disconnect();
  }

  // ── Private ──────────────────────────────────────────────────────────

  /** Compute per-frame smoothing coefficient from time constant in seconds (~60fps) */
  private computeCoeff(timeSec: number): number {
    const framesPerSec = 60;
    return 1 - Math.exp(-1 / (timeSec * framesPerSec));
  }

  private startEnvelopeFollower(): void {
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (): void => {
    this.analyser.getFloatTimeDomainData(
      this.analyserData as Float32Array<ArrayBuffer>,
    );

    // Compute RMS of input signal
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      sum += this.analyserData[i] ** 2;
    }
    const rms = Math.sqrt(sum / this.analyserData.length);

    // Map RMS through sensitivity to get target envelope level
    const target = Math.min(1, rms * this.sensitivity * 10);

    // Attack/decay smoothing
    const coeff = target > this.envelope ? this.attackCoeff : this.decayCoeff;
    this.envelope += (target - this.envelope) * coeff;

    // Apply envelope to filter parameters
    this.filter.frequency.value =
      this.baseFreq + this.envelope * this.freqEnvAmt;
    this.filter.Q.value = this.baseQ + this.envelope * this.resEnvAmt;

    this.rafId = requestAnimationFrame(this.tick);
  };

  private wireEnabled(): void {
    if (this.enabled) {
      // Analyser taps input for envelope detection
      this.inputNode.connect(this.analyser);
      // Dry path
      this.inputNode.connect(this.dryGain);
      this.dryGain.connect(this.levelGain);
      // Wet path (through envelope-modulated filter)
      this.inputNode.connect(this.filter);
      this.filter.connect(this.wetGain);
      this.wetGain.connect(this.levelGain);
      // Level → output
      this.levelGain.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
