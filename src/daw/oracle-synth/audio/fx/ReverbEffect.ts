import { FXProcessor } from './FXProcessor';
import { ReverbParams } from '../types';
import { smoothParam } from '../constants';

/**
 * Algorithmic reverb: a native ConvolverNode fed an impulse response
 * generated from an exponentially-decaying stereo noise burst, with a
 * lowpass "damping" filter in front to tame the high-frequency tail.
 *
 * Character reference is Vital's reverb (a 16-line feedback delay network):
 * band-limit the tank input, shape the decay, damp the highs. We approximate
 * that cheaply with a generated IR rather than a live delay network — render
 * cost is near-zero, at the price of rebuilding (and caching) the IR when
 * size/decay change. Rebuilds only happen on UI/preset changes (reverb is
 * not a modulation target), so they stay infrequent.
 *
 *   input → damp (lowpass) → convolver → wet path
 */
export class ReverbEffect extends FXProcessor {
  private damp: BiquadFilterNode;
  private convolver: ConvolverNode;
  private size = 0.5;
  private decay = 0.5;

  // Quantization buckets for the two IR-shaping params (cache/rebuild gate).
  private static readonly SIZE_STEPS = 25;
  private static readonly DECAY_STEPS = 25;
  private static readonly IR_CACHE_MAX = 32;

  // Cache the expensive IR sample data (context-independent Float32Arrays),
  // keyed on quantized size/decay + sample rate. Rebuilding the AudioBuffer
  // from cached channel data is cheap; generating the noise+envelope is not.
  // FIFO-bounded so a full param sweep can't grow memory without limit.
  private static irCache = new Map<string, [Float32Array, Float32Array]>();

  constructor(ctx: AudioContext) {
    super(ctx);

    this.damp = ctx.createBiquadFilter();
    this.damp.type = 'lowpass';
    this.damp.frequency.value = 12000;
    this.damp.Q.value = 0.7;

    this.convolver = ctx.createConvolver();
    this.convolver.normalize = true;
    this.rebuildIR();

    // Wire: input → damp → convolver → wet path
    this.input.connect(this.damp);
    this.damp.connect(this.convolver);
    this.connectWetPath(this.convolver);
  }

  setSize(size: number): void {
    if (
      this.bucket(size, ReverbEffect.SIZE_STEPS) ===
      this.bucket(this.size, ReverbEffect.SIZE_STEPS)
    )
      return;
    this.size = size;
    this.rebuildIR();
  }

  setDecay(decay: number): void {
    if (
      this.bucket(decay, ReverbEffect.DECAY_STEPS) ===
      this.bucket(this.decay, ReverbEffect.DECAY_STEPS)
    )
      return;
    this.decay = decay;
    this.rebuildIR();
  }

  setDamping(damping: number): void {
    // damping 0 → bright (18kHz), 1 → dark (~1.5kHz), exponential sweep
    const d = Math.min(Math.max(damping, 0), 1);
    const hz = 1500 * Math.pow(18000 / 1500, 1 - d);
    smoothParam(this.damp.frequency, hz, this.ctx);
  }

  updateParams(params: Partial<ReverbParams>): void {
    if (params.enabled !== undefined) this.setEnabled(params.enabled);
    if (params.mix !== undefined) this.setMix(params.mix);
    if (params.size !== undefined) this.setSize(params.size);
    if (params.decay !== undefined) this.setDecay(params.decay);
    if (params.damping !== undefined) this.setDamping(params.damping);
  }

  private bucket(v: number, steps: number): number {
    return Math.round(Math.min(Math.max(v, 0), 1) * steps);
  }

  private rebuildIR(): void {
    const sr = this.ctx.sampleRate;
    const sizeQ = this.bucket(this.size, ReverbEffect.SIZE_STEPS);
    const decayQ = this.bucket(this.decay, ReverbEffect.DECAY_STEPS);
    const key = `${sizeQ}:${decayQ}:${sr}`;

    let data = ReverbEffect.irCache.get(key);
    if (!data) {
      // IR length grows with size: ~0.3 s (small room) .. ~4.5 s (large hall)
      const seconds = 0.3 + (sizeQ / ReverbEffect.SIZE_STEPS) * 4.2;
      const len = Math.max(1, Math.floor(seconds * sr));
      // Decay exponent: high decay → lower power → slower falloff → longer tail
      const power = 5 - (decayQ / ReverbEffect.DECAY_STEPS) * 4.6; // 5 .. 0.4
      const left = new Float32Array(len);
      const right = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, power);
        left[i] = (Math.random() * 2 - 1) * env;
        right[i] = (Math.random() * 2 - 1) * env;
      }
      data = [left, right];
      if (ReverbEffect.irCache.size >= ReverbEffect.IR_CACHE_MAX) {
        const oldest = ReverbEffect.irCache.keys().next().value;
        if (oldest !== undefined) ReverbEffect.irCache.delete(oldest);
      }
      ReverbEffect.irCache.set(key, data);
    }

    const buffer = this.ctx.createBuffer(2, data[0].length, sr);
    buffer.copyToChannel(data[0] as Float32Array<ArrayBuffer>, 0);
    buffer.copyToChannel(data[1] as Float32Array<ArrayBuffer>, 1);
    this.convolver.buffer = buffer;
  }

  dispose(): void {
    this.damp.disconnect();
    this.convolver.disconnect();
    super.dispose();
  }
}
