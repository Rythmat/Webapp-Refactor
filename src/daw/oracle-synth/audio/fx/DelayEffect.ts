import { FXProcessor } from './FXProcessor';
import { DelayParams } from '../types';
import { smoothParam } from '../constants';

/**
 * Feedback delay effect.
 * input → delay → output, with feedback loop.
 */
export class DelayEffect extends FXProcessor {
  private delay: DelayNode;
  private feedbackGain: GainNode;

  constructor(ctx: AudioContext) {
    super(ctx);

    this.delay = ctx.createDelay(2); // max 2 seconds
    this.delay.delayTime.value = 0.3;

    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.value = 0.3;

    // Wire: input → delay → wet path
    this.input.connect(this.delay);

    // Feedback loop: delay → feedbackGain → delay
    this.delay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    this.connectWetPath(this.delay);
  }

  setTime(time: number): void {
    smoothParam(this.delay.delayTime, time, this.ctx);
  }

  setFeedback(feedback: number): void {
    smoothParam(this.feedbackGain.gain, Math.min(feedback, 0.95), this.ctx);
  }

  updateParams(params: Partial<DelayParams>): void {
    if (params.enabled !== undefined) this.setEnabled(params.enabled);
    if (params.mix !== undefined) this.setMix(params.mix);
    if (params.time !== undefined) this.setTime(params.time);
    if (params.feedback !== undefined) this.setFeedback(params.feedback);
  }

  dispose(): void {
    this.delay.disconnect();
    this.feedbackGain.disconnect();
    super.dispose();
  }
}
