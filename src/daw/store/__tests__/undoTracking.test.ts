import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../index';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '../undoMiddleware';

// ── Undo auto-capture (shell-06, ia-flows-10, state-reload-07) ─────────────
// Every editor mount used to add another 15 store listeners and none were
// ever removed, and each listener serialised the whole project before its
// cheap reference check, so every fader or clip-drag move paid for a full
// JSON.stringify once per visit to the editor. Tracking is now one set of
// listeners with a release, and the JSON is built once the edits settle.

const s = () => useStore.getState();
/** Past the 300 ms debounce, so a settled edit has been captured. */
const settle = () => vi.advanceTimersByTime(1000);

const claims: Array<() => void> = [];
const track = () => {
  const release = initUndoTracking();
  claims.push(release);
  return release;
};

let keys = '';

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  resetUndoHistory();
});

afterEach(() => {
  for (const release of claims.splice(0)) release();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('one set of listeners', () => {
  it('a second editor mount adds none', () => {
    const subscribe = vi.spyOn(useStore, 'subscribe');
    track();
    const first = subscribe.mock.calls.length;
    expect(first).toBeGreaterThan(0);
    track();
    expect(subscribe.mock.calls.length).toBe(first);
  });

  it('an edit is one undo step with two editors mounted', () => {
    track();
    track();
    s().updateTrack(keys, { volume: 0.3 });
    settle();

    expect(undo()).toBe(true);
    expect(s().tracks[0].volume).not.toBe(0.3);
    expect(canUndo()).toBe(false);
  });

  it('stays on while any mount still holds it', () => {
    const first = track();
    track();
    first();
    first(); // a repeated cleanup releases nothing more

    s().updateTrack(keys, { volume: 0.3 });
    settle();
    expect(canUndo()).toBe(true);
  });

  it('stops once every mount has released it', () => {
    const first = track();
    const second = track();
    first();
    second();

    s().updateTrack(keys, { volume: 0.3 });
    settle();
    expect(canUndo()).toBe(false);
  });

  it('starts again on the store as it is: work done meanwhile is no undo step', () => {
    track()();
    // A project opened while no editor was mounted.
    s().updateTrack(keys, { volume: 0.3 });
    track();
    settle();
    expect(canUndo()).toBe(false);

    s().updateTrack(keys, { volume: 0.6 });
    settle();
    expect(undo()).toBe(true);
    expect(s().tracks[0].volume).toBe(0.3);
  });

  it('keeps an edit still settling when the editor closes', () => {
    const release = track();
    s().updateTrack(keys, { volume: 0.3 });
    release();
    settle();

    expect(canUndo()).toBe(true);
    undo();
    expect(s().tracks[0].volume).not.toBe(0.3);
  });
});

describe('what an edit costs', () => {
  it('a drag serialises the project once, after it settles', () => {
    track();
    const stringify = vi.spyOn(JSON, 'stringify');

    // A fader drag: one tracks write per pointer move.
    for (let i = 1; i <= 30; i++) {
      s().updateTrack(keys, { volume: i / 40 });
      vi.advanceTimersByTime(16);
    }
    expect(stringify).not.toHaveBeenCalled();

    settle();
    expect(stringify).toHaveBeenCalledTimes(1);
    // The whole gesture is one step.
    expect(undo()).toBe(true);
    expect(canUndo()).toBe(false);
  });

  it('playback writes cost nothing', () => {
    track();
    const stringify = vi.spyOn(JSON, 'stringify');
    for (let tick = 0; tick < 3000; tick += 100) s().setPosition(tick);
    settle();
    expect(stringify).not.toHaveBeenCalled();
    expect(canUndo()).toBe(false);
  });

  it('never clones the marks to find a change', () => {
    track();
    const clone = vi.spyOn(globalThis, 'structuredClone');
    useStore.setState({ scoreSlurs: ['a|b'] });
    s().updateTrack(keys, { volume: 0.3 });
    settle();
    expect(clone).not.toHaveBeenCalled();
    expect(canUndo()).toBe(true);
  });

  it('a mark edit is still an undo step', () => {
    track();
    useStore.setState({ scoreSlurs: ['a|b'] });
    settle();
    expect(undo()).toBe(true);
    expect(s().scoreSlurs).toEqual([]);
  });
});
