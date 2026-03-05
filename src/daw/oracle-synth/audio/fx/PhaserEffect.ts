import { FXProcessor } from './FXProcessor';
import { PhaserParams } from '../types';
import { smoothParam } from '../constants';

/**
 * Phaser effect using cascaded allpass filters with LFO modulation.
 * 4 allpass stages swept by a sine LFO.
 */
export class PhaserEffect extends FXProcessor {
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private filters: BiquadFilterNode[];
  private feedbackGain: GainNode;

  private static readonly NUM_STAGES = 4;
  private static readonly BASE_FREQ = 1000; // Hz center
  private static readonly MAX_SWEEP = 3000; // Hz sweep range

  constructor(ctx: AudioContext) {
    super(ctx);

    // LFO
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5;

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0;
    this.lfo.connect(this.lfoGain);

    // Allpass filter chain
    this.filters = [];
    for (let i = 0; i < PhaserEffect.NUM_STAGES; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = PhaserEffect.BASE_FREQ;
      filter.Q.value = 0.5;
      this.filters.push(filter);

      // LFO → each filter's frequency
      this.lfoGain.connect(filter.frequency);
    }

    // Chain filters in series
    this.input.connect(this.filters[0]);
    for (let i = 1; i < this.filters.length; i++) {
      this.filters[i - 1].connect(this.filters[i]);
    }

    // Feedback: last filter → feedback gain → first filter
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.value = 0.4;
    this.filters[this.filters.length - 1].connect(this.feedbackGain);
    this.feedbackGain.connect(this.filters[0]);

    // Last filter → wet path
    this.connectWetPath(this.filters[this.filters.length - 1]);

    this.lfo.start();
  }

  override setEnabled(enabled: boolean): void {
    const wasEnabled = this.enabled;
    super.setEnabled(enabled);

    if (enabled && !wasEnabled) {
      // Reconnect signal path: input → allpass chain
      this.input.connect(this.filters[0]);
    } else if (!enabled && wasEnabled) {
      // Disconnect signal path — allpass filters stop processing
      try {
        this.input.disconnect(this.filters[0]);
      } catch {
        /* ok */
      }
    }
  }

  setRate(rate: number): void {
    smoothParam(this.lfo.frequency, rate, this.ctx);
  }

  setDepth(depth: number): void {
    smoothParam(this.lfoGain.gain, depth * PhaserEffect.MAX_SWEEP, this.ctx);
  }

  updateParams(params: Partial<PhaserParams>): void {
    if (params.enabled !== undefined) this.setEnabled(params.enabled);
    if (params.mix !== undefined) this.setMix(params.mix);
    if (params.rate !== undefined) this.setRate(params.rate);
    if (params.depth !== undefined) this.setDepth(params.depth);
  }

  dispose(): void {
    try {
      this.lfo.stop();
    } catch {
      /* already stopped */
    }
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.feedbackGain.disconnect();
    for (const f of this.filters) f.disconnect();
    super.dispose();
  }
}
