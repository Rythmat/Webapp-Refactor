import type { MotionValue } from 'framer-motion';

export type TourDrum = 'kick' | 'snare' | 'hat';

/**
 * The tour's sound-gated audio. Every method is a no-op while Sound is off,
 * so timers and rAF loops may call them freely; only `enableFromGesture` may
 * start audio, and only from a click/key handler.
 */
export interface TourAudio {
  /** Whether Sound is on (read at call time, not reactive). */
  isEnabled: () => boolean;
  /** Turn Sound on from a user gesture (resumes the audio context). */
  enableFromGesture: () => Promise<void>;
  /** Play a chord `delay` seconds from now (scheduling lookahead). */
  notes: (
    midis: readonly number[],
    seconds: number,
    delay?: number,
    velocity?: number,
  ) => void;
  /** Hit one drum voice `delay` seconds from now. */
  drum: (drum: TourDrum, delay?: number, velocity?: number) => void;
  /** Release every sounding note (already-scheduled hits may still land). */
  stopAll: () => void;
}

/** Audio for scenes that never make sound (Globe). */
export const SILENT_TOUR_AUDIO: TourAudio = {
  isEnabled: () => false,
  enableFromGesture: () => Promise.resolve(),
  notes: () => {},
  drum: () => {},
  stopAll: () => {},
};

export interface SceneProps {
  /** Index of the current step within this scene's tab. */
  stepIndex: number;
  /**
   * `auto`: the tour is driving (scene animates the current step).
   * `user`: the visitor took over (scene is freely interactive).
   * `static`: reduced motion (show each step's end state, no timers).
   */
  mode: 'auto' | 'user' | 'static';
  /** False while the tour is offscreen or the page is hidden (stop loops). */
  visible: boolean;
  /** Narrow layout (mobile). */
  compact: boolean;
  /** Tell the tour the visitor interacted (pauses auto-advance). */
  onUserAction: () => void;
  /** Play notes from a user gesture (enables sound on first use). */
  playNotes: (midis: number[], seconds?: number) => void;
  /**
   * 0–1 through the current step, every frame while the tour plays; 1 in
   * user/static mode and frozen while paused. Scenes may drive their own
   * script from it instead of timers.
   */
  stepProgress: MotionValue<number>;
  /** Sound-gated audio for scheduled playback. */
  audio: TourAudio;
  /**
   * Bumped by every step-pill click, including the current step's: scenes
   * that keep visitor state may drop it and show the step's end state again.
   */
  resetKey?: number;
}
