// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import {
  CLOSE_ENDED,
  CLOSE_UNAUTHORIZED,
  createSessionSocketController,
  type ResponseSocketMessage,
  type SessionRestClient,
  type SocketEventPayload,
  type SocketLike,
} from './sessionSocketController';
import {
  readSessionsStoreForUser,
  type ServerSessionSnapshot,
  type SessionSocketMessage,
} from './sessionsStore';

const USER_ID = 'user-test';
const CLASSROOM_ID = 'classroom-test';
const SESSION_ID = 'sess-test';

const SNAPSHOT: ServerSessionSnapshot = {
  id: SESSION_ID,
  classroomId: CLASSROOM_ID,
  teacherId: 'teacher-1',
  publishedDayId: 'pd-1',
  code: 'ABCD',
  status: 'live',
  state: {
    phase: 'connectRegulate',
    interactionIndex: 0,
    locked: false,
    mode: 'teacher_paced',
    share: null,
  },
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: null,
};

/** Hand-rolled fake socket — mirrors partysocket's addEventListener/send/close
 *  surface. Tests drive events via `fire*` methods. */
class FakeSocket implements SocketLike {
  private listeners = new Map<string, Array<(e: SocketEventPayload) => void>>();
  sent: string[] = [];
  closeCalls: Array<{ code?: number; reason?: string }> = [];

  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: SocketEventPayload) => void,
  ): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeCalls.push({ code, reason });
  }

  private emit(type: string, event: SocketEventPayload): void {
    for (const cb of this.listeners.get(type) ?? []) cb(event);
  }

  fireOpen(): void {
    this.emit('open', { type: 'open' });
  }
  fireMessage(msg: SessionSocketMessage): void {
    this.emit('message', { type: 'message', data: JSON.stringify(msg) });
  }
  fireClose(code: number, reason?: string): void {
    this.emit('close', { type: 'close', code, reason });
  }
  fireError(): void {
    this.emit('error', { type: 'error' });
  }
}

interface Harness {
  socket: FakeSocket;
  restClient: {
    get: Mock<() => Promise<ServerSessionSnapshot>>;
    patch: Mock<(payload: unknown) => Promise<unknown>>;
    postResponse: Mock<(payload: unknown) => Promise<unknown>>;
  };
  onStatusChange: Mock<(status: unknown) => void>;
  onResponse: Mock<(msg: ResponseSocketMessage) => void>;
  onEndFailed: Mock<(error: unknown) => void>;
  now: Mock<() => number>;
}

