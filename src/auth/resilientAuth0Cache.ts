import {
  InMemoryCache,
  LocalStorageCache,
  type Cacheable,
  type ICache,
  type MaybePromise,
} from '@auth0/auth0-react';

const isQuotaExceeded = (err: unknown): boolean =>
  err instanceof DOMException &&
  // Chrome/standard, Firefox, and the legacy numeric codes respectively.
  (err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014);

/**
 * Reclaim room by removing ONLY regenerable backup keys (`*.bak`, written by the
 * classroom stores on a schema-version bump). User data (`ma-teacher:*`,
 * `music-atlas-*`) and Auth0's own entries are never touched.
 */
const evictRegenerableKeys = (): void => {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.endsWith('.bak')) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Best-effort; storage may be unavailable (privacy mode).
  }
};

/**
 * Auth0 token cache that persists to localStorage but is immune to a full
 * localStorage — signing in must never become collateral damage of app data
 * filling the origin's storage quota.
 *
 * - Happy path delegates to Auth0's own {@link LocalStorageCache} (identical
 *   behavior to `cacheLocation="localstorage"`).
 * - On a quota error it drops only regenerable `*.bak` keys and retries.
 * - If it still cannot fit, it transparently falls back to an in-memory cache for
 *   the rest of the session so auth completes. Tokens simply aren't persisted
 *   across a full reload until storage frees up. User data is never evicted.
 *
 * Passed to `<Auth0Provider cache={...}>` in {@link file://./../main.tsx}.
 */
export class ResilientAuth0Cache implements ICache {
  private readonly local = new LocalStorageCache();
  private readonly memory: ICache = new InMemoryCache().enclosedCache;
  private memoryOnly = false;

  set<T = Cacheable>(key: string, entry: T): MaybePromise<void> {
    if (this.memoryOnly) {
      return this.memory.set(key, entry);
    }
    try {
      this.local.set(key, entry);
      return;
    } catch (err) {
      if (!isQuotaExceeded(err)) throw err;
      evictRegenerableKeys();
      try {
        this.local.set(key, entry);
        return;
      } catch (retryErr) {
        if (!isQuotaExceeded(retryErr)) throw retryErr;
        // Persistence is impossible right now — keep auth alive in memory so the
        // user can still sign in and use the app this session.
        this.memoryOnly = true;
        return this.memory.set(key, entry);
      }
    }
  }

  get<T = Cacheable>(key: string): MaybePromise<T | undefined> {
    if (!this.memoryOnly) {
      return this.local.get<T>(key);
    }
    // Memory takes precedence (it holds this session's writes), then fall back to
    // anything previously persisted before we ran out of room.
    return Promise.resolve(this.memory.get<T>(key)).then((fromMemory) =>
      fromMemory !== undefined ? fromMemory : this.local.get<T>(key),
    );
  }

  remove(key: string): MaybePromise<void> {
    if (this.memoryOnly) {
      void this.memory.remove(key);
    }
    this.local.remove(key);
  }

  allKeys(): MaybePromise<string[]> {
    const localKeys = this.local.allKeys();
    if (!this.memoryOnly) {
      return localKeys;
    }
    return Promise.resolve(this.memory.allKeys?.() ?? []).then((memoryKeys) =>
      Array.from(new Set([...localKeys, ...memoryKeys])),
    );
  }
}
