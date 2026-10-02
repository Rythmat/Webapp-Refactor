import type { Clock } from '../politeHttp';

/**
 * A clock that only moves when someone sleeps, and a server that answers from
 * a script: the rate limit is checked in simulated time, not by waiting.
 */
export function fakeClock(): Clock & { sleeps: number[] } {
  let now = 0;
  const sleeps: number[] = [];
  return {
    sleeps,
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
  };
}

export interface Reply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Simulated response time, in clock milliseconds. */
  takesMs?: number;
  /** Fail the way a dropped connection does. */
  networkError?: boolean;
}

export interface Call {
  url: string;
  at: number;
  headers: Record<string, string>;
}

/**
 * `fetch`, answered from `replies` in order (the last one repeats). Records
 * each call's URL, clock time and headers.
 */
export function scriptedFetch(clock: Clock, replies: Reply[]) {
  const calls: Call[] = [];
  let next = 0;
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    calls.push({
      url,
      at: clock.now(),
      headers: { ...(init.headers as Record<string, string>) },
    });
    const reply = replies[Math.min(next++, replies.length - 1)];
    if (reply.takesMs) await clock.sleep(reply.takesMs);
    if (reply.networkError) throw new TypeError('fetch failed');
    const text =
      typeof reply.body === 'string'
        ? reply.body
        : JSON.stringify(reply.body ?? { ok: true });
    return new Response(text, {
      status: reply.status ?? 200,
      headers: reply.headers,
    });
  };
  return { fetch, calls };
}
