// ── ReverbPedal ───────────────────────────────────────────────────────────
// Convolution reverb with type-specific impulse response, pre-delay,
// high-pass/low-pass filters, and wet/dry mix.

import type { PedalProcessor } from './PedalProcessor';
import type { ReverbType } from '../EffectChain';

const REVERB_TYPES: ReverbType[] = ['hall', 'room', 'chamber', 'plate', 'spring'];

const irCache = new Map<string, AudioBuffer>();

function generateIR(ctx: AudioContext, decay: number, type: ReverbType = 'hall'): AudioBuffer {
  const quantized = Math.round(decay * 10) / 10;
  const key = `${ctx.sampleRate}:${type}:${quantized}`;
  const cached = irCache.get(key);
  if (cached) return cached;

  const sampleRate = ctx.sampleRate;
  const length = Math.round(sampleRate * Math.max(0.1, quantized));
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;

      switch (type) {
        case 'hall': {
          const onset = Math.min(1, t / 0.03);
          const stereoSpread = ch === 0 ? 1 : 0.85 + Math.random() * 0.15;
          data[i] = noise * onset * Math.exp(-2.5 * t / quantized) * stereoSpread;
          break;
        }
        case 'room': {
          const earlyRef = t < 0.015 ? 0.6 + Math.random() * 0.4 : 1;
          data[i] = noise * earlyRef * Math.exp(-4 * t / quantized);
          break;
        }
        case 'chamber': {
          const density = 1 + 0.3 * Math.sin(t * 200);
          data[i] = noise * density * Math.exp(-3 * t / quantized);
          break;
        }
        case 'plate': {
          const brightness = 1 + 0.15 * Math.sin(t * 800);
          data[i] = noise * brightness * Math.exp(-3.5 * t / quantized);
          break;
        }
        case 'spring': {
          const combDelay = Math.round(sampleRate * 0.0037);
          const combSample = i > combDelay ? data[i - combDelay] * 0.4 : 0;
          data[i] = (noise + combSample) * Math.exp(-4.5 * t / quantized);
          break;
        }
      }
    }
  }

  irCache.set(key, buffer);
  return buffer;
}

export class ReverbPedal implements PedalProcessor {
  readonly type = 'reverb';

  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private convolver: ConvolverNode;
  private preDelay: DelayNode;
  private highPassFilter: BiquadFilterNode;
  private lowPassFilter: BiquadFilterNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private enabled = true;
  private currentDecay = 2.5;
  private currentType: ReverbType = 'hall';

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = generateIR(ctx, this.currentDecay, this.currentType);

    // Pre-delay (max 200ms)
    this.preDelay = ctx.createDelay(0.2);
    this.preDelay.delayTime.value = 0.02; // 20ms default

    // High-pass filter on wet path
    this.highPassFilter = ctx.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 100;
    this.highPassFilter.Q.value = 0.7;

    // Low-pass filter on wet path
    this.lowPassFilter = ctx.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 12000;
    this.lowPassFilter.Q.value = 0.7;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.7;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.3;

    this.wireEnabled();
  }

  getInputNode(): AudioNode { return this.inputNode; }
  getOutputNode(): AudioNode { return this.outputNode; }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.inputNode.disconnect();
    this.bypassNode.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    try { this.preDelay.disconnect(); } catch { /* ok */ }
    try { this.highPassFilter.disconnect(); } catch { /* ok */ }
    try { this.convolver.disconnect(); } catch { /* ok */ }
    try { this.lowPassFilter.disconnect(); } catch { /* ok */ }
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    // Type index: 0=hall, 1=room, 2=chamber, 3=plate, 4=spring
    if (params.typeIdx !== undefined) {
      const newType = REVERB_TYPES[Math.round(params.typeIdx)] ?? 'hall';
      if (newType !== this.currentType) {
        this.currentType = newType;
        this.convolver.buffer = generateIR(this.ctx, this.currentDecay, this.currentType);
      }
    }

    // Decay: 0-1 → 0.1 to 5s
    if (params.decay !== undefined && typeof params.decay === 'number') {
      const decay = 0.1 + params.decay * 4.9;
      const quantizedNew = Math.round(decay * 10);
      const quantizedOld = Math.round(this.currentDecay * 10);
      if (quantizedNew !== quantizedOld) {
        this.currentDecay = decay;
        this.convolver.buffer = generateIR(this.ctx, decay, this.currentType);
      }
    }

    // Pre-delay: 0-1 → 0-200ms
    if (params.preDelay !== undefined && typeof params.preDelay === 'number') {
      this.preDelay.delayTime.value = params.preDelay * 0.2; // 0-1 → 0-0.2s
    }

    // High-pass: 0-1 → 20-2000 Hz
    if (params.highPass !== undefined && typeof params.highPass === 'number') {
      this.highPassFilter.frequency.value = 20 + params.highPass * 1980;
    }

    // Low-pass: 0-1 → 1000-20000 Hz
    if (params.lowPass !== undefined && typeof params.lowPass === 'number') {
      this.lowPassFilter.frequency.value = 1000 + params.lowPass * 19000;
    }

    // Mix (wet/dry)
    if (params.mix !== undefined && typeof params.mix === 'number') {
      this.dryGain.gain.value = 1 - params.mix;
      this.wetGain.gain.value = params.mix;
    }

    // Legacy 'size' param — mapped via decay
    if (params.size !== undefined && typeof params.size === 'number' && params.decay === undefined) {
      const decay = 0.1 + params.size * 4.9;
      const quantizedNew = Math.round(decay * 10);
      const quantizedOld = Math.round(this.currentDecay * 10);
      if (quantizedNew !== quantizedOld) {
        this.currentDecay = decay;
        this.convolver.buffer = generateIR(this.ctx, decay, this.currentType);
      }
    }
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.convolver.disconnect();
    this.preDelay.disconnect();
    this.highPassFilter.disconnect();
    this.lowPassFilter.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      // Dry path
      this.inputNode.connect(this.dryGain);
      this.dryGain.connect(this.outputNode);
      // Wet path: pre-delay → HP → convolver → LP → wet gain
      this.inputNode.connect(this.preDelay);
      this.preDelay.connect(this.highPassFilter);
      this.highPassFilter.connect(this.convolver);
      this.convolver.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
