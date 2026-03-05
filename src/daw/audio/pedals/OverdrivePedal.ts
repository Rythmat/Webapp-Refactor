// ── OverdrivePedal ─────────────────────────────────────────────────────────
// Valve Screamer–style overdrive: preGain → waveshaper → tone filter → volume.

import type { PedalProcessor } from './PedalProcessor';

const curveCache = new Map<string, Float32Array>();

function makeSoftClipCurve(amount: number): Float32Array {
  const quantized = Math.round(amount * 100);
  const key = `soft:${quantized}`;
  let curve = curveCache.get(key);
  if (curve) return curve;

  const samples = 44100;
  curve = new Float32Array(samples);
  const k = (quantized / 100) * 50 + 1;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(k * x);
  }
  curveCache.set(key, curve);
  return curve;
}

export class OverdrivePedal implements PedalProcessor {
  readonly type = 'overdrive';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private preGain: GainNode;
  private shaper: WaveShaperNode;
  private tone: BiquadFilterNode;
  private volume: GainNode;
  private enabled = true;

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.preGain = ctx.createGain();
    this.preGain.gain.value = 6; // 1 + 0.5 * 10

    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = makeSoftClipCurve(0.5) as Float32Array<ArrayBuffer>;
    this.shaper.oversample = 'none';

    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 4100; // 200 + 0.5 * 7800
    this.tone.Q.value = 0.7;

    this.volume = ctx.createGain();
    this.volume.gain.value = 0.7;

    this.wireEnabled();
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
    this.volume.disconnect();
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    if (params.drive !== undefined) {
      this.preGain.gain.value = 1 + params.drive * 10;
      this.shaper.curve = makeSoftClipCurve(
        params.drive,
      ) as Float32Array<ArrayBuffer>;
    }
    if (params.tone !== undefined) {
      this.tone.frequency.value = 200 + params.tone * 7800;
    }
    if (params.volume !== undefined) {
      this.volume.gain.value = params.volume;
    }
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.preGain.disconnect();
    this.shaper.disconnect();
    this.tone.disconnect();
    this.volume.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      this.inputNode.connect(this.preGain);
      this.preGain.connect(this.shaper);
      this.shaper.connect(this.tone);
      this.tone.connect(this.volume);
      this.volume.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
