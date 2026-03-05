// ── CompressorPedal ────────────────────────────────────────────────────────
// Guitar compressor using native DynamicsCompressorNode.

import type { PedalProcessor } from './PedalProcessor';

export class CompressorPedal implements PedalProcessor {
  readonly type = 'compressor';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private compressor: DynamicsCompressorNode;
  private enabled = true;

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -30;
    this.compressor.ratio.value = 6;
    this.compressor.knee.value = 10;
    this.compressor.attack.value = 0.02;
    this.compressor.release.value = 0.25;

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
    this.compressor.disconnect();
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    if (params.threshold !== undefined) {
      // 0-1 → -60 to 0 dB
      this.compressor.threshold.value = -60 + params.threshold * 60;
    }
    if (params.ratio !== undefined) {
      // 0-1 → 1:1 to 20:1
      this.compressor.ratio.value = 1 + params.ratio * 19;
    }
    if (params.attack !== undefined) {
      // 0-1 → 0 to 0.1s
      this.compressor.attack.value = params.attack * 0.1;
    }
    if (params.release !== undefined) {
      // 0-1 → 0.01 to 1s
      this.compressor.release.value = 0.01 + params.release * 0.99;
    }
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.compressor.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      this.inputNode.connect(this.compressor);
      this.compressor.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
