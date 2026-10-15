// @vitest-environment jsdom
/**
 * Loading the editor early (milestone 1.12a, bundle-load-06/-09): one fetch
 * however many callers, a failed fetch asked again, the dashboard's idle and
 * intent prefetches, and Save-Data respected.
 *
 * Run: npx vitest run src/daw/__tests__/preload.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isEditorPath,
  memoLoad,
  prefetchDawOnIntent,
  prefetchDawWhenIdle,
  preloadDaw,
} from '../preload';

vi.mock('@/daw/DawApp', () => ({ DawApp: () => null }));

let saveData = false;

beforeEach(() => {
  saveData = false;
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    get: () => ({ saveData }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('memoLoad', () => {
  it('loads once however often it is asked', async () => {
    const load = vi.fn(async () => 'module');
    const get = memoLoad(load);
    expect(get()).toBe(get());
    await expect(get()).resolves.toBe('module');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads again after a load that failed', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('module');
    const get = memoLoad(load);
    const first = get();
    await expect(first).rejects.toThrow('offline');
    const second = get();
    expect(second).not.toBe(first);
    await expect(second).resolves.toBe('module');
    expect(get()).toBe(second);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('preloadDaw', () => {
  it('is the editor module, one fetch for every caller', async () => {
    expect(preloadDaw()).toBe(preloadDaw());
    await expect(preloadDaw()).resolves.toHaveProperty('DawApp');
  });
});

describe('the dashboard prefetch', () => {
  it('waits for the page to be idle', () => {
    const idle = vi.fn(() => 7);
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', idle);
    vi.stubGlobal('cancelIdleCallback', cancel);
    const stop = prefetchDawWhenIdle();
    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 4000 });
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('falls back to a timer without requestIdleCallback', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    const stop = prefetchDawWhenIdle();
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing at idle, on a hover or a focus when the browser saves data', () => {
    saveData = true;
    const idle = vi.fn();
    vi.stubGlobal('requestIdleCallback', idle);
    prefetchDawWhenIdle();
    expect(idle).not.toHaveBeenCalled();
    expect(prefetchDawOnIntent('hover')).toBe(false);
    expect(prefetchDawOnIntent('focus')).toBe(false);
  });

  it('fetches on a press even then, since a click follows', () => {
    saveData = true;
    expect(prefetchDawOnIntent('press')).toBe(true);
    saveData = false;
    expect(prefetchDawOnIntent('hover')).toBe(true);
  });
});

describe('isEditorPath', () => {
  it('is the editor and nothing else', () => {
    expect(isEditorPath('/studio/editor')).toBe(true);
    expect(isEditorPath('/studio/editor/')).toBe(true);
    expect(isEditorPath('/studio')).toBe(false);
    expect(isEditorPath('/studio/editorial')).toBe(false);
  });
});
