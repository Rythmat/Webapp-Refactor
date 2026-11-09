// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK_RECHECK_MS, JOIN_PINGS, JOIN_PING_GAP_MS } from './serverClock';
import { useServerClock } from './useServerClock';

/**
 * The clock check over the session socket (useServerClock.ts): five pings
 * once the socket is up, then one every 30 seconds; each pong a sample.
 * A practice session has no server: its offset is 0.
 */

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('the clock check', () => {
  it('pings five times on joining, then every 30 seconds', () => {
    const ping = vi.fn();
    const { rerender } = renderHook(
      ({ connected }) => useServerClock({ ping, connected }),
      { initialProps: { connected: false } },
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(ping).not.toHaveBeenCalled();
    rerender({ connected: true });
    act(() => vi.advanceTimersByTime(JOIN_PINGS * JOIN_PING_GAP_MS));
    expect(ping).toHaveBeenCalledTimes(JOIN_PINGS);
    act(() => vi.advanceTimersByTime(CLOCK_RECHECK_MS));
    expect(ping).toHaveBeenCalledTimes(JOIN_PINGS + 1);
  });

  it('turns pongs into the offset, and the server’s now', () => {
    const { result } = renderHook(() =>
      useServerClock({ ping: () => {}, connected: true }),
    );
    expect(result.current.synced).toBe(false);
    const now = Date.now();
    // The server is 1.2 s ahead; the trip takes 80 ms each way.
    act(() =>
      result.current.addPong({
        t: now - 160,
        at: new Date(now - 80 + 1200).toISOString(),
        receivedAt: now,
      }),
    );
    expect(result.current.offsetMs).toBe(1200);
    expect(result.current.synced).toBe(true);
    expect(result.current.serverNow()).toBe(Date.now() + 1200);
  });

  it('is in sync from the start with no server (a practice session)', () => {
    const { result } = renderHook(() =>
      useServerClock({ ping: null, connected: false }),
    );
    expect(result.current).toMatchObject({ offsetMs: 0, synced: true });
    expect(result.current.serverNow()).toBe(Date.now());
  });
});
