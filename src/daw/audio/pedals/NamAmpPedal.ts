// ── NamAmpPedal ───────────────────────────────────────────────────────────
// Amp simulator with two modes: Classic (waveshaper + EQ) and NAM (neural amp model + EQ).

import type { PedalProcessor } from './PedalProcessor';
import { NamWorkletNode } from '../nam/NamWorkletNode';
import type { NamModelFile } from '../nam/NamModelParser';

export type AmpModel = 'fire-clean' | 'hard-clip' | 'tube-warm';
export type AmpSimMode = 'classic' | 'nam';

const curveCache = new Map<string, Float32Array>();

function makeDistortionCurve(amount: number, type: 'soft' | 'hard' | 'tube'): Float32Array {
  const quantized = Math.round(amount * 100);
  const key = `${type}:${quantized}`;
  let curve = curveCache.get(key);
  if (curve) return curve;

  const samples = 44100;
  curve = new Float32Array(samples);
  const k = (quantized / 100) * 50 + 1;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    switch (type) {
      case 'soft':  curve[i] = Math.tanh(k * x); break;
      case 'hard':  curve[i] = Math.max(-1, Math.min(1, k * x)); break;
      case 'tube':  curve[i] = x >= 0 ? 1 - Math.exp(-k * x) : -(1 - Math.exp(k * x)) * 0.8; break;
    }
  }
  curveCache.set(key, curve);
  return curve;
}

function ampModelToCurveType(model: AmpModel): 'soft' | 'hard' | 'tube' {
  switch (model) {
    case 'fire-clean': return 'soft';
    case 'hard-clip':  return 'hard';
    case 'tube-warm':  return 'tube';
  }
}

export class NamAmpPedal implements PedalProcessor {
  readonly type = 'nam-amp';

  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private bypassNode: GainNode;

  // Classic mode nodes
  private preGain: GainNode;
  private shaper: WaveShaperNode;

  // Shared post-EQ (both modes)
  private bass: BiquadFilterNode;
  private mid: BiquadFilterNode;
  private treble: BiquadFilterNode;
  private presence: BiquadFilterNode;
  private volume: GainNode;

  // NAM
  private namNode: NamWorkletNode | null = null;
  private namInitPromise: Promise<void> | null = null;

  private enabled = true;
  private mode: AmpSimMode = 'nam';
  private model: AmpModel = 'fire-clean';
  private driveValue = 0.4;
  private inputLevelValue = 0.5;
  private outputLevelValue = 0.5;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.bypassNode = ctx.createGain();

    this.preGain = ctx.createGain();
    this.preGain.gain.value = 1 + this.driveValue * 10;

    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = makeDistortionCurve(this.driveValue, ampModelToCurveType(this.model)) as Float32Array<ArrayBuffer>;
    this.shaper.oversample = 'none';

    this.bass = ctx.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 200;
    this.bass.gain.value = 0;

    this.mid = ctx.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 1.5;
    this.mid.gain.value = 0;

    this.treble = ctx.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 4000;
    this.treble.gain.value = 0;

    this.presence = ctx.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 3000;
    this.presence.Q.value = 1.0;
    this.presence.gain.value = 0;

    this.volume = ctx.createGain();
    this.volume.gain.value = 0.7;

    this.wireChain();
  }

  getInputNode(): AudioNode { return this.inputNode; }
  getOutputNode(): AudioNode { return this.outputNode; }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.wireChain();
  }

  updateParams(params: Record<string, number>): void {
    if (params.drive !== undefined) {
      this.driveValue = params.drive;
      this.preGain.gain.value = 1 + params.drive * 10;
      this.shaper.curve = makeDistortionCurve(params.drive, ampModelToCurveType(this.model)) as Float32Array<ArrayBuffer>;
    }
    if (params.inputLevel !== undefined) {
      this.inputLevelValue = params.inputLevel;
      this.namNode?.setInputLevel(params.inputLevel * 2);
    }
    if (params.outputLevel !== undefined) {
      this.outputLevelValue = params.outputLevel;
      this.namNode?.setOutputLevel(params.outputLevel * 2);
    }
    if (params.bass !== undefined) {
      this.bass.gain.value = (params.bass - 0.5) * 24;
    }
    if (params.mid !== undefined) {
      this.mid.gain.value = (params.mid - 0.5) * 24;
    }
    if (params.treble !== undefined) {
      this.treble.gain.value = (params.treble - 0.5) * 24;
    }
    if (params.presence !== undefined) {
      this.presence.gain.value = (params.presence - 0.5) * 24;
    }
    if (params.volume !== undefined) {
      this.volume.gain.value = params.volume;
    }
  }

  // ── NAM-specific methods ───────────────────────────────────────────────

  async loadNamModel(model: NamModelFile): Promise<void> {
    if (!this.namNode) {
      if (!this.namInitPromise) {
        const node = new NamWorkletNode(this.ctx);
        this.namInitPromise = node.init().then(() => {
          this.namNode = node;
        }).catch((err) => {
          this.namInitPromise = null;
          throw err;
        });
      }
      await this.namInitPromise;
    }
    await this.namNode!.loadModel(model);
    this.namNode!.setInputLevel(this.inputLevelValue * 2);
    this.namNode!.setOutputLevel(this.outputLevelValue * 2);
    if (this.mode === 'nam') {
      this.wireChain();
    }
  }

  setAmpSimMode(mode: AmpSimMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.wireChain();
  }

  getNamModelName(): string | null {
    return this.namNode?.getModelName() ?? null;
  }

  isNamLoaded(): boolean {
    return this.namNode?.isLoaded() ?? false;
  }

  dispose(): void {
    this.namNode?.dispose();
    this.namNode = null;
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassNode.disconnect();
    this.preGain.disconnect();
    this.shaper.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.volume.disconnect();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private wireChain(): void {
    this.inputNode.disconnect();
    this.bypassNode.disconnect();
    this.volume.disconnect();
    this.preGain.disconnect();
    this.shaper.disconnect();
    try { this.namNode?.getNode().disconnect(); } catch { /* not initialized */ }

    if (!this.enabled) {
      this.inputNode.connect(this.bypassNode);
      this.bypassNode.connect(this.outputNode);
      return;
    }

    if (this.mode === 'nam' && this.namNode?.isLoaded()) {
      const namAudioNode = this.namNode.getNode();
      this.inputNode.connect(namAudioNode);
      namAudioNode.connect(this.bass);
    } else {
      this.inputNode.connect(this.preGain);
      this.preGain.connect(this.shaper);
      this.shaper.connect(this.bass);
    }

    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.volume);
    this.volume.connect(this.outputNode);
  }
}
