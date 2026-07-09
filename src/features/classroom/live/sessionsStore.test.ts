// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  applyMessageForUser,
  endSessionForUser,
  getActiveSessionForClassroomForUser,
  readSessionsStoreForUser,
  startSessionForUser,
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
