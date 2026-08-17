// @vitest-environment jsdom
// jsdom has no IndexedDB, so this exercises the synchronous localStorage
// fallback path — the one that must stay behavior-identical to the old stores.
import { describe, expect, it, vi } from 'vitest';
import { getIdbMirror } from '../idbMirror';

describe('getIdbMirror — no-IndexedDB fallback path', () => {
  it('reads via readLegacy, writes via writeLegacy, and notifies subscribers', () => {
    let backing = { v: 0 };
    const readLegacy = vi.fn(() => backing);
    const writeLegacy = vi.fn((value: { v: number }) => {
      backing = value;
    });
    const clearLegacy = vi.fn();

    const mirror = getIdbMirror({
      key: 'test:idb-mirror:a',
      readLegacy,
      writeLegacy,
      clearLegacy,
    });

    expect(mirror.read()).toEqual({ v: 0 });

    let notified = 0;
    const unsubscribe = mirror.subscribe(() => {
      notified += 1;
    });

    mirror.write({ v: 5 });
    expect(writeLegacy).toHaveBeenCalledWith({ v: 5 });
    expect(mirror.read()).toEqual({ v: 5 });
    expect(notified).toBe(1);
    // clearLegacy only runs when migrating to IDB — never on the fallback path.
    expect(clearLegacy).not.toHaveBeenCalled();

    unsubscribe();
    mirror.write({ v: 9 });
    expect(notified).toBe(1); // no longer subscribed
  });

  it('returns the same cached instance for a repeated key', () => {
    const cfg = {
      key: 'test:idb-mirror:b',
      readLegacy: () => 1,
      writeLegacy: () => {},
      clearLegacy: () => {},
    };
    expect(getIdbMirror(cfg)).toBe(getIdbMirror(cfg));
  });
});
