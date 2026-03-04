// ── EqPedal ───────────────────────────────────────────────────────────────
// 3-band EQ: lowshelf, peaking mid, highshelf.

import type { PedalProcessor } from './PedalProcessor';

export class EqPedal implements PedalProcessor {
  readonly type = 'eq';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private low: BiquadFilterNode;
  private mid: BiquadFilterNode;
  private high: BiquadFilterNode;
  private enabled = true;

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.low = ctx.createBiquadFilter();
    this.low.type = 'lowshelf';
    this.low.frequency.value = 200;
    this.low.gain.value = 0;

    this.mid = ctx.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 1.0;
    this.mid.gain.value = 0;

    this.high = ctx.createBiquadFilter();
    this.high.type = 'highshelf';
    this.high.frequency.value = 4000;
    this.high.gain.value = 0;

    this.wireEnabled();
  }

  getInputNode(): AudioNode { return this.inputNode; }
  getOutputNode(): AudioNode { return this.outputNode; }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.inputNode.disconnect();
    this.bypassNode.disconnect();
    this.high.disconnect();
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    // 0-1 → -12 to +12 dB
    if (params.low !== undefined) {
      this.low.gain.value = (params.low - 0.5) * 24;
    }
    if (params.mid !== undefined) {
      this.mid.gain.value = (params.mid - 0.5) * 24;
    }
    if (params.high !== undefined) {
      this.high.gain.value = (params.high - 0.5) * 24;
    }
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.low.disconnect();
    this.mid.disconnect();
    this.high.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      this.inputNode.connect(this.low);
      this.low.connect(this.mid);
      this.mid.connect(this.high);
      this.high.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
