// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  applyMessageForUser,
  applySessionSocketMessage,
  applySocketMessageForUser,
  endSessionForUser,
  getActiveSessionForClassroomForUser,
  readSessionsStoreForUser,
  startSessionForUser,
  type ServerSessionSnapshot,
  type SessionState,
  type SessionSocketMessage,
} from './sessionsStore';

const USER_ID = 'test-user';
const CLASSROOM_ID = 'classroom-test';
const PUBLISHED_DAY_ID = 'local-pd-test';

const startFixture = () =>
  startSessionForUser(USER_ID, {
    classroomId: CLASSROOM_ID,
    publishedDayId: PUBLISHED_DAY_ID,
  });

beforeEach(() => {
  window.localStorage.clear();
});

describe('sessionsStore start/end', () => {
  it('starts a live session with defaults + records it in the store', () => {
    const s = startFixture();
    expect(s.status).toBe('live');
    expect(s.locked).toBe(false);
    expect(s.mode).toBe('teacher_paced');
    expect(s.currentPhase).toBe('connectRegulate');

    const store = readSessionsStoreForUser(USER_ID);
    expect(store.sessions[s.sessionId]).toBeDefined();
    expect(store.seq[s.sessionId]).toBe(0);
  });

  it('endSession cascades locked=false + sharedInteractionIds=[] + status=ended', () => {
    const s = startFixture();
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'lock', locked: true },
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'share', interactionId: 'ix-a', on: true },
    });
    endSessionForUser(USER_ID, s.sessionId);
    const closed = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(closed.status).toBe('ended');
    expect(closed.locked).toBe(false);
    expect(closed.sharedInteractionIds).toEqual([]);
    expect(closed.endedAt).toBeDefined();
  });

  it('getActiveSessionForClassroom returns undefined once ended', () => {
    const s = startFixture();
    expect(
      getActiveSessionForClassroomForUser(USER_ID, CLASSROOM_ID)?.sessionId,
    ).toBe(s.sessionId);
    endSessionForUser(USER_ID, s.sessionId);
    expect(
      getActiveSessionForClassroomForUser(USER_ID, CLASSROOM_ID),
    ).toBeUndefined();
  });
});

describe('applyMessageForUser — envelope + role gating', () => {
  it('teacher nav advances currentPhase and bumps seq', () => {
    const s = startFixture();
    const msg = applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'nav', phase: 'groupPractice' },
    });
    expect(msg?.seq).toBe(1);
    expect(msg?.v).toBe(1);
    const state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state.currentPhase).toBe('groupPractice');
  });

  it('student cannot send nav', () => {
    const s = startFixture();
    const msg = applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'student',
      body: { kind: 'nav', phase: 'creativeProjects' },
    });
    expect(msg).toBeNull();
    const state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state.currentPhase).toBe('connectRegulate');
  });

  it('teacher cannot send response', () => {
    const s = startFixture();
    const msg = applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: {
        kind: 'response',
        interactionId: 'ix-1',
        enrollmentId: 'enr-1',
        payload: { kind: 'text', text: 'hi' },
      },
    });
    expect(msg).toBeNull();
  });

  it('student response upserts into responses[sessionId][enrollmentId]', () => {
    const s = startFixture();
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'student',
      fromEnrollmentId: 'enr-1',
      body: {
        kind: 'response',
        interactionId: 'ix-1',
        enrollmentId: 'enr-1',
        payload: { kind: 'text', text: 'first' },
      },
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'student',
      fromEnrollmentId: 'enr-1',
      body: {
        kind: 'response',
        interactionId: 'ix-1',
        enrollmentId: 'enr-1',
        payload: { kind: 'text', text: 'second' },
      },
    });
    const bag =
      readSessionsStoreForUser(USER_ID).responses[s.sessionId]?.['enr-1'] ?? {};
    expect(Object.keys(bag)).toHaveLength(1);
    expect(bag['ix-1']).toEqual({ kind: 'text', text: 'second' });
  });

  it('projector role cannot send any message', () => {
    const s = startFixture();
    const msg = applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'projector',
      body: { kind: 'share', interactionId: 'ix-1', on: true },
    });
    expect(msg).toBeNull();
  });

  it('share adds/removes interaction ids idempotently', () => {
    const s = startFixture();
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'share', interactionId: 'ix-a', on: true },
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'share', interactionId: 'ix-a', on: true },
    });
    let state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state.sharedInteractionIds).toEqual(['ix-a']);
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'share', interactionId: 'ix-a', on: false },
    });
    state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state.sharedInteractionIds).toEqual([]);
  });

  it('end body flips status and clears locked + shared', () => {
    const s = startFixture();
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'lock', locked: true },
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'share', interactionId: 'ix-a', on: true },
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'end' },
    });
    const state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state.status).toBe('ended');
    expect(state.locked).toBe(false);
    expect(state.sharedInteractionIds).toEqual([]);
  });
});

