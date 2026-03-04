// ── GuitarPedalChain ────────────────────────────────────────────────────
// Dynamic pedal chain for guitar/bass tracks. Supports arbitrary ordering
// of pedal processors via syncChain().

import type { PedalProcessor, PedalBlockDescriptor } from './pedals/PedalProcessor';
import { OverdrivePedal } from './pedals/OverdrivePedal';
import { NamAmpPedal } from './pedals/NamAmpPedal';
import { CompressorPedal } from './pedals/CompressorPedal';
import { EqPedal } from './pedals/EqPedal';
import { ChorusPedal } from './pedals/ChorusPedal';
import { PhaserPedal } from './pedals/PhaserPedal';
import { FlangerPedal } from './pedals/FlangerPedal';
import { WahPedal } from './pedals/WahPedal';
import { PitchCorrectionPedal } from './pedals/PitchCorrectionPedal';
import type { NamModelFile } from './nam/NamModelParser';

// Param interfaces used by GuitarFxAdapter
export interface OverdriveParams {
  enabled: boolean;
  drive: number;
  tone: number;
  volume: number;
}

export interface AmpSimParams {
  enabled: boolean;
  mode: AmpSimMode;
  model: 'fire-clean' | 'hard-clip' | 'tube-warm';
  drive: number;
  inputLevel: number;
  outputLevel: number;
  bass: number;
  mid: number;
  treble: number;
  presence: number;
  volume: number;
}

export type AmpSimMode = 'classic' | 'nam';

// ── Factory ─────────────────────────────────────────────────────────────

function createProcessor(type: string, ctx: AudioContext): PedalProcessor | null {
  switch (type) {
    case 'overdrive':   return new OverdrivePedal(ctx);
    case 'nam-amp':     return new NamAmpPedal(ctx);
    case 'compressor':  return new CompressorPedal(ctx);
    case 'eq':          return new EqPedal(ctx);
    case 'chorus':      return new ChorusPedal(ctx);
    case 'phaser':      return new PhaserPedal(ctx);
    case 'flanger':     return new FlangerPedal(ctx);
    case 'wah':         return new WahPedal(ctx);
    case 'pitch-correction': return new PitchCorrectionPedal(ctx);
    default:            return null;
  }
}

// ── GuitarPedalChain class ──────────────────────────────────────────────

export class GuitarPedalChain {
  private nativeCtx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private processors: PedalProcessor[] = [];

  constructor(ctx: AudioContext) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.nativeCtx = (ctx as any)._nativeContext ?? ctx;
    this.inputNode = this.nativeCtx.createGain();
    this.inputNode.channelCount = 2;
    this.inputNode.channelCountMode = 'explicit';
    this.outputNode = this.nativeCtx.createGain();
    this.outputNode.channelCount = 2;
    this.outputNode.channelCountMode = 'explicit';
    this.outputNode.channelInterpretation = 'speakers';

    // Direct bypass when no processors exist
    this.inputNode.connect(this.outputNode);
  }

  getInputNode(): GainNode { return this.inputNode; }
  getOutputNode(): GainNode { return this.outputNode; }

  // ── Dynamic chain sync ──────────────────────────────────────────────

  /**
   * Sync the audio chain to match the UI block list.
   * Creates/reuses/disposes processors as needed, wires them in order.
   */
  syncChain(blocks: PedalBlockDescriptor[]): void {
    const newProcessors: PedalProcessor[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Try to reuse an existing processor of the same type at the same index
      const existing = this.processors[i];
      let proc: PedalProcessor | null;

      if (existing && existing.type === block.type) {
        proc = existing;
      } else {
        // Type changed or new block — create fresh
        proc = createProcessor(block.type, this.nativeCtx);
      }

      if (!proc) continue;

      proc.setEnabled(block.enabled);
      proc.updateParams(block.params);
      newProcessors.push(proc);
    }

    // Dispose processors that are no longer in the chain
    for (const old of this.processors) {
      if (!newProcessors.includes(old)) {
        old.dispose();
      }
    }

    this.processors = newProcessors;
    this.wireChain();
  }

  // ── Legacy methods (backward compat with GuitarFxAdapter) ───────────

  updateOverdrive(params: Partial<OverdriveParams>): void {
    const proc = this.processors.find((p) => p.type === 'overdrive');
    if (!proc) return;
    if (params.enabled !== undefined) proc.setEnabled(params.enabled);
    proc.updateParams(params as Record<string, number>);
  }

  updateAmpSim(params: Partial<AmpSimParams>): void {
    const proc = this.processors.find((p) => p.type === 'nam-amp') as NamAmpPedal | undefined;
    if (!proc) return;
    if (params.enabled !== undefined) proc.setEnabled(params.enabled);
    if (params.mode !== undefined) proc.setAmpSimMode(params.mode);
    proc.updateParams(params as Record<string, number>);
  }

  async loadNamModel(model: NamModelFile): Promise<void> {
    const proc = this.processors.find((p) => p.type === 'nam-amp') as NamAmpPedal | undefined;
    if (!proc) return;
    await proc.loadNamModel(model);
    this.wireChain();
  }

  setAmpSimMode(mode: AmpSimMode): void {
    const proc = this.processors.find((p) => p.type === 'nam-amp') as NamAmpPedal | undefined;
    proc?.setAmpSimMode(mode);
  }

  getNamModelName(): string | null {
    const proc = this.processors.find((p) => p.type === 'nam-amp') as NamAmpPedal | undefined;
    return proc?.getNamModelName() ?? null;
  }

  isNamLoaded(): boolean {
    const proc = this.processors.find((p) => p.type === 'nam-amp') as NamAmpPedal | undefined;
    return proc?.isNamLoaded() ?? false;
  }

  /**
   * Fast-path param update: updates params on existing processors
   * WITHOUT rewiring the audio graph. Returns true if the chain structure
   * matches (same types in same order) and only params were updated.
   */
  updateProcessorParams(blocks: PedalBlockDescriptor[]): boolean {
    if (blocks.length !== this.processors.length) return false;
    for (let i = 0; i < blocks.length; i++) {
      if (this.processors[i].type !== blocks[i].type) return false;
    }
    // Structure matches — just update enabled state and params, skip wireChain()
    for (let i = 0; i < blocks.length; i++) {
      this.processors[i].setEnabled(blocks[i].enabled);
      this.processors[i].updateParams(blocks[i].params);
    }
    return true;
  }

  dispose(): void {
    for (const proc of this.processors) {
      proc.dispose();
    }
    this.processors = [];
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }

  // ── Private ──────────────────────────────────────────────────────────

  private wireChain(): void {
    // Disconnect everything from inputNode
    this.inputNode.disconnect();
    for (const proc of this.processors) {
      try { proc.getOutputNode().disconnect(); } catch { /* not connected */ }
    }

    if (this.processors.length === 0) {
      // Direct bypass
      this.inputNode.connect(this.outputNode);
      return;
    }

    // Wire: input → proc[0] → proc[1] → ... → output
    this.inputNode.connect(this.processors[0].getInputNode());
    for (let i = 0; i < this.processors.length - 1; i++) {
      this.processors[i].getOutputNode().connect(this.processors[i + 1].getInputNode());
    }
    this.processors[this.processors.length - 1].getOutputNode().connect(this.outputNode);
  }
}
