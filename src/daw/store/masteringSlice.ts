import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';

// ── Types ────────────────────────────────────────────────────────────────

export type MasteringStyle = 'warm' | 'balanced' | 'open';
export type StereoFieldMode = 'focus' | '100%' | 'wide';

export interface MasteringSlice {
  // Mastering chain state
  masteringStyle: MasteringStyle;
  masteringEq: { low: number; mid: number; high: number };
  masteringPresence: number;
  masteringDeEsser: { amount: number; frequency: number };
  masteringLoudness: number;
  masteringStereoField: StereoFieldMode;
  masteringDynamics: { compression: number; character: number; saturation: number };
  masteringAmount: number;
  masteringBypass: boolean;
  masteringFxChain: EffectSlotType[];
  masteringEffects: TrackEffectState;

  // Actions
  setMasteringStyle: (style: MasteringStyle) => void;
  setMasteringEq: (band: 'low' | 'mid' | 'high', value: number) => void;
  setMasteringPresence: (value: number) => void;
  setMasteringDeEsser: (partial: Partial<{ amount: number; frequency: number }>) => void;
  setMasteringLoudness: (value: number) => void;
  setMasteringStereoField: (mode: StereoFieldMode) => void;
  setMasteringDynamics: (partial: Partial<{ compression: number; character: number; saturation: number }>) => void;
  setMasteringAmount: (value: number) => void;
  toggleMasteringBypass: () => void;
  addMasteringFx: (effectType: EffectSlotType) => void;
  removeMasteringFx: (effectType: EffectSlotType) => void;
  updateMasteringEffects: (effects: Partial<TrackEffectState>) => void;
}

// ── Slice ────────────────────────────────────────────────────────────────

export const createMasteringSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  MasteringSlice
> = (set) => ({
  masteringStyle: 'balanced',
  masteringEq: { low: 0, mid: 0, high: 0 },
  masteringPresence: 50,
  masteringDeEsser: { amount: 0, frequency: 6000 },
  masteringLoudness: -2.0,
  masteringStereoField: '100%',
  masteringDynamics: { compression: 50, character: 50, saturation: 0 },
  masteringAmount: 100,
  masteringBypass: false,
  masteringFxChain: [],
  masteringEffects: structuredClone(DEFAULT_EFFECTS),

  setMasteringStyle: (style) => set({ masteringStyle: style }),

  setMasteringEq: (band, value) =>
    set((s) => ({
      masteringEq: { ...s.masteringEq, [band]: Math.max(-12, Math.min(12, value)) },
    })),

  setMasteringPresence: (value) =>
    set({ masteringPresence: Math.max(0, Math.min(100, value)) }),

  setMasteringDeEsser: (partial) =>
    set((s) => ({
      masteringDeEsser: {
        amount: Math.max(0, Math.min(100, partial.amount ?? s.masteringDeEsser.amount)),
        frequency: Math.max(2000, Math.min(16000, partial.frequency ?? s.masteringDeEsser.frequency)),
      },
    })),

  setMasteringLoudness: (value) =>
    set({ masteringLoudness: Math.max(-6, Math.min(6, Math.round(value * 10) / 10)) }),

  setMasteringStereoField: (mode) => set({ masteringStereoField: mode }),

  setMasteringDynamics: (partial) =>
    set((s) => ({
      masteringDynamics: {
        compression: Math.max(0, Math.min(100, partial.compression ?? s.masteringDynamics.compression)),
        character: Math.max(0, Math.min(100, partial.character ?? s.masteringDynamics.character)),
        saturation: Math.max(0, Math.min(100, partial.saturation ?? s.masteringDynamics.saturation)),
      },
    })),

  setMasteringAmount: (value) =>
    set({ masteringAmount: Math.max(0, Math.min(100, value)) }),

  toggleMasteringBypass: () =>
    set((s) => ({ masteringBypass: !s.masteringBypass })),

  addMasteringFx: (effectType) =>
    set((s) => {
      if (s.masteringFxChain.includes(effectType) || s.masteringFxChain.length >= 5) return s;
      return {
        masteringFxChain: [...s.masteringFxChain, effectType],
        masteringEffects: {
          ...s.masteringEffects,
          [effectType]: { ...s.masteringEffects[effectType], enabled: true },
        },
      };
    }),

  removeMasteringFx: (effectType) =>
    set((s) => ({
      masteringFxChain: s.masteringFxChain.filter((e) => e !== effectType),
      masteringEffects: {
        ...s.masteringEffects,
        [effectType]: { ...s.masteringEffects[effectType], enabled: false },
      },
    })),

  updateMasteringEffects: (effects) =>
    set((s) => ({
      masteringEffects: { ...s.masteringEffects, ...effects },
    })),
});
