// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

// ── CollabProvider connection lifecycle ───────────────────────────────────
// collab-04: server messages must be heard on every socket, not just the first.
// collab-05: a room that turned us away must be torn down, not re-knocked ~10×/s.
// collab-16 (client half): every (re)connect presents a fresh token and the
// doc schema version, and the handshake's close codes are honoured.
//
// The fake provider mirrors what y-partykit 0.0.33's YPartyKitProvider does:
// connect() resolves `params` (sync or async) and then opens a socket,
// announcing it with status 'connecting' right after assigning `ws`; a close
// emits 'connection-close' and, while `shouldConnect` is true, schedules its own
// reopen ~100 ms later with the previous URL. destroy() drops all observers.

const h = vi.hoisted(() => {
  type Listener = (...args: never[]) => void;

  class FakeSocket extends EventTarget {
    readyState = 0;
    constructor(public url: string) {
      super();
    }
    send() {}
    close() {
      this.readyState = 3;
    }
  }

  const state = {
    providers: [] as FakeProvider[],
    sockets: [] as FakeSocket[],
    getAccessTokenSilently: null as unknown as Mock<
      (options?: unknown) => Promise<string>
    >,
    showError: null as unknown as Mock<(message: string) => void>,
  };

  class FakeProvider {
    ws: FakeSocket | null = null;
    shouldConnect = false;
    destroyed = false;
    /** Sockets y-partykit's own reconnect timer would have opened. */
    internalReconnects = 0;
    /** The params of each connect(), in order. */
    paramsLog: Record<string, string | null | undefined>[] = [];
    awareness = {
      clientID: 7,
      setLocalState: () => {},
      getLocalState: () => null,
      getStates: () => new Map(),
      on: () => {},
    };
    private observers = new Map<string, Set<Listener>>();

    constructor(
      _host: string,
      _room: string,
      _doc: unknown,
      public options: { connect?: boolean; params?: unknown },
    ) {
      state.providers.push(this);
      if (options.connect !== false) this.connect();
    }

    on(name: string, f: Listener) {
      if (!this.observers.has(name)) this.observers.set(name, new Set());
      this.observers.get(name)!.add(f);
    }

    emit(name: string, args: unknown[]) {
      for (const f of [...(this.observers.get(name) ?? [])]) {
        (f as (...a: unknown[]) => void)(...args);
      }
    }

    connect() {
      const params = this.options.params;
      void Promise.resolve(
        typeof params === 'function' ? params() : params,
      ).then((next: Record<string, string | null | undefined>) => {
        this.paramsLog.push(next);
        this.shouldConnect = true;
        if (this.ws === null) this.setupWS(next);
      });
    }

    private setupWS(params: Record<string, string | null | undefined>) {
      if (!this.shouldConnect || this.ws !== null) return;
      const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null) as [
          string,
          string,
        ][],
      );
      const ws = new FakeSocket(`ws://party/studio?${query}`);
      this.ws = ws;
      state.sockets.push(ws);
      this.emit('status', [{ status: 'connecting' }]);
    }

    destroy() {
      this.destroyed = true;
      this.shouldConnect = false;
      this.observers.clear();
      this.ws?.close();
      this.ws = null;
    }

    // ── What the server does ──

    open() {
      this.ws!.readyState = 1;
      this.emit('status', [{ status: 'connected' }]);
    }

    sync() {
      this.emit('sync', [true]);
    }

    send(message: object) {
      this.ws!.dispatchEvent(
        new MessageEvent('message', { data: JSON.stringify(message) }),
      );
    }

    close(code: number, reason = '') {
      const last = this.paramsLog[this.paramsLog.length - 1];
      this.emit('connection-close', [{ code, reason }]);
      this.ws = null;
      setTimeout(() => {
        if (this.shouldConnect && this.ws === null) {
          this.internalReconnects += 1;
          this.setupWS(last);
        }
      }, 100);
    }
  }

  return { state, FakeProvider };
});

