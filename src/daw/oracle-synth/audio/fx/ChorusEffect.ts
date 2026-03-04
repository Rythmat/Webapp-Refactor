import { FXProcessor } from './FXProcessor';
import { ChorusParams } from '../types';
import { smoothParam } from '../constants';

/**
 * Stereo chorus effect.
 * Two delay lines modulated by a sine LFO at slightly different phases.
 */
export class ChorusEffect extends FXProcessor {
  private lfo: OscillatorNode;
  private lfoGainL: GainNode;
  private lfoGainR: GainNode;
  private delayL: DelayNode;
  private delayR: DelayNode;
  private merger: ChannelMergerNode;

  private static readonly BASE_DELAY = 0.015; // 15ms center delay
  private static readonly MAX_DEPTH = 0.01;   // ±10ms modulation

  constructor(ctx: AudioContext) {
    super(ctx);

    // LFO
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 1.5;

    // LFO → separate gains for L and R (inverted for stereo width)
    this.lfoGainL = ctx.createGain();
    this.lfoGainL.gain.value = 0;
    this.lfoGainR = ctx.createGain();
    this.lfoGainR.gain.value = 0;

    this.lfo.connect(this.lfoGainL);
    this.lfo.connect(this.lfoGainR);

    // Delay lines
    this.delayL = ctx.createDelay(0.1);
    this.delayL.delayTime.value = ChorusEffect.BASE_DELAY;
    this.delayR = ctx.createDelay(0.1);
    this.delayR.delayTime.value = ChorusEffect.BASE_DELAY;

    // LFO modulates delay time
    this.lfoGainL.connect(this.delayL.delayTime);
    this.lfoGainR.connect(this.delayR.delayTime);

    // Merge stereo
    this.merger = ctx.createChannelMerger(2);
    this.delayL.connect(this.merger, 0, 0);
    this.delayR.connect(this.merger, 0, 1);

    // Wire: input → delayL/delayR → merger → wetGain
    this.input.connect(this.delayL);
    this.input.connect(this.delayR);
    this.connectWetPath(this.merger);

    this.lfo.start();
  }

  override setEnabled(enabled: boolean): void {
    const wasEnabled = this.enabled;
    super.setEnabled(enabled);

    if (enabled && !wasEnabled) {
      // Reconnect signal path: input → delayL/delayR
      this.input.connect(this.delayL);
      this.input.connect(this.delayR);
    } else if (!enabled && wasEnabled) {
      // Disconnect signal path — delay lines stop processing
      try { this.input.disconnect(this.delayL); } catch { /* ok */ }
      try { this.input.disconnect(this.delayR); } catch { /* ok */ }
    }
  }

  setRate(rate: number): void {
    smoothParam(this.lfo.frequency, rate, this.ctx);
  }

  setDepth(depth: number): void {
    const mod = depth * ChorusEffect.MAX_DEPTH;
    smoothParam(this.lfoGainL.gain, mod, this.ctx);
    smoothParam(this.lfoGainR.gain, -mod, this.ctx); // inverted for stereo
  }

  updateParams(params: Partial<ChorusParams>): void {
    if (params.enabled !== undefined) this.setEnabled(params.enabled);
    if (params.mix !== undefined) this.setMix(params.mix);
    if (params.rate !== undefined) this.setRate(params.rate);
    if (params.depth !== undefined) this.setDepth(params.depth);
  }

  dispose(): void {
    try { this.lfo.stop(); } catch { /* already stopped */ }
    this.lfo.disconnect();
    this.lfoGainL.disconnect();
    this.lfoGainR.disconnect();
    this.delayL.disconnect();
    this.delayR.disconnect();
    this.merger.disconnect();
    super.dispose();
  }
}
