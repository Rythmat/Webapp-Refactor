import { StateCreator } from 'zustand';

export interface UISlice {
  activeLFOBar: number; // 0-3
  activeLFOIndex: number; // 0-3
  selectedSection: string | null;
  setActiveLFOBar: (bar: number) => void;
  setActiveLFOIndex: (index: number) => void;
  setSelectedSection: (section: string | null) => void;
}

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  activeLFOBar: 0,
  activeLFOIndex: 0,
  selectedSection: null,

  setActiveLFOBar: (bar) => set({ activeLFOBar: bar }),
  setActiveLFOIndex: (index) => set({ activeLFOIndex: index }),
  setSelectedSection: (section) => set({ selectedSection: section }),
});
