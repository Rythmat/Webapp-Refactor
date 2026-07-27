// ── Instrument contract ──────────────────────────────────────────────────────
// The uniform shape every sound source presents to the engine, so the engine
// (and therefore every page) can drive a soundfont, a sampler or a synth
// without knowing which it has.
//
// Capabilities are added by composition, not inheritance: an instrument that
// understands MIDI programs and controllers implements `MidiInstrument` on top
// of `Instrument`, and callers narrow with `isMidiInstrument`. A future
// oscillator or sampler instrument implements only what it actually supports
// rather than inheriting no-op methods it has to pretend to honour.

export interface NoteOptions {
  /** MIDI channel, for multi-timbral instruments. Defaults to 0. */
  channel?: number;
  /** Context time to trigger at, for scheduled playback. Defaults to now. */
  time?: number;
}

export interface Instrument {
  readonly id: string;

  /** Fetch and prepare. Idempotent — repeat calls share one load. */
  load(): Promise<void>;

  /** Whether it can make sound this instant. */
  isReady(): boolean;

  /**
   * Trigger a note. Synchronous and allocation-light by contract: this is the
   * live-MIDI hot path, so implementations must not await anything here. A
   * note sent before `isReady()` is dropped, not queued.
   */
  noteOn(note: number, velocity: number, opts?: NoteOptions): void;

  /** Release a note. */
  noteOff(note: number, opts?: NoteOptions): void;

  /** Release everything sounding — the stuck-note escape hatch. */
  allNotesOff(channel?: number): void;

  /** Output level for this instrument (0–1). */
  setVolume(volume: number): void;

  dispose(): void;
}

/** An instrument addressable with General MIDI program and controller messages. */
export interface MidiInstrument extends Instrument {
  programChange(channel: number, program: number): void;
  controllerChange(channel: number, controller: number, value: number): void;
}

export function isMidiInstrument(
  instrument: Instrument,
): instrument is MidiInstrument {
  return (
    typeof (instrument as MidiInstrument).programChange === 'function' &&
    typeof (instrument as MidiInstrument).controllerChange === 'function'
  );
}
