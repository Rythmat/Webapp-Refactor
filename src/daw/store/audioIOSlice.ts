import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';

// ── Audio I/O Slice ──────────────────────────────────────────────────────
// Global audio device selection and channel configuration.
// Tracks read from this slice to know which channels are available.

const DEVICE_KEY = 'prism-daw-input-device';
const OVERRIDE_KEY = 'prism-daw-input-ch-override';

function loadDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY) || null;
  } catch { /* localStorage unavailable */ }
  return null;
}

function saveDeviceId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(DEVICE_KEY);
    } else {
      localStorage.setItem(DEVICE_KEY, id);
    }
  } catch { /* localStorage unavailable */ }
}

function loadOverride(): number | null {
  try {
    const v = localStorage.getItem(OVERRIDE_KEY);
    if (v !== null) {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 2 ? n : null;
    }
  } catch { /* localStorage unavailable */ }
  return null;
}

function saveOverride(count: number | null): void {
  try {
    if (count === null) {
      localStorage.removeItem(OVERRIDE_KEY);
    } else {
      localStorage.setItem(OVERRIDE_KEY, String(count));
    }
  } catch { /* localStorage unavailable */ }
}

export interface AudioIOSlice {
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  inputDeviceChannelCount: number;
  outputDeviceChannelCount: number;
  inputChannelCountOverride: number | null; // null = auto-detect
  inputDetectedChannelCount: number; // what the browser actually reported

  // Enabled channel indices (0-based). Arrays for serialization.
  enabledMonoInputs: number[];
  enabledStereoInputs: number[];
  enabledMonoOutputs: number[];
  enabledStereoOutputs: number[];

  // Actions
  setInputDevice: (id: string | null, detectedChannelCount: number) => void;
  setOutputDevice: (id: string | null, channelCount: number) => void;
  setInputChannelCountOverride: (count: number | null) => void;
  toggleMonoInput: (channel: number) => void;
  toggleStereoInput: (leftChannel: number) => void;
  toggleMonoOutput: (channel: number) => void;
  toggleStereoOutput: (leftChannel: number) => void;
}

function toggleInArray(arr: number[], value: number): number[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function defaultChannels(channelCount: number) {
  const mono = channelCount >= 2 ? [0, 1] : channelCount >= 1 ? [0] : [];
  const stereo = channelCount >= 2 ? [0] : [];
  return { mono, stereo };
}

export const createAudioIOSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  AudioIOSlice
> = (set) => ({
  inputDeviceId: loadDeviceId(),
  outputDeviceId: null,
  inputDeviceChannelCount: 0,
  outputDeviceChannelCount: 0,
  inputChannelCountOverride: loadOverride(),
  inputDetectedChannelCount: 0,
  enabledMonoInputs: [],
  enabledStereoInputs: [],
  enabledMonoOutputs: [],
  enabledStereoOutputs: [],

  setInputDevice: (id, detectedChannelCount) => {
    saveDeviceId(id);
    const override = loadOverride();
    const effective = override ?? detectedChannelCount;
    const { mono, stereo } = defaultChannels(effective);
    set({
      inputDeviceId: id,
      inputDetectedChannelCount: detectedChannelCount,
      inputDeviceChannelCount: effective,
      enabledMonoInputs: mono,
      enabledStereoInputs: stereo,
    });
  },

  setOutputDevice: (id, channelCount) => {
    const { mono, stereo } = defaultChannels(channelCount);
    set({
      outputDeviceId: id,
      outputDeviceChannelCount: channelCount,
      enabledMonoOutputs: mono,
      enabledStereoOutputs: stereo,
    });
  },

  setInputChannelCountOverride: (count) => {
    saveOverride(count);
    set((s) => {
      const effective = count ?? s.inputDetectedChannelCount;
      const { mono, stereo } = defaultChannels(effective);
      return {
        inputChannelCountOverride: count,
        inputDeviceChannelCount: effective,
        enabledMonoInputs: mono,
        enabledStereoInputs: stereo,
      };
    });
  },

  toggleMonoInput: (channel) =>
    set((s) => ({ enabledMonoInputs: toggleInArray(s.enabledMonoInputs, channel) })),

  toggleStereoInput: (leftChannel) =>
    set((s) => ({ enabledStereoInputs: toggleInArray(s.enabledStereoInputs, leftChannel) })),

  toggleMonoOutput: (channel) =>
    set((s) => ({ enabledMonoOutputs: toggleInArray(s.enabledMonoOutputs, channel) })),

  toggleStereoOutput: (leftChannel) =>
    set((s) => ({ enabledStereoOutputs: toggleInArray(s.enabledStereoOutputs, leftChannel) })),
});
