// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  decodeMockMspToken,
  mintTokenForUser,
  readMspClaimsForUser,
  readMspTokenStoreForUser,
} from './mspTokenStore';

const USER_ID = 'test-user';

const baseInput = () => ({
  interactionId: 'ix-1',
  enrollmentId: 'enr-1',
  module: 'learn' as const,
  activityRef: 'lesson-1',
  expects: 'score' as const,
});

beforeEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('mintTokenForUser', () => {
  it('mints a mock JWT with 5-minute expiry and firewall-safe claims', () => {
    const { token, claims } = mintTokenForUser(USER_ID, baseInput());
    expect(token.endsWith('.mock')).toBe(true);
    expect(claims.sub).toBe(USER_ID);
    expect(claims.module).toBe('learn');
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(claims.exp).toBeLessThan(Math.floor(Date.now() / 1000) + 301);
    expect(claims.ctx.interactionId).toBe('ix-1');
    expect(claims.ctx.enrollmentId).toBe('enr-1');
  });

  it('token body is base64url-decodable back to claims', () => {
    const { token, claims } = mintTokenForUser(USER_ID, baseInput());
    const decoded = decodeMockMspToken(token);
    expect(decoded?.sub).toBe(claims.sub);
    expect(decoded?.module).toBe('learn');
    expect(decoded?.activityRef).toBe('lesson-1');
  });

  it('upserts per interactionId (second mint overwrites)', () => {
    const first = mintTokenForUser(USER_ID, baseInput()).token;
    const second = mintTokenForUser(USER_ID, baseInput()).token;
    const store = readMspTokenStoreForUser(USER_ID);
    expect(Object.keys(store.tokens)).toEqual(['ix-1']);
    expect(store.tokens['ix-1'].token === second).toBe(true);
    expect(first === second).toBe(true); // same iat → same base64 body
  });

  it('readMspClaimsForUser resolves back to claims for a given token', () => {
    const { token, claims } = mintTokenForUser(USER_ID, baseInput());
    const back = readMspClaimsForUser(USER_ID, token);
    expect(back?.activityRef).toBe(claims.activityRef);
  });

  it('expired tokens are pruned on the next read', () => {
    mintTokenForUser(USER_ID, baseInput());
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
  });

  it('userId scoping — other user never sees the token', () => {
    mintTokenForUser(USER_ID, baseInput());
    const other = readMspTokenStoreForUser('other-user');
    expect(other.tokens).toEqual({});
  });
});
