/**
 * The effects' factory presets: every effect has some, each preset keeps
 * its controls inside their ranges (EffectChain.ts), and the delays follow
 * the song's tempo.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_EFFECTS, type EffectSlotType } from '@/daw/audio/EffectChain';
import {
  EFFECT_PRESETS,
  presetEffects,
  presetSlotState,
} from '../effectPresets';

const SLOTS = Object.keys(DEFAULT_EFFECTS) as EffectSlotType[];

/** Each numeric control's range, from EffectChain.ts. */
const RANGES: Record<string, Record<string, [number, number]>> = {
  compressor: {
    threshold: [-60, 0],
    ratio: [1, 20],
    knee: [0, 40],
    attack: [0.001, 1],
    release: [0.01, 1],
    makeup: [0, 24],
    crush: [0, 1],
  },
  gate: {
    threshold: [-96, 0],
    range: [0, 80],
    hold: [0, 0.5],
    attack: [0.001, 0.5],
    release: [0.01, 2],
  },
  reverb: {
    decay: [0.1, 10],
    preDelay: [0, 200],
    highPass: [20, 2000],
    lowPass: [1000, 20000],
    wet: [0, 1],
  },
  delay: { time: [0, 2], feedback: [0, 0.95], wet: [0, 1] },
  presence: { amount: [0, 100], frequency: [1000, 12000], bandwidth: [0.1, 4] },
  'de-esser': { amount: [0, 100], frequency: [2000, 16000], range: [0, 20] },
  saturator: { drive: [0, 100], mix: [0, 100], tone: [0, 100] },
  multiband: {
    depth: [0, 1],
    time: [0, 1],
    crossoverLow: [40, 500],
    crossoverHigh: [800, 8000],
    lowGain: [-12, 12],
    midGain: [-12, 12],
    highGain: [-12, 12],
  },
  ducker: {
    threshold: [-60, 0],
    amount: [0, 1],
    attack: [0.001, 0.5],
    release: [0.01, 1],
  },
  eq: { makeup: [0, 12] },
};

describe('the effect presets', () => {
  it('give every effect at least two, with unique ids', () => {
    for (const slot of SLOTS) {
      expect(
        EFFECT_PRESETS.filter((p) => p.slot === slot).length,
        slot,
      ).toBeGreaterThanOrEqual(2);
    }
    const ids = EFFECT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keep every control inside its range, at slow and fast tempos', () => {
    for (const bpm of [60, 120, 200]) {
      for (const p of EFFECT_PRESETS) {
        const state = presetSlotState(p, DEFAULT_EFFECTS[p.slot], bpm)!;
        expect(state.enabled).toBe(true);
        // A guitar pedal's knobs are 0–1 (2026-10-22).
        const ranges =
          RANGES[p.slot] ??
          Object.fromEntries(
            Object.keys(p.values({ bpm }) ?? {}).map((k) => [k, [0, 1]]),
          );
        for (const [key, [min, max]] of Object.entries(ranges)) {
          const v = (state as unknown as Record<string, number>)[key];
          expect(v, `${p.id}.${key} at ${bpm}`).toBeGreaterThanOrEqual(min);
          expect(v, `${p.id}.${key} at ${bpm}`).toBeLessThanOrEqual(max);
        }
        if (p.slot === 'eq') {
          const bands = (state as typeof DEFAULT_EFFECTS.eq).bands;
          expect(bands).toHaveLength(DEFAULT_EFFECTS.eq.bands.length);
          for (const b of bands) {
            expect(b.freq).toBeGreaterThanOrEqual(20);
            expect(b.freq).toBeLessThanOrEqual(20000);
            expect(Math.abs(b.gain)).toBeLessThanOrEqual(12);
          }
        }
      }
    }
  });

  it('time the delays in note lengths at the song’s tempo', () => {
    const quarter = EFFECT_PRESETS.find((p) => p.id === 'delay-quarter')!;
    const dotted = EFFECT_PRESETS.find((p) => p.id === 'delay-dotted-eighth')!;
    expect(presetSlotState(quarter, DEFAULT_EFFECTS.delay, 120)).toMatchObject({
      time: 0.5,
    });
    expect(presetSlotState(dotted, DEFAULT_EFFECTS.delay, 100)).toMatchObject({
      time: 0.45,
    });
  });

  it('keep the sidechain’s key track and touch only their own effect', () => {
    const pump = EFFECT_PRESETS.find((p) => p.id === 'ducker-big')!;
    const base = {
      ...DEFAULT_EFFECTS,
      ducker: { ...DEFAULT_EFFECTS.ducker, keyTrackId: 'kick' },
    };
    const next = presetEffects(pump, base, 120);
    expect(next.ducker.keyTrackId).toBe('kick');
    expect(next.reverb).toBe(base.reverb);
  });
});
