import { RateDiv, RateModifier } from './types';

/** Duration of each division in quarter-note beats (assuming 4/4 time) */
const DIV_BEATS: Record<RateDiv, number> = {
  '4': 16, // 4 bars = 16 beats
  '2': 8, // 2 bars = 8 beats
  '1': 4, // 1 bar = 4 beats
  '1/2d': 3, // dotted half = 3 beats
  '1/2': 2, // half = 2 beats
  '1/2t': 4 / 3, // half triplet
  '1/4d': 1.5, // dotted quarter
  '1/4': 1, // quarter = 1 beat
  '1/4t': 2 / 3, // quarter triplet
  '1/8d': 0.75, // dotted eighth
  '1/8': 0.5, // eighth
  '1/8t': 1 / 3, // eighth triplet
  '1/16d': 0.375, // dotted sixteenth
  '1/16': 0.25, // sixteenth
  '1/16t': 1 / 6, // sixteenth triplet
  '1/32': 0.125, // thirty-second
  '1/32t': 1 / 12, // thirty-second triplet
  '1/64': 0.0625, // sixty-fourth
};

/** Convert a musical division + BPM to frequency in Hz */
export function divToHz(div: RateDiv, bpm: number): number {
  const beats = DIV_BEATS[div];
  const seconds = (beats * 60) / bpm;
  return 1 / seconds;
}

/** Number of LFO cycle repetitions per musical bar for a given rate division */
export function divToRepeats(div: RateDiv): number {
  return 4 / DIV_BEATS[div];
}

/** All available divisions for UI selectors, ordered slow → fast */
export const RATE_DIV_OPTIONS: { value: RateDiv; label: string }[] = [
  { value: '4', label: '4 BAR' },
  { value: '2', label: '2 BAR' },
  { value: '1', label: '1 BAR' },
  { value: '1/2d', label: '1/2 D' },
  { value: '1/2', label: '1/2' },
  { value: '1/2t', label: '1/2 T' },
  { value: '1/4d', label: '1/4 D' },
  { value: '1/4', label: '1/4' },
  { value: '1/4t', label: '1/4 T' },
  { value: '1/8d', label: '1/8 D' },
  { value: '1/8', label: '1/8' },
  { value: '1/8t', label: '1/8 T' },
  { value: '1/16d', label: '1/16 D' },
  { value: '1/16', label: '1/16' },
  { value: '1/16t', label: '1/16 T' },
  { value: '1/32', label: '1/32' },
  { value: '1/32t', label: '1/32 T' },
  { value: '1/64', label: '1/64' },
];

/** Base rates only (no triplet/dotted suffixes), ordered slow → fast */
export const BASE_RATE_OPTIONS: { value: RateDiv; label: string }[] = [
  { value: '4', label: '4 BAR' },
  { value: '2', label: '2 BAR' },
  { value: '1', label: '1 BAR' },
  { value: '1/2', label: '1/2' },
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
  { value: '1/32', label: '1/32' },
  { value: '1/64', label: '1/64' },
];

/** Triplet variant mapping: base → triplet RateDiv (or null if none exists) */
const TRIPLET_MAP: Partial<Record<RateDiv, RateDiv>> = {
  '1/2': '1/2t',
  '1/4': '1/4t',
  '1/8': '1/8t',
  '1/16': '1/16t',
  '1/32': '1/32t',
};

/** Dotted variant mapping: base → dotted RateDiv (or null if none exists) */
const DOTTED_MAP: Partial<Record<RateDiv, RateDiv>> = {
  '1/2': '1/2d',
  '1/4': '1/4d',
  '1/8': '1/8d',
  '1/16': '1/16d',
};

/** Apply a rate modifier to a base rate. Falls back to the base if no variant exists. */
export function applyRateModifier(base: RateDiv, mod: RateModifier): RateDiv {
  if (mod === 'triplet') return TRIPLET_MAP[base] ?? base;
  if (mod === 'dotted') return DOTTED_MAP[base] ?? base;
  return base;
}

/** Strip triplet/dotted suffix to get the base rate */
export function getBaseRate(rate: RateDiv): RateDiv {
  if (rate.endsWith('t')) return rate.slice(0, -1) as RateDiv;
  if (rate.endsWith('d')) return rate.slice(0, -1) as RateDiv;
  return rate;
}
