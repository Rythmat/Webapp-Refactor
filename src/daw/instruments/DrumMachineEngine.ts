import * as Tone from 'tone';
import type { InstrumentAdapter } from './InstrumentAdapter';
import { DRUM_KIT_CONFIGS, DRUM_PADS, type DrumKitId } from './drumKits';

// Kit/pad data lives in the tone-free ./drumKits module; re-export so
// existing importers of this file keep working.
export { DRUM_KIT_CONFIGS, DRUM_KITS, DRUM_PADS } from './drumKits';
export type { DrumKitConfig, DrumKitId, DrumPadDef } from './drumKits';

// Map any MIDI note to its canonical pad note (for routing through pad chain)
function canonicalPadNote(note: number): number {
  switch (note) {
    case 35:
    case 36:
      return 36; // Kick
    case 37:
    case 38:
    case 39:
      return 38; // Snare
    case 40:
      return 40; // Sidestick
    case 42:
      return 42; // Closed HH
    case 44:
      return 44; // Hi-Hat Pedal
    case 46:
      return 46; // Open HH
    case 48:
    case 50:
      return 48; // Rack Tom 1 (high)
    case 45:
    case 47:
      return 45; // Rack Tom 2 (mid)
    case 41:
    case 43:
      return 41; // Floor Tom (low)
    case 49:
    case 52:
    case 55:
    case 57:
      return 49; // Crash
    case 51:
    case 53:
      return 51; // Ride
    default:
      return 36; // Fallback to kick
  }
}

// ── Per-pad audio chain ─────────────────────────────────────────────────

interface PadChain {
  velGain: Tone.Gain;
  gain: Tone.Gain;
  panner: Tone.Panner;
}

// ── DrumMachineEngine ───────────────────────────────────────────────────

/**
 * Sample-based drum machine: loads .wav samples per pad from local kit configs.
 * Each pad has its own gain + pan chain for individual mix control.
 */
export class DrumMachineEngine implements InstrumentAdapter {
  private players = new Map<number, Tone.Player>();
  private output: Tone.Gain | null = null;
  private currentKit: DrumKitId = 'natural';
  private loaded = false;
  // Monotonic load counter — overlapping loadKit calls resolve last-wins.
  private loadSeq = 0;

  constructor(initialKit?: DrumKitId) {
    if (initialKit && DRUM_KIT_CONFIGS.some((c) => c.id === initialKit)) {
      this.currentKit = initialKit;
    }
  }

  // Per-pad mix chains: note → { gain, panner }
  private padChains = new Map<number, PadChain>();
  // Stored base volumes per pad (immune to velocity scaling)
  private padBaseVolume = new Map<number, number>();

  async init(_ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.output = new Tone.Gain(1);
    this.output.connect(outputNode);

    // Create per-pad velGain → gain → panner → master output
    for (const pad of DRUM_PADS) {
      const velGain = new Tone.Gain(1);
      const gain = new Tone.Gain(0.8);
      const panner = new Tone.Panner(0);
      velGain.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);
      this.padChains.set(pad.note, { velGain, gain, panner });
      this.padBaseVolume.set(pad.note, 0.8);
    }

    await this.loadKit(this.currentKit);
  }

  // In-flight kit load, so duplicate setKit calls share one promise.
  private kitLoad: { kitId: DrumKitId; promise: Promise<void> } | null = null;

  /** Load (or reload) drum samples for a given kit. */
  async setKit(kitId: DrumKitId): Promise<void> {
    if (kitId === this.currentKit && this.loaded) return;
    if (this.kitLoad?.kitId === kitId) return this.kitLoad.promise;
    this.currentKit = kitId;
    const promise = this.loadKit(kitId);
    this.kitLoad = { kitId, promise };
    try {
      await promise;
    } finally {
      if (this.kitLoad?.promise === promise) this.kitLoad = null;
    }
  }

  getKit(): DrumKitId {
    return this.currentKit;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  // ── Per-pad volume/pan ──────────────────────────────────────────────

  setPadVolume(note: number, volume: number): void {
    const chain = this.padChains.get(note);
    if (chain) chain.gain.gain.value = volume;
    this.padBaseVolume.set(note, volume);
  }

  setPadPan(note: number, pan: number): void {
    const chain = this.padChains.get(note);
    if (chain) chain.panner.pan.value = Math.max(-1, Math.min(1, pan));
  }

  getPadVolume(note: number): number {
    return this.padBaseVolume.get(note) ?? 0.8;
  }

  getPadPan(note: number): number {
    return this.padChains.get(note)?.panner.pan.value ?? 0;
  }

  getDefaultPan(note: number): number {
    const config = DRUM_KIT_CONFIGS.find((c) => c.id === this.currentKit);
    return config?.defaultPan?.[note] ?? 0;
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async loadKit(kitId: DrumKitId): Promise<void> {
    const seq = ++this.loadSeq;
    this.loaded = false;

    const config = DRUM_KIT_CONFIGS.find((c) => c.id === kitId);
    if (!config) {
      console.warn(`[DrumMachineEngine] Unknown kit: ${kitId}`);
      return;
    }

    // Build the new players off to the side; only the latest requested load
    // commits (overlapping loads resolve last-wins, losers are discarded).
    const newPlayers = new Map<number, Tone.Player>();
    await Promise.all(
      Object.entries(config.samples).map(async ([noteStr, filename]) => {
        const padNote = Number(noteStr);
        const url = `${config.baseUrl}${filename}${config.ext}`;
        const player = new Tone.Player(url);
        await Tone.loaded();
        newPlayers.set(padNote, player);
      }),
    );

    if (seq !== this.loadSeq) {
      for (const player of newPlayers.values()) player.dispose();
      return;
    }

    // Commit: swap players and route through the per-pad chains
    for (const player of this.players.values()) player.dispose();
    this.players = newPlayers;
    for (const [padNote, player] of newPlayers) {
      const chain = this.padChains.get(padNote);
      if (chain) player.connect(chain.velGain);
    }

    // Apply kit default panning
    if (config.defaultPan) {
      for (const [noteStr, pan] of Object.entries(config.defaultPan)) {
        const chain = this.padChains.get(Number(noteStr));
        if (chain) chain.panner.pan.value = pan;
      }
    }

    this.loaded = true;
  }

  noteOn(note: number, velocity: number, time?: number): void {
    const t = time ?? Tone.now();
    const canonical = canonicalPadNote(note);
    const velGain = Math.max(0, Math.min(1, velocity / 127));

    // Hi-hat choke: closed hat (42) or pedal (44) cuts open hat (46)
    if (canonical === 42 || canonical === 44) {
      const openHat = this.players.get(46);
      if (openHat?.loaded) openHat.stop(t);
    }

    // Apply velocity on the dedicated velocity gain node (pad volume stays untouched)
    const chain = this.padChains.get(canonical);
    if (chain) {
      chain.velGain.gain.setValueAtTime(velGain, t);
    }

    const player = this.players.get(canonical);
    if (player?.loaded) {
      player.stop(t);
      player.start(t);
    }
  }

  noteOff(_note: number, _time?: number): void {
    // Drum sounds are one-shot; no sustained release needed
  }

  allNotesOff(): void {
    // Nothing to release for one-shot drum sounds
  }

  panic(): void {
    // Drums are one-shot; nothing to silence
  }

  dispose(): void {
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();

    for (const chain of this.padChains.values()) {
      chain.velGain.dispose();
      chain.gain.dispose();
      chain.panner.dispose();
    }
    this.padChains.clear();

    this.output?.dispose();
    this.output = null;
    this.loaded = false;
  }
}
