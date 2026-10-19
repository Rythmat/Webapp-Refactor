// ── Presence: a peaking boost around a frequency (true bypass) ──────────────
// source → [peaking filter] → destination; off, source → destination. The
// module owns no boundary node: the filter is fed straight from the previous
// slot and feeds the next one.

import type { AutomationTarget } from '../../automation';
import type { PresenceParams } from '../../EffectChain';
import { setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class PresenceModule implements EffectModule<PresenceParams> {
  readonly input = null;
  readonly output = null;
  readonly latencySeconds = 0;
  readonly filter: BiquadFilterNode;
  private bypassed = true;
  private source: AudioNode | null = null;
  private destination: AudioNode | null = null;

  constructor(private readonly ctx: AudioContext) {
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'peaking';
    this.filter.frequency.value = 4000;
    this.filter.Q.value = 1.0;
    this.filter.gain.value = 0;
  }

  wire(source: AudioNode, destination: AudioNode): void {
    this.source = source;
    this.destination = destination;
    this.wireBypass(this.bypassed);
  }

  unwire(): void {
    this.filter.disconnect();
  }

  private wireBypass(bypassed: boolean): void {
    const { source, destination } = this;
    if (source && destination) {
      tryDisconnect(source, this.filter);
      tryDisconnect(this.filter, destination);
      tryDisconnect(source, destination);

      if (bypassed) {
        source.connect(destination);
      } else {
        source.connect(this.filter);
        this.filter.connect(destination);
      }
    }
    this.bypassed = bypassed;
  }

  update(p: PresenceParams, opts: EffectUpdateOptions): void {
    const wantBypass = !p.enabled;
    if (wantBypass !== this.bypassed) {
      this.wireBypass(wantBypass);
    }
    if (p.enabled) {
      setParam(this.ctx, this.filter.frequency, p.frequency, opts.glide);
      setParam(this.ctx, this.filter.Q, p.bandwidth, opts.glide);
      // amount 0–100 maps to gain 0–12 dB
      setParam(this.ctx, this.filter.gain, (p.amount / 100) * 12, opts.glide);
    }
  }

  automationTargets(param: string): AutomationTarget[] {
    if (param === 'amount') {
      return [{ param: this.filter.gain, map: (v) => (v / 100) * 12 }];
    }
    return [];
  }

  dispose(): void {
    this.filter.disconnect();
  }
}
