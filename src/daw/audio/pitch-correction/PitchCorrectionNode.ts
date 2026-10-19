// ── PitchCorrectionNode ────────────────────────────────────────────────────
// TypeScript wrapper around the pitch-correction-processor AudioWorklet.
// Handles registration, parameter updates, and pitch info messaging.
// Pattern mirrors NamWorkletNode.ts.

import {
  createWorkletNode,
  disposeWorkletNode,
  ensureWorklet,
} from '../graph/workletRegistry';

export interface PitchCorrectionParams {
  correction: number; // 0-100 (snap strength)
  speed: number; // 0-100 (0=slow/natural, 100=instant)
  rootNote: number; // 0-11 (C=0, B=11)
  scaleType: number; // index into SCALE_TYPES
  mix: number; // 0-100 (dry/wet)
  activeNotes: number; // 12-bit bitmask (bit 0=C, bit 11=B)
  humanize: number; // 0-100 (sustained note vibrato preservation)
  shift: number; // 0-1 → -24..+24 semitones
  fine: number; // 0-1 → -100..+100 cents
  formant: number; // 0-100 (formant preservation strength)
  formantFollow: number; // 0-100 (reserved)
}

export interface PitchInfo {
  detected: number; // Hz
  corrected: number; // Hz
}

export const SCALE_TYPES = [
  'chromatic',
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
  'lydianSharp2',
  'ionianSharp5',
  'dorianSharp4',
  'harmonicMinor',
  'phrygianDominant',
  'locrianNat6',
  'alteredDiminished',
  'lydianAugmented',
  'lydianDominant',
  'melodicMinor',
  'mixolydianFlat6',
  'dorianFlat2',
  'locrianNat2',
  'altered',
  'lydianAugmentedSharp2',
  'melodicMinorSharp4',
  'harmonicMajor',
  'mixolydianFlat2',
  'dorianFlat5',
  'alteredDominantNat5',
  'locrianDoubleFlat7',
  'lydianSharp2Sharp6',
  'ionianSharp2Sharp5',
  'doubleHarmonicMinor',
  'doubleHarmonicMajor',
  'oriental',
  'ultraphrygian',
  'locrianDoubleFlat3DoubleFlat7',
] as const;

export type ScaleTypeName = (typeof SCALE_TYPES)[number];

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const DEFAULT_PITCH_CORRECTION: PitchCorrectionParams = {
  correction: 80,
  speed: 50,
  rootNote: 0, // C
  scaleType: 0, // Chromatic
  mix: 100,
  activeNotes: 4095, // all 12 notes
  humanize: 0,
  shift: 0.5, // center (0 semitones)
  fine: 0.5, // center (0 cents)
  formant: 0,
  formantFollow: 0,
};

// The processor is added to each context once, by the worklet registry.
const PITCH_WORKLET_URL = '/daw-assets/pitch-correction-processor.js';

// ── PitchCorrectionNode class ─────────────────────────────────────────────

export class PitchCorrectionNode {
  private ctx: BaseAudioContext;
  private node: AudioWorkletNode | null = null;
  private disposed = false;
  private _ready = false;
  private _pitchInfo: PitchInfo = { detected: 0, corrected: 0 };
  private _onPitchUpdate: ((info: PitchInfo) => void) | null = null;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
  }

  /**
   * Loads the processor (once per context) and makes the node. Rejects if
   * dispose() came first: the node that would have arrived late is never
   * made.
   */
  async init(): Promise<void> {
    // An offline context starts when it renders, not on resume().
    const live = this.ctx as AudioContext;
    if (this.ctx.state === 'suspended' && typeof live.close === 'function') {
      await live.resume();
    }

    await ensureWorklet(this.ctx, PITCH_WORKLET_URL);
    if (this.disposed) {
      throw new Error('[PitchCorrection] node disposed during init');
    }

    this.node = createWorkletNode(this.ctx, 'pitch-correction-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1], // mono processing
    });

    this.node.port.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'pitch-info') {
        this._pitchInfo = {
          detected: data.detected,
          corrected: data.corrected,
        };
        this._onPitchUpdate?.(this._pitchInfo);
      }
    };

    this.node.addEventListener('processorerror', (e) => {
      console.error('[PitchCorrection] Processor error:', e);
    });

    this._ready = true;
  }

  updateParams(params: Partial<PitchCorrectionParams>): void {
    this.node?.port.postMessage({ type: 'set-params', ...params });
  }

  setBypass(bypassed: boolean): void {
    this.node?.port.postMessage({ type: 'bypass', value: bypassed });
  }

  getNode(): AudioWorkletNode {
    if (!this.node) throw new Error('PitchCorrectionNode not initialized');
    return this.node;
  }

  isReady(): boolean {
    return this._ready;
  }

  getPitchInfo(): PitchInfo {
    return this._pitchInfo;
  }

  onPitchUpdate(cb: ((info: PitchInfo) => void) | null): void {
    this._onPitchUpdate = cb;
  }

  /** Tells the processor to stop (process() returns false) and lets go. */
  dispose(): void {
    this.disposed = true;
    if (this.node) disposeWorkletNode(this.node);
    this.node = null;
    this._ready = false;
    this._onPitchUpdate = null;
  }
}
