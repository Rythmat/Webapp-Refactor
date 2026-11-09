import type { BuildStep } from './anatomyTypes';

// ── Build it ───────────────────────────────────────────────────────────────
// The guitar goes back together one named part at a time. A wrong press costs
// a miss and names what was pressed; two on one step point out the right part.

export const HINT_AFTER_MISSES = 2;

export interface BuildState {
  order: readonly BuildStep[];
  /** The step being asked; order.length when done. */
  step: number;
  /** Misses on this step, for the hint. */
  misses: number;
  /** Every press, right or wrong. */
  tries: number;
  /** The part just pressed wrongly, and a count so the same one shakes again. */
  wrong: { part: string; nonce: number } | null;
}

export type BuildAction =
  | { type: 'press'; part: string }
  | { type: 'restart'; order?: readonly BuildStep[] };

export const startBuild = (order: readonly BuildStep[]): BuildState => ({
  order,
  step: 0,
  misses: 0,
  tries: 0,
  wrong: null,
});

export const isBuilt = (state: BuildState) => state.step >= state.order.length;

export const currentStep = (state: BuildState): BuildStep | null =>
  state.order[state.step] ?? null;

export const placedParts = (state: BuildState): ReadonlySet<string> =>
  new Set(state.order.slice(0, state.step).flatMap((step) => step.parts));

export const showHint = (state: BuildState) =>
  state.misses >= HINT_AFTER_MISSES;

export function buildReducer(
  state: BuildState,
  action: BuildAction,
): BuildState {
  if (action.type === 'restart') return startBuild(action.order ?? state.order);
  const step = currentStep(state);
  // Parts already home are out of the game.
  if (!step || placedParts(state).has(action.part)) return state;
  if (step.parts.includes(action.part)) {
    return {
      ...state,
      step: state.step + 1,
      misses: 0,
      tries: state.tries + 1,
      wrong: null,
    };
  }
  return {
    ...state,
    misses: state.misses + 1,
    tries: state.tries + 1,
    wrong: { part: action.part, nonce: (state.wrong?.nonce ?? 0) + 1 },
  };
}
