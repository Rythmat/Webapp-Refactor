// ── EQ: 8-band parametric, each band 1–2 biquads (12 or 24 dB/oct) ─────────
// The filters join the path the first time the EQ is turned on (milestone
// 1.11, audio-core-19): until then sound goes straight to the makeup gain, at
// unity, and nothing filters it. Once in, they stay: an EQ turned off parks
// its cut filters at 1 Hz and 22050 Hz (gliding there, so the A/B of
// mastering Bypass never thumps) and its other bands at 0 dB. The makeup
// gain is the module's output node.

import type { AutomationTarget } from '../../automation';
import type { EqBand, EqBandType, EqParams } from '../../EffectChain';
import { safeVal, setParam, tryDisconnect } from './params';
import type { EffectModule, EffectUpdateOptions } from './types';

function eqBandTypeToBiquad(type: EqBandType): BiquadFilterType {
  switch (type) {
    case 'lowcut':
      return 'highpass';
    case 'lowshelf':
      return 'lowshelf';
    case 'peaking':
      return 'peaking';
    case 'highshelf':
      return 'highshelf';
    case 'highcut':
      return 'lowpass';
  }
}

export class EqModule implements EffectModule<EqParams> {
  readonly input = null;
  readonly output: GainNode;
  readonly latencySeconds = 0;
  /** One group of filters per band (2 for a 24 dB/oct cut). */
  readonly filterGroups: BiquadFilterNode[][];
  private readonly makeupGain: GainNode;
  private state: EqParams;
  private source: AudioNode | null = null;
  private filtersInPath = false;

  constructor(
    private readonly ctx: AudioContext,
    initial: EqParams,
  ) {
    this.state = structuredClone(initial);
    this.filterGroups = this.state.bands.map((band) =>
      this.createFilterGroup(band),
    );
    this.makeupGain = ctx.createGain();
    this.output = this.makeupGain;
  }

  private createFilterGroup(band: EqBand): BiquadFilterNode[] {
    const isCut = band.type === 'lowcut' || band.type === 'highcut';
    const count = isCut && band.slope === 24 ? 2 : 1;
    return Array.from({ length: count }, () => {
      const f = this.ctx.createBiquadFilter();
      f.type = eqBandTypeToBiquad(band.type);
      f.frequency.value = band.freq;
      f.Q.value = band.Q;
      f.gain.value = band.gain;
      return f;
    });
  }

  // source → filter[0] → filter[1] → … → filter[N] → makeup (this module's
  // output, so also the destination)
  wire(source: AudioNode): void {
    this.source = source;
    if (!this.filtersInPath) {
      source.connect(this.makeupGain);
      return;
    }
    const allFilters = this.filterGroups.flat();
    source.connect(allFilters[0]);
    for (let i = 0; i < allFilters.length - 1; i++) {
      allFilters[i].connect(allFilters[i + 1]);
    }
    allFilters[allFilters.length - 1].connect(this.makeupGain);
  }

  unwire(): void {
    this.filterGroups.forEach((group) => group.forEach((f) => f.disconnect()));
    this.makeupGain.disconnect();
  }

  /** Rewires the filters after a band's slope changed its group's nodes. */
  private rewireFilters(oldHead: AudioNode): void {
    if (!this.source || !this.filtersInPath) return;
    tryDisconnect(this.source, oldHead);
    this.filterGroups.forEach((group) => group.forEach((f) => f.disconnect()));
    this.wire(this.source);
  }

  /** Set a filter's frequency, gliding (~50 ms) rather than jumping. */
  private setCutoff(
    filter: BiquadFilterNode,
    hz: number,
    glideCut: boolean,
    opts: EffectUpdateOptions,
  ): void {
    const param = filter.frequency;
    if (!glideCut) {
      setParam(this.ctx, param, hz, opts.glide);
      return;
    }
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.setTargetAtTime(hz, now, 0.05);
  }

  update(eq: EqParams, opts: EffectUpdateOptions): void {
    const oldHead = this.filterGroups[0][0];
    let needsRebuild = false;

    for (let i = 0; i < eq.bands.length; i++) {
      const band = eq.bands[i];
      const oldBand = this.state.bands[i];
      const isCut = band.type === 'lowcut' || band.type === 'highcut';

      if (isCut && (band.slope ?? 12) !== (oldBand?.slope ?? 12)) {
        this.filterGroups[i].forEach((f) => f.disconnect());
        this.filterGroups[i] = this.createFilterGroup(band);
        needsRebuild = true;
      }

      // Switching a band on or off moves a cut filter's cutoff a long way (a
      // 30 Hz low cut goes to 1 Hz when off). A jump that far rings out as a
      // low thump for about a second, which mastering Bypass would make on
      // every A/B, so the cutoff glides there instead. A new chain's first
      // update is not heard yet (and a bounce must start exact): it jumps.
      const wasOn = this.state.enabled && (oldBand?.enabled ?? false);
      const isOn = eq.enabled && band.enabled;
      const glide = opts.heard && isCut && wasOn !== isOn;

      for (const filter of this.filterGroups[i]) {
        if (!isOn) {
          if (band.type === 'lowcut') {
            this.setCutoff(filter, 1, glide, opts);
          } else if (band.type === 'highcut') {
            this.setCutoff(filter, 22050, glide, opts);
          } else {
            setParam(this.ctx, filter.frequency, band.freq, opts.glide);
            setParam(this.ctx, filter.gain, 0, opts.glide);
          }
          setParam(this.ctx, filter.Q, band.Q, opts.glide);
        } else {
          this.setCutoff(filter, band.freq, glide, opts);
          setParam(this.ctx, filter.gain, band.gain, opts.glide);
          setParam(this.ctx, filter.Q, band.Q, opts.glide);
        }
      }
    }

    if (needsRebuild) {
      this.rewireFilters(oldHead);
    }

    // Into the path for good, the first time the EQ is on.
    if (eq.enabled && !this.filtersInPath) {
      this.filtersInPath = true;
      if (this.source) {
        tryDisconnect(this.source, this.makeupGain);
        this.wire(this.source);
      }
    }

    // EQ makeup gain
    setParam(
      this.ctx,
      this.makeupGain.gain,
      eq.enabled ? safeVal(Math.pow(10, eq.makeup / 20), 1) : 1,
      opts.glide,
    );

    this.state = structuredClone(eq);
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.filterGroups.forEach((group) => group.forEach((f) => f.disconnect()));
    this.makeupGain.disconnect();
  }
}
