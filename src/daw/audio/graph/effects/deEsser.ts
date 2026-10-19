// ── De-esser: a full-band compressor blended with the dry signal ────────────
// input → compressor → wet gain → destination, plus input → dry gain →
// destination (true bypass: input → destination). The bandpass `filter` is
// created and its frequency set, but it is not wired: the compressor sees the
// full band, as it always has.

import type { AutomationTarget } from '../../automation';
import type { DeEsserParams } from '../../EffectChain';
import { setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class DeEsserModule implements EffectModule<DeEsserParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  readonly filter: BiquadFilterNode;
  readonly compressor: DynamicsCompressorNode;
  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private bypassed = true;
  private destination: AudioNode | null = null;

  constructor(private readonly ctx: AudioContext) {
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 6000;
    this.filter.Q.value = 2.0;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = 0;
    this.compressor.ratio.value = 1;
    this.compressor.knee.value = 0;
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.05;
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    this.input = ctx.createGain();
  }

  /** `source` is this module's own input. */
  wire(_source: AudioNode, destination: AudioNode): void {
    this.destination = destination;
    this.wireBypass(this.bypassed);
  }

  unwire(): void {
    this.input.disconnect();
  }

  private wireBypass(bypassed: boolean): void {
    const merge = this.input;
    const destination = this.destination;
    if (destination) {
      tryDisconnect(merge, this.dryGain);
      tryDisconnect(merge, this.filter);
      tryDisconnect(merge, this.compressor);
      tryDisconnect(merge, destination);
      tryDisconnect(this.filter);
      tryDisconnect(this.compressor);
      tryDisconnect(this.dryGain);
      tryDisconnect(this.wetGain);

      if (bypassed) {
        // Pass-through: skip de-esser entirely
        merge.connect(destination);
      } else {
        // Full signal → compressor for gain reduction
        merge.connect(this.compressor);
        this.compressor.connect(this.wetGain);
        this.wetGain.connect(destination);
        // Dry path
        merge.connect(this.dryGain);
        this.dryGain.connect(destination);
      }
    }
    this.bypassed = bypassed;
  }

  update(d: DeEsserParams, opts: EffectUpdateOptions): void {
    const set = (param: AudioParam, value: number) =>
      setParam(this.ctx, param, value, opts.glide);
    const wantBypass = !d.enabled;
    if (wantBypass !== this.bypassed) {
      this.wireBypass(wantBypass);
    }
    if (d.enabled) {
      set(this.filter.frequency, d.frequency);
      // amount 0–100 maps to threshold 0 to -40 dB
      set(this.compressor.threshold, -(d.amount / 100) * 40);
      // 4:1 to 20:1
      set(this.compressor.ratio, 4 + (d.range / 20) * 16);
      // Wet/dry blend: more amount = more wet (compressed) signal
      const wetAmount = d.amount / 100;
      set(this.wetGain.gain, wetAmount);
      set(this.dryGain.gain, 1 - wetAmount);
    }
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.filter.disconnect();
    this.compressor.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.input.disconnect();
  }
}
