import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';

// ── Transport Slice ─────────────────────────────────────────────────────
// Controls playback state, tempo, position, metronome, and loop region.
// Ticks: 480 ticks per quarter note (standard MIDI resolution).

export interface TransportSlice {
  isPlaying: boolean;
  isRecording: boolean;
  isCountingIn: boolean;
  countInBars: number; // 0 = off, 1 = 1 bar, 2 = 2 bars
  bpm: number;
  position: number; // current tick position (480 ticks/quarter)
  metronomeEnabled: boolean;
  loopEnabled: boolean;
  loopStart: number; // tick
  loopEnd: number; // tick (default: 4 bars = 7680)

  play: () => void;
  pause: () => void;
  stop: () => void;
  record: () => void;
  setCountInBars: (bars: number) => void;
  _startRecordingAfterCountIn: () => void;
  setBpm: (bpm: number) => void;
  setPosition: (tick: number) => void;
  toggleMetronome: () => void;
  toggleLoop: () => void;
  setLoopRange: (start: number, end: number) => void;
}

export const createTransportSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  TransportSlice
> = (set) => ({
  // ── State ──
  isPlaying: false,
  isRecording: false,
  isCountingIn: false,
  countInBars: 0,
  bpm: 120,
  position: 0,
  metronomeEnabled: false,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 7680, // 4 bars × 4 beats × 480 ticks

  // ── Actions ──
  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false, isCountingIn: false }),

  stop: () =>
    set({
      isPlaying: false,
      isRecording: false,
      isCountingIn: false,
      position: 0,
    }),

  record: () =>
    set((state) => {
      if (state.countInBars > 0) {
        return { isCountingIn: true };
      }
      return { isRecording: true, isPlaying: true };
    }),

  setCountInBars: (bars) =>
    set({ countInBars: Math.max(0, Math.min(2, bars)) }),

  _startRecordingAfterCountIn: () =>
    set({ isCountingIn: false, isRecording: true, isPlaying: true }),

  setBpm: (bpm) => set({ bpm: Math.max(40, Math.min(300, bpm)) }),

  setPosition: (tick) => set({ position: Math.max(0, tick) }),

  toggleMetronome: () =>
    set((state) => ({ metronomeEnabled: !state.metronomeEnabled })),

  toggleLoop: () => set((state) => ({ loopEnabled: !state.loopEnabled })),

  setLoopRange: (start, end) =>
    set({ loopStart: Math.max(0, start), loopEnd: Math.max(0, end) }),
});