const makeHarness = (
  overrides: {
    restGet?: () => Promise<ServerSessionSnapshot>;
    restPatch?: (payload: unknown) => Promise<unknown>;
    role?: 'teacher' | 'student' | 'projector';
    userId?: string | null;
    endRetryDelaysMs?: number[];
  } = {},
): {
  harness: Harness;
  controller: ReturnType<typeof createSessionSocketController>;
} => {
  const socket = new FakeSocket();
  const restClient = {
    get: vi.fn(overrides.restGet ?? (async () => SNAPSHOT)),
    patch: vi.fn(overrides.restPatch ?? (async () => ({}))),
    postResponse: vi.fn(async () => ({})),
  } as unknown as Harness['restClient'];
  const onStatusChange = vi.fn() as Harness['onStatusChange'];
  const onResponse = vi.fn() as Harness['onResponse'];
  const onEndFailed = vi.fn() as Harness['onEndFailed'];
  const now = vi.fn(() => 42) as Harness['now'];

  const controller = createSessionSocketController({
    sessionId: SESSION_ID,
    role: overrides.role ?? 'teacher',
    userId: overrides.userId ?? USER_ID,
    restClient: restClient as unknown as SessionRestClient,
    socketFactory: () => socket,
    onStatusChange,
    onResponse,
    onEndFailed,
    now,
    heartbeatMs: 25_000,
    // Instant retries by default so tests don't need vi.useFakeTimers.
    endRetryDelaysMs: overrides.endRetryDelaysMs ?? [0, 0],
  });

  return {
    harness: {
      socket,
      restClient,
      onStatusChange,
      onResponse,
      onEndFailed,
      now,
    },
    controller,
  };
};

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSessionSocketController — mount + hello wiring', () => {
  it('open() calls restClient.get and folds a synthetic hello into local state', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    await flushPromises();
    expect(harness.restClient.get).toHaveBeenCalledTimes(1);
    const stored = readSessionsStoreForUser(USER_ID).sessions[SESSION_ID];
    expect(stored?.currentPhase).toBe('connectRegulate');
    expect(stored?.status).toBe('live');
  });

  it('DROPS the REST snapshot when the socket delivers hello first (race guard)', async () => {
    // The REST GET resolves late; the socket hello arrives during that gap
    // with newer state (different phase). The REST resolution must NOT
    // overwrite the socket-derived state.
    let resolveRest: (snap: ServerSessionSnapshot) => void = () => {};
    const restPromise = new Promise<ServerSessionSnapshot>((r) => {
      resolveRest = r;
    });
    const { harness, controller } = makeHarness({ restGet: () => restPromise });
    controller.open();

    // Socket hello arrives with different phase before REST resolves.
    const socketSnap: ServerSessionSnapshot = {
      ...SNAPSHOT,
      state: {
        ...(SNAPSHOT.state as Record<string, unknown>),
        phase: 'creativeProjects',
      },
    };
    harness.socket.fireMessage({
      type: 'hello',
      session: socketSnap,
      role: 'teacher',
    });

    // Now the REST resolves with the older snapshot.
    resolveRest(SNAPSHOT);
    await flushPromises();

    // Socket-derived state wins.
    const stored = readSessionsStoreForUser(USER_ID).sessions[SESSION_ID];
    expect(stored?.currentPhase).toBe('creativeProjects');
  });

  it('opens the socket and fires onStatusChange("connecting") then "connected" on open', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    const calls = harness.onStatusChange.mock.calls.map(
      ([c]: [unknown]) => c,
    );
    expect(calls[0]).toBe('connecting');
    harness.socket.fireOpen();
    expect(harness.onStatusChange).toHaveBeenLastCalledWith('connected');
  });
});

describe('createSessionSocketController — socket message routing', () => {
  it('hello writes the seeded session to the localStorage store', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    const stored = readSessionsStoreForUser(USER_ID).sessions[SESSION_ID];
    expect(stored?.sessionId).toBe(SESSION_ID);
    expect(stored?.currentPhase).toBe('connectRegulate');
  });

  it('nav / lock / mode / share update the stored state', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    harness.socket.fireMessage({
      type: 'nav',
      phase: 'groupPractice',
      interactionIndex: 1,
      focusOpen: false,
    });
    harness.socket.fireMessage({ type: 'lock', on: true });
    harness.socket.fireMessage({ type: 'mode', value: 'student_paced' });
    harness.socket.fireMessage({
      type: 'share',
      interactionId: 'ix-9',
      on: true,
    });
    const stored = readSessionsStoreForUser(USER_ID).sessions[SESSION_ID];
    expect(stored?.currentPhase).toBe('groupPractice');
    expect(stored?.locked).toBe(true);
    expect(stored?.mode).toBe('student_paced');
    expect(stored?.sharedInteractionIds).toEqual(['ix-9']);
  });

  it('type:"response" invokes onResponse with the parsed message', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    const responseMsg: ResponseSocketMessage = {
      type: 'response',
      at: '2026-01-01T00:00:00.000Z',
      interactionId: 'ix-1',
      sessionId: SESSION_ID,
      enrollmentId: 'enr-1',
      payload: { kind: 'text', text: 'hello' },
    };
    harness.socket.fireMessage(responseMsg);
    expect(harness.onResponse).toHaveBeenCalledTimes(1);
    expect(harness.onResponse).toHaveBeenCalledWith(responseMsg);
  });

  it('ignores non-JSON socket messages without throwing', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    // Directly emit garbage — the controller should swallow the parse error.
    (
      harness.socket as unknown as {
        emit: (type: string, event: SocketEventPayload) => void;
      }
    ).emit?.('message', { type: 'message', data: 'not json' });
    // No throw → we're good; no state written for this session.
    expect(readSessionsStoreForUser(USER_ID).sessions[SESSION_ID]).toBeUndefined();
  });
});

