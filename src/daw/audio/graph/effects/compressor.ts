// ── Compressor, crush and makeup, with the FX meters' pre/post taps ────────
// source → [pre-comp tap] + compressor → crush waveshaper → makeup → [post-comp
// tap]. Always in the path: a compressor that's off sits at threshold 0 and
// ratio 1, and the crush waveshaper (2× oversampled, tanh at drive 1 when the
// crush is 0) is always there. The makeup gain is the module's output node.
//
// Latency: the native compressor's look-ahead plus the waveshaper's
// oversampling filters delay the chain by about 8.7–8.9 ms at 44.1/48 kHz
// (the golden harness's effectChainLatencyMs). It isn't accounted here yet,
// so latencySeconds says 0.

import type { AutomationTarget } from '../../automation';
import type { CompressorParams } from '../../EffectChain';
import { createMeterTap } from '../../meterTap';
import { crushKey, generateCrushCurve } from './crushCurve';
import { safeVal, setParam } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class CompressorModule implements EffectModule<CompressorParams> {
  readonly input = null;
  readonly output: GainNode;
  readonly latencySeconds = 0;
  readonly compressor: DynamicsCompressorNode;
  readonly crushNode: WaveShaperNode;
  readonly makeupGain: GainNode;
  // Meter taps (meterTap.ts): only the FX meters read them.
  readonly preCompAnalyser: AnalyserNode;
  readonly postCompAnalyser: AnalyserNode;
  // The drive the crush curve was made for (generateCrushCurve's key), so an
  // update that leaves it alone doesn't swap the curve: Chromium outputs a
  // silent quantum while a curve is replaced.
  private crushCurveKey = 0;

  constructor(
    private readonly ctx: AudioContext,
    initial: CompressorParams,
  ) {
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = initial.threshold;
    this.compressor.ratio.value = initial.ratio;
    this.compressor.knee.value = initial.knee;
    this.compressor.attack.value = initial.attack;
    this.compressor.release.value = initial.release;

    this.crushNode = ctx.createWaveShaper();
    this.crushNode.oversample = '2x';
    // Default: linear (no crush)
    this.crushNode.curve = generateCrushCurve(0) as Float32Array<ArrayBuffer>;

    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.value = 1;
    this.output = this.makeupGain;

    this.preCompAnalyser = createMeterTap(ctx);
    this.postCompAnalyser = createMeterTap(ctx);
  }

  // source → preComp tap + compressor → crush → makeup → postComp tap. The
  // makeup is this module's output, so it is also the destination.
  wire(source: AudioNode): void {
    source.connect(this.preCompAnalyser); // parallel tap
    source.connect(this.compressor);
    this.compressor.connect(this.crushNode);
    this.crushNode.connect(this.makeupGain);
    this.makeupGain.connect(this.postCompAnalyser); // parallel tap
  }

  unwire(): void {
    this.compressor.disconnect();
    this.crushNode.disconnect();
    this.makeupGain.disconnect();
    this.preCompAnalyser.disconnect();
    this.postCompAnalyser.disconnect();
  }

  /** The compressor's current gain reduction (negative dB). */
  getGainReduction(): number {
    return this.compressor.reduction;
  }

  update(c: CompressorParams, opts: EffectUpdateOptions): void {
    const set = (param: AudioParam, value: number) =>
      setParam(this.ctx, param, value, opts.glide);

    // Compressor
    if (c.enabled) {
      set(this.compressor.threshold, c.threshold);
      set(this.compressor.ratio, c.ratio);
      set(this.compressor.knee, c.knee);
      set(this.compressor.attack, c.attack);
      set(this.compressor.release, c.release);
    } else {
      set(this.compressor.threshold, 0);
      set(this.compressor.ratio, 1);
    }

    // Crush (saturation)
    const crush = c.enabled && c.crush > 0 ? c.crush : 0;
    if (crushKey(crush) !== this.crushCurveKey) {
      this.crushCurveKey = crushKey(crush);
      this.crushNode.curve = generateCrushCurve(
        crush,
      ) as Float32Array<ArrayBuffer>;
    }

    // Makeup gain
    if (c.enabled) {
      let makeupDb = c.makeup;
      if (c.auto) {
        // Auto makeup: compensate for gain reduction. Clamp ratio ≥ 1 so
        // ratio=0 (corrupt/collab payload) can't make 1/ratio → Infinity and
        // poison the master to silence.
        const ratio = Math.max(1, c.ratio);
        makeupDb = (-c.threshold * (1 - 1 / ratio)) / 2;
      }
      set(this.makeupGain.gain, safeVal(Math.pow(10, makeupDb / 20), 1));
    } else {
      set(this.makeupGain.gain, 1);
    }
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.unwire();
  }
}
