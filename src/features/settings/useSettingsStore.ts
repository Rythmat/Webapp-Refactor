import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MidiMapping {
  firstNote: number;
  lastNote: number;
  keyCount: number;
}

interface SettingsState {
  // Audio
  outputDevice: string;
  outputChannel: string;
  latency: number;
  volume: number;

  // Look & Feel
  appSounds: boolean;
  autoPreview: boolean;
  highContrast: boolean;
  noteStreaks: boolean;

  // MIDI
  midiDeviceId: string;
  hitSensitivity: number;
  midiMapping: MidiMapping | null;

  // Actions
  setOutputDevice: (device: string) => void;
  setOutputChannel: (channel: string) => void;
  setLatency: (latency: number) => void;
  setVolume: (volume: number) => void;
  setAppSounds: (enabled: boolean) => void;
  setAutoPreview: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setNoteStreaks: (enabled: boolean) => void;
  setMidiDeviceId: (id: string) => void;
  setHitSensitivity: (sensitivity: number) => void;
  setMidiMapping: (mapping: MidiMapping | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Audio defaults
      outputDevice: 'OS DEFAULT',
      outputChannel: '1 & 2',
      latency: 10,
      volume: 80,

      // Look & Feel defaults
      appSounds: true,
      autoPreview: true,
      highContrast: false,
      noteStreaks: true,

      // MIDI defaults
      midiDeviceId: '',
      hitSensitivity: 80,
      midiMapping: null,

      // Actions
      setOutputDevice: (device) => set({ outputDevice: device }),
      setOutputChannel: (channel) => set({ outputChannel: channel }),
      setLatency: (latency) => set({ latency }),
      setVolume: (volume) => set({ volume }),
      setAppSounds: (enabled) => set({ appSounds: enabled }),
      setAutoPreview: (enabled) => set({ autoPreview: enabled }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setNoteStreaks: (enabled) => set({ noteStreaks: enabled }),
      setMidiDeviceId: (id) => set({ midiDeviceId: id }),
      setHitSensitivity: (sensitivity) => set({ hitSensitivity: sensitivity }),
      setMidiMapping: (mapping) => set({ midiMapping: mapping }),
    }),
    {
      name: 'music-atlas-settings',
    },
  ),
);
