// ── VocalProcessingChain ──────────────────────────────────────────────────
// Vocal equivalent of GuitarPedalChain.ts. Wraps the pitch correction
// AudioWorklet with bypass/enable support and lazy initialization.
//
// Signal: inputNode → [pitchNode worklet | bypassGain] → outputNode

import {
  PitchCorrectionNode,
  type PitchCorrectionParams,
  type PitchInfo,
} from './pitch-correction/PitchCorrectionNode';

export class VocalProcessingChain {
  private _ctx: AudioContext;
  private nativeCtx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassGain: GainNode;
  private pitchNode: PitchCorrectionNode | null = null;
  private _enabled = false;

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.nativeCtx = (ctx as any)._nativeContext ?? ctx;

    // Create input/output nodes on the native context so they can connect
    // to MediaStreamSource nodes (which also live on the native context).
    this.inputNode = this.nativeCtx.createGain();
    this.outputNode = this.nativeCtx.createGain();
    this.bypassGain = this.nativeCtx.createGain();

    // Default: bypass path (input → output directly)
    this.inputNode.connect(this.bypassGain);
    this.bypassGain.connect(this.outputNode);
  }

  getInputNode(): GainNode {
    return this.inputNode;
  }

  getOutputNode(): GainNode {
    return this.outputNode;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  /** Lazy-init: loads the AudioWorklet module on first enable. */
  async enable(): Promise<void> {
    if (this._enabled) return;

    if (!this.pitchNode) {
      this.pitchNode = new PitchCorrectionNode(this.nativeCtx);
      await this.pitchNode.init();
    }

    // Disconnect bypass path
    try {
      this.inputNode.disconnect(this.bypassGain);
    } catch {
      /* not connected */
    }

    // Connect through worklet: input → worklet → output
    const worklet = this.pitchNode.getNode();
    this.inputNode.connect(worklet);
    worklet.connect(this.outputNode);

    this.pitchNode.setBypass(false);
    this._enabled = true;
  }

  disable(): void {
    if (!this._enabled) return;

    if (this.pitchNode) {
      const worklet = this.pitchNode.getNode();
      this.pitchNode.setBypass(true);

      // Disconnect worklet path
      try {
        this.inputNode.disconnect(worklet);
      } catch {
        /* not connected */
      }
      try {
        worklet.disconnect(this.outputNode);
      } catch {
        /* not connected */
      }
    }

    // Reconnect bypass path
    this.inputNode.connect(this.bypassGain);

    this._enabled = false;
  }

  updateParams(params: Partial<PitchCorrectionParams>): void {
    this.pitchNode?.updateParams(params);
  }

  getPitchInfo(): PitchInfo | null {
    return this.pitchNode?.getPitchInfo() ?? null;
  }

  onPitchUpdate(cb: ((info: PitchInfo) => void) | null): void {
    this.pitchNode?.onPitchUpdate(cb);
  }

  dispose(): void {
    this.disable();
    this.pitchNode?.dispose();
    this.pitchNode = null;
    try {
      this.inputNode.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.outputNode.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.bypassGain.disconnect();
    } catch {
      /* ok */
    }
  }
}
