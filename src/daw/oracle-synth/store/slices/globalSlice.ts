import { StateCreator } from 'zustand';

export interface GlobalSlice {
  masterVolume: number;
  pitchBend: number;
  pitchBendRange: number; // semitones
  modWheel: number;
  activeNotes: Set<number>;
  bpm: number;
  setMasterVolume: (vol: number) => void;
  setPitchBend: (val: number) => void;
  setPitchBendRange: (semitones: number) => void;
  setModWheel: (val: number) => void;
  addActiveNote: (note: number) => void;
  removeActiveNote: (note: number) => void;
  setBPM: (bpm: number) => void;
}

export const createGlobalSlice: StateCreator<
  GlobalSlice,
  [],
  [],
  GlobalSlice
> = (set) => ({
  masterVolume: 0.8,
  pitchBend: 0,
  pitchBendRange: 2,
  modWheel: 0,
  activeNotes: new Set<number>(),
  bpm: 120,

  setMasterVolume: (vol) => set({ masterVolume: vol }),
  setPitchBend: (val) => set({ pitchBend: val }),
  setPitchBendRange: (semitones) => set({ pitchBendRange: semitones }),
  setModWheel: (val) => set({ modWheel: val }),
  addActiveNote: (note) =>
    set((state) => ({
      activeNotes: new Set(state.activeNotes).add(note),
    })),
  removeActiveNote: (note) =>
    set((state) => {
      const next = new Set(state.activeNotes);
      next.delete(note);
      return { activeNotes: next };
    }),
  setBPM: (bpm) => set({ bpm }),
});
