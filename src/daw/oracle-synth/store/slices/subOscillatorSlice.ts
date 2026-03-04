import { StateCreator } from 'zustand';
import { SubOscillatorParams } from '../../audio/types';

export interface SubOscillatorSlice {
  subOscillator: SubOscillatorParams;
  setSubParam: <K extends keyof SubOscillatorParams>(
    param: K,
    value: SubOscillatorParams[K]
  ) => void;
}

export const createSubOscillatorSlice: StateCreator<
  SubOscillatorSlice,
  [],
  [],
  SubOscillatorSlice
> = (set) => ({
  subOscillator: {
    waveform: 'sine',
    octave: -1,
    semitone: 0,
    fine: 0,
    level: 0.5,
    pan: 0,
    enabled: false,
  },

  setSubParam: (param, value) =>
    set((state) => ({
      subOscillator: { ...state.subOscillator, [param]: value },
    })),
});