describe('applySessionSocketMessage (Sprint 5+ pure reducer)', () => {
  const baseSnapshot: ServerSessionSnapshot = {
    id: 'sess-1',
    classroomId: CLASSROOM_ID,
    teacherId: 'teacher-1',
    publishedDayId: PUBLISHED_DAY_ID,
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

  it('hello replaces state from the server snapshot', () => {
    const next = applySessionSocketMessage(null, {
      type: 'hello',
      session: baseSnapshot,
      role: 'teacher',
    });
    expect(next?.sessionId).toBe('sess-1');
    expect(next?.currentPhase).toBe('connectRegulate');
    expect(next?.mode).toBe('teacher_paced');
    expect(next?.locked).toBe(false);
    expect(next?.sharedInteractionIds).toEqual([]);
    expect(next?.status).toBe('live');
  });

  it('hello with share: {on: true} seeds sharedInteractionIds', () => {
    const snap: ServerSessionSnapshot = {
      ...baseSnapshot,
      state: {
        ...(baseSnapshot.state as Record<string, unknown>),
        share: { interactionId: 'ix-9', on: true },
      },
    };
    const next = applySessionSocketMessage(null, {
      type: 'hello',
      session: snap,
      role: 'teacher',
    });
    expect(next?.sharedInteractionIds).toEqual(['ix-9']);
  });

  const seed = (): SessionState =>
    applySessionSocketMessage(null, {
      type: 'hello',
      session: baseSnapshot,
      role: 'teacher',
    }) as SessionState;

  it('nav updates currentPhase', () => {
    const s = applySessionSocketMessage(seed(), {
      type: 'nav',
      phase: 'creativeProjects',
      interactionIndex: 2,
      focusOpen: true,
    });
    expect(s?.currentPhase).toBe('creativeProjects');
  });

  it('lock flips locked', () => {
    const s = applySessionSocketMessage(seed(), { type: 'lock', on: true });
    expect(s?.locked).toBe(true);
  });

  it('share sets sharedInteractionIds when on, clears when off', () => {
    const on = applySessionSocketMessage(seed(), {
      type: 'share',
      interactionId: 'ix-42',
      on: true,
    });
    expect(on?.sharedInteractionIds).toEqual(['ix-42']);
    const off = applySessionSocketMessage(on, {
      type: 'share',
      interactionId: 'ix-42',
      on: false,
    });
    expect(off?.sharedInteractionIds).toEqual([]);
  });

  it('mode updates the pacing', () => {
    const s = applySessionSocketMessage(seed(), {
      type: 'mode',
      value: 'student_paced',
    });
    expect(s?.mode).toBe('student_paced');
  });

  it('end sets status=ended + endedAt + clears locked/shared', () => {
    const locked = applySessionSocketMessage(seed(), {
      type: 'lock',
      on: true,
    });
    const sharedThenLocked = applySessionSocketMessage(locked, {
      type: 'share',
      interactionId: 'ix-a',
      on: true,
    });
    const ended = applySessionSocketMessage(sharedThenLocked, { type: 'end' });
    expect(ended?.status).toBe('ended');
    expect(ended?.locked).toBe(false);
    expect(ended?.sharedInteractionIds).toEqual([]);
    expect(ended?.endedAt).toBeDefined();
  });

  it('response / presence / pong leave state unchanged (state-only reducer)', () => {
    const s = seed();
    const response: SessionSocketMessage = {
      type: 'response',
      at: '2026-01-01T00:00:00.000Z',
      interactionId: 'ix-1',
      sessionId: 'sess-1',
      enrollmentId: 'enr-1',
      payload: { kind: 'text', text: 'hello' },
    };
    expect(applySessionSocketMessage(s, response)).toBe(s);
    expect(
      applySessionSocketMessage(s, {
        type: 'presence',
        at: '',
        delta: [],
      }),
    ).toBe(s);
    expect(applySessionSocketMessage(s, { type: 'pong', t: 1, at: '' })).toBe(
      s,
    );
  });

  it('non-hello messages against null state return null (no seed to fold into)', () => {
    expect(
      applySessionSocketMessage(null, {
        type: 'nav',
        phase: 'nav-anywhere',
        interactionIndex: 0,
        focusOpen: false,
      }),
    ).toBeNull();
  });
});

describe('applySocketMessageForUser (writes state + responses to the store)', () => {
  const snap: ServerSessionSnapshot = {
    id: 'sess-store',
    classroomId: CLASSROOM_ID,
    teacherId: 'teacher-1',
    publishedDayId: PUBLISHED_DAY_ID,
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

  it('hello writes the seeded session into the store', () => {
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'hello',
      session: snap,
      role: 'teacher',
    });
    const store = readSessionsStoreForUser(USER_ID);
    expect(store.sessions['sess-store']?.currentPhase).toBe('connectRegulate');
  });

  it('response upserts into responses[sessionId][enrollmentId]', () => {
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'hello',
      session: snap,
      role: 'teacher',
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'response',
      at: '2026-01-01T00:00:00.000Z',
      interactionId: 'ix-1',
      sessionId: 'sess-store',
      enrollmentId: 'enr-1',
      payload: { kind: 'text', text: 'first' },
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'response',
      at: '2026-01-01T00:00:00.000Z',
      interactionId: 'ix-1',
      sessionId: 'sess-store',
      enrollmentId: 'enr-1',
      payload: { kind: 'text', text: 'second' },
    });
    const bag =
      readSessionsStoreForUser(USER_ID).responses['sess-store']?.['enr-1'] ??
      {};
    expect(bag['ix-1']).toEqual({ kind: 'text', text: 'second' });
  });

  it('nav / lock / mode / share flow through to the stored session', () => {
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'hello',
      session: snap,
      role: 'teacher',
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'nav',
      phase: 'groupPractice',
      interactionIndex: 1,
      focusOpen: false,
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'lock',
      on: true,
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'mode',
      value: 'student_paced',
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'share',
      interactionId: 'ix-3',
      on: true,
    });
    const s = readSessionsStoreForUser(USER_ID).sessions['sess-store'];
    expect(s.currentPhase).toBe('groupPractice');
    expect(s.locked).toBe(true);
    expect(s.mode).toBe('student_paced');
    expect(s.sharedInteractionIds).toEqual(['ix-3']);
  });

  it('presence / pong are no-ops on the store', () => {
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'hello',
      session: snap,
      role: 'teacher',
    });
    const before = readSessionsStoreForUser(USER_ID).sessions['sess-store'];
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'presence',
      at: '',
      delta: [{ enrollmentId: 'enr-1', state: 'active' }],
    });
    applySocketMessageForUser(USER_ID, 'sess-store', {
      type: 'pong',
      t: 1,
      at: '',
    });
    const after = readSessionsStoreForUser(USER_ID).sessions['sess-store'];
    expect(after).toEqual(before);
  });
});

