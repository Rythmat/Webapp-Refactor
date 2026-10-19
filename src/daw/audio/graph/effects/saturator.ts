// ── Saturator: waveshaper with tone and a dry/wet mix (true bypass) ─────────
// input → shaper → tone low-pass → wet gain → destination, plus input → dry
// gain → destination; off, input → destination. The curve is the crush
// curve (crushCurve.ts) at drive/100.

import type { AutomationTarget } from '../../automation';
import type { SaturatorParams } from '../../EffectChain';
import { crushKey, generateCrushCurve } from './crushCurve';
import { setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class SaturatorModule implements EffectModule<SaturatorParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  readonly shaper: WaveShaperNode;
  readonly toneFilter: BiquadFilterNode;
  readonly dryGain: GainNode;
  readonly wetGain: GainNode;
  private bypassed = true;
  // The drive the curve was made for, so an update that leaves it alone
  // doesn't swap the curve (Chromium outputs a silent quantum while a curve
  // is replaced).
  private curveKey = 0;
  private destination: AudioNode | null = null;

  constructor(private readonly ctx: AudioContext) {
    this.shaper = ctx.createWaveShaper();
    this.shaper.oversample = '2x';
    this.shaper.curve = generateCrushCurve(0) as Float32Array<ArrayBuffer>;
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 10000;
    this.toneFilter.Q.value = 0.7;
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
      tryDisconnect(merge, this.shaper);
      tryDisconnect(merge, this.dryGain);
      tryDisconnect(merge, destination);
      tryDisconnect(this.shaper);
      tryDisconnect(this.toneFilter);
      tryDisconnect(this.wetGain);
      tryDisconnect(this.dryGain);

      if (bypassed) {
        merge.connect(destination);
      } else {
        // Wet: shaper → tone filter → wetGain → destination
        merge.connect(this.shaper);
        this.shaper.connect(this.toneFilter);
        this.toneFilter.connect(this.wetGain);
        this.wetGain.connect(destination);
        // Dry path
        merge.connect(this.dryGain);
        this.dryGain.connect(destination);
      }
    }
    this.bypassed = bypassed;
  }

  update(s: SaturatorParams, opts: EffectUpdateOptions): void {
    const set = (param: AudioParam, value: number) =>
      setParam(this.ctx, param, value, opts.glide);
    const wantBypass = !s.enabled;
    if (wantBypass !== this.bypassed) {
      this.wireBypass(wantBypass);
    }
    if (s.enabled) {
      // drive 0–100 maps to crush curve 0–1
      const drive = s.drive / 100;
      if (crushKey(drive) !== this.curveKey) {
        this.curveKey = crushKey(drive);
        this.shaper.curve = generateCrushCurve(
          drive,
        ) as Float32Array<ArrayBuffer>;
      }
      // tone 0–100 maps to lowpass freq 2000–20000 Hz
      set(this.toneFilter.frequency, 2000 + (s.tone / 100) * 18000);
      // mix 0–100 maps to wet/dry blend
      const mix = s.mix / 100;
      set(this.wetGain.gain, mix);
      set(this.dryGain.gain, 1 - mix);
    }
  }

  automationTargets(param: string): AutomationTarget[] {
    if (param === 'mix') {
      return [
        { param: this.wetGain.gain, map: (v) => v / 100 },
        { param: this.dryGain.gain, map: (v) => 1 - v / 100 },
      ];
    }
    return [];
  }

  dispose(): void {
    this.shaper.disconnect();
    this.toneFilter.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.input.disconnect();
  }
}
