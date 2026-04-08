import * as Tone from 'tone';
import type { InstrumentAdapter } from './InstrumentAdapter';

// ── Drum kit config ─────────────────────────────────────────────────────

export interface DrumKitConfig {
  id: string;
  label: string;
  baseUrl: string;
  samples: Record<number, string>;
  ext: string;
  defaultPan?: Record<number, number>;
}

export const DRUM_KIT_CONFIGS: DrumKitConfig[] = [
  {
    id: 'natural',
    label: 'Natural',
    baseUrl: '/daw-assets/samples/drums/natural/',
    ext: '.wav',
    samples: {
      36: 'kick',
      38: 'snare',
      40: 'snare-sidestick',
      42: 'hihat-closed',
      44: 'hihat-pedal',
      46: 'hihat-open',
      41: 'tom-floor',
      45: 'tom-mid',
      48: 'tom-hi',
      49: 'crash',
      51: 'ride',
    },
    defaultPan: {
      42: -0.14, // Hi-Hat Closed  7L
      44: -0.16, // Hi-Hat Pedal   8L
      46: -0.26, // Hi-Hat Open   13L
      41: -0.2, // Floor Tom     10L
      45: 0.14, // Rack Tom 2     7R
      48: 0.04, // Rack Tom 1     2R
      49: 0.36, // Crash         18R
      51: 0.34, // Ride          17R
    },
  },
];

export const DRUM_KITS = DRUM_KIT_CONFIGS.map((c) => ({
  id: c.id,
  label: c.label,
}));
export type DrumKitId = string;

// ── Drum pad definitions ────────────────────────────────────────────────
// 11 pads, ordered bottom-to-top for display (Kick at bottom, Ride at top).

export interface DrumPadDef {
  note: number;
  label: string;
  shortLabel: string;
}

export const DRUM_PADS: DrumPadDef[] = [
  { note: 36, label: 'Kick', shortLabel: 'KCK' },
  { note: 38, label: 'Snare', shortLabel: 'SNR' },
  { note: 40, label: 'Sidestick', shortLabel: 'STK' },
  { note: 42, label: 'Hi-Hat Closed', shortLabel: 'CHH' },
  { note: 44, label: 'Hi-Hat Pedal', shortLabel: 'PHH' },
  { note: 46, label: 'Hi-Hat Open', shortLabel: 'OHH' },
  { note: 41, label: 'Floor Tom', shortLabel: 'FLT' },
  { note: 45, label: 'Rack Tom 2', shortLabel: 'TM2' },
  { note: 48, label: 'Rack Tom 1', shortLabel: 'TM1' },
  { note: 49, label: 'Crash', shortLabel: 'CRS' },
  { note: 51, label: 'Ride', shortLabel: 'RDE' },
];

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

  /** Load (or reload) drum samples for a given kit. */
  async setKit(kitId: DrumKitId): Promise<void> {
    if (kitId === this.currentKit && this.loaded) return;
    this.currentKit = kitId;
    await this.loadKit(kitId);
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
    this.loaded = false;

    // Dispose old players
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();

    const config = DRUM_KIT_CONFIGS.find((c) => c.id === kitId);
    if (!config) {
      console.warn(`[DrumMachineEngine] Unknown kit: ${kitId}`);
      return;
    }

    // Load all samples in parallel, route through per-pad chains
    const loadPromises = Object.entries(config.samples).map(
      async ([noteStr, filename]) => {
        const padNote = Number(noteStr);
        const url = `${config.baseUrl}${filename}${config.ext}`;
        const player = new Tone.Player(url);

        const chain = this.padChains.get(padNote);
        if (chain) player.connect(chain.velGain);

        await Tone.loaded();
        this.players.set(padNote, player);
      },
    );

    await Promise.all(loadPromises);

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
