import { describe, expect, it } from 'vitest';
import {
  buildReducer,
  currentStep,
  isBuilt,
  placedParts,
  showHint,
  startBuild,
  type BuildState,
} from '../buildGame';

const ORDER = [
  { term: 'body', parts: ['body'] },
  { term: 'neck', parts: ['neckShaft'] },
  { term: 'strings', parts: ['strings'] },
];

const press = (state: BuildState, part: string) =>
  buildReducer(state, { type: 'press', part });

describe('Build it', () => {
  it('asks for the steps in order', () => {
    let state = startBuild(ORDER);
    expect(currentStep(state)?.term).toBe('body');
    state = press(state, 'body');
    expect(currentStep(state)?.term).toBe('neck');
    expect(placedParts(state).has('body')).toBe(true);
    expect(isBuilt(state)).toBe(false);
  });

  it('a wrong press names itself, costs a try and places nothing', () => {
    const state = press(startBuild(ORDER), 'strings');
    expect(state.step).toBe(0);
    expect(state.tries).toBe(1);
    expect(state.misses).toBe(1);
    expect(state.wrong).toEqual({ part: 'strings', nonce: 1 });
    expect(placedParts(state).size).toBe(0);
  });

  it('pressing the same wrong part again shakes it again', () => {
    const once = press(startBuild(ORDER), 'strings');
    const twice = press(once, 'strings');
    expect(twice.wrong?.nonce).not.toBe(once.wrong?.nonce);
  });

  it('points out the part after two misses, and resets on the next step', () => {
    let state = press(startBuild(ORDER), 'strings');
    expect(showHint(state)).toBe(false);
    state = press(state, 'neckShaft');
    expect(showHint(state)).toBe(true);
    state = press(state, 'body');
    expect(showHint(state)).toBe(false);
    expect(state.wrong).toBeNull();
  });

  it('a part already home does not count', () => {
    const state = press(startBuild(ORDER), 'body');
    expect(press(state, 'body')).toBe(state);
  });

  it('finishes, counting tries, and ignores further presses', () => {
    let state = startBuild(ORDER);
    state = press(state, 'strings');
    for (const part of ['body', 'neckShaft', 'strings']) {
      state = press(state, part);
    }
    expect(isBuilt(state)).toBe(true);
    expect(currentStep(state)).toBeNull();
    expect(state.tries).toBe(4);
    expect(press(state, 'body')).toBe(state);
  });

  it('restarts, on a new guitar if given one', () => {
    const done = press(startBuild(ORDER), 'body');
    expect(buildReducer(done, { type: 'restart' }).step).toBe(0);
    const other = [{ term: 'back', parts: ['back'] }];
    const next = buildReducer(done, { type: 'restart', order: other });
    expect(next.order).toBe(other);
    expect(next.tries).toBe(0);
  });
});
