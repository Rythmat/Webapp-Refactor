import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { getTransport } from 'tone';
import { dropRepeatedTicks } from '../transportTicks';

// ── One tick, one run ─────────────────────────────────────────────────────
// Tone's clock can hand a tick that lands on the edge between two of its
// passes to both (seen in Chromium: a 48 kHz offline render at 120 bpm, PPQ
// 480, ran beat 2 at 1 s and again at 1.0000000000000062 s), so every event
// on it ran twice: a Part's notes, scheduled clips, metronome clicks (+6 dB).

type Transport = ReturnType<typeof getTransport>;

/** A transport whose clock records what reaches Transport._processTick. */
function fakeTransport() {
  const processed: Array<[number, number | undefined]> = [];
  const listeners: Record<string, Array<() => void>> = {};
  const clock = {
    callback: (time: number, ticks?: number) => {
      processed.push([time, ticks]);
    },
  };
  const transport = {
    _clock: clock,
    on: vi.fn((event: string, cb: () => void) => {
      (listeners[event] ??= []).push(cb);
    }),
  };
  return {
    transport: transport as unknown as Transport,
    /** What Clock._loop does for each tick it finds in a pass. */
    tick: (time: number, ticks: number) => clock.callback(time, ticks),
    emit: (event: string) => listeners[event]?.forEach((cb) => cb()),
    processed,
  };
}

describe('dropRepeatedTicks', () => {
  it('runs a tick handed to two passes once', () => {
    const t = fakeTransport();
    dropRepeatedTicks(t.transport);
    t.tick(0.9989583333333333, 959);
    t.tick(1, 960);
    t.tick(1.0000000000000062, 960);
    t.tick(1.0010416666666666, 961);
    expect(t.processed.map(([, ticks]) => ticks)).toEqual([959, 960, 961]);
  });

  it('keeps ticks a tick apart, even at 300 bpm', () => {
    const t = fakeTransport();
    dropRepeatedTicks(t.transport);
    const tickSeconds = 60 / 300 / 480;
    for (let i = 0; i < 100; i++) t.tick(i * tickSeconds, i);
    expect(t.processed).toHaveLength(100);
  });

  it('catches the repeat at a loop wrap too (where its tick number differs)', () => {
    // At the loop end, _processTick resets the clock to loopStart, so the
    // repeat comes back as loopStart: the time is what identifies it.
    const t = fakeTransport();
    dropRepeatedTicks(t.transport);
    t.tick(4, 3840);
    t.tick(4.000000000000001, 0);
    expect(t.processed).toEqual([[4, 3840]]);
  });

  it("runs a restart's first tick even on the previous tick's time", () => {
    const t = fakeTransport();
    dropRepeatedTicks(t.transport);
    t.tick(2, 1920);
    t.emit('start');
    t.tick(2, 0);
    expect(t.processed).toEqual([
      [2, 1920],
      [2, 0],
    ]);
  });

  it('wraps a clock once however often it is called', () => {
    const t = fakeTransport();
    dropRepeatedTicks(t.transport);
    dropRepeatedTicks(t.transport);
    t.tick(1, 960);
    t.tick(1.0000000000000002, 960);
    expect(t.processed).toHaveLength(1);
    expect(t.transport.on).toHaveBeenCalledTimes(1);
  });

  it('leaves a transport without a clock callback alone', () => {
    const bare = { on: vi.fn() } as unknown as Transport;
    expect(() => dropRepeatedTicks(bare)).not.toThrow();
    expect(bare.on).not.toHaveBeenCalled();
  });
});

describe("Tone's clock wiring that dropRepeatedTicks relies on", () => {
  // The guard wraps a private member. If a Tone upgrade changes any of this,
  // re-check whether the double-fire is still there before adapting it.
  const tone = (file: string) =>
    readFileSync(
      join(process.cwd(), 'node_modules/tone/build/esm/core/clock', file),
      'utf8',
    );

  it('the transport hands every tick to its clock callback', () => {
    expect(tone('Transport.js')).toMatch(
      /this\._clock = new Clock\(\{\s*callback: this\._processTick\.bind\(this\)/,
    );
    expect(tone('Clock.js')).toMatch(
      /forEachTickBetween\(startTime, endTime, \(time, ticks\) => \{\s*this\.callback\(time, ticks\);/,
    );
  });

  it('the pass that repeats a tick is still there', () => {
    // When this changes, Tone may have fixed it: the guard is then a no-op.
    expect(tone('TickSource.js')).toContain(
      'offset = EQ(offset, 1) ? 0 : offset;',
    );
  });
});
