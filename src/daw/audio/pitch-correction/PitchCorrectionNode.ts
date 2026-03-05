// ── PitchCorrectionNode ────────────────────────────────────────────────────
// TypeScript wrapper around the pitch-correction-processor AudioWorklet.
// Handles registration, parameter updates, and pitch info messaging.
// Pattern mirrors NamWorkletNode.ts.

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
  'Chromatic',
  'Major',
  'Minor',
  'Pentatonic',
  'Minor Pent',
  'Blues',
  'Dorian',
  'Mixolydian',
  'Harmonic Minor',
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

// ── Module-level guard for AudioWorklet registration ──────────────────────

let moduleLoaded = false;
let modulePromise: Promise<void> | null = null;

async function ensureModuleLoaded(ctx: AudioContext): Promise<void> {
  if (moduleLoaded) return;
  if (!modulePromise) {
    modulePromise = ctx.audioWorklet
      .addModule('/daw-assets/pitch-correction-processor.js')
      .then(() => {
        moduleLoaded = true;
      })
      .catch((err) => {
        modulePromise = null; // allow retry
        throw err;
      });
  }
  await modulePromise;
}

// ── PitchCorrectionNode class ─────────────────────────────────────────────

export class PitchCorrectionNode {
  private ctx: AudioContext;
  private node: AudioWorkletNode | null = null;
  private _ready = false;
  private _pitchInfo: PitchInfo = { detected: 0, corrected: 0 };
  private _onPitchUpdate: ((info: PitchInfo) => void) | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  async init(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    await ensureModuleLoaded(this.ctx);

    this.node = new AudioWorkletNode(this.ctx, 'pitch-correction-processor', {
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

  dispose(): void {
    this.node?.disconnect();
    this.node = null;
    this._ready = false;
    this._onPitchUpdate = null;
  }
}
