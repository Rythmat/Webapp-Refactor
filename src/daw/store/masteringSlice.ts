import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import {
  DEFAULT_EFFECTS,
  type EffectSlotType,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';
import {
  insertPoint,
  removePoint,
  type AutomationLanes,
  type AutomationPoint,
} from '@/daw/audio/automation';

// ── Types ────────────────────────────────────────────────────────────────
// The mastering rack: the master bus's effect chain, its fader and its
// automation. Eight macro settings (style, EQ, presence, de-esser, loudness,
// stereo field, dynamics, amount) used to live here too; no control set them
// and no engine read them, so milestone 1.3 removed them. Their keys stay in
// the collab doc for older peers (YjsDocManager).

export interface MasteringSlice {
  // Mastering chain state
  masteringBypass: boolean;
  masteringFxChain: EffectSlotType[];
  masteringEffects: TrackEffectState;
  // Master bus output volume (0–1), driving the audio engine's master gain.
  masterVolume: number;
  /** Master-bus automation lanes, same shape as Track.automation. Only
   *  'volume' is offered (see MASTER_AUTOMATION_PARAMS). */
  masterAutomation: AutomationLanes;

  // Actions
  toggleMasteringBypass: () => void;
  addMasteringFx: (effectType: EffectSlotType) => void;
  removeMasteringFx: (effectType: EffectSlotType) => void;
  updateMasteringEffects: (effects: Partial<TrackEffectState>) => void;
  setMasterVolume: (value: number) => void;
  upsertMasterAutomationPoint: (
    paramId: string,
    point: AutomationPoint,
  ) => void;
  removeMasterAutomationPoint: (paramId: string, tick: number) => void;
}

/**
 * The mastering chain as live playback should run it: the stored chain, or
 * every slot switched off while Bypass is on. Only the copy handed to the
 * engine changes, so the saved chain, undo and collab keep the student's
 * settings and switching Bypass off brings them straight back. Bypass is a
 * listening A/B: an export always runs the stored chain (renderProject).
 */
export function masteringEffectsForEngine(
  effects: TrackEffectState,
  bypass: boolean,
): TrackEffectState {
  if (!bypass) return effects;
  const off = { ...effects };
  for (const slot of Object.keys(off) as (keyof TrackEffectState)[]) {
    (off as Record<string, unknown>)[slot] = { ...off[slot], enabled: false };
  }
  return off;
}

// ── Slice ────────────────────────────────────────────────────────────────

export const createMasteringSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  MasteringSlice
> = (set) => ({
  masteringBypass: false,
  masteringFxChain: [],
  masteringEffects: structuredClone(DEFAULT_EFFECTS),
  masterVolume: 0.8,
  masterAutomation: {},

  toggleMasteringBypass: () =>
    set((s) => ({ masteringBypass: !s.masteringBypass })),

  addMasteringFx: (effectType) =>
    set((s) => {
      if (
        s.masteringFxChain.includes(effectType) ||
        s.masteringFxChain.length >= 5
      )
        return s;
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

  setMasterVolume: (value) =>
    set({ masterVolume: Math.max(0, Math.min(1, value)) }),

  // Fresh lanes object on every edit (like track automation) so the undo,
  // collab diff and playback re-assert all see the change by reference.
  upsertMasterAutomationPoint: (paramId, point) =>
    set((s) => ({
      masterAutomation: {
        ...s.masterAutomation,
        [paramId]: insertPoint(s.masterAutomation[paramId], point),
      },
    })),

  removeMasterAutomationPoint: (paramId, tick) =>
    set((s) => {
      const lane = s.masterAutomation[paramId];
      if (!lane) return {};
      const next = removePoint(lane, tick);
      const masterAutomation: AutomationLanes = { ...s.masterAutomation };
      if (next.length === 0) delete masterAutomation[paramId];
      else masterAutomation[paramId] = next;
      return { masterAutomation };
    }),
});
