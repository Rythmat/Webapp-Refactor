// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import {
  lastGlobeStopHref,
  readLastGlobeStop,
  rememberGlobeStop,
} from './lastGlobeStop';

/** The Globe remembers each person's last place or tour (owner, 2026-11-12). */

afterEach(() => {
  window.localStorage.clear();
  setLocalStoreUser(undefined);
  vi.restoreAllMocks();
});

describe('the last Globe stop', () => {
  it('is kept per person, and opens the same stop again', () => {
    setLocalStoreUser('ana');
    rememberGlobeStop('?event=e1', 'Soul Makossa');
    const stop = readLastGlobeStop();
    expect(stop).toMatchObject({ search: '?event=e1', title: 'Soul Makossa' });
    expect(lastGlobeStopHref(stop!)).toBe('/globe?event=e1');
    // Someone else on this device has none of Ana's.
    setLocalStoreUser('ben');
    expect(readLastGlobeStop()).toBeNull();
    setLocalStoreUser('ana');
    expect(readLastGlobeStop()?.title).toBe('Soul Makossa');
  });

  it('keeps the stop’s picture, when it has one', () => {
    setLocalStoreUser('ana');
    rememberGlobeStop('?event=e1', 'Soul Makossa', '/poster.jpg');
    expect(readLastGlobeStop()?.image).toBe('/poster.jpg');
    rememberGlobeStop('?city=lagos', 'Lagos');
    expect(readLastGlobeStop()).not.toHaveProperty('image');
  });

  it('keeps nothing before it knows whose it is', () => {
    rememberGlobeStop('?event=e1', 'Soul Makossa');
    setLocalStoreUser('ana');
    expect(readLastGlobeStop()).toBeNull();
  });

  it('carries on when storage refuses', () => {
    setLocalStoreUser('ana');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => rememberGlobeStop('?event=e1', 'x')).not.toThrow();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLastGlobeStop()).toBeNull();
  });

  it('reads back only what it wrote', () => {
    setLocalStoreUser('ana');
    window.localStorage.setItem('ma:globe:last:v1:ana', '{"search":"x"}');
    expect(readLastGlobeStop()).toBeNull();
  });
});
