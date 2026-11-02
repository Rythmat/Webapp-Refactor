// ── What the player is doing ───────────────────────────────────────────────
// Pure, so that every path through a lesson can be tested without a screen.
//
//   acting ── check right ──▶ right ── continue ──▶ next screen
//     ▲  └─── check wrong ──▶ wrong ── try again ─▶ acting (their attempt kept)
//     │                         └───── see answer ▶ revealed ── continue ──▶ …
//
// Screens with nothing to check just wait for Continue.

export type Phase = 'acting' | 'right' | 'wrong' | 'revealed';

export type View = 'lesson' | 'skillIntro' | 'finish';

export interface PlayerState {
  index: number;
  /** The furthest screen reached: back and forward stop here. */
  furthest: number;
  phase: Phase;
  view: View;
  /** The choice in hand, on a screen of choices. */
  picked: string | null;
  /** Choices already tried and found wrong. */
  eliminated: readonly string[];
  /** What the last wrong answer was, for its feedback. */
  mistake: string | null;
  /** Tries on this screen. */
  attempts: number;
  /** Screens answered right the first time. */
  firstTry: readonly string[];
  /** Every checked screen that's been answered at all. */
  answered: readonly string[];
}

export type PlayerAction =
  | { type: 'pick'; id: string }
  | { type: 'verdict'; screenId: string; ok: true }
  | { type: 'verdict'; screenId: string; ok: false; mistake: string }
  | { type: 'tryAgain' }
  | { type: 'seeAnswer'; screenId: string; answer?: string }
  | { type: 'continue'; count: number; practiceFrom: number }
  | { type: 'startPractice' }
  | { type: 'back' }
  | { type: 'jump'; index: number };

export const initialPlayer = (index = 0): PlayerState => ({
  index,
  furthest: index,
  phase: 'acting',
  view: 'lesson',
  picked: null,
  eliminated: [],
  mistake: null,
  attempts: 0,
  firstTry: [],
  answered: [],
});

const onScreen = (state: PlayerState, index: number): PlayerState => ({
  ...state,
  index,
  furthest: Math.max(state.furthest, index),
  phase: 'acting',
  picked: null,
  eliminated: [],
  mistake: null,
  attempts: 0,
});

const once = (list: readonly string[], id: string) =>
  list.includes(id) ? list : [...list, id];

export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
): PlayerState {
  switch (action.type) {
    case 'pick':
      if (state.phase !== 'acting') return state;
      return { ...state, picked: action.id };
    case 'verdict':
      if (state.phase !== 'acting') return state;
      if (action.ok) {
        return {
          ...state,
          phase: 'right',
          mistake: null,
          attempts: state.attempts + 1,
          answered: once(state.answered, action.screenId),
          firstTry:
            state.attempts === 0
              ? once(state.firstTry, action.screenId)
              : state.firstTry,
        };
      }
      return {
        ...state,
        phase: 'wrong',
        mistake: action.mistake,
        attempts: state.attempts + 1,
        answered: once(state.answered, action.screenId),
        eliminated: state.picked
          ? once(state.eliminated, state.picked)
          : state.eliminated,
      };
    case 'tryAgain':
      return state.phase === 'wrong'
        ? { ...state, phase: 'acting', mistake: null, picked: null }
        : state;
    case 'seeAnswer':
      return state.phase === 'wrong'
        ? {
            ...state,
            phase: 'revealed',
            mistake: null,
            picked: action.answer ?? null,
          }
        : state;
    case 'continue': {
      const following = state.index + 1;
      if (following >= action.count) return { ...state, view: 'finish' };
      const next = onScreen(state, following);
      return following === action.practiceFrom
        ? { ...next, view: 'skillIntro' }
        : next;
    }
    case 'startPractice':
      return { ...state, view: 'lesson' };
    case 'back':
      return state.index > 0 ? onScreen(state, state.index - 1) : state;
    case 'jump':
      return action.index <= state.furthest
        ? onScreen(state, action.index)
        : state;
    default:
      return state;
  }
}

/** Whether the screen's result is showing, so that its controls hold still. */
export const isSettled = (phase: Phase) =>
  phase === 'right' || phase === 'revealed';
