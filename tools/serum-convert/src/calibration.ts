// Calibration values for the ⚠ unit curves. Defaults are documented
// assumptions; `calibrate.ts` overwrites calibration.json from reference
// presets with known display values. The constants describe Serum's knob
// taper (a fact about the engine), not any preset's creative content.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Calibration {
  /** Filter cutoff: hz = freqLoHz · (freqHiHz/freqLoHz)^x, x = raw 0..1 */
  freqLoHz: number;
  freqHiHz: number;
  /**
   * Master volume dB curve: dB = masterDbA + masterDbB·raw. Null (default)
   * means the field is treated as a linear amplitude (the scan-consistent
   * interpretation) — a dB curve is only used once measured from reference
   * presets, since an uncalibrated dB assumption renders typical presets
   * near-silent.
   */
  masterDbA: number | null;
  masterDbB: number | null;
  /** LFO synced rate: raw value → cycles-per-bar lookup (sorted asc by raw). */
  lfoSyncPoints: { raw: number; cyclesPerBar: number }[];
  /** LFO free rate is Hz directly (verified); kept for completeness. */
  lfoFreeIsHz: boolean;
  /** Provenance note for the report. */
  source: string;
}

export const DEFAULT_CALIBRATION: Calibration = {
  freqLoHz: 8,
  freqHiHz: 22050,
  masterDbA: null, // → amplitude interpretation until measured
  masterDbB: null,
  lfoSyncPoints: [],
  lfoFreeIsHz: true,
  source: 'documented assumptions (uncalibrated)',
};

const CALIB_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'calibration.json',
);

let cached: Calibration | null = null;

export function loadCalibration(): Calibration {
  if (cached) return cached;
  if (existsSync(CALIB_PATH)) {
    try {
      cached = {
        ...DEFAULT_CALIBRATION,
        ...(JSON.parse(
          readFileSync(CALIB_PATH, 'utf8'),
        ) as Partial<Calibration>),
      };
      return cached;
    } catch {
      /* fall through to defaults */
    }
  }
  cached = DEFAULT_CALIBRATION;
  return cached;
}

export const calibrationPath = CALIB_PATH;
