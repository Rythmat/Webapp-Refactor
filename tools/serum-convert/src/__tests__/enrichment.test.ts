import { describe, it, expect } from 'vitest';
import { createCollector } from '../fidelity.ts';
import { applyFx } from '../mapping/fx.ts';
import { mapWarp } from '../mapping/oscillators.ts';
import { defaultPreset } from '../oracleTypes.ts';
import { detuneModeScale } from '../serumDefaults.ts';
import type { SerumDoc } from '../serumPreset.ts';

describe('warp menu mapping', () => {
  it('maps distortion warps (kDist* names) to live waveshaper modes', () => {
    expect(mapWarp('kDistTube', 0.5)).toEqual({ mode: 'tube', amount: 0.5 });
    expect(mapWarp('kDistSoftClip', 0.3)).toMatchObject({ mode: 'softclip' });
    expect(mapWarp('kDistDiode1', 0.8)).toMatchObject({ mode: 'diode' });
    expect(mapWarp('kDistLinFold', 0.2)).toMatchObject({ mode: 'fold' });
  });

  it('maps phase warps to pre-baked modes', () => {
    expect(mapWarp('kSync', 0.5)).toMatchObject({ mode: 'sync' });
    expect(mapWarp('kBendPos', 0.5)).toMatchObject({ mode: 'bend' });
    expect(mapWarp('kPWM', 0.5)).toMatchObject({ mode: 'pwm' });
    expect(mapWarp('kASYMNeg', 0.5)).toMatchObject({ mode: 'squeeze' });
  });

  it('returns null for no warp (empty or near-zero amount)', () => {
    expect(mapWarp('', 0.5)).toBeNull();
    expect(mapWarp('kDistTube', 0)).toBeNull();
  });

  it('drops modulation-osc warps (FM/RM/AM/PD) with a label', () => {
    expect(mapWarp('kFM_OSC', 0.5)).toEqual({ drop: 'FM_OSC' });
    expect(mapWarp('kPD_OSC', 0.5)).toEqual({ drop: 'PD_OSC' });
    expect(mapWarp('kRM_SUB', 0.5)).toEqual({ drop: 'RM_SUB' });
  });
});

describe('detune mode scaling', () => {
  it('spreads Super wider and Inv narrower than Linear', () => {
    expect(detuneModeScale('kDetuneLinear')).toBe(1);
    expect(detuneModeScale('kDetuneSuper')).toBeGreaterThan(1);
    expect(detuneModeScale('kDetuneInv')).toBeLessThan(1);
    expect(detuneModeScale('<absent>')).toBe(1); // unknown → linear
  });
});

// Build a minimal SerumDoc carrying one FX rack with a single module.
function docWithFx(
  type: number,
  subKey: string,
  params: Record<string, number | string>,
): SerumDoc {
  return {
    meta: { presetName: 'T' },
    body: {
      FXRack0: {
        FX: [
          {
            type,
            kUIParamMixOrGain: 0,
            [subKey]: { plainParams: params },
          },
        ],
      },
    },
  } as unknown as SerumDoc;
}

describe('FX params read from the nested sub-object', () => {
  it('enables reverb from FXReverb.plainParams and maps size/mix', () => {
    const preset = defaultPreset('T');
    const fid = createCollector();
    applyFx(
      preset,
      docWithFx(6, 'FXReverb', {
        kParamWet: 40,
        kParamSize: 60,
        kParamType: '"kHall"',
        kParamFreqB: 30,
      }),
      fid,
    );
    expect(preset.fx.reverb.enabled).toBe(true);
    expect(preset.fx.reverb.mix).toBeCloseTo(0.4);
    expect(preset.fx.reverb.size).toBeCloseTo(0.6);
  });

  it('skips a reverb stored at wet 0 (bypassed)', () => {
    const preset = defaultPreset('T');
    const fid = createCollector();
    applyFx(preset, docWithFx(6, 'FXReverb', { kParamWet: 0 }), fid);
    expect(preset.fx.reverb.enabled).toBe(false);
  });

  it('reads distortion drive from FXDistortion.plainParams', () => {
    const preset = defaultPreset('T');
    const fid = createCollector();
    applyFx(
      preset,
      docWithFx(0, 'FXDistortion', { kParamWet: 100, kParamDrive: 50 }),
      fid,
    );
    expect(preset.fx.drive.enabled).toBe(true);
    expect(preset.fx.drive.amount).toBeCloseTo(0.5);
  });
});
