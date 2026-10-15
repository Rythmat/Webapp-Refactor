// ── ReverbPedal ───────────────────────────────────────────────────────────
// Convolution reverb for the vocal pedal chain: pre-delay → high-pass →
// convolver → low-pass on the wet path, mixed with the dry signal.
//
// Its impulse responses come from the shared loader in ../reverbIR.ts, the
// same bundled IRs as EffectChain's reverb. Until a space's real IR has
// decoded, a synthetic one plays (never a null buffer, so the wet path is
// never silent), and the real one swaps in when it lands.
//
// Knobs (0–1): Size picks the space (room, chamber or hall, small to large),
// Decay sets how long the tail rings (0.1–5 s) and Mix balances wet and dry.
// typeIdx (0–4, any of the five spaces), preDelay, highPass and lowPass are
// accepted too; an explicit typeIdx wins over Size.

import type { PedalProcessor } from './PedalProcessor';
import type { ReverbType } from '../EffectChain';
import { ensureProcessedIr, getProcessedIr } from '../reverbIR';

const REVERB_TYPES: ReverbType[] = [
  'hall',
  'room',
  'chamber',
  'plate',
  'spring',
];

/** The spaces Size moves through, smallest first. */
const SIZE_SPACES: ReverbType[] = ['room', 'chamber', 'hall'];

/** A knob value, or undefined for a missing or non-finite one. */
function knob(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : undefined;
}

function spaceForSize(size: number): ReverbType {
  const i = Math.min(
    SIZE_SPACES.length - 1,
    Math.floor(size * SIZE_SPACES.length),
  );
  return SIZE_SPACES[i];
}

/** Decay knob 0-1 → 0.1 to 5 s. */
function decaySeconds(decay: number): number {
  return 0.1 + decay * 4.9;
}

/** The IR swaps only when a 0.1 s step changes, as EffectChain's does. */
function irKey(type: ReverbType, decay: number): string {
  return `${type}:${Math.round(decay * 10) / 10}`;
}

// Bounded: with the IR pack unreachable every 0.1 s Decay step lands here.
const IR_CACHE_MAX = 16;
const irCache = new Map<string, AudioBuffer>();

/** The instant stand-in until the real IR for a space has decoded. */
function generateIR(
  ctx: AudioContext,
  decay: number,
  type: ReverbType = 'hall',
): AudioBuffer {
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
          data[i] =
            noise * onset * Math.exp((-2.5 * t) / quantized) * stereoSpread;
          break;
        }
        case 'room': {
          const earlyRef = t < 0.015 ? 0.6 + Math.random() * 0.4 : 1;
          data[i] = noise * earlyRef * Math.exp((-4 * t) / quantized);
          break;
        }
        case 'chamber': {
          const density = 1 + 0.3 * Math.sin(t * 200);
          data[i] = noise * density * Math.exp((-3 * t) / quantized);
          break;
        }
        case 'plate': {
          const brightness = 1 + 0.15 * Math.sin(t * 800);
          data[i] = noise * brightness * Math.exp((-3.5 * t) / quantized);
          break;
        }
        case 'spring': {
          const combDelay = Math.round(sampleRate * 0.0037);
          const combSample = i > combDelay ? data[i - combDelay] * 0.4 : 0;
          data[i] = (noise + combSample) * Math.exp((-4.5 * t) / quantized);
          break;
        }
      }
    }
  }

  irCache.set(key, buffer);
  if (irCache.size > IR_CACHE_MAX) {
    const oldest = irCache.keys().next().value;
    if (oldest !== undefined) irCache.delete(oldest);
  }
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
  // The vocal catalog's defaults (Size 0.5, Decay 0.5), so the IR built here
  // is the one a new block's first updateParams asks for.
  private currentDecay = decaySeconds(0.5);
  private currentType: ReverbType = spaceForSize(0.5);
  /** The (space, decay) the convolver should hold; '' once disposed. */
  private currentIrKey = '';

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.convolver = ctx.createConvolver();

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

    this.applyIr();
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
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    try {
      this.preDelay.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.highPassFilter.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.convolver.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.lowPassFilter.disconnect();
    } catch {
      /* ok */
    }
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    // The space: an explicit type (0=hall, 1=room, 2=chamber, 3=plate,
    // 4=spring), else the one Size picks.
    const typeIdx = params.typeIdx;
    const size = knob(params.size);
    if (typeof typeIdx === 'number' && Number.isFinite(typeIdx)) {
      this.currentType = REVERB_TYPES[Math.round(typeIdx)] ?? 'hall';
    } else if (size !== undefined) {
      this.currentType = spaceForSize(size);
    }

    const decay = knob(params.decay);
    if (decay !== undefined) this.currentDecay = decaySeconds(decay);

    this.applyIr();

    // Pre-delay: 0-1 → 0-200ms
    const preDelay = knob(params.preDelay);
    if (preDelay !== undefined) this.preDelay.delayTime.value = preDelay * 0.2;

    // High-pass: 0-1 → 20-2000 Hz
    const highPass = knob(params.highPass);
    if (highPass !== undefined) {
      this.highPassFilter.frequency.value = 20 + highPass * 1980;
    }

    // Low-pass: 0-1 → 1000-20000 Hz
    const lowPass = knob(params.lowPass);
    if (lowPass !== undefined) {
      this.lowPassFilter.frequency.value = 1000 + lowPass * 19000;
    }

    // Mix (wet/dry)
    const mix = knob(params.mix);
    if (mix !== undefined) {
      this.dryGain.gain.value = 1 - mix;
      this.wetGain.gain.value = mix;
    }
  }

  dispose(): void {
    // A real IR still loading must not land on the released convolver.
    this.currentIrKey = '';
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

  /**
   * Point the convolver at the IR for the current space and decay. Knob
   * moves within the same 0.1 s decay step change nothing. A real IR that
   * finishes loading after the student has moved on is dropped.
   */
  private applyIr(): void {
    const type = this.currentType;
    const decay = this.currentDecay;
    const key = irKey(type, decay);
    if (key === this.currentIrKey) return;
    this.currentIrKey = key;

    const real = getProcessedIr(this.ctx, type, decay);
    if (real) {
      this.convolver.buffer = real;
      return;
    }
    this.convolver.buffer = generateIR(this.ctx, decay, type);
    void ensureProcessedIr(this.ctx, type, decay).then((buf) => {
      if (buf && this.currentIrKey === key) this.convolver.buffer = buf;
    });
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
