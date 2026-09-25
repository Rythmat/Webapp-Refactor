/**
 * Product-tour state machine (pure — unit tested in __tests__/tourMachine.test.ts).
 *
 * The tour walks tabs × steps on a clock. `TICK` advances time; steps advance
 * when their duration elapses, rolling into the next tab and looping back to
 * the first. Auto-advance halts while any pause reason is active, while the
 * visitor has taken over (`user`, resumes after `USER_IDLE_MS` idle or when
 * they pick a tab), and never runs in `static` (reduced-motion) mode.
 */

export type PauseReason = 'focus' | 'offscreen' | 'hidden' | 'manual';
export type TourStatus = 'playing' | 'user' | 'static';

export interface TourTiming {
  steps: ReadonlyArray<{ durationMs: number }>;
}

export interface TourState {
  tab: number;
  step: number;
  /** ms elapsed in the current step. */
  elapsed: number;
  status: TourStatus;
  pauses: PauseReason[];
  /** ms since the visitor's last interaction (only counted in `user`). */
  idle: number;
}

export type TourAction =
  | { type: 'TICK'; dt: number }
  | { type: 'SELECT_TAB'; tab: number }
  | { type: 'SELECT_STEP'; step: number }
  | { type: 'PAUSE'; reason: PauseReason }
  | { type: 'RESUME'; reason: PauseReason }
  | { type: 'USER_ACTION' };

export const USER_IDLE_MS = 12_000;
/** Clamp for a single tick (e.g. after a backgrounded frame). */
const MAX_DT = 250;

const lastStep = (tabs: readonly TourTiming[], tab: number) =>
  Math.max(0, tabs[tab].steps.length - 1);

export const createTourState = (
  tabs: readonly TourTiming[],
  { isStatic = false }: { isStatic?: boolean } = {},
): TourState => ({
  tab: 0,
  step: isStatic ? lastStep(tabs, 0) : 0,
  elapsed: 0,
  status: isStatic ? 'static' : 'playing',
  pauses: [],
  idle: 0,
});

export const isAdvancing = (s: TourState) =>
  s.status === 'playing' && s.pauses.length === 0;

export function tourReducer(
  state: TourState,
  action: TourAction,
  tabs: readonly TourTiming[],
): TourState {
  switch (action.type) {
    case 'TICK': {
      if (state.status === 'static' || state.pauses.length > 0) return state;
      const dt = Math.min(Math.max(action.dt, 0), MAX_DT);

      if (state.status === 'user') {
        const idle = state.idle + dt;
        return idle >= USER_IDLE_MS
          ? { ...state, status: 'playing', elapsed: 0, idle: 0 }
          : { ...state, idle };
      }

      let { tab, step } = state;
      let elapsed = state.elapsed + dt;
      while (elapsed >= tabs[tab].steps[step].durationMs) {
        elapsed -= tabs[tab].steps[step].durationMs;
        step += 1;
        if (step >= tabs[tab].steps.length) {
          step = 0;
          tab = (tab + 1) % tabs.length;
        }
      }
      return { ...state, tab, step, elapsed };
    }

    case 'SELECT_TAB': {
      const tab = ((action.tab % tabs.length) + tabs.length) % tabs.length;
      const isStatic = state.status === 'static';
      return {
        ...state,
        tab,
        step: isStatic ? lastStep(tabs, tab) : 0,
        elapsed: 0,
        idle: 0,
        status: isStatic ? 'static' : 'playing',
      };
    }

    case 'SELECT_STEP': {
      const step = Math.min(
        Math.max(action.step, 0),
        lastStep(tabs, state.tab),
      );
      return {
        ...state,
        step,
        elapsed: 0,
        idle: 0,
        status: state.status === 'static' ? 'static' : 'user',
      };
    }

    case 'PAUSE':
      return state.pauses.includes(action.reason)
        ? state
        : { ...state, pauses: [...state.pauses, action.reason] };

    case 'RESUME':
      return state.pauses.includes(action.reason)
        ? { ...state, pauses: state.pauses.filter((r) => r !== action.reason) }
        : state;

    case 'USER_ACTION':
      return state.status === 'static'
        ? state
        : { ...state, status: 'user', idle: 0 };

    default:
      return state;
  }
}

/** Fraction (0–1) of the current tab's total duration that has played. */
export const tabProgress = (
  state: TourState,
  tabs: readonly TourTiming[],
): number => {
  const steps = tabs[state.tab].steps;
  const total = steps.reduce((sum, s) => sum + s.durationMs, 0);
  if (state.status === 'static') return 1;
  const before = steps
    .slice(0, state.step)
    .reduce((sum, s) => sum + s.durationMs, 0);
  const current =
    state.status === 'user' ? steps[state.step].durationMs : state.elapsed;
  return total > 0 ? Math.min(1, (before + current) / total) : 0;
};
