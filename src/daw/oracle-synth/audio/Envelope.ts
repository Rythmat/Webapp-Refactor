import { EnvelopeParams } from './types';
import { ANTI_CLICK_TIME } from './constants';

export class Envelope {
  private params: EnvelopeParams;

  constructor(params?: Partial<EnvelopeParams>) {
    this.params = {
      attack: params?.attack ?? 0.01,
      decay: params?.decay ?? 0.1,
      sustain: params?.sustain ?? 0.7,
      release: params?.release ?? 0.3,
    };
  }

  setParams(params: Partial<EnvelopeParams>): void {
    if (params.attack !== undefined) this.params.attack = params.attack;
    if (params.decay !== undefined) this.params.decay = params.decay;
    if (params.sustain !== undefined) this.params.sustain = params.sustain;
    if (params.release !== undefined) this.params.release = params.release;
  }

  getParams(): EnvelopeParams {
    return { ...this.params };
  }

  trigger(target: AudioParam, velocity: number, ctx: AudioContext, time?: number): void {
    const now = time ?? ctx.currentTime;
    const { attack, decay, sustain } = this.params;
    const peak = velocity;
    const sustainLevel = sustain * velocity;

    // Cancel any ongoing automation
    target.cancelScheduledValues(now);

    // Start from near-zero to avoid click
    target.setValueAtTime(ANTI_CLICK_TIME, now);

    // Attack: ramp to peak
    if (attack > 0.001) {
      target.linearRampToValueAtTime(peak, now + attack);
    } else {
      target.setValueAtTime(peak, now + 0.001);
    }

    // Decay: ramp to sustain level
    target.setTargetAtTime(sustainLevel, now + attack, decay / 3);
  }

  release(target: AudioParam, ctx: AudioContext, time?: number): void {
    const now = time ?? ctx.currentTime;
    const { release } = this.params;

    target.cancelScheduledValues(now);
    // Get current value and ramp down from it
    target.setValueAtTime(target.value, now);
    target.setTargetAtTime(0, now, release / 5);
  }

  forceStop(target: AudioParam, ctx: AudioContext): void {
    const now = ctx.currentTime;
    target.cancelScheduledValues(now);
    target.setValueAtTime(target.value, now);
    target.linearRampToValueAtTime(0, now + ANTI_CLICK_TIME);
  }

  getReleaseTime(): number {
    // Time constant * 5 gets us to ~99% of target
    return this.params.release;
  }

  getVisualizationPoints(): Array<{ time: number; value: number }> {
    const { attack, decay, sustain, release } = this.params;
    return [
      { time: 0, value: 0 },
      { time: attack, value: 1 },
      { time: attack + decay, value: sustain },
      { time: attack + decay + 0.5, value: sustain }, // hold
      { time: attack + decay + 0.5 + release, value: 0 },
    ];
  }
}
