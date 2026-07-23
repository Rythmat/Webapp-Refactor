import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import {
  DEFAULT_EFFECTS,
  type EffectSlotType,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';

// ── Aux return buses (Phase 4: sends / returns) ────────────────────────────
// Global return buses A (Reverb) and B (Delay). Each holds its own EffectChain
// state (like the mastering rack) + an output volume. Tracks feed them via
// post-fader sends (Track.sends). Returns are global, not per-track creatable.

export interface ReturnBus {
  id: string; // 'A' | 'B'
  label: string;
  volume: number; // 0–1
  fxChain: EffectSlotType[]; // active effect slots (UI order)
  effects: TrackEffectState;
}

export interface ReturnsSlice {
  returns: ReturnBus[];
  setReturnVolume: (id: string, value: number) => void;
  addReturnFx: (id: string, effectType: EffectSlotType) => void;
  removeReturnFx: (id: string, effectType: EffectSlotType) => void;
  updateReturnEffects: (id: string, effects: Partial<TrackEffectState>) => void;
}

/** A return preset: one effect enabled and set fully wet (the dry comes from
 *  each track's own direct-to-master path). */
function makeReturn(
  id: string,
  label: string,
  slot: EffectSlotType,
  wetPatch: Partial<TrackEffectState>,
): ReturnBus {
  const effects = structuredClone(DEFAULT_EFFECTS);
  effects[slot] = { ...effects[slot], enabled: true } as never;
  Object.assign(effects, wetPatch);
  return { id, label, volume: 0.8, fxChain: [slot], effects };
}

export function defaultReturns(): ReturnBus[] {
  const base = structuredClone(DEFAULT_EFFECTS);
  return [
    makeReturn('A', 'Reverb', 'reverb', {
      reverb: { ...base.reverb, enabled: true, wet: 1 },
    }),
    makeReturn('B', 'Delay', 'delay', {
      delay: { ...base.delay, enabled: true, wet: 1 },
    }),
  ];
}

const MAX_RETURN_FX = 5;

export const createReturnsSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  ReturnsSlice
> = (set) => ({
  returns: defaultReturns(),

  setReturnVolume: (id, value) =>
    set((s) => ({
      returns: s.returns.map((r) =>
        r.id === id ? { ...r, volume: Math.max(0, Math.min(1, value)) } : r,
      ),
    })),

  addReturnFx: (id, effectType) =>
    set((s) => ({
      returns: s.returns.map((r) => {
        if (r.id !== id) return r;
        if (r.fxChain.includes(effectType) || r.fxChain.length >= MAX_RETURN_FX)
          return r;
        return {
          ...r,
          fxChain: [...r.fxChain, effectType],
          effects: {
            ...r.effects,
            [effectType]: { ...r.effects[effectType], enabled: true },
          },
        };
      }),
    })),

  removeReturnFx: (id, effectType) =>
    set((s) => ({
      returns: s.returns.map((r) =>
        r.id === id
          ? {
              ...r,
              fxChain: r.fxChain.filter((e) => e !== effectType),
              effects: {
                ...r.effects,
                [effectType]: { ...r.effects[effectType], enabled: false },
              },
            }
          : r,
      ),
    })),

  updateReturnEffects: (id, effects) =>
    set((s) => ({
      returns: s.returns.map((r) =>
        r.id === id ? { ...r, effects: { ...r.effects, ...effects } } : r,
      ),
    })),
});