describe('createSessionSocketController — teacher REST sends', () => {
  it('sendNav PATCHes with the merged state (phase changed, others preserved)', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    controller.sendNav('groupPractice');
    await flushPromises();
    expect(harness.restClient.patch).toHaveBeenCalledWith({
      state: {
        phase: 'groupPractice',
        slideIndex: -1,
        locked: false,
        mode: 'teacher_paced',
        share: null,
        pairs: null,
        showcase: null,
        timer: null,
        media: null,
      },
    });
  });

  it('sendNav with a slide index carries slideIndex in the merged PATCH', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    controller.sendNav('groupPractice', 3);
    await flushPromises();
    expect(harness.restClient.patch).toHaveBeenCalledWith({
      state: {
        phase: 'groupPractice',
        slideIndex: 3,
        locked: false,
        mode: 'teacher_paced',
        share: null,
        pairs: null,
        showcase: null,
        timer: null,
        media: null,
      },
    });
    // After the server echoes the nav, a later non-nav send must NOT drop
    // the slide position from the merged state.
    harness.socket.fireMessage({
      type: 'nav',
      phase: 'groupPractice',
      interactionIndex: 0,
      focusOpen: false,
      slideIndex: 3,
    });
    controller.sendLock(true);
    await flushPromises();
    const last = (
      harness.restClient.patch as unknown as {
        mock: { calls: Array<[{ state?: { slideIndex?: number } }]> };
      }
    ).mock.calls.at(-1)?.[0];
    expect(last?.state?.slideIndex).toBe(3);
  });

  it('auto-advance nav + timer-clear in the same tick keeps the advanced slide (no stale-index revert)', async () => {
    // Regression: the timer auto-advance fires sendNav(next) then
    // sendTimer(null) synchronously. Before the optimistic stateRef fold, the
    // second PATCH built off the un-echoed base and carried the STALE
    // pre-advance slideIndex, snapping the deck back a slide on server
    // sessions. Now the timer-clear PATCH must carry the ADVANCED index.
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    // No intervening echo between the two sends (the real failure window).
    controller.sendNav('groupPractice', 4);
    controller.sendTimer(null);
    await flushPromises();
    const calls = harness.restClient.patch.mock.calls.map(
      ([p]: [unknown]) => (p as { state?: { slideIndex?: number; timer?: unknown } }).state,
    );
    // Second PATCH (timer clear) must NOT revert slideIndex to -1.
    expect(calls[1]?.slideIndex).toBe(4);
    expect(calls[1]?.timer).toBeNull();
  });

  it('two media commands in one tick get monotonically increasing cmdIds (projector re-fires)', async () => {
    // Regression: sendMedia derived cmdId from the un-echoed stateRef, so a
    // quick Play→Pause computed the SAME cmdId twice and the projector's
    // cmdId-keyed effect swallowed the second command. cmdId must increment.
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    controller.sendMedia('slide-x', 'play');
    controller.sendMedia('slide-x', 'pause');
    await flushPromises();
    const media = harness.restClient.patch.mock.calls.map(
      ([p]: [unknown]) =>
        (p as { state?: { media?: { action: string; cmdId: number } } }).state
          ?.media,
    );
    expect(media[0]).toMatchObject({ action: 'play', cmdId: 1 });
    expect(media[1]).toMatchObject({ action: 'pause', cmdId: 2 });
  });

  it('sendLock / sendShare / sendMode PATCH with the merged state', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    controller.sendLock(true);
    controller.sendShare('ix-42', true);
    controller.sendMode('student_paced');
    await flushPromises();
    const calls = harness.restClient.patch.mock.calls.map(
      ([p]: [unknown]) => (p as { state?: unknown }).state,
    );
    expect(calls[0]).toMatchObject({
      phase: 'connectRegulate',
      locked: true,
      share: null,
    });
    expect(calls[1]).toMatchObject({
      share: { interactionId: 'ix-42', on: true },
    });
    expect(calls[2]).toMatchObject({ mode: 'student_paced' });
  });

  it('sendEnd ends the local session BEFORE the PATCH (report-page safety) and resolves ok on success', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });

    // Assert local session was NOT ended yet.
    expect(
      readSessionsStoreForUser(USER_ID).sessions[SESSION_ID]?.status,
    ).toBe('live');

    const pending = controller.sendEnd();

    // Local state must reflect "ended" IMMEDIATELY — before we await the
    // PATCH. This is the invariant that keeps SessionReportPage from
    // rendering a stale "still open" session when the teacher navigates
    // away before the socket echo arrives.
    expect(
      readSessionsStoreForUser(USER_ID).sessions[SESSION_ID]?.status,
    ).toBe('ended');

    const result = await pending;
    expect(result).toEqual({ ok: true });
    expect(harness.restClient.patch).toHaveBeenCalledWith({ status: 'ended' });
    // First-attempt success: no onEndFailed.
    expect(harness.onEndFailed).not.toHaveBeenCalled();
  });

  it('sendEnd retries the PATCH on transient failure and resolves ok once one attempt succeeds', async () => {
    // Fail the first two calls, succeed the third.
    let attempt = 0;
    const { harness, controller } = makeHarness({
      restPatch: async () => {
        attempt += 1;
        if (attempt < 3) throw new Error('flaky network');
        return {};
      },
      endRetryDelaysMs: [0, 0], // instant retries
    });
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });

    const result = await controller.sendEnd();
    expect(result).toEqual({ ok: true });
    expect(harness.restClient.patch).toHaveBeenCalledTimes(3);
    expect(harness.onEndFailed).not.toHaveBeenCalled();
  });

  it('sendEnd surfaces failure via onEndFailed + result when every retry fails', async () => {
    const boom = new Error('permanent 500');
    const { harness, controller } = makeHarness({
      restPatch: async () => {
        throw boom;
      },
      endRetryDelaysMs: [0, 0], // 3 total attempts
    });
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });

    const result = await controller.sendEnd();
    expect(result).toEqual({ ok: false, error: boom });
    // 1 initial + 2 retries.
    expect(harness.restClient.patch).toHaveBeenCalledTimes(3);
    expect(harness.onEndFailed).toHaveBeenCalledTimes(1);
    expect(harness.onEndFailed).toHaveBeenCalledWith(boom);
    // Optimistic local end SURVIVES failure — teacher chose to end; the
    // caller decides how to recover (via onEndFailed → toast → manual retry).
    expect(
      readSessionsStoreForUser(USER_ID).sessions[SESSION_ID]?.status,
    ).toBe('ended');
  });

  it('sendEnd honors endRetryDelaysMs=[] (single attempt, no retries)', async () => {
    let calls = 0;
    const { harness, controller } = makeHarness({
      restPatch: async () => {
        calls += 1;
        throw new Error('nope');
      },
      endRetryDelaysMs: [],
    });
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });

    const result = await controller.sendEnd();
    expect(result.ok).toBe(false);
    expect(calls).toBe(1);
    expect(harness.restClient.patch).toHaveBeenCalledTimes(1);
    expect(harness.onEndFailed).toHaveBeenCalledTimes(1);
  });

  it('drops teacher sends when no baseline state exists yet', async () => {
    const { harness, controller } = makeHarness({
      restGet: () => new Promise(() => {}), // never resolves
    });
    controller.open();
    controller.sendNav('groupPractice');
    await flushPromises();
    // No PATCH — there was no baseline to merge with.
    expect(harness.restClient.patch).not.toHaveBeenCalled();
  });

  it('sendShare(id, true) PATCHes share: {id, on: true} — merged with base state', async () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    controller.sendShare('ix-A', true);
    await flushPromises();
    expect(harness.restClient.patch).toHaveBeenCalledTimes(1);
    const arg = harness.restClient.patch.mock.calls[0][0] as {
      state?: { share?: unknown };
    };
    expect(arg.state?.share).toEqual({ interactionId: 'ix-A', on: true });
  });

  it("sendShare(id, false) is a NO-OP when the currently-shared interaction is a different id", async () => {
    // Share A is currently active.
    const snap: ServerSessionSnapshot = {
      ...SNAPSHOT,
      state: {
        ...(SNAPSHOT.state as Record<string, unknown>),
        share: { interactionId: 'ix-A', on: true },
      },
    };
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({ type: 'hello', session: snap, role: 'teacher' });
    // Sanity: baseline reflects share=A.
    expect(
      readSessionsStoreForUser(USER_ID).sessions[SESSION_ID]
        ?.sharedInteractionIds,
    ).toEqual(['ix-A']);

    // Stale UI: unshare B (wrong id). Must not fire.
    controller.sendShare('ix-B', false);
    await flushPromises();
    expect(harness.restClient.patch).not.toHaveBeenCalled();
  });

  it('sendShare(id, false) DOES fire share:null when the id matches the current share', async () => {
    const snap: ServerSessionSnapshot = {
      ...SNAPSHOT,
      state: {
        ...(SNAPSHOT.state as Record<string, unknown>),
        share: { interactionId: 'ix-A', on: true },
      },
    };
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({ type: 'hello', session: snap, role: 'teacher' });

    controller.sendShare('ix-A', false);
    await flushPromises();
    expect(harness.restClient.patch).toHaveBeenCalledTimes(1);
    const arg = harness.restClient.patch.mock.calls[0][0] as {
      state?: { share?: unknown };
    };
    expect(arg.state?.share).toBeNull();
  });

  it('sendShare(id, false) is a NO-OP when nothing is currently shared', async () => {
    // Base state has share: null.
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'teacher',
    });
    expect(
      readSessionsStoreForUser(USER_ID).sessions[SESSION_ID]
        ?.sharedInteractionIds,
    ).toEqual([]);

    controller.sendShare('ix-A', false);
    await flushPromises();
    expect(harness.restClient.patch).not.toHaveBeenCalled();
  });
});

