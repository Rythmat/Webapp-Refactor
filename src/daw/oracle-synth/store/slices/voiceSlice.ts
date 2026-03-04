import { StateCreator } from 'zustand';
import { VoiceMode } from '../../audio/types';

export interface VoiceSlice {
  voiceMode: VoiceMode;
  voiceCount: number;
  glide: number;
  spread: number;
  setVoiceMode: (mode: VoiceMode) => void;
  setVoiceCount: (count: number) => void;
  setGlide: (value: number) => void;
  setSpread: (value: number) => void;
}

export const createVoiceSlice: StateCreator<
  VoiceSlice,
  [],
  [],
  VoiceSlice
> = (set) => ({
  voiceMode: 'poly',
  voiceCount: 8,
  glide: 0,
  spread: 0,

  setVoiceMode: (mode) => set({ voiceMode: mode }),
  setVoiceCount: (count) => set({ voiceCount: count }),
  setGlide: (value) => set({ glide: value }),
  setSpread: (value) => set({ spread: value }),
});
