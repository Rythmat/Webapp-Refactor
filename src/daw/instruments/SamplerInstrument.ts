import * as Tone from 'tone';
import type { InstrumentAdapter } from './InstrumentAdapter';

// ── Config ──────────────────────────────────────────────────────────────

export interface SamplerConfig {
  name: string;
  baseUrl: string;
  /** Map of note names to filenames, e.g. { 'C2': 'C2.mp3', 'F#3': 'Fs3.mp3' } */
  sampleMap: Record<string, string>;
}

// ── SamplerInstrument ───────────────────────────────────────────────────

/**
 * Generic sample-based instrument using Tone.js Sampler.
 * Loads samples from a CDN and interpolates between sparse note keys.
 * Follows the same Tone.Gain bridge pattern as PianoSampler.
 */
export class SamplerInstrument implements InstrumentAdapter {
  private sampler: Tone.Sampler | null = null;
  private bridge: Tone.Gain | null = null;
  private loaded = false;
  private sustainActive = false;
  private sustainedNotes = new Set<string>();

  constructor(private config: SamplerConfig) {}

  async init(_ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    return new Promise<void>((resolve) => {
      this.bridge = new Tone.Gain(1);
      this.bridge.connect(outputNode);

      this.sampler = new Tone.Sampler({
        urls: this.config.sampleMap,
        baseUrl: this.config.baseUrl,
        onload: () => {
          this.loaded = true;
          resolve();
        },
      });

      this.sampler.connect(this.bridge);
    });
  }

  noteOn(note: number, velocity: number, time?: number): void {
    if (!this.sampler || !this.loaded) return;
    const noteName = Tone.Frequency(note, 'midi').toNote();
    this.sampler.triggerAttack(noteName, time, velocity / 127);
  }

  noteOff(note: number, time?: number): void {
    if (!this.sampler) return;
    const noteName = Tone.Frequency(note, 'midi').toNote();
    if (this.sustainActive) {
      this.sustainedNotes.add(noteName);
      return;
    }
    this.sampler.triggerRelease(noteName, time);
  }

  cc(controller: number, value: number): void {
    if (controller !== 64) return;
    if (value >= 64) {
      this.sustainActive = true;
    } else {
      this.sustainActive = false;
      for (const noteName of this.sustainedNotes) {
        this.sampler?.triggerRelease(noteName);
      }
      this.sustainedNotes.clear();
    }
  }

  allNotesOff(): void {
    this.sustainActive = false;
    this.sustainedNotes.clear();
    this.sampler?.releaseAll();
  }

  panic(): void {
    this.allNotesOff();
  }

  dispose(): void {
    this.sampler?.dispose();
    this.bridge?.dispose();
    this.sampler = null;
    this.bridge = null;
    this.loaded = false;
  }
}
