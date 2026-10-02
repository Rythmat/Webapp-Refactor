/**
 * Interface that all instrument adapters must implement.
 * Provides a uniform API for the DAW mixer/track system to drive
 * any sound source (synth, sampler, drum machine, etc.).
 */
export interface InstrumentAdapter {
  /**
   * Initialize the instrument and connect its audio output.
   * @param ctx - The shared AudioContext from AudioEngine
   * @param outputNode - The track's gain node to route audio into
   */
  init(ctx: AudioContext, outputNode: AudioNode): Promise<void>;

  /**
   * Trigger a note.
   * @param note - MIDI note number (0-127)
   * @param velocity - MIDI velocity (0-127)
   * @param time - Optional audio context time for sample-accurate scheduling
   */
  noteOn(note: number, velocity: number, time?: number): void;

  /**
   * Release a note.
   * @param note - MIDI note number (0-127)
   * @param time - Optional audio context time for sample-accurate scheduling
   */
  noteOff(note: number, time?: number): void;

  /**
   * Handle a MIDI CC message (e.g. CC64 sustain pedal).
   * Optional — instruments that don't support CC can omit this.
   */
  cc?(controller: number, value: number, time?: number): void;

  /**
   * Pitch-bend wheel position, -1 (full down) … 0 (centre) … +1 (full up).
   * Optional — instruments that can't bend omit this.
   */
  pitchBend?(value: number, time?: number): void;

  /** Release all currently sounding notes (with envelope release). */
  allNotesOff(): void;

  /** Immediately silence all notes (no release envelope). */
  panic(): void;

  /** Tear down the instrument and release all audio resources. */
  dispose(): void;
}
