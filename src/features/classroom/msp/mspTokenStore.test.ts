// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  nowSec,
  readCachedTokenForInteraction,
  readMspTokenStoreForUser,
  writeCachedTokenForInteraction,
  type MspTokenRecord,
} from './mspTokenStore';

const USER_ID = 'test-user';

const baseRecord = (): MspTokenRecord => {
  const iat = nowSec();
  return {
    token: 'server.issued.jwt',
    iat,
    exp: iat + 1800,
    claims: {
      sub: USER_ID,
      ctx: {
        interactionId: 'ix-1',
        enrollmentId: 'enr-1',
      },
      module: 'learn',
      activityRef: 'lesson-1',
      expects: 'score',
      return: 'https://app.example/msp/return',
      exp: iat + 1800,
    },
  };
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('mspTokenStore cache', () => {
  it('read/write round-trips a token record keyed by interactionId', () => {
    const rec = baseRecord();
    writeCachedTokenForInteraction(USER_ID, 'ix-1', rec);
    const back = readCachedTokenForInteraction(USER_ID, 'ix-1');
    expect(back?.token).toBe(rec.token);
    expect(back?.claims.ctx.interactionId).toBe('ix-1');
    expect(back?.claims.return).toBe(rec.claims.return);
  });

  it('overwrites the entry when the same interactionId is written twice', () => {
    writeCachedTokenForInteraction(USER_ID, 'ix-1', baseRecord());
    const second: MspTokenRecord = { ...baseRecord(), token: 'newer.jwt' };
    writeCachedTokenForInteraction(USER_ID, 'ix-1', second);
    const store = readMspTokenStoreForUser(USER_ID);
    expect(Object.keys(store.tokens)).toEqual(['ix-1']);
    expect(store.tokens['ix-1'].token).toBe('newer.jwt');
  });

  it('returns undefined for an unknown interactionId', () => {
    expect(readCachedTokenForInteraction(USER_ID, 'missing')).toBeUndefined();
  });

  it('expired tokens are pruned on the next read', () => {
    writeCachedTokenForInteraction(USER_ID, 'ix-1', baseRecord());
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${USER_ID}`);
    if (!raw) throw new Error('token not written');
    const parsed = JSON.parse(raw);
    parsed.tokens['ix-1'].exp = 0;
    window.localStorage.setItem(
      `${STORAGE_KEY}:${USER_ID}`,
      JSON.stringify(parsed),
    );
    const store = readMspTokenStoreForUser(USER_ID);
    expect(store.tokens).toEqual({});
    expect(readCachedTokenForInteraction(USER_ID, 'ix-1')).toBeUndefined();
  });

  it('userId scoping — other user never sees the token', () => {
    writeCachedTokenForInteraction(USER_ID, 'ix-1', baseRecord());
    const other = readMspTokenStoreForUser('other-user');
    expect(other.tokens).toEqual({});
  });

  it('schema-version mismatch backs up the old data + returns empty', () => {
    window.localStorage.setItem(
      `${STORAGE_KEY}:${USER_ID}`,
      JSON.stringify({ schemaVersion: 999, tokens: {} }),
    );
    const store = readMspTokenStoreForUser(USER_ID);
    expect(store.tokens).toEqual({});
    expect(
      window.localStorage.getItem(`${STORAGE_KEY}:${USER_ID}.bak`),
    ).toContain('999');
  });
});
