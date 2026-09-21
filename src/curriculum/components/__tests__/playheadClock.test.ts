import { describe, expect, it } from 'vitest';
import {
  advancePlayhead,
  initialClockState,
  type PlayheadFrame,
} from '../playheadClock';

const FRAME = 1 / 60;
const COUNT_IN = 1920;
/** 95 BPM, the tempo in the Funk lesson this was reported from. */
const TICKS_PER_SECOND = (95 / 60) * 480;

/** Run a series of clock readings and report where the playhead went. */
function run(
  readings: (number | null | undefined)[],
  { prev = -COUNT_IN, deltaSeconds = FRAME } = {},
) {
  let state = initialClockState();
  let tick = prev;
  const ticks: number[] = [];
  let gaveUpAt: number | null = null;

  readings.forEach((clockTicks, i) => {
    const frame: PlayheadFrame = {
      prev: tick,
      deltaSeconds,
      clockTicks,
      countInTicks: COUNT_IN,
      ticksPerSecond: TICKS_PER_SECOND,
    };
    const decision = advancePlayhead(state, frame);
    state = decision.state;
    tick = decision.tick;
    ticks.push(tick);
    if (decision.justGaveUp) gaveUpAt = i;
  });

  return { ticks, state, gaveUpAt };
}

describe('advancePlayhead', () => {
  it('free-runs when there is no transport to follow', () => {
    const { ticks } = run([undefined, undefined, undefined]);
    expect(ticks[0]).toBeGreaterThan(-COUNT_IN);
    expect(ticks[2]).toBeGreaterThan(ticks[1]);
  });

  it('holds at the start while the transport has not begun', () => {
    // ticksAt returns null for a moment before the transport starts.
    const { ticks } = run([null, null, null, null]);
    expect(ticks).toEqual([-COUNT_IN, -COUNT_IN, -COUNT_IN, -COUNT_IN]);
  });

  it('follows the transport once it is demonstrably moving', () => {
    const { ticks } = run([0, 20, 60, 120]);
    // 0 and 20 are within the wobble threshold; 60 proves movement.
    expect(ticks[0]).toBe(-COUNT_IN);
    expect(ticks[1]).toBe(-COUNT_IN);
    expect(ticks[2]).toBe(60 - COUNT_IN);
    expect(ticks[3]).toBe(120 - COUNT_IN);
  });

  it('does not count a pre-start null as a reading of tick 0', () => {
    // THE REGRESSION. ticksAt used to answer 0 before the transport began, so
    // the playhead pinned its baseline at 0 and sat on beat 1 for the whole
    // output-latency window — an audible beat at Bluetooth latencies. Nulls
    // must leave the baseline unset so the first real tick starts the measure.
    const withNulls = run([null, null, null, 4000, 4020, 4060]);
    const withoutNulls = run([4000, 4020, 4060]);

    // The baseline is the first REAL reading either way.
    expect(withNulls.state.firstTicks).toBe(4000);
    expect(withoutNulls.state.firstTicks).toBe(4000);
    // And the playhead reaches the same place after the same real readings.
    expect(withNulls.ticks.slice(3)).toEqual(withoutNulls.ticks);
  });

  it('starts following within a few frames of the first real tick', () => {
    // At 95 BPM the transport passes the 30-tick threshold in well under a
    // beat, so the hold is imperceptible rather than a count.
    const perFrame = TICKS_PER_SECOND * FRAME; // ~12.7 ticks
    const readings: (number | null)[] = [null, null];
    for (let i = 0; i < 6; i++) readings.push(5000 + i * perFrame);
    const { ticks } = run(readings);
    const moving = ticks.findIndex((t) => t !== -COUNT_IN);
    expect(moving).toBeGreaterThan(0);
    // Under a quarter of a beat of hold once real ticks arrive.
    expect((moving - 2) * FRAME).toBeLessThan(60 / 95 / 4);
  });

  it('gives up and free-runs if the transport never arrives', () => {
    const readings = Array.from({ length: 90 }, () => null); // 1.5s at 60fps
    const { ticks, gaveUpAt } = run(readings);
    expect(gaveUpAt).not.toBeNull();
    expect(ticks.at(-1)).toBeGreaterThan(-COUNT_IN);
  });

  it('reports giving up exactly once', () => {
    const readings = Array.from({ length: 120 }, () => null);
    let state = initialClockState();
    let tick = -COUNT_IN;
    let count = 0;
    for (const clockTicks of readings) {
      const d = advancePlayhead(state, {
        prev: tick,
        deltaSeconds: FRAME,
        clockTicks,
        countInTicks: COUNT_IN,
        ticksPerSecond: TICKS_PER_SECOND,
      });
      state = d.state;
      tick = d.tick;
      if (d.justGaveUp) count++;
    }
    expect(count).toBe(1);
  });

  it('holds where it is when a running transport stops', () => {
    const { ticks } = run([0, 60, 600, null, null]);
    expect(ticks[2]).toBe(600 - COUNT_IN);
    expect(ticks[3]).toBe(600 - COUNT_IN);
    expect(ticks[4]).toBe(600 - COUNT_IN);
  });

  it('puts transport zero at the roll’s count-in, not at its bar 1', () => {
    // The roll draws a count-in bar before bar 1, so transport 0 is -1920.
    const { ticks } = run([0, 60, COUNT_IN]);
    expect(ticks.at(-1)).toBe(0);
  });
});
