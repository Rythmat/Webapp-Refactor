// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ENROLLMENT_TRANSITIONS,
  STORAGE_KEY,
  approveEnrollmentForUser,
  denyEnrollmentForUser,
  generateEnrollmentId,
  isValidTransition,
  kickEnrollmentForUser,
  reactivateEnrollmentForUser,
  readEnrollmentStoreForUser,
  seedPreviewPendingEnrollmentForUser,
  type Enrollment,
  type EnrollmentStatus,
  type EnrollmentStore,
} from './useEnrollments';

const USER_ID = 'test-user';
const OTHER_USER_ID = 'other-user';
const CLASSROOM_ID = 'classroom-test';

const writeRaw = (
  userId: string,
  entries: Record<string, Enrollment>,
): void => {
  const store: EnrollmentStore = { schemaVersion: 1, entries };
  window.localStorage.setItem(
    `${STORAGE_KEY}:${userId}`,
    JSON.stringify(store),
  );
};

const makeEnrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: generateEnrollmentId(),
  classroomId: CLASSROOM_ID,
  accountId: 'acct-x',
  displayName: 'Student X',
  status: 'pending',
  joinedAt: '2026-06-30T00:00:00.000Z',
  approvedAt: null,
  removedAt: null,
  ...overrides,
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('ENROLLMENT_TRANSITIONS', () => {
  const allStatuses: EnrollmentStatus[] = ['pending', 'active', 'removed'];
  const legal: Array<[EnrollmentStatus, EnrollmentStatus]> = [
    ['pending', 'active'],
    ['pending', 'removed'],
    ['active', 'removed'],
    ['removed', 'active'],
  ];

  it('exposes exactly the legal transitions in the table', () => {
    for (const [from, to] of legal) {
      expect(ENROLLMENT_TRANSITIONS[from]).toContain(to);
      expect(isValidTransition(from, to)).toBe(true);
    }
  });

  it('rejects every other transition', () => {
    for (const from of allStatuses) {
      for (const to of allStatuses) {
        const isLegal = legal.some(([f, t]) => f === from && t === to);
        if (isLegal) continue;
        expect(isValidTransition(from, to)).toBe(false);
      }
    }
  });
});

describe('*ForUser transitions (dev-only sim harness path)', () => {
  it('approve moves pending -> active and stamps approvedAt', async () => {
    const e = makeEnrollment();
    writeRaw(USER_ID, { [e.id]: e });
    const updated = await approveEnrollmentForUser(USER_ID, e.id);
    expect(updated.status).toBe('active');
    expect(updated.approvedAt).not.toBeNull();
    expect(updated.removedAt).toBeNull();
  });

  it('deny moves pending -> removed and stamps removedAt', async () => {
    const e = makeEnrollment();
    writeRaw(USER_ID, { [e.id]: e });
    const updated = await denyEnrollmentForUser(USER_ID, e.id);
    expect(updated.status).toBe('removed');
    expect(updated.removedAt).not.toBeNull();
    expect(updated.approvedAt).toBeNull();
  });

  it('kick moves active -> removed and stamps removedAt', async () => {
    const e = makeEnrollment({
      status: 'active',
      approvedAt: '2026-06-29T00:00:00.000Z',
    });
    writeRaw(USER_ID, { [e.id]: e });
    const updated = await kickEnrollmentForUser(USER_ID, e.id);
    expect(updated.status).toBe('removed');
    expect(updated.removedAt).not.toBeNull();
    expect(updated.approvedAt).toBe('2026-06-29T00:00:00.000Z');
  });

  it('reactivate moves removed -> active, rewrites approvedAt, clears removedAt', async () => {
    const e = makeEnrollment({
      status: 'removed',
      approvedAt: '2026-06-29T00:00:00.000Z',
      removedAt: '2026-06-30T00:00:00.000Z',
    });
    writeRaw(USER_ID, { [e.id]: e });
    const updated = await reactivateEnrollmentForUser(USER_ID, e.id);
    expect(updated.status).toBe('active');
    expect(updated.approvedAt).not.toBeNull();
    expect(updated.approvedAt).not.toBe('2026-06-29T00:00:00.000Z');
    expect(updated.removedAt).toBeNull();
  });

  it('approve throws on already-active enrollment', async () => {
    const e = makeEnrollment({ status: 'active' });
    writeRaw(USER_ID, { [e.id]: e });
    await expect(approveEnrollmentForUser(USER_ID, e.id)).rejects.toThrow(
      /Invalid transition/,
    );
  });

  it('deny throws on non-pending enrollment', async () => {
    const e = makeEnrollment({ status: 'active' });
    writeRaw(USER_ID, { [e.id]: e });
    await expect(denyEnrollmentForUser(USER_ID, e.id)).rejects.toThrow(
      /non-pending/,
    );
  });

  it('kick throws on non-active enrollment', async () => {
    const e = makeEnrollment({ status: 'pending' });
    writeRaw(USER_ID, { [e.id]: e });
    await expect(kickEnrollmentForUser(USER_ID, e.id)).rejects.toThrow(
      /non-active/,
    );
  });
});

describe('storage schema + scoping', () => {
  it('round-trips schemaVersion=1', () => {
    seedPreviewPendingEnrollmentForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      accountId: 'acct-a',
      displayName: 'A',
    });
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${USER_ID}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('schemaVersion mismatch backs up to .bak and returns empty', () => {
    window.localStorage.setItem(
      `${STORAGE_KEY}:${USER_ID}`,
      JSON.stringify({ schemaVersion: 99, entries: { foo: {} } }),
    );
    const store = readEnrollmentStoreForUser(USER_ID);
    expect(store.entries).toEqual({});
    expect(
      window.localStorage.getItem(`${STORAGE_KEY}:${USER_ID}.bak`),
    ).not.toBeNull();
  });

  it('writes under userId do not leak into other userId keys', async () => {
    const e = makeEnrollment();
    writeRaw(USER_ID, { [e.id]: e });
    await approveEnrollmentForUser(USER_ID, e.id);
    const other = readEnrollmentStoreForUser(OTHER_USER_ID);
    expect(other.entries).toEqual({});
  });

  it('anon key is used when userId is null', async () => {
    const e = makeEnrollment();
    window.localStorage.setItem(
      `${STORAGE_KEY}:anon`,
      JSON.stringify({ schemaVersion: 1, entries: { [e.id]: e } }),
    );
    await approveEnrollmentForUser(null, e.id);
    const anon = window.localStorage.getItem(`${STORAGE_KEY}:anon`);
    expect(anon).toContain('"status":"active"');
  });
});

describe('seedPreviewPendingEnrollmentForUser', () => {
  it('creates a pending row idempotently per (classroomId, accountId)', () => {
    const a = seedPreviewPendingEnrollmentForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      accountId: 'acct-a',
      displayName: 'A',
    });
    const b = seedPreviewPendingEnrollmentForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      accountId: 'acct-a',
      displayName: 'A2',
    });
    expect(b.id).toBe(a.id);
    expect(b.status).toBe('pending');
  });
});
