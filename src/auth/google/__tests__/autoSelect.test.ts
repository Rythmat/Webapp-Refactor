// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_RETRY_WINDOW_MS,
  clearGoogleAutoSelectSuppression,
  isAutoSelection,
  isGoogleAutoSelectSuppressed,
  isOneTapQuiet,
  markAutoAttempt,
  shouldBlockAutoRetry,
  suppressGoogleAutoSelect,
} from '../autoSelect';

/**
 * Sign-out must not be undone by Google auto sign-in, and an automatic pick
 * that bounces back must not loop.
 */

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
};

const throwingStorage = (): Storage =>
  new Proxy({} as Storage, {
    get: () => () => {
      throw new Error('SecurityError');
    },
  });

afterEach(() => {
  delete window.google;
  vi.restoreAllMocks();
});

describe('sign-out suppression', () => {
  it('turns auto-select off and quiets the marketing prompt until cleared', async () => {
    const local = memoryStorage();
    const session = memoryStorage();
    expect(isGoogleAutoSelectSuppressed(local)).toBe(false);

    await suppressGoogleAutoSelect(local, session);
    expect(isGoogleAutoSelectSuppressed(local)).toBe(true);
    expect(isOneTapQuiet(session)).toBe(true);

    clearGoogleAutoSelectSuppression(local, session);
    expect(isGoogleAutoSelectSuppressed(local)).toBe(false);
    expect(isOneTapQuiet(session)).toBe(false);
  });

  it('tells a loaded GIS and the browser (FedCM) to stop silent sign-in', async () => {
    const disableAutoSelect = vi.fn();
    window.google = {
      accounts: {
        id: {
          disableAutoSelect,
          initialize: vi.fn(),
          prompt: vi.fn(),
          cancel: vi.fn(),
          renderButton: vi.fn(),
        },
      },
    };
    const preventSilentAccess = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { preventSilentAccess },
    });

    await suppressGoogleAutoSelect(memoryStorage(), memoryStorage());
    expect(disableAutoSelect).toHaveBeenCalledOnce();
    expect(preventSilentAccess).toHaveBeenCalledOnce();

    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: undefined,
    });
  });

  it('never throws when storage is unavailable (private mode)', async () => {
    const broken = throwingStorage();
    await expect(
      suppressGoogleAutoSelect(broken, broken),
    ).resolves.toBeUndefined();
    expect(isGoogleAutoSelectSuppressed(broken)).toBe(false);
    expect(isOneTapQuiet(broken)).toBe(false);
    expect(() =>
      clearGoogleAutoSelectSuppression(broken, broken),
    ).not.toThrow();
    expect(shouldBlockAutoRetry(0, broken)).toBe(false);
  });
});

describe('auto-selection loop breaker', () => {
  it('recognises automatic picks', () => {
    expect(isAutoSelection('auto')).toBe(true);
    expect(isAutoSelection('fedcm_auto')).toBe(true);
    for (const by of ['user', 'user_1tap', 'fedcm', 'btn', 'itp', undefined]) {
      expect(isAutoSelection(by), String(by)).toBe(false);
    }
  });

  it('blocks a second automatic pick within the window only', () => {
    const session = memoryStorage();
    expect(shouldBlockAutoRetry(1_000, session)).toBe(false);
    markAutoAttempt(1_000, session);
    expect(shouldBlockAutoRetry(1_000 + 5_000, session)).toBe(true);
    expect(shouldBlockAutoRetry(1_000 + AUTO_RETRY_WINDOW_MS, session)).toBe(
      false,
    );
  });
});
