// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Presence publishing (collab-02, engine-hooks-15) ──────────────────────
// The presence sync subscribed with a selector that built a new object and
// no equality function, so EVERY store write (the playhead's ~30 a second, a
// peer's presence landing in remoteUsers) re-published presence with a fresh
// lastActiveAt. Each publish reached every peer, whose own store write
// published back: an endless loop that re-rendered every editor in the room.
// Now only a selection change publishes, and lastActiveAt goes out at most
// every 10 s, after activity, on a timer that runs only while in a room.
//
// The fake provider keeps just what this needs: an awareness that holds the
// local state and logs every setLocalState, as y-protocols' would broadcast.

const h = vi.hoisted(() => {
  type Presence = Record<string, unknown>;

  class FakeAwareness {
    clientID = 7;
    state: Presence | null = null;
    /** Every state published, in order. */
    published: Presence[] = [];
    setLocalState(next: Presence | null) {
      this.state = next;
      if (next) this.published.push(next);
    }
    getLocalState() {
      return this.state;
    }
    getStates() {
      return new Map<number, Presence>();
    }
    on() {}
  }

  class FakeProvider {
    ws = null;
    shouldConnect = false;
    awareness = new FakeAwareness();
    constructor() {
      state.providers.push(this);
    }
    on() {}
    connect() {}
    destroy() {}
  }

  const state = { providers: [] as FakeProvider[] };
  return { state, FakeProvider };
});

vi.mock('y-partykit/provider', () => ({ default: h.FakeProvider }));
vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: class {
    destroy() {}
  },
}));
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ getAccessTokenSilently: async () => 'tok' }),
}));
vi.mock('@/auth/devBypass', () => ({ DEV_AUTH_BYPASS: false }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userId: 'u1', appUser: null, token: 'ctx-token' }),
}));
vi.mock('@/components/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { useStore } from '@/daw/store';
import { CollabProvider, useCollab } from '../CollabProvider';
import type { UserPresence } from '../types';

const REFRESH_MS = 10_000;

let collab: ReturnType<typeof useCollab>;
function Harness() {
  collab = useCollab();
  return null;
}

const s = () => useStore.getState();
const awareness = () =>
  h.state.providers[h.state.providers.length - 1].awareness;
const published = () => awareness().published as unknown as UserPresence[];

function joinRoom() {
  render(
    <CollabProvider>
      <Harness />
    </CollabProvider>,
  );
  act(() => collab.joinRoomById('room1', 'editor'));
}

/** A peer's presence landing in the store, as onAwarenessChange writes it. */
const peerUpdate = (selectedTrackId: string | null) =>
  s()._setRemoteUsers(
    new Map([
      [
        9,
        {
          userId: 'u2',
          userName: 'Sam',
          avatarUrl: '',
          color: '#f00',
          selectedTrackId,
          selectedClipId: null,
          cursorTick: null,
          cursorTrackIndex: null,
          pianoRollCursor: null,
          activity: 'idle',
          lastActiveAt: Date.now(),
        },
      ],
    ]),
  );

beforeEach(() => {
  vi.useFakeTimers();
  h.state.providers.length = 0;
  s()._clearCollab();
  useStore.setState({
    selectedTrackId: null,
    selectedClipId: null,
    editingClipId: null,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('what publishes presence', () => {
  it('neither the playhead nor a peer’s presence', () => {
    joinRoom();
    const before = published().length;

    for (let tick = 0; tick < 3000; tick += 100) s().setPosition(tick);
    peerUpdate('t9');
    peerUpdate(null);

    expect(published()).toHaveLength(before);
  });

  it('a selection change, once, without a new lastActiveAt', () => {
    joinRoom();
    const joined = published().at(-1)!;

    act(() => s().setSelectedTrackId('t1'));
    s().setPosition(480);
    useStore.setState({ editingClipId: 'c1' });

    const [selected, editing] = published().slice(-2);
    expect(published()).toHaveLength(3);
    expect(selected).toMatchObject({
      selectedTrackId: 't1',
      activity: 'idle',
      lastActiveAt: joined.lastActiveAt,
    });
    expect(editing).toMatchObject({
      selectedTrackId: 't1',
      activity: 'editing',
    });
  });

  it('starts from the selection already made', () => {
    useStore.setState({ selectedTrackId: 't1', editingClipId: 'c1' });
    joinRoom();
    expect(published()[0]).toMatchObject({
      userId: 'u1',
      selectedTrackId: 't1',
      activity: 'editing',
    });
  });
});

describe('lastActiveAt', () => {
  it('goes out within 10 s of activity, once', () => {
    joinRoom();
    vi.advanceTimersByTime(2_000);
    const activeAt = Date.now();
    s().setSelectedTrackId('t1');
    const afterSelect = published().length;

    vi.advanceTimersByTime(REFRESH_MS);
    expect(published()).toHaveLength(afterSelect + 1);
    expect(published().at(-1)).toMatchObject({
      selectedTrackId: 't1',
      lastActiveAt: activeAt,
    });

    // Idle: nothing more, however long.
    vi.advanceTimersByTime(REFRESH_MS * 6);
    expect(published()).toHaveLength(afterSelect + 1);
  });

  it('is never sent for an idle user', () => {
    joinRoom();
    const joined = published().length;
    vi.advanceTimersByTime(REFRESH_MS * 6);
    expect(published()).toHaveLength(joined);
  });

  it('has no timer outside a room', () => {
    render(
      <CollabProvider>
        <Harness />
      </CollabProvider>,
    );
    expect(vi.getTimerCount()).toBe(0);

    act(() => collab.joinRoomById('room1', 'editor'));
    expect(vi.getTimerCount()).toBe(1);

    act(() => collab.leaveRoom());
    expect(vi.getTimerCount()).toBe(0);
  });
});
