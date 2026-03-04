import { FXProcessor } from './FXProcessor';
import { DriveParams } from '../types';
import { smoothParam } from '../constants';

/**
 * Distortion / overdrive effect using WaveShaperNode.
 * Generates a soft-clipping curve based on the drive amount.
 */
export class DriveEffect extends FXProcessor {
  private shaper: WaveShaperNode;
  private preGain: GainNode;

  constructor(ctx: AudioContext) {
    super(ctx);
    this.preGain = ctx.createGain();
    this.preGain.gain.value = 1;
    this.shaper = ctx.createWaveShaper();
    this.shaper.oversample = '4x';
    this.setCurve(0);

    // Wire: input → preGain → shaper → wetGain → output
    this.input.connect(this.preGain);
    this.preGain.connect(this.shaper);
    this.connectWetPath(this.shaper);
  }

  setAmount(amount: number): void {
    this.setCurve(amount);
    // Boost input signal as drive increases for more saturation
    smoothParam(this.preGain.gain, 1 + amount * 3, this.ctx);
  }

  updateParams(params: Partial<DriveParams>): void {
    if (params.enabled !== undefined) this.setEnabled(params.enabled);
    if (params.mix !== undefined) this.setMix(params.mix);
    if (params.amount !== undefined) this.setAmount(params.amount);
  }

  private static curveCache = new Map<number, Float32Array>();

  private setCurve(amount: number): void {
    // Quantize to 1% steps (max 101 cached entries)
    const key = Math.round(amount * 100);

    let curve = DriveEffect.curveCache.get(key);
    if (!curve) {
      const samples = 256;
      curve = new Float32Array(samples);
      const k = (key / 100) * 50;
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = k === 0 ? x : ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      DriveEffect.curveCache.set(key, curve);
    }

    this.shaper.curve = curve as Float32Array<ArrayBuffer>;
  }

  dispose(): void {
    this.preGain.disconnect();
    this.shaper.disconnect();
    super.dispose();
  }
}
