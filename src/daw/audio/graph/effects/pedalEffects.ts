import { ChorusPedal } from '../../pedals/ChorusPedal';
import { FlangerPedal } from '../../pedals/FlangerPedal';
import { NamAmpPedal } from '../../pedals/NamAmpPedal';
import { OverdrivePedal } from '../../pedals/OverdrivePedal';
import type { PedalProcessor } from '../../pedals/PedalProcessor';
import { PhaserPedal } from '../../pedals/PhaserPedal';
import { WahPedal } from '../../pedals/WahPedal';

// ── The guitar pedals as effects (owner, 2026-10-22) ───────────────────────
//
// The pedals a guitar, bass or vocal track had in its own chain, as effects
// any track, send or Master can add from the Effects dock: Overdrive, Amp,
// Chorus, Phaser, Flanger and Wah. The pedals' own sound (audio/pedals/),
// each wrapped as one slot of the effect chain (PedalEffectModule). The
// Compressor, EQ, Delay and Reverb pedals are the dock's own effects
// already; Pitch Correction is left out (owner).
//
// A pedal's controls are its knobs, 0–1 as the pedal takes them, each with
// its default (the guitar view's), and a readout in the units it means.

export type PedalSlot =
  | 'overdrive'
  | 'amp'
  | 'chorus'
  | 'phaser'
  | 'flanger'
  | 'wah';

/** A pedal slot's state: on or off, and each knob 0–1. */
export interface PedalEffectParams {
  enabled: boolean;
  [knob: string]: number | boolean;
}

export interface PedalKnob {
  key: string;
  /** The knob's name on its card. */
  label: string;
  default: number;
  /** The readout under it, for the value 0–1. */
  format(v: number): string;
}

