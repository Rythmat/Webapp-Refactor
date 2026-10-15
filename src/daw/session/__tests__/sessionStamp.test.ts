/**
 * Work that lands after an await (a boot link that loads first, a demo's
 * drums) lands only in the session it started in (sessionStamp.ts): not
 * after a load or reset, and not after a room was joined, created or left,
 * since a Join doesn't load yet.
 *
 * Run: npx vitest run src/daw/session/__tests__/sessionStamp.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setBridge } from '@/daw/collab/collabMiddleware';
import type { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import { useStore } from '@/daw/store';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '../sessionGeneration';
import { isSessionCurrent, stampSession } from '../sessionStamp';

/** A bridge to a room: what a join attaches, a new one for every join. */
const aBridge = () =>
  ({
    suppressStoreToYjs: false,
    syncToYjs: vi.fn(),
  }) as unknown as ZustandYjsBridge;

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

afterEach(() => {
  setBridge(null);
});

describe('a session stamp', () => {
  it('is current until something else happens', () => {
    const stamp = stampSession();
    useStore.getState().setProjectName('Edited, not replaced');

    expect(isSessionCurrent(stamp)).toBe(true);
  });

  it('is out of date once a load or reset starts a new generation', () => {
    const stamp = stampSession();
    bumpSessionGeneration('test');

    expect(isSessionCurrent(stamp)).toBe(false);
  });

  it('names an earlier generation when given one', () => {
    const generation = getSessionGeneration();
    bumpSessionGeneration('test');

    expect(isSessionCurrent(stampSession(generation))).toBe(false);
    expect(isSessionCurrent(stampSession())).toBe(true);
  });

  it('is out of date once a room is joined or created', () => {
    const stamp = stampSession();
    setBridge(aBridge());
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });

    expect(isSessionCurrent(stamp)).toBe(false);
  });

  it('is out of date once a room identity appears, before its bridge', () => {
    const stamp = stampSession();
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });

    expect(isSessionCurrent(stamp)).toBe(false);
  });

  it('is out of date once the room is joined again under the same name', () => {
    // A guest's identity kept from an earlier visit, then a Join of the
    // same room: the room's project comes in again.
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    const stamp = stampSession();
    setBridge(aBridge());

    expect(isSessionCurrent(stamp)).toBe(false);
  });

  it('is out of date once the room is left', () => {
    const bridge = aBridge();
    setBridge(bridge);
    useStore.setState({ roomId: 'room-1', collabRole: 'owner' });
    const stamp = stampSession();
    setBridge(null);
    useStore.setState({ roomId: null });

    expect(isSessionCurrent(stamp)).toBe(false);
  });
});
