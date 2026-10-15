import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerBeforeSignOut, runBeforeSignOut } from '../beforeSignOut';

// ── Work to finish before signing out (milestone 1.4, E17) ────────────────
// Run: npx vitest run src/auth/__tests__/beforeSignOut.test.ts

const stops: Array<() => void> = [];
const register = (task: Parameters<typeof registerBeforeSignOut>[0]) => {
  stops.push(registerBeforeSignOut(task));
};

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('runBeforeSignOut', () => {
  it('resolves at once with nothing registered', async () => {
    await expect(runBeforeSignOut()).resolves.toBeUndefined();
  });

  it('runs every task in parallel and resolves when all finish', async () => {
    const started: string[] = [];
    let releaseA: () => void = () => {};
    register(async () => {
      started.push('a');
      await new Promise<void>((r) => (releaseA = r));
    });
    register(() => {
      started.push('b');
    });
    const run = runBeforeSignOut(5000);
    // Both started before the first finished.
    expect(started).toEqual(['a', 'b']);
    let done = false;
    void run.then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    releaseA();
    await run;
    expect(done).toBe(true);
  });

  it('resolves at the timeout with the signal aborted', async () => {
    vi.useFakeTimers();
    const seen: { signal?: AbortSignal } = {};
    register((signal) => {
      seen.signal = signal;
      return new Promise<void>(() => {});
    });
    const run = runBeforeSignOut(1000);
    expect(seen.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(999);
    expect(seen.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await run;
    expect(seen.signal?.aborted).toBe(true);
  });

  it('logs a task that throws or rejects, and still resolves', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ran = vi.fn();
    register(() => {
      throw new Error('sync');
    });
    register(async () => {
      throw new Error('async');
    });
    register(ran);
    await expect(runBeforeSignOut()).resolves.toBeUndefined();
    expect(ran).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('shares the run in progress with a second call', async () => {
    const task = vi.fn(() => new Promise<void>((r) => setTimeout(r, 10)));
    register(task);
    const first = runBeforeSignOut();
    const second = runBeforeSignOut();
    expect(second).toBe(first);
    await first;
    expect(task).toHaveBeenCalledTimes(1);
    // A later sign-out runs again.
    await runBeforeSignOut();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('stops running a task once unregistered', async () => {
    const task = vi.fn();
    const stop = registerBeforeSignOut(task);
    stop();
    await runBeforeSignOut();
    expect(task).not.toHaveBeenCalled();
  });
});
