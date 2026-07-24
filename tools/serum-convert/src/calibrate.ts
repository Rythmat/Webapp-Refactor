// Derives the ⚠ unit curves from reference presets with KNOWN display
// values, then writes calibration.json (consumed by serumDefaults.ts).
//
//   node tools/serum-convert/src/cli.ts calibrate --refdir "<folder>"
//
// The refdir holds single-knob reference presets named by their displayed
// value (see CALIBRATION.md for the exact list). Filename conventions:
//   cutoff-<Hz>.SerumPreset       filter 1 cutoff = <Hz> displayed
//   master-<dB>db.SerumPreset     master volume = <dB> (use m6 for −6)
//   lfo-sync-<div>.SerumPreset    LFO1 synced to <div> (1_1, 1_2, 1_4, 1_8, 1_16)
//   lfo-free-<Hz>hz.SerumPreset   LFO1 free-run at <Hz>
// Missing categories are simply skipped (defaults retained for them).

import { readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseSerumPreset, plainParams, num, section } from './serumPreset.ts';
import {
  DEFAULT_CALIBRATION,
  calibrationPath,
  type Calibration,
} from './calibration.ts';

const DIVISION_CYCLES: Record<string, number> = {
  // cycles per 4/4 bar
  '1_1': 1,
  '1_2': 2,
  '1_4': 4,
  '1_8': 8,
  '1_16': 16,
  '1_32': 32,
};

interface CutoffPoint {
  raw: number;
  hz: number;
}
interface MasterPoint {
  raw: number;
  db: number;
}

/** log-linear fit of hz = lo·(hi/lo)^x → returns {lo, hi} spanning x∈[0,1]. */
function fitExp(points: CutoffPoint[]): { lo: number; hi: number } | null {
  if (points.length < 2) return null;
  // Linear regression of ln(hz) on raw x
  const n = points.length;
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (const p of points) {
    const y = Math.log(p.hz);
    sx += p.raw;
    sy += y;
    sxx += p.raw * p.raw;
    sxy += p.raw * y;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const lo = Math.exp(intercept); // x = 0
  const hi = Math.exp(intercept + slope); // x = 1
  return { lo, hi };
}

/** linear fit db = a + b·raw */
function fitLinear(points: MasterPoint[]): { a: number; b: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (const p of points) {
    sx += p.raw;
    sy += p.db;
    sxx += p.raw * p.raw;
    sxy += p.raw * p.db;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b };
}

export function runCalibrate(refdir: string): void {
  const files = readdirSync(refdir).filter((f) => f.endsWith('.SerumPreset'));
  const cutoff: CutoffPoint[] = [];
  const master: MasterPoint[] = [];
  const lfoSync: { raw: number; cyclesPerBar: number }[] = [];
  const lfoFree: { raw: number; hz: number }[] = [];

  for (const f of files) {
    const name = basename(f, '.SerumPreset').toLowerCase();
    let doc;
    try {
      doc = parseSerumPreset(join(refdir, f));
    } catch (err) {
      console.warn(`skip ${f}: ${(err as Error).message}`);
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = name.match(/cutoff-(\d+(?:\.\d+)?)/))) {
      const raw = num(
        plainParams(section(doc, 'VoiceFilter0')),
        'kParamFreq',
        NaN,
      );
      if (isFinite(raw)) cutoff.push({ raw, hz: parseFloat(m[1]) });
    } else if ((m = name.match(/master-(m?)(\d+(?:\.\d+)?)db/))) {
      const raw = num(
        plainParams(section(doc, 'Global0')),
        'kParamMasterVolume',
        NaN,
      );
      const db = (m[1] === 'm' ? -1 : 1) * parseFloat(m[2]);
      if (isFinite(raw)) master.push({ raw, db });
    } else if ((m = name.match(/lfo-sync-(\d+_\d+)/))) {
      const cyc = DIVISION_CYCLES[m[1]];
      const raw = num(plainParams(section(doc, 'LFO0')), 'kParamRate', NaN);
      if (isFinite(raw) && cyc) lfoSync.push({ raw, cyclesPerBar: cyc });
    } else if ((m = name.match(/lfo-free-(\d+(?:\.\d+)?)hz/))) {
      const raw = num(plainParams(section(doc, 'LFO0')), 'kParamRate', NaN);
      if (isFinite(raw)) lfoFree.push({ raw, hz: parseFloat(m[1]) });
    } else {
      console.warn(`unrecognized reference file: ${f}`);
    }
  }

  const calib: Calibration = { ...DEFAULT_CALIBRATION };
  const notes: string[] = [];

  const exp = fitExp(cutoff);
  if (exp) {
    calib.freqLoHz = Math.round(exp.lo * 100) / 100;
    calib.freqHiHz = Math.round(exp.hi);
    notes.push(
      `cutoff: ${cutoff.length} pts → ${calib.freqLoHz}Hz..${calib.freqHiHz}Hz` +
        ` (residuals: ${cutoff
          .map((p) => {
            const pred =
              calib.freqLoHz * Math.pow(calib.freqHiHz / calib.freqLoHz, p.raw);
            return `${p.hz}→${Math.round(pred)}`;
          })
          .join(', ')})`,
    );
  }

  const lin = fitLinear(master);
  if (lin) {
    calib.masterDbA = Math.round(lin.a * 100) / 100;
    calib.masterDbB = Math.round(lin.b * 100) / 100;
    notes.push(
      `master: ${master.length} pts → dB = ${calib.masterDbA} + ${calib.masterDbB}·raw`,
    );
  }

  if (lfoSync.length) {
    calib.lfoSyncPoints = lfoSync.sort((a, b) => a.raw - b.raw);
    notes.push(
      `lfo sync: ${lfoSync.map((p) => `${p.raw.toFixed(3)}→${p.cyclesPerBar}c/bar`).join(', ')}`,
    );
  }
  if (lfoFree.length) {
    const ok = lfoFree.every((p) => Math.abs(p.raw - p.hz) < 0.5);
    notes.push(
      `lfo free: ${ok ? 'confirmed Hz' : 'NOT Hz — check ' + JSON.stringify(lfoFree)}`,
    );
    calib.lfoFreeIsHz = ok;
  }

  calib.source = `calibrated from ${files.length} reference presets`;
  if (notes.length === 0) {
    console.error(
      'No recognizable reference presets found. See CALIBRATION.md for the naming convention.',
    );
    process.exit(1);
  }

  writeFileSync(calibrationPath, JSON.stringify(calib, null, 1));
  console.log(`wrote ${calibrationPath}\n`);
  for (const n of notes) console.log(`  ${n}`);
}