export interface PedalEffectDef {
  slot: PedalSlot;
  /** Its name in the picker and on its card. */
  label: string;
  /** What it does, in one line. */
  about: string;
  /** Its knobs, the main ones first (a short card keeps the first ones). */
  knobs: readonly PedalKnob[];
  /** The pedal's settings no knob shows (its fixed mode). */
  fixed?: Readonly<Record<string, number>>;
  create(ctx: AudioContext): PedalProcessor;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const hz = (lo: number, span: number) => (v: number) => {
  const f = lo + v * span;
  return f < 10 ? `${f.toFixed(1)} Hz` : `${Math.round(f)} Hz`;
};
/** A tone stack's ±12 dB around its middle. */
const db12 = (v: number) => {
  const d = (v - 0.5) * 24;
  return `${d > 0 ? '+' : ''}${d.toFixed(1)} dB`;
};
const ms = (lo: number, span: number) => (v: number) =>
  `${Math.round((lo + v * span) * 1000)} ms`;

export const PEDAL_EFFECTS: readonly PedalEffectDef[] = [
  {
    slot: 'overdrive',
    label: 'Overdrive',
    about: 'Pushes the sound into a warm, gritty drive',
    knobs: [
      { key: 'drive', label: 'DRIVE', default: 0.5, format: pct },
      { key: 'tone', label: 'TONE', default: 0.5, format: hz(200, 7800) },
      { key: 'volume', label: 'VOLUME', default: 0.7, format: pct },
    ],
    create: (ctx) => new OverdrivePedal(ctx),
  },
  {
    slot: 'amp',
    label: 'Amp',
    about: 'A guitar amp: its drive and its bass, mid and treble',
    knobs: [
      { key: 'drive', label: 'DRIVE', default: 0.4, format: pct },
      { key: 'bass', label: 'BASS', default: 0.5, format: db12 },
      { key: 'mid', label: 'MID', default: 0.5, format: db12 },
      { key: 'treble', label: 'TREBLE', default: 0.5, format: db12 },
      { key: 'presence', label: 'PRESENCE', default: 0.5, format: db12 },
      { key: 'volume', label: 'VOLUME', default: 0.7, format: pct },
    ],
    create: (ctx) => {
      // The classic amp: no neural model to load in an effect.
      const amp = new NamAmpPedal(ctx);
      amp.setAmpSimMode('classic');
      return amp;
    },
  },
  {
    slot: 'chorus',
    label: 'Chorus',
    about: 'Doubles the sound into a wide shimmer',
    knobs: [
      { key: 'rate', label: 'RATE', default: 0.3, format: hz(0.1, 7.9) },
      { key: 'depth', label: 'DEPTH', default: 0.5, format: pct },
      { key: 'mix', label: 'MIX', default: 0.5, format: pct },
    ],
    create: (ctx) => new ChorusPedal(ctx),
  },
  {
    slot: 'phaser',
    label: 'Phaser',
    about: 'Sweeps a whoosh through the sound',
    knobs: [
      { key: 'rate', label: 'RATE', default: 0.3, format: hz(0.01, 39.99) },
      { key: 'depth', label: 'DEPTH', default: 0.5, format: pct },
      { key: 'mix', label: 'MIX', default: 0.5, format: pct },
    ],
    // Its rate in Hz (the pedal's free mode, not synced to the song).
    fixed: { rateMode: 0 },
    create: (ctx) => new PhaserPedal(ctx),
  },
  {
    slot: 'flanger',
    label: 'Flanger',
    about: 'A jet-plane swoosh, like a phaser but metallic',
    knobs: [
      { key: 'rate', label: 'RATE', default: 0.3, format: hz(0.1, 4.9) },
      { key: 'depth', label: 'DEPTH', default: 0.5, format: pct },
      { key: 'mix', label: 'MIX', default: 0.5, format: pct },
    ],
    create: (ctx) => new FlangerPedal(ctx),
  },
  {
    slot: 'wah',
    label: 'Wah',
    about: 'A filter that opens as you play harder: “wah”',
    knobs: [
      {
        key: 'frequency',
        label: 'FREQ',
        default: 0.5,
        format: (v) => {
          const f = 100 * Math.pow(50, v);
          return f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`;
        },
      },
      { key: 'resonance', label: 'RESO', default: 0.4, format: pct },
      { key: 'sensitivity', label: 'SENS', default: 0.5, format: pct },
      { key: 'mix', label: 'MIX', default: 0.7, format: pct },
      {
        key: 'attack',
        label: 'ATTACK',
        default: 0.3,
        format: ms(0.001, 0.099),
      },
      { key: 'decay', label: 'DECAY', default: 0.5, format: ms(0.01, 0.99) },
    ],
    // Its band-pass sweep, its envelope's reach and its output, as the
    // guitar view's Wah starts.
    fixed: { filterType: 1, freqEnvAmt: 0.5, resEnvAmt: 0.2, level: 0.7 },
    create: (ctx) => new WahPedal(ctx),
  },
];

export const PEDAL_SLOTS: readonly PedalSlot[] = PEDAL_EFFECTS.map(
  (d) => d.slot,
);

const BY_SLOT = new Map(PEDAL_EFFECTS.map((d) => [d.slot, d]));

/** The pedal effect `slot` is, if it is one. */
export function pedalEffectDef(slot: string): PedalEffectDef | undefined {
  return BY_SLOT.get(slot as PedalSlot);
}

/** A pedal slot's default state: off, each knob at its default. */
export function defaultPedalParams(slot: PedalSlot): PedalEffectParams {
  const def = BY_SLOT.get(slot)!;
  const params: PedalEffectParams = { enabled: false };
  for (const knob of def.knobs) params[knob.key] = knob.default;
  return params;
}

/** The knob values a pedal is given: the state's, else each default. */
export function pedalKnobValues(
  def: PedalEffectDef,
  state: PedalEffectParams | undefined,
): Record<string, number> {
  const values: Record<string, number> = { ...(def.fixed ?? {}) };
  for (const knob of def.knobs) {
    const v = state?.[knob.key];
    values[knob.key] =
      typeof v === 'number' && Number.isFinite(v) ? v : knob.default;
  }
  return values;
}
