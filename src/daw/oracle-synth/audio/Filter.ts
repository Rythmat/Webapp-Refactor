import { FilterParams } from './types';
import { smoothParam } from './constants';

/**
 * Filter with BiquadFilterNode and dry/wet mix control.
 * Parallel routing: input splits to dry (bypass) and wet (filtered) paths.
 */
export class Filter {
  private ctx: AudioContext;
  private input: GainNode;
  private biquad: BiquadFilterNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private output: GainNode;
  private params: FilterParams;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.params = {
      type: 'lowpass',
      cutoff: 20000,
      resonance: 0,
      pan: 0,
      gain: 0,
      mix: 1,
      enabled: true,
    };

    // Input node (sources connect here)
    this.input = ctx.createGain();
    this.input.gain.value = 1;

    // Biquad filter
    this.biquad = ctx.createBiquadFilter();
    this.biquad.type = this.params.type;
    this.biquad.frequency.value = this.params.cutoff;
    this.biquad.Q.value = this.params.resonance;
    this.biquad.gain.value = this.params.gain;

    // Dry/wet routing
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1 - this.params.mix;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = this.params.mix;

    // Output
    this.output = ctx.createGain();
    this.output.gain.value = 1;

    // Wire: input -> dry -> output
    //        input -> biquad -> wet -> output
    this.input.connect(this.dryGain);
    this.input.connect(this.biquad);
    this.biquad.connect(this.wetGain);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);
    this.output.connect(destination);
  }

  getInputNode(): AudioNode {
    return this.input;
  }

  getOutputNode(): AudioNode {
    return this.output;
  }

  setParams(params: Partial<FilterParams>): void {
    if (params.type !== undefined) {
      this.params.type = params.type;
      this.biquad.type = params.type;
    }
    if (params.cutoff !== undefined) {
      this.params.cutoff = params.cutoff;
      smoothParam(this.biquad.frequency, params.cutoff, this.ctx);
    }
    if (params.resonance !== undefined) {
      this.params.resonance = params.resonance;
      smoothParam(this.biquad.Q, params.resonance, this.ctx);
    }
    if (params.gain !== undefined) {
      this.params.gain = params.gain;
      smoothParam(this.biquad.gain, params.gain, this.ctx);
    }
    if (params.mix !== undefined) {
      this.params.mix = params.mix;
      smoothParam(this.wetGain.gain, params.mix, this.ctx);
      smoothParam(this.dryGain.gain, 1 - params.mix, this.ctx);
    }
    if (params.enabled !== undefined) {
      this.params.enabled = params.enabled;
    }
  }

  getCutoffParam(): AudioParam {
    return this.biquad.frequency;
  }

  getDetuneParam(): AudioParam {
    return this.biquad.detune;
  }

  getResonanceParam(): AudioParam {
    return this.biquad.Q;
  }

  getGainParam(): AudioParam {
    return this.output.gain;
  }

  getFrequencyResponse(frequencies: Float32Array): {
    magnitude: Float32Array;
    phase: Float32Array;
  } {
    const magnitude = new Float32Array(frequencies.length);
    const phase = new Float32Array(frequencies.length);
    this.biquad.getFrequencyResponse(frequencies as Float32Array<ArrayBuffer>, magnitude as Float32Array<ArrayBuffer>, phase as Float32Array<ArrayBuffer>);
    return { magnitude, phase };
  }
}
