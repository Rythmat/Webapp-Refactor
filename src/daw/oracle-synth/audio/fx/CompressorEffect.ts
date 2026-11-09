import { FXProcessor } from './FXProcessor';
import { CompressorParams } from '../types';
import { smoothParam } from '../constants';

/**
 * Compressor effect using the built-in DynamicsCompressorNode.
 */
export class CompressorEffect extends FXProcessor {
  private compressor: DynamicsCompressorNode;

  constructor(ctx: AudioContext) {
    super(ctx);

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.knee.value = 6;

    // Wire: input → compressor → wet path
    this.input.connect(this.compressor);
    this.connectWetPath(this.compressor);
    // An insert: all wet. The base's 50/50 dry+wet blend summed the dry
    // signal with the compressor's look-ahead-delayed copy, a comb filter
    // (audit 2026-10-21), and was never the patch's choice.
    this.setMix(1);
  }

  setThreshold(threshold: number): void {
    smoothParam(this.compressor.threshold, threshold, this.ctx);
  }

  setRatio(ratio: number): void {
    smoothParam(this.compressor.ratio, ratio, this.ctx);
  }

  setAttack(attack: number): void {
    smoothParam(this.compressor.attack, attack, this.ctx);
  }

  setRelease(release: number): void {
    smoothParam(this.compressor.release, release, this.ctx);
  }

  updateParams(params: Partial<CompressorParams>): void {
    if (params.enabled !== undefined) this.setEnabled(params.enabled);
    if (params.threshold !== undefined) this.setThreshold(params.threshold);
    if (params.ratio !== undefined) this.setRatio(params.ratio);
    if (params.attack !== undefined) this.setAttack(params.attack);
    if (params.release !== undefined) this.setRelease(params.release);
  }

  dispose(): void {
    this.compressor.disconnect();
    super.dispose();
  }
}
