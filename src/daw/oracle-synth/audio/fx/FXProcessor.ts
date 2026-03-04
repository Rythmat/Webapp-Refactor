import { smoothParam } from '../constants';

/**
 * Base class for all FX processors.
 * Handles dry/wet mixing and bypass routing.
 *
 * Signal flow:
 *   input ──┬── dryGain ──────────┬── output
 *           └── [effect chain] ── wetGain ─┘
 */
export abstract class FXProcessor {
  protected ctx: AudioContext;
  readonly input: GainNode;
  readonly output: GainNode;
  protected dryGain: GainNode;
  protected wetGain: GainNode;
  protected enabled = false;
  protected mixValue = 0.5;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();

    // Dry path: always connected
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet gain → output (wet path connected by subclass via connectWetPath)
    this.wetGain.connect(this.output);

    // Start fully dry
    this.dryGain.gain.value = 1;
    this.wetGain.gain.value = 0;
  }

  /** Subclasses call this to connect their effect output to the wet path */
  protected connectWetPath(effectOutput: AudioNode): void {
    effectOutput.connect(this.wetGain);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyMix();
  }

  setMix(mix: number): void {
    this.mixValue = mix;
    this.applyMix();
  }

  private applyMix(): void {
    if (!this.enabled) {
      smoothParam(this.dryGain.gain, 1, this.ctx);
      smoothParam(this.wetGain.gain, 0, this.ctx);
    } else {
      // Equal-power crossfade
      smoothParam(this.dryGain.gain, Math.cos(this.mixValue * Math.PI * 0.5), this.ctx);
      smoothParam(this.wetGain.gain, Math.sin(this.mixValue * Math.PI * 0.5), this.ctx);
    }
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }
}
