import { describe, expect, it } from 'vitest';
import {
  CLOCK_SAMPLES_KEPT,
  createServerClockEstimate,
  estimateClockOffset,
  median,
  pongSample,
  sampleOffset,
  toLocalTime,
  toServerTime,
  type ClockSample,
} from './serverClock';

/**
 * The clock check (serverClock.ts): how far this device's clock is from the
 * server's, from the session's ping/pong. Echo in the classroom starts each
 * round on every device by it.
 */

/** A ping and pong for a device `skew` ms ahead of the server. */
const sample = (
  at: number,
  skew: number,
  out: number,
  back: number,
): ClockSample => ({
  sentAt: at + skew,
  serverAt: at + out,
  receivedAt: at + out + back + skew,
});

describe('the clock check', () => {
  it('reads the offset from the middle of a round trip', () => {
    // An even trip: exactly the skew, the other way.
    expect(sampleOffset(sample(1000, 250, 40, 40))).toBe(-250);
    // An uneven one is off by half the difference.
    expect(sampleOffset(sample(1000, 250, 60, 20))).toBe(-230);
  });

  it('takes the median, so one slow trip doesn’t move it', () => {
    const samples = [
      sample(0, -500, 30, 30),
      sample(250, -500, 25, 35),
      sample(500, -500, 35, 25),
      sample(750, -500, 30, 30),
      sample(1000, -500, 1800, 20), // a stall on the way out
    ];
    expect(estimateClockOffset(samples)).toBe(500);
  });

  it('ignores a pong that can’t be right', () => {
    const backwards = { sentAt: 1000, serverAt: 5000, receivedAt: 900 };
    const slow = { sentAt: 0, serverAt: 10, receivedAt: 9000 };
    expect(estimateClockOffset([backwards, slow])).toBeNull();
    expect(estimateClockOffset([backwards, sample(0, 100, 20, 20)])).toBe(-100);
  });

  it('keeps the latest samples as it goes', () => {
    const estimate = createServerClockEstimate();
    expect(estimate.synced()).toBe(false);
    expect(estimate.offset()).toBe(0);
    for (let i = 0; i < CLOCK_SAMPLES_KEPT; i++) {
      estimate.add(sample(i * 100, 300, 20, 20));
    }
    expect(estimate.offset()).toBe(-300);
    // The device's clock is corrected: the newer samples win.
    for (let i = 0; i < CLOCK_SAMPLES_KEPT; i++) {
      estimate.add(sample(10_000 + i * 100, 0, 20, 20));
    }
    expect(estimate.offset()).toBe(0);
    expect(estimate.synced()).toBe(true);
  });

  it('reads the party’s pong, its server time as ISO', () => {
    const at = '2026-10-21T10:00:00.120Z';
    const server = Date.parse(at);
    expect(pongSample({ t: server - 60, at, receivedAt: server + 40 })).toEqual(
      { sentAt: server - 60, serverAt: server, receivedAt: server + 40 },
    );
    expect(pongSample({ t: 1, at: 'not a time', receivedAt: 2 })).toBeNull();
  });

  it('turns a round’s start into this device’s time and back', () => {
    expect(toLocalTime(10_000, 250)).toBe(9_750);
    expect(toServerTime(9_750, 250)).toBe(10_000);
  });

  it('medians as it should', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
