import { describe, expect, it } from 'vitest';
import {
  MAX_OUTPUT_LATENCY_MS,
  beatSeconds,
  measureOutputLatency,
} from '../latencyCalibration';

const BEAT = beatSeconds();
const clicks = Array.from({ length: 8 }, (_, i) => 10 + i * BEAT);
const tapsAfter = (seconds: number) => clicks.map((c) => c + seconds);

describe('measureOutputLatency', () => {
  it('is the tap delay beyond the reported latency', () => {
    // Bluetooth: taps land 250 ms after each click; the browser reports 40 ms.
    expect(measureOutputLatency(clicks, tapsAfter(0.25), 0.04)).toEqual({
      latencyMs: 210,
      taps: 8,
    });
  });

  it('ignores a stray tap and an off-beat outlier', () => {
    const taps = tapsAfter(0.2);
    taps[3] += 0.12; // one late tap
    taps.push(clicks[5] + 0.45); // an extra tap between clicks
    expect(measureOutputLatency(clicks, taps, 0)?.latencyMs).toBe(200);
  });

  it('rounds to 5 ms and never goes below zero', () => {
    expect(measureOutputLatency(clicks, tapsAfter(0.123), 0)?.latencyMs).toBe(
      125,
    );
    // Early taps (anticipating the click) on a wired output.
    expect(
      measureOutputLatency(clicks, tapsAfter(-0.03), 0.01)?.latencyMs,
    ).toBe(0);
  });

  it('caps the latency', () => {
    // Taps 590 ms late: the latest that still belongs to its click.
    expect(measureOutputLatency(clicks, tapsAfter(0.59), 0)?.latencyMs).toBe(
      MAX_OUTPUT_LATENCY_MS,
    );
  });

  it('needs enough taps to trust', () => {
    expect(
      measureOutputLatency(clicks, tapsAfter(0.2).slice(0, 4), 0),
    ).toBeNull();
  });
});
