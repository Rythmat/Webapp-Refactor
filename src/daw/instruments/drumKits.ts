// ── Drum kit config ─────────────────────────────────────────────────────
// Pure data — no tone.js import so store types and tests can depend on it
// without pulling in the audio runtime.

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
  {
    id: '808',
    label: '808',
    baseUrl: '/daw-assets/samples/drums/808/',
    ext: '.wav',
    samples: {
      36: 'kick',
      38: 'snare',
      40: 'clap', // Sidestick pad carries the clap on electronic kits
      42: 'hihat-closed',
      44: 'hihat-pedal',
      46: 'hihat-open',
      41: 'tom-floor',
      45: 'tom-mid',
      48: 'tom-hi',
      49: 'crash',
      51: 'ride',
    },
    // Mostly centered — the mono drum-machine aesthetic; hats/cymbals get a hint of width
    defaultPan: {
      42: -0.08,
      44: -0.08,
      46: -0.12,
      49: 0.12,
      51: 0.15,
    },
  },
  {
    id: 'house',
    label: 'House',
    baseUrl: '/daw-assets/samples/drums/house/',
    ext: '.wav',
    samples: {
      36: 'kick',
      38: 'snare',
      40: 'clap',
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
      42: -0.12,
      44: -0.12,
      46: -0.18,
      41: -0.08,
      45: 0.06,
      48: 0.1,
      49: 0.2,
      51: 0.18,
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
