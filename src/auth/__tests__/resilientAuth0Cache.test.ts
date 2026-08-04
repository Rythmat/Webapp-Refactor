// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResilientAuth0Cache } from '../resilientAuth0Cache';

const KEY = '@@auth0spajs@@::client::https://api::openid profile email';

const makeEntry = (token: string) => ({
  body: {
    access_token: token,
    audience: 'https://api',
    scope: 'openid profile email',
    client_id: 'client',
    expires_in: 3600,
  },
  expiresAt: Date.now() + 3_600_000,
});

const quotaError = () => new DOMException('quota', 'QuotaExceededError');

// Auth0's caches are synchronous (void/value), so normalize the MaybePromise.
const resolve = <T>(v: T | Promise<T>): Promise<T> => Promise.resolve(v);

describe('ResilientAuth0Cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists to localStorage on the happy path', async () => {
    const cache = new ResilientAuth0Cache();
    await resolve(cache.set(KEY, makeEntry('tok')));

    expect(await resolve(cache.get(KEY))).toMatchObject({
      body: { access_token: 'tok' },
    });
    expect(window.localStorage.length).toBeGreaterThan(0);
  });

  it('evicts only *.bak keys and retries when quota is hit once', async () => {
    window.localStorage.setItem('ma-teacher:published:v1:me.bak', 'x'.repeat(50));
    window.localStorage.setItem('ma-teacher:published:v1:me', 'keep-me');

    const originalSet = Storage.prototype.setItem;
    let setCalls = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      k: string,
      v: string,
    ) {
      setCalls += 1;
      if (setCalls === 1) throw quotaError();
      originalSet.call(this, k, v);
    });

    const cache = new ResilientAuth0Cache();
    await resolve(cache.set(KEY, makeEntry('after-evict')));

    // Dropped the regenerable backup, kept real user data, persisted the token.
    expect(window.localStorage.getItem('ma-teacher:published:v1:me.bak')).toBeNull();
    expect(window.localStorage.getItem('ma-teacher:published:v1:me')).toBe(
      'keep-me',
    );
    expect(await resolve(cache.get(KEY))).toMatchObject({
      body: { access_token: 'after-evict' },
    });
  });

  it('falls back to in-memory when storage stays full — auth never breaks', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError();
    });

    const cache = new ResilientAuth0Cache();
    // Does not throw despite storage being unwritable...
    expect(() => cache.set(KEY, makeEntry('mem'))).not.toThrow();
    // ...and the token is still retrievable this session (from memory).
    expect(await resolve(cache.get(KEY))).toMatchObject({
      body: { access_token: 'mem' },
    });
  });

  it('rethrows non-quota storage errors instead of swallowing them', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('nope', 'SecurityError');
    });

    const cache = new ResilientAuth0Cache();
    expect(() => cache.set(KEY, makeEntry('x'))).toThrow(DOMException);
  });
});
