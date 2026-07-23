// FXRack0..2 → Oracle's fixed 5-effect chain. Serum FX module numeric types
// (verified): 0 Dist, 1 Flanger, 2 Phaser, 3 Chorus, 4 Delay, 5 Comp,
// 6 Reverb, 7 EQ, 8 Filter, 9 HyperDim, 10 Bode, 11 Convolve, 12 Utils,
// 13/14 Split. Only 0/2/3/4/5 have Oracle equivalents.

import {
  plainParams,
  num,
  str,
  section,
  type SerumDoc,
} from '../serumPreset.ts';
import { pctToUnit, clamp } from '../serumDefaults.ts';
import type { CborValue } from '../cbor.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type { PresetDataOut } from '../oracleTypes.ts';

const FX_NAMES: Record<number, string> = {
  0: 'Distortion',
  1: 'Flanger',
  2: 'Phaser',
  3: 'Chorus',
  4: 'Delay',
  5: 'Compressor',
  6: 'Reverb',
  7: 'EQ',
  8: 'FX Filter',
  9: 'Hyper/Dimension',
  10: 'Bode',
  11: 'Convolve',
  12: 'Utility',
  13: 'Splitter',
  14: 'Splitter',
};

interface FxModule {
  type: number;
  params: Record<string, number | string>;
  wet: number; // 0..1
}

function gatherFx(doc: SerumDoc): FxModule[] {
  const out: FxModule[] = [];
  for (let rack = 0; rack < 3; rack++) {
    const r = section(doc, `FXRack${rack}`);
    const fxList = r?.FX;
    if (!Array.isArray(fxList)) continue;
    for (const entry of fxList as CborValue[]) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, CborValue>;
      const type = typeof e.type === 'number' ? e.type : -1;
      if (type < 0) continue;
      // Each FX stores its params in a nested `FX<Name>` sub-object, NOT at the
      // entry top level (which only carries `type` + a UI mix value). Reading
      // the top level yields all-defaults; read the sub-object instead.
      const subKey = Object.keys(e).find(
        (k) => k.startsWith('FX') && e[k] !== null && typeof e[k] === 'object',
      );
      const params = plainParams(subKey ? e[subKey] : e);
      // Mix effects carry kParamWet (0..100) — that's the real on/off + amount.
      // Insert effects (compressor, EQ, …) have no wet and are active whenever
      // present in the rack.
      const hasWet = 'kParamWet' in params;
      const wet = hasWet ? pctToUnit(num(params, 'kParamWet', 0)) : 1;
      if (hasWet && wet <= 0.001) continue; // stored but silent → skip
      out.push({ type, params, wet });
    }
  }
  return out;
}

export function applyFx(
  preset: PresetDataOut,
  doc: SerumDoc,
  fid: FidelityCollector,
): void {
  const modules = gatherFx(doc);
  for (const fx of modules) {
    const p = fx.params;
    switch (fx.type) {
      case 0: // Distortion → drive
        preset.fx.drive = {
          enabled: true,
          amount: clamp(
            Math.max(preset.fx.drive.amount, num(p, 'kParamDrive', 30) / 100),
            0,
            1,
          ),
          mix: Math.max(preset.fx.drive.mix, fx.wet),
        };
        fid.mapped('FX Distortion → drive');
        break;
      case 2: // Phaser
        preset.fx.phaser = {
          enabled: true,
          rate: clamp(num(p, 'kParamRate', 0.5), 0.1, 10),
          depth: clamp(num(p, 'kParamDepth', 50) / 100, 0, 1),
          mix: fx.wet,
        };
        fid.mapped('FX Phaser');
        break;
      case 3: // Chorus
        preset.fx.chorus = {
          enabled: true,
          rate: clamp(num(p, 'kParamRate', 0.8), 0.1, 10),
          depth: clamp(num(p, 'kParamDepth', 30) / 100, 0, 1),
          mix: fx.wet,
        };
        fid.mapped('FX Chorus');
        break;
      case 4: {
        // Delay — Serum times are often beat-synced; approximate at 120 BPM
        const timeRaw = num(p, 'kParamTimeL', num(p, 'kParamTime', 0.25));
        const time = timeRaw > 2 ? 0.375 : clamp(timeRaw, 0.01, 2);
        preset.fx.delay = {
          enabled: true,
          time,
          feedback: clamp(num(p, 'kParamFeedback', 35) / 100, 0, 0.95),
          mix: fx.wet,
        };
        fid.approx('FX Delay (time approximated at 120 BPM)', 0.5);
        break;
      }
      case 5: // Compressor
        preset.fx.compressor = {
          enabled: true,
          threshold: clamp(num(p, 'kParamThresh', -18), -60, 0),
          ratio: clamp(num(p, 'kParamRatio', 4), 1, 20),
          attack: clamp(num(p, 'kParamAttack', 0.01), 0, 1),
          release: clamp(num(p, 'kParamRelease', 0.2), 0, 1),
        };
        fid.mapped('FX Compressor');
        break;
      case 6: {
        // Reverb → Oracle's convolver reverb. Serum stores kParamType (algo:
        // kHall/kPlate/kVintage/kAbyss/…), kParamSize (0..100), and damping
        // cut frequencies (kParamFreq low-cut, kParamFreqB high-cut). There's
        // no explicit decay — the tail scales with size (plates decay shorter).
        const algo = str(p, 'kParamType', '').replace(/"/g, '');
        const isPlate = /plate/i.test(algo);
        const size = clamp(num(p, 'kParamSize', isPlate ? 40 : 60) / 100, 0, 1);
        const decay = clamp(size * (isPlate ? 0.85 : 1), 0, 1);
        const damping = clamp(
          num(p, 'kParamFreqB', isPlate ? 25 : 40) / 100,
          0,
          1,
        );
        preset.fx.reverb = {
          enabled: true,
          size,
          decay,
          damping,
          mix: fx.wet,
        };
        fid.approx(`FX Reverb (${algo || 'hall'} → convolver)`, 0.5);
        break;
      }
      default: {
        const name = FX_NAMES[fx.type] ?? `FX type ${fx.type}`;
        // Weight by how much the effect defines the sound. Hyper/Dimension
        // changes character most; EQ/Utility are usually subtle tone shaping.
        // Scale by wet so a barely-there effect barely counts.
        let base: number;
        if (fx.type === 9)
          base = 2; // Hyper/Dimension
        else if (fx.type === 11)
          base = 1.5; // Convolve
        else if (fx.type === 7 || fx.type === 12)
          base = 0.4; // EQ, Utility
        else if (fx.type === 8)
          base = 1; // FX Filter
        else base = 0.8;
        fid.drop(
          `FX ${name} dropped (wet ${Math.round(fx.wet * 100)}%)`,
          base * fx.wet,
        );
      }
    }
  }
}
