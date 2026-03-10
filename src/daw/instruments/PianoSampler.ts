import * as Tone from 'tone';
import type { InstrumentAdapter } from './InstrumentAdapter';

/**
 * Piano instrument using Tone.js Sampler with Salamander Grand Piano samples.
 * Samples are loaded from the free Tone.js CDN on init.
 *
 * Uses a Tone.Gain bridge to connect the Tone.js Sampler output graph
 * to a native AudioNode (the track's gain node).
 */
export class PianoSampler implements InstrumentAdapter {
  private sampler: Tone.Sampler | null = null;
  private bridge: Tone.Gain | null = null;
  private loaded = false;
  private sustainActive = false;
  private sustainedNotes = new Set<string>();

  async init(_ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    return new Promise<void>((resolve) => {
      // Bridge Tone.js signal graph to native AudioNode
      this.bridge = new Tone.Gain(1);
      this.bridge.connect(outputNode);

      this.sampler = new Tone.Sampler({
        urls: {
          A0: 'A0.mp3',
          C1: 'C1.mp3',
          'D#1': 'Ds1.mp3',
          'F#1': 'Fs1.mp3',
          A1: 'A1.mp3',
          C2: 'C2.mp3',
          'D#2': 'Ds2.mp3',
          'F#2': 'Fs2.mp3',
          A2: 'A2.mp3',
          C3: 'C3.mp3',
          'D#3': 'Ds3.mp3',
          'F#3': 'Fs3.mp3',
          A3: 'A3.mp3',
          C4: 'C4.mp3',
          'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
          'D#5': 'Ds5.mp3',
          'F#5': 'Fs5.mp3',
          A5: 'A5.mp3',
          C6: 'C6.mp3',
          'D#6': 'Ds6.mp3',
          'F#6': 'Fs6.mp3',
          A6: 'A6.mp3',
          C7: 'C7.mp3',
          'D#7': 'Ds7.mp3',
          'F#7': 'Fs7.mp3',
          A7: 'A7.mp3',
          C8: 'C8.mp3',
        },
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
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
