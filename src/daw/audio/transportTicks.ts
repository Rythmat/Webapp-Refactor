// ── Repeated transport ticks ────────────────────────────────────────────────
// Tone 15's clock can hand one tick to two of its scheduling passes. A pass
// covers [previous end, now). When a pass ends a hair after a tick (float
// error in the clock), TickSource.forEachTickBetween fires the tick in that
// pass, and fires it again at the start of the next one, where EQ(offset, 1)
// rounds the hair back onto the same tick. An offline render's passes are
// its 128-sample blocks, so at 48 kHz any tick on a 1/375 s edge could run
// twice: in a 16-beat Chromium test, 3 beats at 120 bpm and 5 at 90 bpm,
// each with every note, clip and click on it (+6 dB). The live clock (passes
// end on a render quantum plus lookAhead) does it too: 2 to 13 repeats in
// 24 s of playback at 48 kHz, more on a throttled CPU.

import type { getTransport } from 'tone';

type Transport = ReturnType<typeof getTransport>;
type TickCallback = (time: number, ticks?: number) => void;

/** Closer than this is the same tick: real ticks are at least 0.4 ms apart
 *  (300 bpm at PPQ 480); a repeat is float noise, under 1e-13 s, apart. */
const SAME_TICK_SECONDS = 1e-6;

const guarded = new WeakSet<object>();

/**
 * Make `transport` ignore a tick that repeats the one before it, so each
 * scheduled event runs once. Wraps the callback of the transport's clock
 * (private in Tone, so this pins Tone's internals; see transportTicks.test).
 * Idempotent. A start begins afresh, so a restart's first tick always runs.
 */
export function dropRepeatedTicks(transport: Transport): void {
  const clock = transport['_clock'] as { callback?: TickCallback } | undefined;
  if (!clock || typeof clock.callback !== 'function' || guarded.has(clock)) {
    return;
  }
  guarded.add(clock);
  const tick = clock.callback;
  let last = Number.NEGATIVE_INFINITY;
  transport.on('start', () => {
    last = Number.NEGATIVE_INFINITY;
  });
  clock.callback = (time, ticks) => {
    if (Math.abs(time - last) < SAME_TICK_SECONDS) return;
    last = time;
    tick(time, ticks);
  };
}
