import { create } from 'zustand';
import {
  clampVelocity,
  DEFAULT_TYPING_OCTAVE,
  DEFAULT_TYPING_VELOCITY,
  MAX_TYPING_OCTAVE,
  MIN_TYPING_OCTAVE,
} from './musicalTypingMap';

// ── Musical typing's switch, octave and velocity (milestone 1.6) ───────────
//
// Off until the student turns it on (` or the chip), and kept for as long as
// the page is open; nothing about it is saved. It lives outside the editor
// store: a key press that changes the octave is not an edit to the project,
// and playing must never cost a store write.

interface MusicalTypingState {
  enabled: boolean;
  /** The octave the A key plays C in: 4 is middle C. */
  octave: number;
  velocity: number;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  shiftOctave: (by: number) => void;
  shiftVelocity: (by: number) => void;
}

export const useMusicalTypingStore = create<MusicalTypingState>()((set) => ({
  enabled: false,
  octave: DEFAULT_TYPING_OCTAVE,
  velocity: DEFAULT_TYPING_VELOCITY,
  setEnabled: (enabled) => set({ enabled }),
  toggle: () => set((s) => ({ enabled: !s.enabled })),
  shiftOctave: (by) =>
    set((s) => ({
      octave: Math.min(
        MAX_TYPING_OCTAVE,
        Math.max(MIN_TYPING_OCTAVE, s.octave + by),
      ),
    })),
  shiftVelocity: (by) =>
    set((s) => ({ velocity: clampVelocity(s.velocity + by) })),
}));
