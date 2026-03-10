import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';

// ── Types ───────────────────────────────────────────────────────────────

export interface MidiDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
}

// ── Slice ───────────────────────────────────────────────────────────────

export type MidiStatus = 'idle' | 'ready' | 'unavailable';

export interface MidiDeviceSlice {
  inputs: MidiDevice[];
  outputs: MidiDevice[];
  midiStatus: MidiStatus;
  hwActiveNotes: Set<number>;
  audioActiveNotes: number[];

  addDevice: (device: MidiDevice) => void;
  removeDevice: (id: string) => void;
  setInputs: (devices: MidiDevice[]) => void;
  setOutputs: (devices: MidiDevice[]) => void;
  setMidiStatus: (status: MidiStatus) => void;
  hwNoteOn: (note: number) => void;
  hwNoteOff: (note: number) => void;
  setAudioActiveNotes: (notes: number[]) => void;
}

export const createMidiDeviceSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  MidiDeviceSlice
> = (set) => ({
  // ── State ──
  inputs: [],
  outputs: [],
  midiStatus: 'idle' as MidiStatus,
  hwActiveNotes: new Set<number>(),
  audioActiveNotes: [] as number[],

  // ── Actions ──
  addDevice: (device) =>
    set((state) => {
      if (device.type === 'input') {
        return { inputs: [...state.inputs, device] };
      }
      return { outputs: [...state.outputs, device] };
    }),

  removeDevice: (id) =>
    set((state) => ({
      inputs: state.inputs.filter((d) => d.id !== id),
      outputs: state.outputs.filter((d) => d.id !== id),
    })),

  setInputs: (devices) => set({ inputs: devices }),

  setOutputs: (devices) => set({ outputs: devices }),

  setMidiStatus: (status) => set({ midiStatus: status }),

  hwNoteOn: (note) =>
    set((state) => {
      const next = new Set(state.hwActiveNotes);
      next.add(note);
      return { hwActiveNotes: next };
    }),

  hwNoteOff: (note) =>
    set((state) => {
      const next = new Set(state.hwActiveNotes);
      next.delete(note);
      return { hwActiveNotes: next };
    }),

  setAudioActiveNotes: (notes) =>
    set((state) => {
      const prev = state.audioActiveNotes;
      if (prev.length === notes.length && prev.every((n, i) => n === notes[i]))
        return state;
      return { audioActiveNotes: notes };
    }),
});
