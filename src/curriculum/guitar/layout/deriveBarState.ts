import type { BarState, RunState } from './types';

// ── What the action bar shows ──────────────────────────────────────────────
// One answer, in precedence order, so two things can never claim the bar (or
// the visuals slot) at once — the old screen stacked the result modal under
// the section-complete offer at the last step of a section.
//
//   section-complete offer > result > performance > practice > preview
//
// A practice loop between two passes reads 'preview' for a moment
// (restartingPass); it is still practice, so the bar doesn't flash the
// preview's buttons.

export interface BarStateInput {
  state: RunState;
  restartingPass: boolean;
  /** A scored take is on screen (the layout's `result` is set). */
  hasResult: boolean;
  /** The section-complete offer is up (the layout's `offer` is set). */
  hasOffer: boolean;
}

export function deriveBarState({
  state,
  restartingPass,
  hasResult,
  hasOffer,
}: BarStateInput): BarState {
  if (hasOffer) return 'sectionComplete';
  if (hasResult) return 'result';
  if (state === 'performance') return 'performance';
  if (state === 'practice' || restartingPass) return 'practice';
  return 'preview';
}
