// ── FlangerPedal ──────────────────────────────────────────────────────────
// Short modulated delay with feedback for metallic flanging effect.

import type { PedalProcessor } from './PedalProcessor';

export class FlangerPedal implements PedalProcessor {
  readonly type = 'flanger';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private delay: DelayNode;
  private feedback: GainNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private enabled = true;

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    // Very short delay (1-3ms range) for flanging
    this.delay = ctx.createDelay(0.02);
    this.delay.delayTime.value = 0.003;

    // Feedback gives metallic character
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.5;
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);

    // LFO modulates delay time
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5;

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.0015; // 1.5ms depth

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);
    this.lfo.start();

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.5;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.5;

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
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    if (params.rate !== undefined) {
      // 0-1 → 0.1 to 5 Hz
      this.lfo.frequency.value = 0.1 + params.rate * 4.9;
    }
    if (params.depth !== undefined) {
      // 0-1 → 0 to 3ms modulation depth
      this.lfoGain.gain.value = params.depth * 0.003;
    }
    if (params.mix !== undefined) {
      this.dryGain.gain.value = 1 - params.mix;
      this.wetGain.gain.value = params.mix;
    }
  }

  dispose(): void {
    try { this.lfo.stop(); } catch { /* already stopped */ }
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.delay.disconnect();
    this.feedback.disconnect();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      this.inputNode.connect(this.dryGain);
      this.dryGain.connect(this.outputNode);
      this.inputNode.connect(this.delay);
      this.delay.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
