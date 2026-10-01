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
  /** Output delay beyond what the browser reports (Bluetooth headphones), in
   *  ms. Lessons shift the in-time playhead and scoring by it. */
  outputLatencyMs: number;
  volume: number;

  // Look & Feel
  appSounds: boolean;
  autoPreview: boolean;
  highContrast: boolean;
  noteStreaks: boolean;

  /** Practice Track keyboard: show the scale-degree row over the lit keys. */
  practiceShowDegrees: boolean;
  /** Practice Track keyboard: show the note-name row over the lit keys. */
  practiceShowNoteNames: boolean;
  /**
   * Chords Practice Track keyboard: 'root', or the id of one of the lesson's
   * own voicing sets. '' until the student picks, so each track opens on its
   * own default.
   */
  practiceChordVoicing: string;

  // MIDI
  midiDeviceId: string;
  hitSensitivity: number;
  midiMapping: MidiMapping | null;

  // Actions
  setOutputDevice: (device: string) => void;
  setOutputChannel: (channel: string) => void;
  setOutputLatencyMs: (ms: number) => void;
  setVolume: (volume: number) => void;
  setAppSounds: (enabled: boolean) => void;
  setAutoPreview: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setNoteStreaks: (enabled: boolean) => void;
  setPracticeShowDegrees: (enabled: boolean) => void;
  setPracticeShowNoteNames: (enabled: boolean) => void;
  setPracticeChordVoicing: (voicing: string) => void;
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
      outputLatencyMs: 0,
      volume: 80,

      // Look & Feel defaults
      appSounds: true,
      autoPreview: true,
      highContrast: false,
      noteStreaks: true,
      practiceShowDegrees: true,
      practiceShowNoteNames: true,
      practiceChordVoicing: '',

      // MIDI defaults
      midiDeviceId: '',
      hitSensitivity: 80,
      midiMapping: null,

      // Actions
      setOutputDevice: (device) => set({ outputDevice: device }),
      setOutputChannel: (channel) => set({ outputChannel: channel }),
      setOutputLatencyMs: (ms) => set({ outputLatencyMs: ms }),
      setVolume: (volume) => set({ volume }),
      setAppSounds: (enabled) => set({ appSounds: enabled }),
      setAutoPreview: (enabled) => set({ autoPreview: enabled }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setNoteStreaks: (enabled) => set({ noteStreaks: enabled }),
      setPracticeShowDegrees: (enabled) =>
        set({ practiceShowDegrees: enabled }),
      setPracticeShowNoteNames: (enabled) =>
        set({ practiceShowNoteNames: enabled }),
      setPracticeChordVoicing: (voicing) =>
        set({ practiceChordVoicing: voicing }),
      setMidiDeviceId: (id) => set({ midiDeviceId: id }),
      setHitSensitivity: (sensitivity) => set({ hitSensitivity: sensitivity }),
      setMidiMapping: (mapping) => set({ midiMapping: mapping }),
    }),
    {
      name: 'music-atlas-settings',
    },
  ),
);
