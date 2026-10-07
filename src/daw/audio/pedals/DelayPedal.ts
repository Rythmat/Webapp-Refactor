// ── DelayPedal ────────────────────────────────────────────────────────────
// Feedback delay with wet/dry mix, for the vocal pedal chain.

import type { PedalProcessor } from './PedalProcessor';

/** A knob value, or undefined for a missing or non-finite one. */
function knob(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : undefined;
}

export class DelayPedal implements PedalProcessor {
  readonly type = 'delay';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private delay: DelayNode;
  private feedback: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private enabled = true;

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.4;

    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.27; // 0.3 * 0.9

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.6;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.4;

    // Feedback loop: delay → feedback → delay
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);

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
    this.wireEnabled();
  }

  // Knobs are clamped to 0-1: a feedback value past about 1.1 would take the
  // loop past unity, where the echoes grow until the track clips.
  updateParams(params: Record<string, number>): void {
    const time = knob(params.time);
    if (time !== undefined) {
      // 0-1 → 0 to 1s
      this.delay.delayTime.value = time;
    }
    const feedback = knob(params.feedback);
    if (feedback !== undefined) {
      // 0-1 → 0 to 0.9 (capped to prevent instability)
      this.feedback.gain.value = feedback * 0.9;
    }
    const mix = knob(params.mix);
    if (mix !== undefined) {
      this.dryGain.gain.value = 1 - mix;
      this.wetGain.gain.value = mix;
    }
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.delay.disconnect();
    this.feedback.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      // Dry path
      this.inputNode.connect(this.dryGain);
      this.dryGain.connect(this.outputNode);
      // Wet path
      this.inputNode.connect(this.delay);
      this.delay.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