describe('storage schema + scoping', () => {
  it('schema-version mismatch backs up to .bak and returns empty', () => {
    window.localStorage.setItem(
      `${STORAGE_KEY}:${USER_ID}`,
      JSON.stringify({ schemaVersion: 99, sessions: { x: {} } }),
    );
    const store = readSessionsStoreForUser(USER_ID);
    expect(store.sessions).toEqual({});
    expect(
      window.localStorage.getItem(`${STORAGE_KEY}:${USER_ID}.bak`),
    ).not.toBeNull();
  });

  it('writes under userId do not leak into other userId keys', () => {
    startFixture();
    const other = readSessionsStoreForUser('other-user');
    expect(other.sessions).toEqual({});
  });
});

describe('slideIndex (interactive slides nav)', () => {
  it('startSessionForUser defaults slideIndex to -1 and honors initialSlideIndex', () => {
    const legacy = startFixture();
    expect(legacy.slideIndex).toBe(-1);
    const deck = startSessionForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      publishedDayId: PUBLISHED_DAY_ID,
      initialSlideIndex: 0,
    });
    expect(deck.slideIndex).toBe(0);
  });

  it('local nav envelope carries slideIndex into SessionState', () => {
    const s = startFixture();
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'nav', phase: 'groupPractice', slideIndex: 3 },
    });
    const store = readSessionsStoreForUser(USER_ID);
    expect(store.sessions[s.sessionId].currentPhase).toBe('groupPractice');
    expect(store.sessions[s.sessionId].slideIndex).toBe(3);
  });

  it('local nav without slideIndex leaves the existing slideIndex untouched', () => {
    const s = startSessionForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      publishedDayId: PUBLISHED_DAY_ID,
      initialSlideIndex: 2,
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'nav', phase: 'presentPerform' },
    });
    const store = readSessionsStoreForUser(USER_ID);
    expect(store.sessions[s.sessionId].slideIndex).toBe(2);
  });

  it('socket hello seeds slideIndex from server state (default -1)', () => {
    const snap: ServerSessionSnapshot = {
      id: 'sess-slides',
      classroomId: CLASSROOM_ID,
      teacherId: 'teacher-1',
      publishedDayId: PUBLISHED_DAY_ID,
      code: 'WXYZ',
      status: 'live',
      state: { phase: 'connectRegulate', slideIndex: 4 },
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: null,
    };
    const withIndex = applySessionSocketMessage(null, {
      type: 'hello',
      session: snap,
      role: 'student',
    });
    expect(withIndex?.slideIndex).toBe(4);
    const legacy = applySessionSocketMessage(null, {
      type: 'hello',
      session: { ...snap, state: { phase: 'connectRegulate' } },
      role: 'student',
    });
    expect(legacy?.slideIndex).toBe(-1);
  });

  it('socket nav applies slideIndex when present and preserves it when absent', () => {
    const base = applySessionSocketMessage(null, {
      type: 'hello',
      session: {
        id: 'sess-slides-2',
        classroomId: CLASSROOM_ID,
        teacherId: 'teacher-1',
        publishedDayId: PUBLISHED_DAY_ID,
        code: 'QRST',
        status: 'live',
        state: { phase: 'connectRegulate', slideIndex: 0 },
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
      },
      role: 'student',
    }) as SessionState;
    const navved = applySessionSocketMessage(base, {
      type: 'nav',
      phase: 'groupPractice',
      interactionIndex: 0,
      focusOpen: false,
      slideIndex: 5,
    });
    expect(navved?.slideIndex).toBe(5);
    expect(navved?.currentPhase).toBe('groupPractice');
    const legacyNav = applySessionSocketMessage(navved as SessionState, {
      type: 'nav',
      phase: 'presentPerform',
      interactionIndex: 0,
      focusOpen: false,
    });
    expect(legacyNav?.slideIndex).toBe(5);
  });
});

