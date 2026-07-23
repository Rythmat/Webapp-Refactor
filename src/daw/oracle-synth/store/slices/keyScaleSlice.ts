import { StateCreator } from 'zustand';
import type { SnapMode } from '../../audio/ScaleQuantizer';

export interface KeyScaleParams {
  enabled: boolean;
  /** When true, rootPc/mode mirror the project's UNISON-detected key. */
  followProjectKey: boolean;
  rootPc: number; // 0-11
  mode: string; // key into @prism/engine ALL_MODES
  snapMode: SnapMode;
}

export const DEFAULT_KEYSCALE: KeyScaleParams = {
  enabled: false,
  followProjectKey: true,
  rootPc: 0,
  mode: 'ionian',
  snapMode: 'nearest',
};

export interface KeyScaleSlice {
  keyScale: KeyScaleParams;
  setKeyScale: (updates: Partial<KeyScaleParams>) => void;
}

export const createKeyScaleSlice: StateCreator<
  KeyScaleSlice,
  [],
  [],
  KeyScaleSlice
> = (set) => ({
  keyScale: structuredClone(DEFAULT_KEYSCALE),

  setKeyScale: (updates) =>
    set((state) => ({
      keyScale: { ...state.keyScale, ...updates },
    })),
});
