import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── heardTime: the context time and tick the student was hearing ───────────

const tone = vi.hoisted(() => ({
  native: {} as Record<string, unknown>,
  transport: {
    ticks: 0,
    bpm: { value: 120 },
    PPQ: 480,
    // 960 ticks a second from tick 0 at context time 10.
    getTicksAtTime: (time: number) => (time - 10) * 960,
  },
  lookAhead: 0.1,
}));
vi.mock('tone', () => ({
  getContext: () => ({
    lookAhead: tone.lookAhead,
    rawContext: { _nativeContext: tone.native },
  }),
  getTransport: () => tone.transport,
}));

import {
  contextTimeHeardAt,
  nativeContextOf,
  ticksAtContextTime,
  ticksHeardAt,
} from '../heardTime';

beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(5000);
  tone.native = {
    currentTime: 12.3,
    baseLatency: 0.01,
    outputLatency: 0.04,
    // 11.2 s left the speakers at 4900 ms.
    getOutputTimestamp: () => ({ contextTime: 11.2, performanceTime: 4900 }),
  };
});

describe('contextTimeHeardAt', () => {
  it('reads the output timestamp, moved to the moment asked about', () => {
    expect(contextTimeHeardAt(4900)).toBeCloseTo(11.2, 9);
    expect(contextTimeHeardAt(4950)).toBeCloseTo(11.25, 9);
    // Default: now (5000 ms).
    expect(contextTimeHeardAt()).toBeCloseTo(11.3, 9);
  });

  it('falls back to the clock less the latencies and the delay', () => {
    tone.native.getOutputTimestamp = undefined;
    // 12.3 − 0.01 − 0.04 − (5000 − 4980) ms
    expect(contextTimeHeardAt(4980)).toBeCloseTo(12.23, 9);
  });

  it('falls back while the context has not started (zero timestamp)', () => {
    tone.native.getOutputTimestamp = () => ({
      contextTime: 0,
      performanceTime: 0,
    });
    expect(contextTimeHeardAt()).toBeCloseTo(12.25, 9);
  });

  it('unwraps the native context under Tone', () => {
    const native = { currentTime: 1 };
    expect(nativeContextOf({ rawContext: { _nativeContext: native } })).toBe(
      native,
    );
    expect(nativeContextOf({ _nativeContext: native })).toBe(native);
    expect(nativeContextOf(native)).toBe(native);
  });
});

describe('ticksHeardAt', () => {
  it("is the transport's tick at the heard time", () => {
    // Heard 11.25 s at 4950 ms → 1.25 s after tick 0 → 1200 ticks.
    expect(ticksHeardAt(4950)).toBeCloseTo(1200, 6);
  });

  it("holds at the transport start's tick before the start", () => {
    // Heard 11.3 s, but the transport starts at 11.5 s.
    expect(ticksHeardAt(undefined, 11.5)).toBeCloseTo(1440, 6);
    expect(ticksAtContextTime(11, 11.5)).toBeCloseTo(1440, 6);
    expect(ticksAtContextTime(12, 11.5)).toBeCloseTo(1920, 6);
  });
});
