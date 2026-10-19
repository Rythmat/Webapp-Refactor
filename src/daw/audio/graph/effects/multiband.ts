// ── Multiband (OTT): 3-band compressor with a depth crossfade (true bypass) ─
//   dry:  input → dry gain (1 − depth) → destination
//   wet:  input → each band's filters → comp → makeup → user gain
//           → band sum → out gain (−9 dB) → wet gain (depth) → destination
// depth 0 ⇒ wet gain 0 ⇒ exact dry passthrough (null). Off, input →
// destination.

import type { AutomationTarget } from '../../automation';
import type { MultibandParams } from '../../EffectChain';
import {
  MULTIBAND_OUT_DB,
  createLrPair,
  createMultibandBand,
  type MultibandBand,
} from './multibandBands';
import { safeVal, setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

export class MultibandModule implements EffectModule<MultibandParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  readonly bands: MultibandBand[];
  private readonly bandSum: GainNode;
  private readonly outGain: GainNode; // level compensation on the wet sum
  readonly wetGain: GainNode;
  readonly dryGain: GainNode;
  private bypassed = true;
  private destination: AudioNode | null = null;

  constructor(
    private readonly ctx: AudioContext,
    initial: MultibandParams,
  ) {
    this.input = ctx.createGain();
    this.bands = [
      createMultibandBand(
        ctx,
        createLrPair(ctx, 'lowpass', initial.crossoverLow),
      ),
      createMultibandBand(ctx, [
        ...createLrPair(ctx, 'highpass', initial.crossoverLow),
        ...createLrPair(ctx, 'lowpass', initial.crossoverHigh),
      ]),
      createMultibandBand(
        ctx,
        createLrPair(ctx, 'highpass', initial.crossoverHigh),
      ),
    ];
    this.bandSum = ctx.createGain();
    this.outGain = ctx.createGain();
    this.outGain.gain.value = Math.pow(10, MULTIBAND_OUT_DB / 20);
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
    for (const band of this.bands) {
      band.userGain.connect(this.bandSum);
    }
    // bandSum → outGain (compensation) is a fixed internal edge; only
    // outGain → wetGain is (dis)connected by the bypass wiring.
    this.bandSum.connect(this.outGain);
  }

  /** `source` is this module's own input. */
  wire(_source: AudioNode, destination: AudioNode): void {
    this.destination = destination;
    this.wireBypass(this.bypassed);
  }

  unwire(): void {
    this.input.disconnect();
    this.bandSum.disconnect();
    this.outGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    // bandSum → outGain is a fixed internal edge, severed above: restore it.
    this.bandSum.connect(this.outGain);
  }

  private wireBypass(bypassed: boolean): void {
    const merge = this.input;
    const destination = this.destination;
    if (destination) {
      tryDisconnect(merge, destination);
      tryDisconnect(merge, this.dryGain);
      tryDisconnect(this.dryGain);
      tryDisconnect(this.outGain, this.wetGain);
      tryDisconnect(this.wetGain);
      for (const band of this.bands) {
        tryDisconnect(merge, band.filters[0]);
      }

      if (bypassed) {
        merge.connect(destination);
      } else {
        // Dry path
        merge.connect(this.dryGain);
        this.dryGain.connect(destination);
        // Wet path: split into the three bands (each band's internal series
        // is wired in createMultibandBand; each userGain feeds bandSum, which
        // feeds outGain via the fixed edge from the constructor).
        for (const band of this.bands) {
          merge.connect(band.filters[0]);
        }
        this.outGain.connect(this.wetGain);
        this.wetGain.connect(destination);
      }
    }
    this.bypassed = bypassed;
  }

  update(mb: MultibandParams, opts: EffectUpdateOptions): void {
    const set = (param: AudioParam, value: number) =>
      setParam(this.ctx, param, value, opts.glide);
    const wantBypass = !mb.enabled;
    if (wantBypass !== this.bypassed) {
      this.wireBypass(wantBypass);
    }
    if (!mb.enabled) return;
    // Crossover frequencies → the cascaded band filters. Band 0 = low (2x
    // LP@low), band 1 = mid (2x HP@low, 2x LP@high), band 2 = high (2x HP@high).
    const [low, mid, high] = this.bands;
    for (const f of low.filters) set(f.frequency, mb.crossoverLow);
    set(mid.filters[0].frequency, mb.crossoverLow);
    set(mid.filters[1].frequency, mb.crossoverLow);
    set(mid.filters[2].frequency, mb.crossoverHigh);
    set(mid.filters[3].frequency, mb.crossoverHigh);
    for (const f of high.filters) set(f.frequency, mb.crossoverHigh);
    // time 0–1 → attack 1–51 ms, release 20–320 ms (all bands).
    const attack = 0.001 + mb.time * 0.05;
    const release = 0.02 + mb.time * 0.3;
    for (const band of this.bands) {
      set(band.comp.attack, attack);
      set(band.comp.release, release);
    }
    set(low.userGain.gain, safeVal(Math.pow(10, mb.lowGain / 20), 1));
    set(mid.userGain.gain, safeVal(Math.pow(10, mb.midGain / 20), 1));
    set(high.userGain.gain, safeVal(Math.pow(10, mb.highGain / 20), 1));
    // depth = global dry/wet (Ableton OTT "Depth"). depth 0 ⇒ exact null.
    set(this.wetGain.gain, safeVal(mb.depth));
    set(this.dryGain.gain, safeVal(1 - mb.depth, 1));
  }

  automationTargets(param: string): AutomationTarget[] {
    if (param === 'depth') {
      return [
        { param: this.wetGain.gain, map: (v) => v },
        { param: this.dryGain.gain, map: (v) => 1 - v },
      ];
    }
    return [];
  }

  dispose(): void {
    this.input.disconnect();
    this.bandSum.disconnect();
    this.outGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    for (const band of this.bands) {
      band.filters.forEach((f) => f.disconnect());
      band.comp.disconnect();
      band.makeup.disconnect();
      band.userGain.disconnect();
    }
  }
}
