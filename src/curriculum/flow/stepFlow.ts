// ── Demo, Practice, Perform ────────────────────────────────────────────────
// What an activity does by itself once it's open. Pure, so that every path through
// it can be tested without a sound.
//
//   armed ─▶ demo ─▶ toPractice ─▶ practice ─▶ toPerform ─▶ perform ─▶ done
//                                     │  ▲                       │
//                     nothing heard   ▼  │ again            pass ▼
//                                    held                     passed ─▶ the next step
//
// Pressing anything by hand turns it off for that step: from then on the student is
// driving. It never moves on from a practice that heard nothing. A pass moves on
// however the take was started, and the next step starts running itself again.

export type FlowStatus =
  | 'off'
  | 'armed'
  | 'demo'
  | 'toPractice'
  | 'practice'
  | 'held'
  | 'toPerform'
  | 'perform'
  | 'passed'
  | 'done';

export type FlowStage = 'demo' | 'practice' | 'perform';

export const FLOW_STAGES: readonly FlowStage[] = [
  'demo',
  'practice',
  'perform',
];

export interface FlowState {
  status: FlowStatus;
  /** Stop after the demo: a screen with something to hear and nothing to play. */
  demoOnly: boolean;
}

export type FlowAction =
  | { type: 'arm'; auto: boolean; demoOnly?: boolean }
  | { type: 'armElapsed' }
  | { type: 'start' }
  | { type: 'demoEnded' }
  | { type: 'transitionDone' }
  | { type: 'practiceEnded'; heard: boolean }
  | { type: 'practiceAgain' }
  | { type: 'performAgain' }
  | { type: 'performEnded' }
  | { type: 'takePassed' }
  | { type: 'passOver' }
  | { type: 'skip' }
  | { type: 'takeOver' };

export const initialFlow: FlowState = { status: 'off', demoOnly: false };

const NEXT: Partial<Record<FlowStatus, FlowStatus>> = {
  armed: 'toPractice',
  demo: 'toPractice',
  toPractice: 'practice',
  practice: 'toPerform',
  held: 'toPerform',
  toPerform: 'perform',
};

function skipFrom(state: FlowState): FlowState {
  const next = NEXT[state.status];
  if (!next) return state;
  // With nothing to play afterwards, skipping the demo is the end of it.
  return {
    ...state,
    status: next === 'toPractice' && state.demoOnly ? 'off' : next,
  };
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  const to = (status: FlowStatus): FlowState => ({ ...state, status });
  switch (action.type) {
    case 'arm':
      return {
        status: action.auto ? 'armed' : 'off',
        demoOnly: action.demoOnly ?? false,
      };
    case 'armElapsed':
      return state.status === 'armed' ? to('demo') : state;
    case 'start':
      return to('demo');
    case 'demoEnded':
      if (state.status !== 'demo') return state;
      return to(state.demoOnly ? 'off' : 'toPractice');
    case 'transitionDone':
      if (state.status === 'toPractice') return to('practice');
      if (state.status === 'toPerform') return to('perform');
      return state;
    case 'practiceEnded':
      if (state.status !== 'practice') return state;
      return to(action.heard ? 'toPerform' : 'held');
    case 'practiceAgain':
      return state.status === 'held' ? to('practice') : state;
    case 'performAgain':
      return to('toPerform');
    case 'performEnded':
      return state.status === 'perform' ? to('done') : state;
    case 'takePassed':
      return to('passed');
    case 'passOver':
      return state.status === 'passed' ? to('done') : state;
    case 'skip':
      return skipFrom(state);
    case 'takeOver':
      return to('off');
    default:
      return state;
  }
}

/** The stage a running flow is at; null when it isn't running. */
export function stageOf(status: FlowStatus): FlowStage | null {
  switch (status) {
    case 'armed':
    case 'demo':
      return 'demo';
    case 'toPractice':
    case 'practice':
    case 'held':
      return 'practice';
    case 'toPerform':
    case 'perform':
    case 'passed':
    case 'done':
      return 'perform';
    default:
      return null;
  }
}

/** How long a pass stays up: long enough to read what it says, and no longer. */
export function passHoldMs(detail?: string | null): number {
  const words = detail?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return Math.min(6000, Math.max(2200, 1000 + words * 200));
}

/** The change of stage on show right now, if there is one. */
export const transitionOf = (status: FlowStatus): FlowStage | null =>
  status === 'toPractice'
    ? 'practice'
    : status === 'toPerform'
      ? 'perform'
      : null;
