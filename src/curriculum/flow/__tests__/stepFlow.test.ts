import { describe, expect, it } from 'vitest';
import {
  flowReducer,
  initialFlow,
  passHoldMs,
  stageOf,
  transitionOf,
  type FlowAction,
  type FlowState,
  type FlowStatus,
} from '../stepFlow';

const at = (status: FlowStatus, demoOnly = false): FlowState => ({
  status,
  demoOnly,
});
const run = (state: FlowState, ...actions: FlowAction[]) =>
  actions.reduce(flowReducer, state);

describe('an activity running itself', () => {
  it('goes all the way through', () => {
    const steps: [FlowAction, FlowStatus][] = [
      [{ type: 'arm', auto: true }, 'armed'],
      [{ type: 'armElapsed' }, 'demo'],
      [{ type: 'demoEnded' }, 'toPractice'],
      [{ type: 'transitionDone' }, 'practice'],
      [{ type: 'practiceEnded', heard: true }, 'toPerform'],
      [{ type: 'transitionDone' }, 'perform'],
      [{ type: 'performEnded' }, 'done'],
    ];
    let state = initialFlow;
    for (const [action, expected] of steps) {
      state = flowReducer(state, action);
      expect(state.status).toBe(expected);
    }
  });

  it('shows a pass, however the take was started, then it’s over', () => {
    for (const from of ['perform', 'off', 'done'] as const) {
      const passed = flowReducer(at(from), { type: 'takePassed' });
      expect(passed.status).toBe('passed');
      expect(flowReducer(passed, { type: 'passOver' }).status).toBe('done');
    }
    expect(stageOf('passed')).toBe('perform');
    expect(transitionOf('passed')).toBeNull();
  });

  it('leaves a take that’s still to pass alone', () => {
    expect(flowReducer(at('off'), { type: 'passOver' }).status).toBe('off');
    expect(flowReducer(at('passed'), { type: 'skip' }).status).toBe('passed');
    expect(flowReducer(at('passed'), { type: 'takeOver' }).status).toBe('off');
  });

  it('holds a pass long enough to read it, within limits', () => {
    expect(passHoldMs()).toBe(2200);
    expect(passHoldMs('Nice.')).toBe(2200);
    expect(passHoldMs(Array(12).fill('word').join(' '))).toBe(3400);
    expect(passHoldMs(Array(200).fill('word').join(' '))).toBe(6000);
  });

  it('stays off when it isn’t allowed to start', () => {
    expect(flowReducer(initialFlow, { type: 'arm', auto: false }).status).toBe(
      'off',
    );
  });

  it('starts over on a new step, from wherever it was', () => {
    expect(flowReducer(at('perform'), { type: 'arm', auto: true }).status).toBe(
      'armed',
    );
  });

  it('starts from a press, when sound had to wait for one', () => {
    expect(flowReducer(at('off'), { type: 'start' }).status).toBe('demo');
  });

  it('stops after the demo on a screen with nothing to play', () => {
    const armed = flowReducer(initialFlow, {
      type: 'arm',
      auto: true,
      demoOnly: true,
    });
    expect(
      run(armed, { type: 'armElapsed' }, { type: 'demoEnded' }).status,
    ).toBe('off');
    expect(flowReducer(at('demo', true), { type: 'skip' }).status).toBe('off');
  });
});

describe('a practice that heard nothing', () => {
  it('waits instead of moving on', () => {
    const held = flowReducer(at('practice'), {
      type: 'practiceEnded',
      heard: false,
    });
    expect(held.status).toBe('held');
  });

  it('can go round again, and then on', () => {
    const again = flowReducer(at('held'), { type: 'practiceAgain' });
    expect(again.status).toBe('practice');
    expect(
      flowReducer(again, { type: 'practiceEnded', heard: true }).status,
    ).toBe('toPerform');
  });

  it('can skip to Perform', () => {
    expect(flowReducer(at('held'), { type: 'skip' }).status).toBe('toPerform');
  });
});

describe('pressing something by hand', () => {
  it.each<FlowStatus>([
    'armed',
    'demo',
    'toPractice',
    'practice',
    'held',
    'toPerform',
    'perform',
  ])('ends the run from %s', (status) => {
    expect(flowReducer(at(status), { type: 'takeOver' }).status).toBe('off');
  });

  it('ignores anything that arrives afterwards', () => {
    const off = at('off');
    for (const action of [
      { type: 'armElapsed' },
      { type: 'demoEnded' },
      { type: 'transitionDone' },
      { type: 'practiceEnded', heard: true },
      { type: 'performEnded' },
    ] as FlowAction[]) {
      expect(flowReducer(off, action).status).toBe('off');
    }
  });
});

describe('skipping', () => {
  it.each<[FlowStatus, FlowStatus]>([
    ['armed', 'toPractice'],
    ['demo', 'toPractice'],
    ['toPractice', 'practice'],
    ['practice', 'toPerform'],
    ['toPerform', 'perform'],
    ['perform', 'perform'],
    ['off', 'off'],
  ])('from %s goes to %s', (from, to) => {
    expect(flowReducer(at(from), { type: 'skip' }).status).toBe(to);
  });
});

describe('trying again', () => {
  it('goes straight back to Perform, from anywhere', () => {
    for (const status of ['done', 'off', 'practice'] as FlowStatus[]) {
      expect(flowReducer(at(status), { type: 'performAgain' }).status).toBe(
        'toPerform',
      );
    }
  });
});

describe('what the rail shows', () => {
  it.each<[FlowStatus, string | null]>([
    ['off', null],
    ['armed', 'demo'],
    ['demo', 'demo'],
    ['toPractice', 'practice'],
    ['held', 'practice'],
    ['toPerform', 'perform'],
    ['done', 'perform'],
  ])('%s is %s', (status, stage) => {
    expect(stageOf(status)).toBe(stage);
  });

  it('only has a transition on show between stages', () => {
    expect(transitionOf('toPractice')).toBe('practice');
    expect(transitionOf('toPerform')).toBe('perform');
    expect(transitionOf('practice')).toBeNull();
  });
});
