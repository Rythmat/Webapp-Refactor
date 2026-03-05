import { StateCreator } from 'zustand';
import { EnvelopeParams } from '../../audio/types';

export interface EnvelopeSlice {
  envelopes: [EnvelopeParams, EnvelopeParams];
  setEnvParam: (
    index: 0 | 1,
    param: keyof EnvelopeParams,
    value: number,
  ) => void;
}

export const createEnvelopeSlice: StateCreator<
  EnvelopeSlice,
  [],
  [],
  EnvelopeSlice
> = (set) => ({
  envelopes: [
    { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    { attack: 0.01, decay: 0.5, sustain: 0.5, release: 0.5 },
  ],

  setEnvParam: (index, param, value) =>
    set((state) => {
      const newEnvs = [...state.envelopes] as [EnvelopeParams, EnvelopeParams];
      newEnvs[index] = { ...newEnvs[index], [param]: value };
      return { envelopes: newEnvs };
    }),
});
