/**
 * When replacing the project would reach a room (sharedSession.ts): while a
 * room is joined, and while a guest's room may still take the project back.
 * Not once a room the student hosted has closed, which nothing rejoins.
 *
 * Run: npx vitest run src/daw/session/__tests__/sharedSession.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setBridge } from '@/daw/collab/collabMiddleware';
import type { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import { useStore } from '@/daw/store';
import { inSharedSession } from '../sharedSession';

const attachBridge = () =>
  setBridge({
    suppressStoreToYjs: false,
    syncToYjs: vi.fn(),
  } as unknown as ZustandYjsBridge);

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

afterEach(() => {
  setBridge(null);
});

describe('a shared session', () => {
  it('is not one with no room', () => {
    expect(inSharedSession()).toBe(false);
  });

  it.each(['owner', 'editor', 'viewer'] as const)(
    'is one while a room is joined, as its %s',
    (role) => {
      attachBridge();
      useStore.setState({ roomId: 'room-1', collabRole: role });
      expect(inSharedSession()).toBe(true);
    },
  );

  it.each(['editor', 'viewer'] as const)(
    'is one while a guest (%s) has a room to rejoin',
    (role) => {
      useStore.setState({ roomId: 'room-1', collabRole: role });
      expect(inSharedSession()).toBe(true);
    },
  );

  it('is not one once a room its host left has closed', () => {
    useStore.setState({ roomId: 'room-1', collabRole: 'owner' });
    expect(inSharedSession()).toBe(false);
  });
});
