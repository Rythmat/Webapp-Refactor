import * as Tone from 'tone';
import {
  createEightOhEight,
  type EightOhEight,
} from '@/curriculum/engine/genreGeneration/eightOhEight';
import type { InstrumentAdapter } from './InstrumentAdapter';

/**
 * The lessons' 808 sub-bass (eightOhEight.ts) as a Studio instrument, so a Hip
 * Hop Practice Track sounds like the play-along it came from. Monophonic, like
 * a real 808: a new note takes over from the one sounding. Slides are a lesson
 * play-along feature; a Studio MIDI clip has no way to ask for one.
 */
export class EightOhEightInstrument implements InstrumentAdapter {
  private bridge: Tone.Gain | null = null;
  private voice: EightOhEight | null = null;
  private sounding: number | null = null;

  async init(_ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.bridge = new Tone.Gain(1);
    this.bridge.connect(outputNode);
    this.voice = createEightOhEight(this.bridge);
  }

  noteOn(note: number, velocity: number, time?: number): void {
    if (!this.voice) return;
    this.sounding = note;
    this.voice.synth.triggerAttack(
      Tone.Frequency(note, 'midi').toNote(),
      time ?? Tone.immediate(),
      velocity / 127,
    );
  }

  noteOff(note: number, time?: number): void {
    // Only the note still sounding can end it; a stale note-off from a note
    // that was already taken over is ignored.
    if (!this.voice || note !== this.sounding) return;
    this.voice.synth.triggerRelease(time ?? Tone.immediate());
    this.sounding = null;
  }

  allNotesOff(): void {
    this.voice?.synth.triggerRelease(Tone.immediate());
    this.sounding = null;
  }

  panic(): void {
    this.allNotesOff();
  }

  dispose(): void {
    this.voice?.dispose();
    this.bridge?.dispose();
    this.voice = null;
    this.bridge = null;
  }
}
