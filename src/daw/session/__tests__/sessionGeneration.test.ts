import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bumpSessionGeneration,
  getSessionGeneration,
  onSessionGeneration,
} from '../sessionGeneration';

// ── The session generation (milestone 1.3, audio-core-08) ─────────────────
// Every load or reset bumps it first; caches keyed by track id (the Oracle
// patch cache, the TrackEngine registry, the synth panel's bridge) listen, so
// a track id the next project reuses never reads the previous project's entry.

const stops: Array<() => void> = [];
const listen = (listener: (gen: number, reason: string) => void) => {
  stops.push(onSessionGeneration(listener));
};

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
});

describe('bumpSessionGeneration', () => {
  it('moves the generation on and returns the new one', () => {
    const before = getSessionGeneration();
    const next = bumpSessionGeneration('test');
    expect(next).toBe(before + 1);
    expect(getSessionGeneration()).toBe(next);
  });

  it('runs every listener, in order, before it returns', () => {
    const heard: string[] = [];
    listen((gen, reason) => heard.push(`first ${gen} ${reason}`));
    listen((gen, reason) => heard.push(`second ${gen} ${reason}`));

    const gen = bumpSessionGeneration('cloud-open');
    expect(heard).toEqual([
      `first ${gen} cloud-open`,
      `second ${gen} cloud-open`,
    ]);
  });

  it('lets a loader seed after the bump: a cache cleared by a listener stays seeded', () => {
    const cache = new Map([['t1', 'old project']]);
    listen(() => cache.clear());

    bumpSessionGeneration('restore');
    cache.set('t1', 'new project');
    expect(cache.get('t1')).toBe('new project');
  });

  it('still runs the other listeners when one throws, and logs it', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const later = vi.fn();
    listen(() => {
      throw new Error('cache failed to clear');
    });
    listen(later);

    const gen = bumpSessionGeneration('new');
    expect(later).toHaveBeenCalledWith(gen, 'new');
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe('onSessionGeneration', () => {
  it('stops calling a listener once unsubscribed', () => {
    const listener = vi.fn();
    const stop = onSessionGeneration(listener);
    bumpSessionGeneration('first');
    stop();
    bumpSessionGeneration('second');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('lets a listener unsubscribe while the bump runs', () => {
    const order: string[] = [];
    let stopFirst = () => {};
    stopFirst = onSessionGeneration(() => {
      order.push('first');
      stopFirst();
    });
    listen(() => order.push('second'));

    bumpSessionGeneration('one');
    bumpSessionGeneration('two');
    expect(order).toEqual(['first', 'second', 'second']);
  });
});
