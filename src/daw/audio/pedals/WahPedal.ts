// ── WahPedal ──────────────────────────────────────────────────────────────
// Envelope-follower auto-wah with selectable filter type (LP/BP/HP),
// envelope-modulated frequency and resonance, and wet/dry mix.
//
// The envelope follower runs on the audio thread: the dynamics worklet in
// 'follower' mode turns the input's level into a 0–1 control signal, and two
// gains scale it onto the filter's frequency and Q, which hold the base
// values. Attack and decay are time constants in seconds, so the sweep is the
// same at any frame rate (and keeps going through main-thread jank). While
// the pedal is bypassed the follower hears nothing and rests at 0.

import type { PedalProcessor } from './PedalProcessor';
import {
  createWorkletNode,
  disposeWorkletNode,
  DYNAMICS_PROCESSOR,
  DYNAMICS_WORKLET_URL,
  ensureWorklet,
  supportsWorklets,
} from '../graph/workletRegistry';

const FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'bandpass', 'highpass'];

export class WahPedal implements PedalProcessor {
  readonly type = 'wah';

  private ctx: BaseAudioContext;
  /** Settles once the follower is in (or failed to load): a bounce waits. */
  private ready: Promise<void> = Promise.resolve();
  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;
  private filter: BiquadFilterNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private levelGain: GainNode;
  // The envelope (0–1) scaled to Hz and to Q, summed into the filter's own
  // frequency and Q (the base values).
  private freqEnvGain: GainNode;
  private resEnvGain: GainNode;
  private follower: AudioWorkletNode | null = null;
  private enabled = true;
  private disposed = false;

  // Follower settings, in the worklet's units
  private sensitivity = 5; // 0.1–10
  private attackSec = 0.001 + 0.3 * 0.099; // 1–100 ms
  private decaySec = 0.01 + 0.5 * 0.99; // 10–1000 ms

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    // Filter (switchable LP/BP/HP)
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 5;

    // Dry/wet mix
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.3;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.7;

    // Output level
    this.levelGain = ctx.createGain();
    this.levelGain.gain.value = 0.7;

    // Envelope → filter: 2000 Hz and 0 Q of sweep by default
    this.freqEnvGain = ctx.createGain();
    this.freqEnvGain.gain.value = 2000;
    this.resEnvGain = ctx.createGain();
    this.resEnvGain.gain.value = 0;
    this.freqEnvGain.connect(this.filter.frequency);
    this.resEnvGain.connect(this.filter.Q);

    this.wireEnabled();
    this.loadFollower();
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }
  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.inputNode.disconnect();
    this.bypassNode.disconnect();
    this.filter.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.levelGain.disconnect();
    this.wireEnabled();
  }

  updateParams(params: Record<string, number>): void {
    if (params.sensitivity !== undefined) {
      // 0-1 → 0.1 to 10
      this.sensitivity = 0.1 + params.sensitivity * 9.9;
    }
    if (params.attack !== undefined) {
      // 0-1 → 1ms to 100ms
      this.attackSec = 0.001 + params.attack * 0.099;
    }
    if (params.decay !== undefined) {
      // 0-1 → 10ms to 1000ms
      this.decaySec = 0.01 + params.decay * 0.99;
    }
    if (params.filterType !== undefined) {
      const idx = Math.round(params.filterType);
      this.filter.type = FILTER_TYPES[idx] ?? 'bandpass';
    }
    if (params.frequency !== undefined) {
      // 0-1 → 100 to 5000 Hz (exponential)
      this.filter.frequency.value = 100 * Math.pow(50, params.frequency);
    }
    if (params.level !== undefined) {
      this.levelGain.gain.value = params.level;
    }
    if (params.freqEnvAmt !== undefined) {
      // 0-1 → 0 to 4000 Hz
      this.freqEnvGain.gain.value = params.freqEnvAmt * 4000;
    }
    if (params.resonance !== undefined) {
      // 0-1 → Q 0.5 to 20
      this.filter.Q.value = 0.5 + params.resonance * 19.5;
    }
    if (params.resEnvAmt !== undefined) {
      // 0-1 → 0 to 15 Q
      this.resEnvGain.gain.value = params.resEnvAmt * 15;
    }
    if (params.mix !== undefined) {
      this.dryGain.gain.value = 1 - params.mix;
      this.wetGain.gain.value = params.mix;
    }
    this.applyFollowerParams();
  }

  dispose(): void {
    this.disposed = true;
    if (this.follower) disposeWorkletNode(this.follower);
    this.follower = null;
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.filter.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.levelGain.disconnect();
    this.freqEnvGain.disconnect();
    this.resEnvGain.disconnect();
  }

  // ── Private ──────────────────────────────────────────────────────────

  whenReady(): Promise<void> {
    return this.ready;
  }

  /** The follower's AudioParams (its 'release' is the wah's decay). */
  private followerParams(): Record<string, number> {
    return {
      sensitivity: this.sensitivity,
      attack: this.attackSec,
      release: this.decaySec,
    };
  }

  // Loads the worklet and makes the follower; until then the filter sits at
  // its base frequency and Q. A follower that arrives after dispose is let go.
  private loadFollower(): void {
    if (!supportsWorklets(this.ctx)) return;
    this.ready = ensureWorklet(this.ctx, DYNAMICS_WORKLET_URL)
      .then(() => {
        if (this.disposed) return;
        const node = createWorkletNode(this.ctx, DYNAMICS_PROCESSOR, {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          processorOptions: { mode: 'follower' },
          parameterData: this.followerParams(),
        });
        this.follower = node;
        node.connect(this.freqEnvGain);
        node.connect(this.resEnvGain);
        if (this.enabled) this.inputNode.connect(node);
      })
      .catch((err: unknown) => {
        console.warn('[Wah] envelope follower failed to load:', err);
      });
  }

  private applyFollowerParams(): void {
    const node = this.follower;
    if (!node) return;
    for (const [name, value] of Object.entries(this.followerParams())) {
      const param = node.parameters.get(name);
      if (param) param.setValueAtTime(value, this.ctx.currentTime);
    }
  }

  private wireEnabled(): void {
    if (this.enabled) {
      // The follower taps the input for envelope detection
      if (this.follower) this.inputNode.connect(this.follower);
      // Dry path
      this.inputNode.connect(this.dryGain);
      this.dryGain.connect(this.levelGain);
      // Wet path (through envelope-modulated filter)
      this.inputNode.connect(this.filter);
      this.filter.connect(this.wetGain);
      this.wetGain.connect(this.levelGain);
      // Level → output
      this.levelGain.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
    }
  }
}
