// ── Compressor, crush and makeup, with the FX meters' pre/post taps ────────
// source → [pre-comp tap] + (pad | compressor) → (crush) → makeup →
// [post-comp tap]. The makeup gain is the module's output node.
//
// Milestone 1.11 (audio-core-12, audio-core-19): nothing colours a chain whose
// compressor was never turned on.
//   - Until the compressor is first turned on, a plain delay stands in its
//     place (`pad`), as late as the compressor's look-ahead, so every chain
//     passes sound equally late with the compressor on or off, and tracks
//     never drift apart when one turns it on. Once on, the compressor stays in
//     the path; off, it sits at threshold 0 and ratio 1, which passes sound
//     unchanged, so switching it never clicks.
//   - The crush waveshaper joins the path only when the crush is first turned
//     up. Before 1.11 it was always there, at drive 1 when the crush was 0:
//     tanh(x)/tanh(1), which lifted every chain by about 2.4 dB and clipped
//     peaks over full scale. With a crush of 0 it now holds a straight line.

import type { AutomationTarget } from '../../automation';
import type { CompressorParams } from '../../EffectChain';
import { createMeterTap } from '../../meterTap';
import { crushKey, generateCrushCurve } from './crushCurve';
import { safeVal, setParam } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

/**
 * How late the native compressor passes sound: Chromium's look-ahead is a
 * fixed 6 ms at every sample rate (the golden renders measure it with the
 * waveshaper's oversampling on top before 1.11).
 */
export const COMPRESSOR_LOOKAHEAD_S = 0.006;

/** A waveshaper curve that passes [-1, 1] unchanged. */
const STRAIGHT = new Float32Array([-1, 1]);

export class CompressorModule implements EffectModule<CompressorParams> {
  readonly input = null;
  readonly output: GainNode;
  readonly latencySeconds = COMPRESSOR_LOOKAHEAD_S;
  readonly compressor: DynamicsCompressorNode;
  readonly crushNode: WaveShaperNode;
  /** Stands in for the compressor until it is first turned on. */
  readonly pad: DelayNode;
  private compressorInPath = false;
  private crushInPath = false;
  private source: AudioNode | null = null;
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
    this.crushNode.curve = STRAIGHT as Float32Array<ArrayBuffer>;

    this.pad = ctx.createDelay(0.05);
    this.pad.delayTime.value = COMPRESSOR_LOOKAHEAD_S;

    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.value = 1;
    this.output = this.makeupGain;

    this.preCompAnalyser = createMeterTap(ctx);
    this.postCompAnalyser = createMeterTap(ctx);
  }

  // source → preComp tap + (pad | compressor) → (crush) → makeup → postComp
  // tap. The makeup is this module's output, so it is also the destination.
  wire(source: AudioNode): void {
    this.source = source;
    source.connect(this.preCompAnalyser); // parallel tap
    const head = this.compressorInPath ? this.compressor : this.pad;
    source.connect(head);
    if (this.crushInPath) {
      head.connect(this.crushNode);
      this.crushNode.connect(this.makeupGain);
    } else {
      head.connect(this.makeupGain);
    }
    this.makeupGain.connect(this.postCompAnalyser); // parallel tap
  }

  unwire(): void {
    if (this.source) {
      for (const node of [this.compressor, this.pad]) {
        try {
          this.source.disconnect(node);
        } catch {
          /* not connected */
        }
      }
    }
    this.compressor.disconnect();
    this.pad.disconnect();
    this.crushNode.disconnect();
    this.makeupGain.disconnect();
    this.preCompAnalyser.disconnect();
    this.postCompAnalyser.disconnect();
  }

  /** Bring a node into the path for good (the compressor or the crush): only
   *  the edges between the source and the makeup change. */
  private rewire(): void {
    const source = this.source;
    if (!source) return;
    for (const node of [this.compressor, this.pad]) {
      try {
        source.disconnect(node);
      } catch {
        /* not connected */
      }
    }
    this.compressor.disconnect();
    this.pad.disconnect();
    this.crushNode.disconnect();
    const head = this.compressorInPath ? this.compressor : this.pad;
    source.connect(head);
    if (this.crushInPath) {
      head.connect(this.crushNode);
      this.crushNode.connect(this.makeupGain);
    } else {
      head.connect(this.makeupGain);
    }
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

    // Crush (saturation): a straight line at 0, once it has been used.
    const crush = c.enabled && c.crush > 0 ? c.crush : 0;
    if (crushKey(crush) !== this.crushCurveKey) {
      this.crushCurveKey = crushKey(crush);
      this.crushNode.curve = (
        crush > 0 ? generateCrushCurve(crush) : STRAIGHT
      ) as Float32Array<ArrayBuffer>;
    }

    // Into the path for good, the first time each is used.
    let rewire = false;
    if (c.enabled && !this.compressorInPath) {
      this.compressorInPath = true;
      rewire = true;
    }
    if (crush > 0 && !this.crushInPath) {
      this.crushInPath = true;
      rewire = true;
    }
    if (rewire) this.rewire();

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
