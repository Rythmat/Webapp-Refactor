// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  consumeMspEntryForUser,
  readMspInboxForUser,
  recordMspResponseForUser,
} from './mspResponseInbox';

const USER_ID = 'test-user';

const baseEntry = () => ({
  token: 'mock-token-1',
  interactionId: 'ix-1',
  participant: { enrollmentId: 'enr-1' },
  module: 'learn' as const,
  activityRef: 'lesson-1',
  payload: { kind: 'score' as const, score: 8, max: 10 },
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('mspResponseInbox', () => {
  it('records + reads back an entry with createdAt stamped', () => {
    const entry = recordMspResponseForUser(USER_ID, baseEntry());
    expect(entry.createdAt).toBeDefined();
    const store = readMspInboxForUser(USER_ID);
    expect(store.entries[entry.token]).toBeDefined();
    expect(store.entries[entry.token].participant.enrollmentId).toBe('enr-1');
  });

  it('consumeMspEntryForUser removes the entry', () => {
    recordMspResponseForUser(USER_ID, baseEntry());
    consumeMspEntryForUser(USER_ID, 'mock-token-1');
    const store = readMspInboxForUser(USER_ID);
    expect(store.entries).toEqual({});
  });

  it('schema mismatch backs up to .bak and returns empty', () => {
    window.localStorage.setItem(
      `${STORAGE_KEY}:${USER_ID}`,
      JSON.stringify({ schemaVersion: 99, entries: { x: {} } }),
    );
    const store = readMspInboxForUser(USER_ID);
    expect(store.entries).toEqual({});
    expect(
      window.localStorage.getItem(`${STORAGE_KEY}:${USER_ID}.bak`),
    ).not.toBeNull();
  });

  it('userId scoping — other user never sees the entry', () => {
    recordMspResponseForUser(USER_ID, baseEntry());
    const other = readMspInboxForUser('other-user');
    expect(other.entries).toEqual({});
  });
});