describe('createSessionSocketController — student sends', () => {
  it('sendResponse POSTs to /responses (never patches)', async () => {
    const { harness, controller } = makeHarness({ role: 'student' });
    controller.open();
    harness.socket.fireMessage({
      type: 'hello',
      session: SNAPSHOT,
      role: 'student',
    });
    controller.sendResponse('ix-1', { kind: 'text', text: 'answer' });
    await flushPromises();
    expect(harness.restClient.postResponse).toHaveBeenCalledWith({
      interactionId: 'ix-1',
      payload: { kind: 'text', text: 'answer' },
    });
    expect(harness.restClient.patch).not.toHaveBeenCalled();
  });
});

describe('createSessionSocketController — close-code handling', () => {
  it('4001 (unauthorized) sets status=error AND explicitly closes the socket', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireClose(CLOSE_UNAUTHORIZED);
    expect(harness.onStatusChange).toHaveBeenLastCalledWith('error');
    // Explicit close() call is what stops partysocket's default infinite
    // reconnect loop. If this ever regresses, the client will DoS the auth
    // endpoint.
    expect(harness.socket.closeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('4002 (session ended) sets status=disconnected AND closes the socket', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireClose(CLOSE_ENDED);
    expect(harness.onStatusChange).toHaveBeenLastCalledWith('disconnected');
    expect(harness.socket.closeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('other close codes set status=disconnected but do NOT force a close (partysocket may reconnect)', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireClose(1006); // abnormal
    expect(harness.onStatusChange).toHaveBeenLastCalledWith('disconnected');
    expect(harness.socket.closeCalls).toHaveLength(0);
  });

  it('error event sets status=error', () => {
    const { harness, controller } = makeHarness();
    controller.open();
    harness.socket.fireError();
    expect(harness.onStatusChange).toHaveBeenLastCalledWith('error');
  });
});

describe('createSessionSocketController — heartbeat + cleanup', () => {
  it('sends {type:"ping"} every heartbeatMs interval', () => {
    vi.useFakeTimers();
    const { harness, controller } = makeHarness();
    controller.open();
    // Advance one heartbeat interval.
    vi.advanceTimersByTime(25_000);
    const pings = harness.socket.sent.filter((s) => s.includes('"ping"'));
    expect(pings.length).toBeGreaterThanOrEqual(1);
    // Advance another interval — another ping.
    vi.advanceTimersByTime(25_000);
    const pings2 = harness.socket.sent.filter((s) => s.includes('"ping"'));
    expect(pings2.length).toBeGreaterThan(pings.length);
  });

  it('close() clears the heartbeat interval and closes the socket', () => {
    vi.useFakeTimers();
    const { harness, controller } = makeHarness();
    controller.open();
    vi.advanceTimersByTime(25_000);
    const pingsBefore = harness.socket.sent.filter((s) =>
      s.includes('"ping"'),
    ).length;

    controller.close();
    expect(harness.socket.closeCalls.length).toBeGreaterThanOrEqual(1);

    // Advance more time — no additional pings.
    vi.advanceTimersByTime(25_000);
    const pingsAfter = harness.socket.sent.filter((s) =>
      s.includes('"ping"'),
    ).length;
    expect(pingsAfter).toBe(pingsBefore);
  });
});
