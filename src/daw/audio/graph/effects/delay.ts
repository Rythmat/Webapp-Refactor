// ── Delay: feedback delay with a wet/dry blend (true bypass) ────────────────
// input → dry gain → destination, plus input → delay → wet gain →
// destination and delay → feedback → delay; off, input → destination.

import type { AutomationTarget } from '../../automation';
import type { DelayParams } from '../../EffectChain';
import { safeVal, setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class DelayModule implements EffectModule<DelayParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  readonly delayNode: DelayNode;
  readonly feedback: GainNode;
  readonly wetGain: GainNode;
  readonly dryGain: GainNode;
  private bypassed = true;
  private destination: AudioNode | null = null;

  constructor(private readonly ctx: AudioContext) {
    this.delayNode = ctx.createDelay(5);
    this.delayNode.delayTime.value = 0.375;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
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
      tryDisconnect(merge, this.delayNode);
      tryDisconnect(merge, destination);
      tryDisconnect(this.delayNode);
      tryDisconnect(this.wetGain);
      tryDisconnect(this.dryGain);
      tryDisconnect(this.feedback);

      if (bypassed) {
        merge.connect(destination);
      } else {
        merge.connect(this.dryGain);
        this.dryGain.connect(destination);
        merge.connect(this.delayNode);
        this.delayNode.connect(this.wetGain);
        this.wetGain.connect(destination);
        this.delayNode.connect(this.feedback);
        this.feedback.connect(this.delayNode);
      }
    }
    this.bypassed = bypassed;
  }

  update(d: DelayParams, opts: EffectUpdateOptions): void {
    const set = (param: AudioParam, value: number) =>
      setParam(this.ctx, param, value, opts.glide);
    const wantBypass = !d.enabled;
    if (wantBypass !== this.bypassed) {
      this.wireBypass(wantBypass);
    }
    if (d.enabled) {
      set(this.delayNode.delayTime, safeVal(d.time));
      // Guard the feedback loop especially: Math.min(0.95, NaN) is NaN, and a
      // NaN in a delay-feedback loop latches it to permanent silence.
      set(this.feedback.gain, safeVal(Math.min(0.95, d.feedback)));
      set(this.wetGain.gain, safeVal(d.wet));
      set(this.dryGain.gain, safeVal(1 - d.wet, 1));
    }
  }

  automationTargets(param: string): AutomationTarget[] {
    switch (param) {
      case 'wet':
        return [
          { param: this.wetGain.gain, map: (v) => v },
          { param: this.dryGain.gain, map: (v) => 1 - v },
        ];
      case 'feedback':
        return [
          {
            param: this.feedback.gain,
            map: (v) => Math.min(0.95, Math.max(0, v)),
          },
        ];
      default:
        return [];
    }
  }

  dispose(): void {
    this.delayNode.disconnect();
    this.feedback.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.input.disconnect();
  }
}
