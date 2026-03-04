// ── PhaserPedal ───────────────────────────────────────────────────────────
// 4-stage allpass phaser with LFO modulation and wet/dry mix.
// Supports Hz (free-running) and Rate (BPM-synced) modes.

import type { PedalProcessor } from './PedalProcessor';

const STAGES = 4;

/** Note divisions in beats for BPM-synced rate mode */
export const RATE_DIVISIONS = [
  8, 6, 4, 3, 2, 1.5, 1, 3/4, 1/2, 3/8, 1/3, 5/16,
  1/4, 3/16, 1/6, 1/8, 1/12, 1/16, 1/24, 1/32, 1/48, 1/64,
];

export const RATE_LABELS = [
  '8', '6', '4', '3', '2', '1.5', '1', '3/4', '1/2', '3/8', '1/3', '5/16',
  '1/4', '3/16', '1/6', '1/8', '1/12', '1/16', '1/24', '1/32', '1/48', '1/64',
];

export class PhaserPedal implements PedalProcessor {
  readonly type = 'phaser';

  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private allpassFilters: BiquadFilterNode[];
  private lfo: OscillatorNode;
  private lfoGains: GainNode[];
  private dryGain: GainNode;
  private wetGain: GainNode;
  private enabled = true;
  private rateMode = 0;   // 0 = Hz, 1 = Rate (BPM-synced)
  private bpm = 120;
  private rateIdx = 10;   // default to 1/3

  constructor(ctx: AudioContext) {
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    // Create allpass filter stages
    this.allpassFilters = [];
    this.lfoGains = [];

    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.8;

    for (let i = 0; i < STAGES; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.7;
      this.allpassFilters.push(filter);

      // Each stage gets its own LFO gain to modulate frequency
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 500; // modulation range
      this.lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.lfoGains.push(lfoGain);
    }

    this.lfo.start();

    // Chain allpass stages
    for (let i = 0; i < STAGES - 1; i++) {
      this.allpassFilters[i].connect(this.allpassFilters[i + 1]);
    }

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
    if (params.rateMode !== undefined) this.rateMode = params.rateMode;
    if (params.bpm !== undefined) this.bpm = params.bpm;
    if (params.rateIdx !== undefined) this.rateIdx = Math.round(params.rateIdx);

    if (this.rateMode === 0) {
      // Hz mode: rate knob 0-1 → 0.01 to 40.00 Hz
      if (params.rate !== undefined) {
        this.lfo.frequency.value = 0.01 + params.rate * 39.99;
      }
    } else {
      // Rate mode: BPM-synced → Hz = BPM / (60 × division_in_beats)
      const div = RATE_DIVISIONS[this.rateIdx] ?? 1;
      this.lfo.frequency.value = this.bpm / (60 * div);
    }

    if (params.depth !== undefined) {
      // 0-1 → modulation range 0 to 2000 Hz
      for (const lfoGain of this.lfoGains) {
        lfoGain.gain.value = params.depth * 2000;
      }
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
    this.lfo.disconnect();
    for (const f of this.allpassFilters) f.disconnect();
    for (const g of this.lfoGains) g.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }

  private wireEnabled(): void {
    if (this.enabled) {
      // Dry path
      this.inputNode.connect(this.dryGain);
      this.dryGain.connect(this.outputNode);
      // Wet path (through allpass chain)
      this.inputNode.connect(this.allpassFilters[0]);
      this.allpassFilters[STAGES - 1].connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