describe('Phase 4 — timer / media / position protocol', () => {
  it('teacher timer body folds into state.timer; clearing sets null', () => {
    const s = startFixture();
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: {
        kind: 'timer',
        timer: {
          slideId: 'sl-1',
          endsAt: 123456,
          durationSec: 60,
          autoAdvance: true,
        },
      },
    });
    let state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state?.timer).toEqual({
      slideId: 'sl-1',
      endsAt: 123456,
      durationSec: 60,
      autoAdvance: true,
    });
    applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'teacher',
      body: { kind: 'timer', timer: null },
    });
    state = readSessionsStoreForUser(USER_ID).sessions[s.sessionId];
    expect(state?.timer).toBeNull();
  });

  it('media body bumps a monotonic cmdId so repeated commands re-fire', () => {
    const s = startFixture();
    const fire = () =>
      applyMessageForUser(USER_ID, {
        sessionId: s.sessionId,
        from: 'teacher',
        body: { kind: 'media', slideId: 'sl-1', action: 'play' },
      });
    fire();
    const first =
      readSessionsStoreForUser(USER_ID).sessions[s.sessionId]?.media;
    fire();
    const second =
      readSessionsStoreForUser(USER_ID).sessions[s.sessionId]?.media;
    expect(first?.cmdId).toBe(1);
    expect(second?.cmdId).toBe(2);
    expect(second?.action).toBe('play');
  });

  it('student position writes to the positions side-map, never SessionState', () => {
    const s = startFixture();
    const msg = applyMessageForUser(USER_ID, {
      sessionId: s.sessionId,
      from: 'student',
      fromEnrollmentId: 'enr-9',
      body: { kind: 'position', enrollmentId: 'enr-9', slideIndex: 3 },
    });
    expect(msg).not.toBeNull();
    const store = readSessionsStoreForUser(USER_ID);
    expect(store.positions[s.sessionId]?.['enr-9']).toBe(3);
    // SessionState is untouched (no position field leaks in).
    expect('position' in (store.sessions[s.sessionId] ?? {})).toBe(false);
  });

  it('teacher may NOT send a position; projector may not send timer', () => {
    const s = startFixture();
    expect(
      applyMessageForUser(USER_ID, {
        sessionId: s.sessionId,
        from: 'teacher',
        body: { kind: 'position', enrollmentId: 'enr-9', slideIndex: 1 },
      }),
    ).toBeNull();
    expect(
      applyMessageForUser(USER_ID, {
        sessionId: s.sessionId,
        from: 'projector',
        body: { kind: 'timer', timer: null },
      }),
    ).toBeNull();
  });
});
