// ── SoundFontInstrument ──────────────────────────────────────────────────────
// The application's General MIDI voice: a single SpessaSynth worklet with the
// GM soundbank, on the shared context, routed to the `instruments` bus.
//
// One instance serves every feature at once — Jam Room, Chroma, Constellations,
// Chord Press, Major Arcanum — by handing out MIDI channel leases. Two features
// can sound simultaneously on different channels with different programs, which
// is the whole reason this is channel-addressed rather than a single voice.
//
// Note: the DAW keeps its own copy (daw/instruments/SoundFontAdapter) until its
// migration, so the .sf2 may still be fetched twice across a session — the
// browser's HTTP cache absorbs the second. Collapsing the two is the last step
// of the DAW migration.

import type { WorkletSynthesizer } from 'spessasynth_lib';
import { audioContextOwner } from '../core/AudioContextOwner';
import { mixer } from '../core/Mixer';
import type { MidiInstrument, NoteOptions } from './Instrument';

const WORKLET_URL = '/daw-assets/spessasynth_processor.min.js';
const SOUNDBANK_URL = '/daw-assets/GeneralUser_GS.sf2';
const ALL_NOTES_OFF = 123; // MIDI CC

/** Reserved channels. Everything else (1–8) is leased on demand. */
export const SOUNDFONT_CHANNELS = {
  /** Default melodic channel for single-player features. */
  local: 0,
  /** GM percussion — fixed by the standard. */
  drums: 9,
  /** Sustained drones/pads. */
  drone: 10,
  /** Short accents/sparkles. */
  accent: 11,
} as const;

const FIRST_LEASABLE = 1;
const LAST_LEASABLE = 8;

type SynthInternals = {
  isReady: Promise<void>;
  soundBankManager: {
    addSoundBank(data: ArrayBuffer, id: string): Promise<void>;
  };
};

export class SoundFontInstrument implements MidiInstrument {
  readonly id = 'gm-soundfont';

  private synth: WorkletSynthesizer | null = null;
  private ready = false;
  private loadPromise: Promise<void> | null = null;
  private output: GainNode | null = null;
  private volume = 1;

  // Channel leases for multi-participant features (Jam Room remotes).
  private leases = new Map<string, number>();
  private nextLeasable = FIRST_LEASABLE;

  // ── Loading ──────────────────────────────────────────────────────────────

  load(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.doLoad();
    return this.loadPromise;
  }

  isReady(): boolean {
    return this.ready;
  }

  private async doLoad(): Promise<void> {
    const ctx = audioContextOwner.get();
    // Not awaited: with no user activation yet the browser leaves resume()
    // pending forever, which would stall the load and every caller waiting on
    // it. Loading works fine on a suspended context.
    audioContextOwner.resume();

    await ctx.audioWorklet.addModule(WORKLET_URL);
    const { WorkletSynthesizer } = await import('spessasynth_lib');
    const synth = new WorkletSynthesizer(ctx);
    await (synth as unknown as SynthInternals).isReady;

    const response = await fetch(SOUNDBANK_URL);
    if (!response.ok) {
      throw new Error(`[SoundFont] soundbank fetch failed: ${response.status}`);
    }
    const soundbank = await response.arrayBuffer();
    await (synth as unknown as SynthInternals).soundBankManager.addSoundBank(
      soundbank,
      'gm',
    );

    this.output = mixer.channel('instruments', this.volume);
    synth.connect(this.output);
    synth.programChange(SOUNDFONT_CHANNELS.local, 0); // Acoustic Grand default

    this.synth = synth;
    this.ready = true;
  }

  // ── Playback ─────────────────────────────────────────────────────────────

  noteOn(note: number, velocity: number, opts?: NoteOptions): void {
    // A note always follows a gesture — the reliable moment to lift an
    // autoplay suspension left over from a gesture-less warm-up.
    audioContextOwner.resume();
    if (!this.ready || !this.synth) return;
    this.synth.noteOn(
      opts?.channel ?? SOUNDFONT_CHANNELS.local,
      note,
      velocity,
    );
  }

  noteOff(note: number, opts?: NoteOptions): void {
    if (!this.ready || !this.synth) return;
    this.synth.noteOff(opts?.channel ?? SOUNDFONT_CHANNELS.local, note);
  }

  allNotesOff(channel?: number): void {
    if (!this.ready || !this.synth) return;
    if (channel != null) {
      this.controllerChange(channel, ALL_NOTES_OFF, 0);
      return;
    }
    for (let ch = 0; ch < 16; ch++) this.controllerChange(ch, ALL_NOTES_OFF, 0);
  }

  programChange(channel: number, program: number): void {
    if (!this.ready || !this.synth) return;
    this.synth.programChange(channel, program);
  }

  controllerChange(channel: number, controller: number, value: number): void {
    if (!this.ready || !this.synth) return;
    this.synth.controllerChange(
      channel,
      controller as Parameters<WorkletSynthesizer['controllerChange']>[1],
      value,
    );
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    const out = this.output;
    if (out) {
      out.gain.setTargetAtTime(this.volume, out.context.currentTime, 0.01);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  // ── Channel leases ───────────────────────────────────────────────────────

  /**
   * Claim a channel for a client (a remote jam participant, a feature that
   * needs its own program). Stable per client id: asking twice returns the
   * same channel. Wraps around when all leasable channels are taken — the
   * oldest lease is the one overwritten.
   */
  leaseChannel(clientId: string): number {
    const existing = this.leases.get(clientId);
    if (existing !== undefined) return existing;

    const channel = this.nextLeasable;
    this.nextLeasable = channel >= LAST_LEASABLE ? FIRST_LEASABLE : channel + 1;
    this.leases.set(clientId, channel);
    return channel;
  }

  /** Give a channel back, silencing anything it is still holding. */
  releaseChannel(clientId: string): void {
    const channel = this.leases.get(clientId);
    if (channel !== undefined) this.allNotesOff(channel);
    this.leases.delete(clientId);
  }

  dispose(): void {
    if (this.synth) {
      this.allNotesOff();
      this.synth.disconnect();
    }
    this.output?.disconnect();
    this.output = null;
    this.synth = null;
    this.ready = false;
    this.loadPromise = null;
    this.leases.clear();
    this.nextLeasable = FIRST_LEASABLE;
  }
}
