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
  // The effect's last (wet) node, detached from wetGain while disabled so the
  // whole wet sub-graph is dropped from the pull graph and stops processing.
  private wetOutput: AudioNode | null = null;
  private wetAttached = false;

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
    this.wetOutput = effectOutput;
    effectOutput.connect(this.wetGain);
    this.wetAttached = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyMix();
    this.updateWetAttachment();
  }

  /**
   * Attaches/detaches the wet sub-graph from wetGain to match `enabled`.
   * Detaching leaves the effect's nodes (ConvolverNode, oversampled
   * WaveShaper, DynamicsCompressor, delay lines) with no pulled consumer, so
   * they stop consuming CPU entirely while disabled — a big saving when many
   * tracks each carry a disabled reverb/drive/compressor. Idempotent, so it
   * also bypasses effects that START disabled (they no longer sit processing
   * until first toggled).
   */
  private updateWetAttachment(): void {
    if (!this.wetOutput) return;
    if (this.enabled && !this.wetAttached) {
      this.wetOutput.connect(this.wetGain);
      this.wetAttached = true;
    } else if (!this.enabled && this.wetAttached) {
      try {
        this.wetOutput.disconnect(this.wetGain);
      } catch {
        /* already disconnected */
      }
      this.wetAttached = false;
    }
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
      smoothParam(
        this.dryGain.gain,
        Math.cos(this.mixValue * Math.PI * 0.5),
        this.ctx,
      );
      smoothParam(
        this.wetGain.gain,
        Math.sin(this.mixValue * Math.PI * 0.5),
        this.ctx,
      );
    }
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }
}
