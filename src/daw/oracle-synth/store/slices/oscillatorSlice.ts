import { StateCreator } from 'zustand';
import { OscillatorParams, BasicWaveform } from '../../audio/types';

export interface OscillatorSlice {
  oscillators: [OscillatorParams, OscillatorParams];
  setOscParam: <K extends keyof OscillatorParams>(
    index: 0 | 1,
    param: K,
    value: OscillatorParams[K],
  ) => void;
  setOscWaveform: (index: 0 | 1, waveform: BasicWaveform) => void;
}

const defaultOsc = (enabled: boolean): OscillatorParams => ({
  waveform: 'sawtooth',
  wavetable: 'SAWTOOTH',
  octave: 0,
  semitone: 0,
  fine: 0,
  wtPosition: 0,
  pan: 0,
  level: 0.7,
  unisonVoices: 1,
  unisonDetune: 0,
  unisonBlend: 0.1,
  enabled,
});

export const createOscillatorSlice: StateCreator<
  OscillatorSlice,
  [],
  [],
  OscillatorSlice
> = (set) => ({
  oscillators: [defaultOsc(true), defaultOsc(false)],

  setOscParam: (index, param, value) =>
    set((state) => {
      const newOscs = [...state.oscillators] as [
        OscillatorParams,
        OscillatorParams,
      ];
      newOscs[index] = { ...newOscs[index], [param]: value };
      return { oscillators: newOscs };
    }),

  setOscWaveform: (index, waveform) =>
    set((state) => {
      const newOscs = [...state.oscillators] as [
        OscillatorParams,
        OscillatorParams,
      ];
      newOscs[index] = { ...newOscs[index], waveform };
      return { oscillators: newOscs };
    }),
});
