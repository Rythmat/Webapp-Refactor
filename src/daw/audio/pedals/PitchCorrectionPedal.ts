// ── PitchCorrectionPedal ──────────────────────────────────────────────────
// PedalProcessor wrapper around PitchCorrectionNode.
// Lazy-initializes the AudioWorklet on first enable, bypasses otherwise.

import type { PedalProcessor } from './PedalProcessor';
import { PitchCorrectionNode } from '../pitch-correction/PitchCorrectionNode';
import type { PitchInfo } from '../pitch-correction/PitchCorrectionNode';

export class PitchCorrectionPedal implements PedalProcessor {
  readonly type = 'pitch-correction';

  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassGain: GainNode;
  private pitchNode: PitchCorrectionNode | null = null;
  private _enabled = false;
  private _ready = false;
  private _initPromise: Promise<void> | null = null;
  private pendingParams: Record<string, number> = {};

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassGain = ctx.createGain();

    // Default: bypass path
    this.inputNode.connect(this.bypassGain);
    this.bypassGain.connect(this.outputNode);
  }

  getInputNode(): AudioNode { return this.inputNode; }
  getOutputNode(): AudioNode { return this.outputNode; }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;

    if (enabled) {
      if (!this._initPromise) {
        this._initPromise = this.initWorklet();
      }
      // If already ready, rewire immediately
      if (this._ready) {
        this.wireWorklet();
      }
      // Otherwise initWorklet() will call wireWorklet() when done
    } else {
      this.wireBypass();
    }
  }

  updateParams(params: Record<string, number>): void {
    Object.assign(this.pendingParams, params);

    if (this._ready && this.pitchNode) {
      this.pitchNode.updateParams(params);
    }
  }

  // ── Vocal-specific: pitch info for PitchMeter ──────────────────────────

  getPitchInfo(): PitchInfo | null {
    return this.pitchNode?.getPitchInfo() ?? null;
  }

  onPitchUpdate(cb: ((info: PitchInfo) => void) | null): void {
    this.pitchNode?.onPitchUpdate(cb);
  }

  dispose(): void {
    this.wireBypass();
    this.pitchNode?.dispose();
    this.pitchNode = null;
    this._ready = false;
    this._initPromise = null;
    try { this.inputNode.disconnect(); } catch { /* ok */ }
    try { this.outputNode.disconnect(); } catch { /* ok */ }
    try { this.bypassGain.disconnect(); } catch { /* ok */ }
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async initWorklet(): Promise<void> {
    try {
      this.pitchNode = new PitchCorrectionNode(this.ctx);
      await this.pitchNode.init();

      // Apply any params that arrived before init completed
      if (Object.keys(this.pendingParams).length > 0) {
        this.pitchNode.updateParams(this.pendingParams);
      }

      this._ready = true;

      // If still enabled after async init, wire the worklet
      if (this._enabled) {
        this.wireWorklet();
      }
    } catch (err) {
      console.warn('[PitchCorrectionPedal] Worklet init failed:', err);
      this._initPromise = null;
    }
  }

  private wireWorklet(): void {
    if (!this.pitchNode || !this._ready) return;

    const worklet = this.pitchNode.getNode();
    this.pitchNode.setBypass(false);

    // Disconnect bypass
    try { this.inputNode.disconnect(this.bypassGain); } catch { /* not connected */ }

    // Wire through worklet
    this.inputNode.connect(worklet);
    worklet.connect(this.outputNode);
  }

  private wireBypass(): void {
    if (this.pitchNode && this._ready) {
      const worklet = this.pitchNode.getNode();
      this.pitchNode.setBypass(true);
      try { this.inputNode.disconnect(worklet); } catch { /* not connected */ }
      try { worklet.disconnect(this.outputNode); } catch { /* not connected */ }
    }

    // Reconnect bypass
    try { this.inputNode.disconnect(this.bypassGain); } catch { /* ok */ }
    this.inputNode.connect(this.bypassGain);
  }
}
