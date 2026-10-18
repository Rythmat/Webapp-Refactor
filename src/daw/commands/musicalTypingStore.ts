import { create } from 'zustand';
import {
  DEFAULT_TYPING_OCTAVE,
  DEFAULT_TYPING_VELOCITY,
  MAX_TYPING_OCTAVE,
  MIN_TYPING_OCTAVE,
  TYPING_VELOCITY_STEP,
} from './musicalTypingMap';

// ── Musical typing's switch, octave and velocity (milestone 1.6) ───────────
//
// Off until the student turns it on (` or the chip), and kept for as long as
// the page is open; nothing about it is saved. It lives outside the editor
// store: a key press that changes the octave is not an edit to the project,
// and playing must never cost a store write.

/**
 * The velocities C and V step through: 20 apart from the default 100, with
 * MIDI's ends, so stepping up to 127 and back down lands on 100 again.
 */
export const VELOCITY_LADDER: readonly number[] = [
  1, 20, 40, 60, 80, 100, 120, 127,
];

/**
 * `velocity` moved `by` (in TYPING_VELOCITY_STEPs, at least one) along the
 * ladder; a velocity between rungs goes to the next rung that way.
 */
export function stepVelocity(velocity: number, by: number): number {
  if (by === 0) return velocity;
  const steps = Math.max(1, Math.round(Math.abs(by) / TYPING_VELOCITY_STEP));
  const ahead =
    by > 0
      ? VELOCITY_LADDER.filter((v) => v > velocity)
      : VELOCITY_LADDER.filter((v) => v < velocity).reverse();
  if (ahead.length === 0) return velocity;
  return ahead[Math.min(steps, ahead.length) - 1]!;
}

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
    set((s) => ({ velocity: stepVelocity(s.velocity, by) })),
}));
