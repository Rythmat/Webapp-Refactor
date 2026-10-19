// ── Reverb: convolver with pre-delay and wet filters (true bypass) ──────────
// input → dry gain → destination, plus input → pre-delay → high-pass →
// convolver → low-pass → wet gain → destination; off, input → destination.
// The IR is the bundled real one once it has decoded, an instant synthetic
// one until then (hot-swapped when the real one loads).

import type { AutomationTarget } from '../../automation';
import type { ReverbParams, ReverbType } from '../../EffectChain';
import { ensureProcessedIr, getProcessedIr } from '../../reverbIR';
import { generateImpulseResponse } from './impulseResponse';
import { safeVal, setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class ReverbModule implements EffectModule<ReverbParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  readonly convolver: ConvolverNode;
  readonly preDelay: DelayNode;
  readonly highPass: BiquadFilterNode;
  readonly lowPass: BiquadFilterNode;
  readonly wetGain: GainNode;
  readonly dryGain: GainNode;
  private bypassed = true;
  // Desired reverb IR key (`type:decay`); guards against stale async IR hot-swaps.
  private irKey = '';
  // The reverb as heard: with deferIr, its decay and type stay the IR's.
  private state: ReverbParams;
  private destination: AudioNode | null = null;

  constructor(
    private readonly ctx: AudioContext,
    initial: ReverbParams,
  ) {
    this.state = structuredClone(initial);
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = generateImpulseResponse(
      ctx,
      this.state.decay,
      this.state.type,
    );
    this.preDelay = ctx.createDelay(0.2);
    this.preDelay.delayTime.value = this.state.preDelay / 1000;
    this.highPass = ctx.createBiquadFilter();
    this.highPass.type = 'highpass';
    this.highPass.frequency.value = this.state.highPass;
    this.highPass.Q.value = 0.7;
    this.lowPass = ctx.createBiquadFilter();
    this.lowPass.type = 'lowpass';
    this.lowPass.frequency.value = this.state.lowPass;
    this.lowPass.Q.value = 0.7;
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
      tryDisconnect(merge, this.preDelay);
      tryDisconnect(merge, destination);
      tryDisconnect(this.preDelay);
      tryDisconnect(this.highPass);
      tryDisconnect(this.convolver);
      tryDisconnect(this.lowPass);
      tryDisconnect(this.wetGain);
      tryDisconnect(this.dryGain);

      if (bypassed) {
        merge.connect(destination);
      } else {
        // Dry path
        merge.connect(this.dryGain);
        this.dryGain.connect(destination);
        // Wet path: pre-delay → HP → convolver → LP → wet gain
        merge.connect(this.preDelay);
        this.preDelay.connect(this.highPass);
        this.highPass.connect(this.convolver);
        this.convolver.connect(this.lowPass);
        this.lowPass.connect(this.wetGain);
        this.wetGain.connect(destination);
      }
    }
    this.bypassed = bypassed;
  }

  // Assign the convolver's IR for (type, decay). Uses the bundled real IR when
  // it's already decoded; otherwise keeps an instant synthetic IR (never a
  // null buffer → no silence glitch) and hot-swaps to the real one once it
  // loads, unless the user has since changed type/decay or disabled the slot.
  private applyIr(type: ReverbType, decay: number): void {
    const key = `${type}:${Math.round(decay * 10) / 10}`;
    this.irKey = key;

    const real = getProcessedIr(this.ctx, type, decay);
    if (real) {
      this.convolver.buffer = real;
      return;
    }
    this.convolver.buffer = generateImpulseResponse(this.ctx, decay, type);
    void ensureProcessedIr(this.ctx, type, decay).then((buf) => {
      if (buf && this.irKey === key && !this.bypassed) {
        this.convolver.buffer = buf;
      }
    });
  }

  /**
   * With `deferIr` (a Decay knob moving) the module keeps its old IR and
   * remembers the old decay and type, so the release's update builds the new
   * one. Enabling the slot always (re)loads the IR.
   */
  update(r: ReverbParams, opts: EffectUpdateOptions): void {
    const set = (param: AudioParam, value: number) =>
      setParam(this.ctx, param, value, opts.glide);
    const heard = this.state;
    const wantBypass = !r.enabled;
    // Enabling the slot must (re)load the IR even when type/decay are unchanged,
    // since the buffer regen below is otherwise only triggered by a param change.
    const justEnabled = this.bypassed && !wantBypass;
    if (wantBypass !== this.bypassed) {
      this.wireBypass(wantBypass);
    }
    if (r.enabled) {
      const irChanged = r.decay !== heard.decay || r.type !== heard.type;
      if (justEnabled || (irChanged && !opts.deferIr)) {
        this.applyIr(r.type, r.decay);
      }
      set(this.preDelay.delayTime, safeVal(r.preDelay / 1000));
      set(this.highPass.frequency, safeVal(r.highPass, 20));
      set(this.lowPass.frequency, safeVal(r.lowPass, 20000));
      set(this.wetGain.gain, safeVal(r.wet));
      set(this.dryGain.gain, safeVal(1 - r.wet, 1));
    }

    this.state = structuredClone(r);
    if (opts.deferIr && !justEnabled) {
      // Not built yet: the next update without deferIr builds it.
      this.state.decay = heard.decay;
      this.state.type = heard.type;
    }
  }

  automationTargets(param: string): AutomationTarget[] {
    if (param === 'wet') {
      return [
        { param: this.wetGain.gain, map: (v) => v },
        { param: this.dryGain.gain, map: (v) => 1 - v },
      ];
    }
    return [];
  }

  dispose(): void {
    this.convolver.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.input.disconnect();
  }
}
