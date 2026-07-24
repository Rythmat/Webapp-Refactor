// Serum 2 parameter defaults + unit converters — THE calibration surface.
// Sparse storage means absent params take these defaults; wrong values here
// silently skew every converted preset. Sources: empirical scan of factory
// presets (documented per entry) and Serum 2 UI conventions. Items marked
// CAL are calibration assumptions; the ⚠ curves (filter cutoff, master dB,
// LFO sync) come from calibration.json (see calibrate.ts + CALIBRATION.md).

import { loadCalibration } from './calibration.ts';

// ── Defaults (absent-key values) ─────────────────────────────────────────

export const OSC_DEFAULTS = {
  kParamVolume: 0.75, // CAL: UI default level
  kParamPan: 0, // −50..50
  kParamOctave: 0,
  kParamCoarsePit: 0,
  kParamFine: 0, // cents
  kParamUnison: 1,
  kParamDetune: 0.25, // CAL: UI default detune knob (only audible when unison > 1)
  kParamUnisonStereo: 100,
  kParamTablePos: 0, // 0..256
  kParamRandomPhase: 100, // Serum defaults to random phase
} as const;

export const FILTER_DEFAULTS = {
  kParamFreq: 0.5, // normalized
  kParamReso: 0,
  kParamDrive: 0,
  kParamWet: 100, // fully wet
  kParamLevelOut: 1,
} as const;

export const ENV_DEFAULTS = {
  kParamAttack: 0.001,
  kParamHold: 0,
  kParamDecay: 1.0, // CAL: UI shows ~1 s
  kParamSustain: 1.0, // empirically: stored values never reach 1.0
  kParamRelease: 0.05,
} as const;

export const GLOBAL_DEFAULTS = {
  kParamMasterVolume: 0.75, // amplitude; UI default
  kParamPolyCount: 8,
  kParamPortamentoTime: 0,
} as const;

// ── Unit converters ──────────────────────────────────────────────────────

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Serum filter cutoff: normalized 0..1 → Hz.
 * CAL assumption: exponential sweep 8 Hz → 22050 Hz (Serum's UI range),
 * clamped to Oracle's 20..20000 biquad range.
 */
export function filterFreqToHz(n: number): number {
  const { freqLoHz, freqHiHz } = loadCalibration();
  const hz = freqLoHz * Math.pow(freqHiHz / freqLoHz, clamp(n, 0, 1));
  return clamp(hz, 20, 20000);
}

/**
 * Serum resonance 0..100 → biquad Q 0..30. Squared taper: Serum's knob is
 * gentle at the bottom and screams at the top; a linear map would make
 * every midway preset over-resonant on a biquad.
 */
export function resoToQ(res: number): number {
  const n = clamp(res, 0, 100) / 100;
  return clamp(0.5 + n * n * 29.5, 0, 30);
}

/** Serum pan −50..50 → Oracle −1..1 */
export function panToUnit(pan: number): number {
  return clamp(pan / 50, -1, 1);
}

/** Serum percent 0..100 → 0..1 */
export function pctToUnit(v: number): number {
  return clamp(v / 100, 0, 1);
}

/** Serum mod amount −100..100 → Oracle amount −1..1 */
export function amountToUnit(v: number): number {
  return clamp(v / 100, -1, 1);
}

/** Serum table position 0..256 → Oracle wtPosition 0..1 */
export function tablePosToUnit(pos: number): number {
  return clamp(pos / 256, 0, 1);
}

/**
 * Serum detune-mode → scalar applied to Oracle's single linear unison detune.
 * Serum spreads voices very differently per mode for the same knob (Super is
 * wide, Inv narrower), so rescale to keep perceived width close. CAL factors.
 */
export function detuneModeScale(mode: string): number {
  switch (mode) {
    case 'kDetuneSuper':
      return 1.3; // supersaw-style wide spread
    case 'kDetuneExp':
      return 1.15;
    case 'kDetuneInv':
      return 0.85;
    case 'kDetuneRandom':
    case 'kDetuneLinear':
    default:
      return 1.0;
  }
}

/**
 * Serum master volume → Oracle masterVolume linear gain. Default treats the
 * field as a linear amplitude relative to 0.75 = unity (scan-consistent),
 * scaled into Oracle's 0.8 headroom. When calibration has measured a dB
 * curve, use it instead.
 */
export function masterVolumeToUnit(v: number): number {
  const { masterDbA, masterDbB } = loadCalibration();
  if (masterDbA !== null && masterDbB !== null) {
    const linear = Math.pow(10, (masterDbA + masterDbB * clamp(v, 0, 1)) / 20);
    return clamp(linear, 0, 1) * 0.8;
  }
  return clamp(v / 0.75, 0, 1) * 0.8; // amplitude interpretation
}

/**
 * Serum synced LFO raw rate → cycles-per-bar (for replicating the shape
 * across an Oracle LFO bar). Uses calibrated points when available; falls
 * back to a plausible quarter-note default (4 cycles/bar).
 */
export function lfoSyncCyclesPerBar(raw: number): number {
  const { lfoSyncPoints } = loadCalibration();
  if (lfoSyncPoints.length === 0) return 4;
  // Nearest calibrated point by raw value
  let best = lfoSyncPoints[0];
  let bestDist = Math.abs(raw - best.raw);
  for (const p of lfoSyncPoints) {
    const d = Math.abs(raw - p.raw);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best.cyclesPerBar;
}

/**
 * Octave/semitone folding: Serum allows ±4 octaves and large coarse pitch;
 * Oracle clamps octave ±3 and semitone ±12 — fold overflow across fields.
 */
export function foldPitch(
  octave: number,
  semitone: number,
): {
  octave: number;
  semitone: number;
} {
  let total = octave * 12 + semitone;
  total = clamp(total, -3 * 12 - 12, 3 * 12 + 12);
  let oct = Math.trunc(total / 12);
  let semi = total - oct * 12;
  if (oct > 3) {
    semi += (oct - 3) * 12;
    oct = 3;
  } else if (oct < -3) {
    semi += (oct + 3) * 12;
    oct = -3;
  }
  return { octave: oct, semitone: clamp(semi, -12, 12) };
}
