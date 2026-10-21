/**
 * useServerClock — the clock check over the session socket (serverClock.ts).
 *
 * Once the socket is connected it pings five times, a quarter second
 * apart, then every 30 seconds; every pong is a sample, and the offset is
 * their median. Each reconnect pings five times again. A practice session
 * (the local mock) has no server, so its offset is 0 and it is in sync from
 * the start.
 *
 * `useSessionSync` owns the socket and hands this its ping, whether the
 * socket is up, and each pong (`addPong`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CLOCK_RECHECK_MS,
  JOIN_PINGS,
  JOIN_PING_GAP_MS,
  createServerClockEstimate,
  pongSample,
  toServerTime,
} from './serverClock';

/** What a screen reads of the server's clock. */
export interface SessionClock {
  /** The server's time less this device's (ms). */
  offsetMs: number;
  /** A usable sample has come (always, for a practice session). */
  synced: boolean;
  /** Now, on the server's clock (epoch ms). */
  serverNow: () => number;
}

/** A session with no server: this device's clock is the session's. */
export const LOCAL_SESSION_CLOCK: SessionClock = {
  offsetMs: 0,
  synced: true,
  serverNow: () => Date.now(),
};

export interface UseServerClockOptions {
  /** Send one ping; null for a practice session (no server). */
  ping: (() => void) | null;
  /** The socket is open: pinging can begin (and begins again on reconnect). */
  connected: boolean;
}

export interface UseServerClock extends SessionClock {
  /** Feed it each pong, with when it arrived on this device. */
  addPong: (pong: { t: number; at: string; receivedAt: number }) => void;
}

export function useServerClock({
  ping,
  connected,
}: UseServerClockOptions): UseServerClock {
  const estimate = useRef(createServerClockEstimate());
  const [offsetMs, setOffsetMs] = useState(0);
  const [synced, setSynced] = useState(false);
  const pingRef = useRef(ping);
  pingRef.current = ping;
  const local = ping === null;

  useEffect(() => {
    if (local || !connected) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < JOIN_PINGS; i++) {
      timers.push(setTimeout(() => pingRef.current?.(), i * JOIN_PING_GAP_MS));
    }
    const recheck = setInterval(() => pingRef.current?.(), CLOCK_RECHECK_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(recheck);
    };
  }, [local, connected]);

  const addPong = useCallback(
    (pong: { t: number; at: string; receivedAt: number }) => {
      const sample = pongSample(pong);
      if (!sample) return;
      setOffsetMs(estimate.current.add(sample));
      setSynced(estimate.current.synced());
    },
    [],
  );

  const offset = local ? 0 : offsetMs;
  const serverNow = useCallback(
    () => toServerTime(Date.now(), offset),
    [offset],
  );
  return useMemo(
    () => ({
      offsetMs: offset,
      synced: local || synced,
      serverNow,
      addPong,
    }),
    [offset, local, synced, serverNow, addPong],
  );
}
