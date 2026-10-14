// @vitest-environment jsdom
/**
 * A lazy part that fails to load after a deploy (milestone 1.12a,
 * bundle-load-16): the open work is saved first (beforeReload), then the tab
 * reloads, once a minute at most, never offline, and the event is cancelled
 * only when it does.
 *
 * Run: npx vitest run src/lib/__tests__/chunkReload.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
  sessionStorage.clear();
  reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function load() {
  const before = await import('../beforeReload');
  const chunks = await import('../chunkReload');
  return { ...before, ...chunks };
}

const failure = () => new Event('vite:preloadError', { cancelable: true });

describe('a chunk that failed to load', () => {
  it('saves the open work, then reloads', async () => {
    const { onPreloadError, registerBeforeReload, chunkReloadPending } =
      await load();
    const order: string[] = [];
    registerBeforeReload(async () => {
      order.push('saved');
    });
    reload.mockImplementation(() => order.push('reloaded'));

    const event = failure();
    onPreloadError(event);
    expect(event.defaultPrevented).toBe(true);
    expect(chunkReloadPending()).toBe(true);
    await vi.runAllTimersAsync();
    expect(order).toEqual(['saved', 'reloaded']);
  });

  it('reloads without waiting longer than the cap for a slow task', async () => {
    const { onPreloadError, registerBeforeReload } = await load();
    registerBeforeReload(() => new Promise(() => {}));
    onPreloadError(failure());
    await vi.advanceTimersByTimeAsync(1499);
    expect(reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads once: a failure after the reload reaches the boundary', async () => {
    const first = await load();
    first.onPreloadError(failure());
    await vi.runAllTimersAsync();
    expect(reload).toHaveBeenCalledTimes(1);

    // The page after the reload: a fresh module, the same tab's storage.
    vi.resetModules();
    vi.advanceTimersByTime(10_000);
    const second = await load();
    const event = failure();
    second.onPreloadError(event);
    expect(event.defaultPrevented).toBe(false);
    expect(second.chunkReloadPending()).toBe(false);
    await vi.runAllTimersAsync();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('may reload again a minute later (the next deploy)', async () => {
    const first = await load();
    first.onPreloadError(failure());
    await vi.runAllTimersAsync();
    vi.resetModules();
    vi.advanceTimersByTime(61_000);
    const second = await load();
    const event = failure();
    second.onPreloadError(event);
    expect(event.defaultPrevented).toBe(true);
    await vi.runAllTimersAsync();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('never reloads offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const { onPreloadError } = await load();
    const event = failure();
    onPreloadError(event);
    expect(event.defaultPrevented).toBe(false);
    await vi.runAllTimersAsync();
    expect(reload).not.toHaveBeenCalled();
  });

  it('never reloads when it could not remember doing so', async () => {
    const { onPreloadError } = await load();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const event = failure();
    onPreloadError(event);
    expect(event.defaultPrevented).toBe(false);
    await vi.runAllTimersAsync();
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('tells a chunk failure from any other error', async () => {
    const { isChunkLoadError } = await load();
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://x/a.js',
        ),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(new TypeError('Importing a module script failed.')),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error('Unable to preload CSS for /a.css')),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('x is undefined'))).toBe(false);
  });
});

describe('the work before a reload', () => {
  it('runs every task at once and logs one that fails', async () => {
    const { registerBeforeReload, runBeforeReload } = await load();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ran: string[] = [];
    const stopA = registerBeforeReload(async () => {
      ran.push('a');
    });
    registerBeforeReload(() => {
      throw new Error('broken');
    });
    await runBeforeReload();
    expect(ran).toEqual(['a']);
    expect(error).toHaveBeenCalled();

    stopA();
    ran.length = 0;
    await runBeforeReload();
    expect(ran).toEqual([]);
    error.mockRestore();
  });
});
