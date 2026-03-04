import { StateCreator } from 'zustand';
import { NoiseParams } from '../../audio/types';

export interface NoiseSlice {
  noise: NoiseParams;
  setNoiseParam: <K extends keyof NoiseParams>(
    param: K,
    value: NoiseParams[K]
  ) => void;
}

export const createNoiseSlice: StateCreator<
  NoiseSlice,
  [],
  [],
  NoiseSlice
> = (set) => ({
  noise: {
    type: 'pink',
    level: 0.3,
    pan: 0,
    enabled: false,
  },

  setNoiseParam: (param, value) =>
    set((state) => ({
      noise: { ...state.noise, [param]: value },
    })),
});
