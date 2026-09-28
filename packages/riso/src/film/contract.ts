/**
 * The film contract. Everything — live playback, the tools, the parity harness — drives a film
 * through this and nothing else.
 *
 * `seek(t)` is PURE: repeated seeks and cold jumps from anywhere give identical pixels. That is
 * what lets one source both play live in a canvas and render frame-by-frame to MP4, and it is the
 * property the whole port is verified against. It does NOT prove motion continuity — a film can
 * be perfectly pure and still stutter.
 *
 * Purity has one non-obvious consequence worth stating: animation is a function of `t`, never of
 * a frame counter and never of a wall clock. `Math.random`, `Date.now` and `performance.now` are
 * banned inside the engine, enforced by src/__tests__/purity.test.ts. (An ESLint
 * `no-restricted-properties` rule is planned to back it up, but it lives in the app's
 * .eslintrc.cjs and lands with the workspace wiring — until then the test is the only guard.)
 */

/** A representative moment in the film, derived from the one authoritative timeline. */
export interface Shot {
  id: string;
  start: number;
  /** A moment that reads — used for contact sheets and for the reduced-motion poster frame. */
  readAt?: number;
  end: number;
  action?: string;
  transition?: string;
}

export interface RisoFilm {
  /** Actual film length in seconds. */
  duration: number;
  /** True only once required baking is complete. The tools wait on this. */
  ready: boolean;
  /** Synchronously render exactly the frame at t. Pure. */
  seek(t: number): void;
  /** Visible event times. Optional. */
  marks?: number[];
  /** Derived from the timeline — never a second set of timing constants. */
  shots?: Shot[];
}

declare global {
  interface Window {
    __riso?: RisoFilm;
  }
}