vi.mock('y-partykit/provider', () => ({ default: h.FakeProvider }));
vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: class {
    destroy() {}
  },
}));
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ getAccessTokenSilently: h.state.getAccessTokenSilently }),
}));
vi.mock('@/auth/devBypass', () => ({ DEV_AUTH_BYPASS: false }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userId: 'u1', appUser: null, token: 'ctx-token' }),
}));
vi.mock('@/components/utils/toast', () => ({
  showError: (message: string) => h.state.showError(message),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { useStore } from '@/daw/store';
import { CollabProvider, useCollab } from '../CollabProvider';
import {
  COLLAB_CLOSE,
  COLLAB_DOC_SCHEMA_PARAM,
  COLLAB_DOC_SCHEMA_VERSION,
  versionMismatchReason,
} from '../types';

// First reconnect after a dropped socket (CollabProvider RECONNECT_BASE_MS),
// the longest wait between reconnects (RECONNECT_MAX_MS), and how long a
// jam→studio joiner waits for the host (AWAIT_HOST_TIMEOUT_MS).
const RECONNECT_FIRST_DELAY = 100;
const RECONNECT_MAX_DELAY = 2_500;
const AWAIT_HOST_TIMEOUT = 20_000;

let collab: ReturnType<typeof useCollab>;
function Harness() {
  collab = useCollab();
  return null;
}

/** Run timers (and the promise jobs between them) inside act. */
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const lastProvider = () => h.state.providers[h.state.providers.length - 1];

const renderProvider = () =>
  render(
    <CollabProvider>
      <Harness />
    </CollabProvider>,
  );

async function joinAsEditor(roomId = 'room1') {
  renderProvider();
  act(() => collab.joinRoomById(roomId, 'editor'));
  await advance(0); // params resolve → the first socket opens
  return lastProvider();
}

beforeEach(() => {
  vi.useFakeTimers();
  h.state.providers.length = 0;
  h.state.sockets.length = 0;
  let issued = 0;
  h.state.getAccessTokenSilently = vi.fn(
    async (_options?: unknown) => `tok-${(issued += 1)}`,
  );
  h.state.showError = vi.fn<(message: string) => void>();
  useStore.getState()._clearCollab();
  useStore.getState().setProjectId(null);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('connect params', () => {
  it('present a fresh token and the doc schema version on every (re)connect', async () => {
    const provider = await joinAsEditor();
    expect(provider.paramsLog[0]).toMatchObject({
      role: 'editor',
      token: 'tok-1',
      [COLLAB_DOC_SCHEMA_PARAM]: '1',
    });

    provider.open();
    provider.sync();
    act(() => provider.close(1006)); // Wi-Fi blip
    await advance(RECONNECT_FIRST_DELAY);

    expect(provider.paramsLog).toHaveLength(2);
    expect(provider.paramsLog[1].token).toBe('tok-2');
    expect(h.state.sockets[1].url).toContain('token=tok-2');
    // y-partykit's own reopen (stale URL and token) never ran.
    await advance(5_000);
    expect(provider.internalReconnects).toBe(0);
  });
});

describe('server messages (collab-04)', () => {
  it('are heard on a socket opened by a reconnect', async () => {
    const provider = await joinAsEditor();
    provider.open();
    provider.sync();
    act(() => provider.close(1006));
    await advance(RECONNECT_FIRST_DELAY);
    expect(h.state.sockets).toHaveLength(2);

    provider.open();
    act(() => provider.send({ type: 'room:closing' }));

    const s = useStore.getState();
    expect(s.leavePromptPending).toBe(true);
    // Torn down, but the room identity stays for the prompt's Leave path.
    expect(provider.destroyed).toBe(true);
    expect(s.roomId).toBe('room1');
  });
});

describe('the host hearing room:closing', () => {
  // The server held a dead socket of the host's after a network blip, closed
  // the room when it finally timed that socket out, and told the host's live
  // socket too.
  it('reconnects on the same document and is host again, instead of going idle', async () => {
    renderProvider();
    act(() => collab.createAndJoinRoom());
    await advance(0);
    const provider = lastProvider();
    provider.open();
    provider.sync();
    const { roomId } = useStore.getState();

    act(() =>
      provider.send({ type: 'room:closing', reason: 'host_disconnected' }),
    );
    act(() => provider.close(COLLAB_CLOSE.hostLeft));

    expect(provider.destroyed).toBe(false);
    expect(useStore.getState().leavePromptPending).toBe(false);
    await advance(RECONNECT_FIRST_DELAY);
    expect(h.state.sockets).toHaveLength(2);
    expect(h.state.sockets[1].url).toContain('role=owner');

    provider.open();
    act(() => provider.sync());
    const s = useStore.getState();
    expect(s.connectionStatus).toBe('connected');
    expect(s.roomId).toBe(roomId);
    expect(s.collabRole).toBe('owner');
    // The same provider and doc: re-forming the room merges cleanly.
    expect(h.state.providers).toHaveLength(1);
  });
});

describe('dead rooms (collab-05)', () => {
  it('room:full tears the provider down and nothing reconnects', async () => {
    const provider = await joinAsEditor();
    provider.open();
    act(() => provider.send({ type: 'room:full', reason: 'capacity' }));
    act(() => provider.close(COLLAB_CLOSE.full));
    await advance(10_000);

    expect(provider.destroyed).toBe(true);
    expect(h.state.sockets).toHaveLength(1);
    expect(h.state.providers).toHaveLength(1);
    const s = useStore.getState();
    expect(s.roomError).toMatch(/full/);
    // Forgotten, so an SPA return doesn't knock again.
    expect(s.roomId).toBeNull();
  });

  it('room:not-found ends a plain join', async () => {
    const provider = await joinAsEditor();
    provider.open();
    act(() => provider.send({ type: 'room:not-found', reason: 'no_host' }));
    act(() => provider.close(COLLAB_CLOSE.notFound));
    await advance(10_000);

    expect(provider.destroyed).toBe(true);
    expect(h.state.sockets).toHaveLength(1);
    expect(useStore.getState().roomError).toMatch(/not active/);
    expect(useStore.getState().roomId).toBeNull();
  });

  it('room:not-found while awaiting the host retries once a second, not in a tight loop', async () => {
    renderProvider();
    act(() => collab.joinRoomAwaitingHost('room1'));
    await advance(0);
    const first = lastProvider();
    first.open();
    act(() => first.send({ type: 'room:not-found', reason: 'no_host' }));
    act(() => first.close(COLLAB_CLOSE.notFound));

    expect(first.destroyed).toBe(true);
    expect(useStore.getState().awaitingSessionCreation).toBe(true);
    await advance(999);
    expect(h.state.providers).toHaveLength(1);
    await advance(1);
    await advance(0);
    expect(h.state.providers).toHaveLength(2);
    expect(h.state.sockets).toHaveLength(2);
  });

  it('waiting for the host ends at the deadline when the server never answers', async () => {
    renderProvider();
    act(() => collab.joinRoomAwaitingHost('room1'));
    await advance(0);
    const provider = lastProvider();

    // Offline: every socket fails before it opens, and each one reconnects.
    for (let elapsed = 0; elapsed < AWAIT_HOST_TIMEOUT - 2_500; ) {
      if (provider.ws) act(() => provider.close(1006));
      await advance(RECONNECT_MAX_DELAY);
      elapsed += RECONNECT_MAX_DELAY;
    }
    expect(useStore.getState().awaitingSessionCreation).toBe(true);
    expect(h.state.sockets.length).toBeGreaterThan(1);

    await advance(2_500);
    const s = useStore.getState();
    expect(provider.destroyed).toBe(true);
    expect(s.awaitingSessionCreation).toBe(false);
    expect(s.roomError).toMatch(/not active/);
    expect(s.roomId).toBeNull();
    const sockets = h.state.sockets.length;
    await advance(10_000);
    expect(h.state.sockets).toHaveLength(sockets);
  });

  it('a join that synced is not ended by the await-host deadline', async () => {
    renderProvider();
    act(() => collab.joinRoomAwaitingHost('room1'));
    await advance(0);
    const provider = lastProvider();
    provider.open();
    act(() => provider.sync());

    await advance(AWAIT_HOST_TIMEOUT + 10_000);
    expect(provider.destroyed).toBe(false);
    expect(useStore.getState().roomId).toBe('room1');
    expect(useStore.getState().roomError).toBeNull();
  });

  it('leaving the editor while waiting leaves no deadline behind', async () => {
    const { unmount } = renderProvider();
    act(() => collab.joinRoomAwaitingHost('room1'));
    await advance(0);
    unmount();

    // A late deadline would wipe the room an SPA return rejoins (and tear
    // down the module-wide doc of whatever session the next mount joined).
    await advance(AWAIT_HOST_TIMEOUT + 10_000);
    expect(useStore.getState().roomId).toBe('room1');
    expect(useStore.getState().roomError).toBeNull();
  });

  it('kicked leaves the room for good', async () => {
    const provider = await joinAsEditor();
    provider.open();
    provider.sync();
    act(() => provider.send({ type: 'kicked', reason: 'kicked' }));
    act(() => provider.close(COLLAB_CLOSE.kicked));
    await advance(10_000);

    expect(provider.destroyed).toBe(true);
    expect(h.state.sockets).toHaveLength(1);
    expect(useStore.getState().kickedNotice).toBe(true);
    expect(useStore.getState().roomId).toBeNull();
  });
});

describe('handshake close codes', () => {
  it('4426 ends the session with the update message and no reconnect', async () => {
    const provider = await joinAsEditor();
    provider.open();
    act(() =>
      provider.close(
        COLLAB_CLOSE.versionMismatch,
        versionMismatchReason(
          COLLAB_DOC_SCHEMA_VERSION,
          COLLAB_DOC_SCHEMA_VERSION + 1,
        ),
      ),
    );
    await advance(10_000);

    expect(h.state.showError).toHaveBeenCalledWith(
      'Update Music Atlas to join this session',
    );
    expect(useStore.getState().roomError).toBe(
      'Update Music Atlas to join this session',
    );
    expect(provider.destroyed).toBe(true);
    expect(h.state.sockets).toHaveLength(1);
    expect(useStore.getState().roomId).toBeNull();
  });

  it('4426 from a server on an older schema says the server is being updated', async () => {
    const provider = await joinAsEditor();
    provider.open();
    act(() =>
      provider.close(
        COLLAB_CLOSE.versionMismatch,
        versionMismatchReason(
          COLLAB_DOC_SCHEMA_VERSION,
          COLLAB_DOC_SCHEMA_VERSION - 1,
        ),
      ),
    );
    await advance(10_000);

    const message =
      'The session server is being updated. Try again in a few minutes.';
    expect(h.state.showError).toHaveBeenCalledWith(message);
    expect(useStore.getState().roomError).toBe(message);
    expect(h.state.sockets).toHaveLength(1);
  });

  it('4426 without a server version asks for an update', async () => {
    const provider = await joinAsEditor();
    provider.open();
    act(() => provider.close(COLLAB_CLOSE.versionMismatch));

    expect(h.state.showError).toHaveBeenCalledWith(
      'Update Music Atlas to join this session',
    );
  });

  it('4401 retries with a token fetched past the Auth0 cache, then ends the session', async () => {
    const provider = await joinAsEditor();
    expect(h.state.getAccessTokenSilently).toHaveBeenLastCalledWith(undefined);

    provider.open();
    act(() => provider.close(COLLAB_CLOSE.unauthorized));
    await advance(100);
    expect(h.state.sockets).toHaveLength(2);
    expect(h.state.getAccessTokenSilently).toHaveBeenLastCalledWith({
      cacheMode: 'off',
    });

    provider.open();
    act(() => provider.close(COLLAB_CLOSE.unauthorized));
    await advance(200);
    expect(h.state.sockets).toHaveLength(3);

    provider.open();
    act(() => provider.close(COLLAB_CLOSE.unauthorized));
    await advance(10_000);

    expect(h.state.sockets).toHaveLength(3);
    expect(provider.destroyed).toBe(true);
    expect(h.state.showError).toHaveBeenCalledWith(
      expect.stringMatching(/sign-in could not be confirmed/),
    );
  });

  it('a connect still waiting for its token when the session ends never opens a socket', async () => {
    let release: (token: string) => void = () => {};
    h.state.getAccessTokenSilently = vi.fn(
      (_options?: unknown) =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const provider = await joinAsEditor();
    act(() => collab.leaveRoom());
    release('late-token');
    await advance(5_000);

    expect(h.state.sockets).toHaveLength(0);
    expect(provider.shouldConnect).toBe(false);
  });
});

describe('session saved', () => {
  it('a save while in a room counts even mid-reconnect', async () => {
    const provider = await joinAsEditor();
    provider.open();
    provider.sync();
    act(() => provider.close(1006));
    expect(useStore.getState().isCollabActive).toBe(false);

    window.dispatchEvent(new CustomEvent('ma-studio-project-saved'));
    expect(useStore.getState().sessionSaved).toBe(true);
  });

  it('a save outside a room does not', () => {
    renderProvider();
    window.dispatchEvent(new CustomEvent('ma-studio-project-saved'));
    expect(useStore.getState().sessionSaved).toBe(false);
  });
});
