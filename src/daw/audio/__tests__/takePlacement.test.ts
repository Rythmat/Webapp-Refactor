import { describe, expect, it } from 'vitest';
import {
  findLagSeconds,
  monoHead,
  placeTake,
  takeAnchor,
} from '../takePlacement';

// ── Where an audio take lands (milestone 1.11 d) ───────────────────────────

/** A transport at `bpm` that started at context time `t0` from `tick0`. */
function transport(bpm: number, t0: number, tick0: number) {
  const ticksPerSecond = (bpm * 480) / 60;
  return {
    ticksPerSecond,
    ticksAtTime: (time: number) => tick0 + (time - t0) * ticksPerSecond,
  };
}

describe('takeAnchor + placeTake', () => {
  it('subtracts the input and output latency from the capture start', () => {
    const { ticksAtTime, ticksPerSecond } = transport(120, 10, 1920);
    const anchor = takeAnchor({
      captureStart: 12.06,
      inputLatency: 0.01,
      outputLatency: 0.05,
      transportStart: 10,
      ticksAtTime,
      ticksPerSecond,
    });
    expect(anchor.heard).toBeCloseTo(12, 9);
    // 2 s after the start at 960 ticks a second.
    expect(placeTake(anchor, 0)).toEqual({ startTick: 3840, offsetSeconds: 0 });
  });

  it('follows the tempo', () => {
    const { ticksAtTime, ticksPerSecond } = transport(90, 10, 0);
    const anchor = takeAnchor({
      captureStart: 11.02,
      inputLatency: 0.005,
      outputLatency: 0.015,
      transportStart: 10,
      ticksAtTime,
      ticksPerSecond,
    });
    // 1 s at 720 ticks a second.
    expect(placeTake(anchor, 0).startTick).toBe(720);
  });

  it('trims audio from before the transport started', () => {
    const { ticksAtTime, ticksPerSecond } = transport(120, 10, 960);
    const anchor = takeAnchor({
      captureStart: 9.9,
      inputLatency: 0.02,
      outputLatency: 0.03,
      transportStart: 10,
      ticksAtTime,
      ticksPerSecond,
    });
    const placed = placeTake(anchor, 0);
    expect(placed.startTick).toBe(960);
    expect(placed.offsetSeconds).toBeCloseTo(0.15, 9);
  });

  it('skips decoded audio that starts early, and starts later for late audio', () => {
    const { ticksAtTime, ticksPerSecond } = transport(120, 10, 0);
    const anchor = takeAnchor({
      captureStart: 11,
      inputLatency: 0,
      outputLatency: 0,
      transportStart: 10,
      ticksAtTime,
      ticksPerSecond,
    });
    const early = placeTake(anchor, 0.08);
    expect(early.startTick).toBe(960);
    expect(early.offsetSeconds).toBeCloseTo(0.08, 9);
    const late = placeTake(anchor, -0.05);
    expect(late).toEqual({ startTick: 1008, offsetSeconds: 0 });
  });
});

/** Deterministic noise with a few loud bursts (like a voice's onsets). */
function signal(length: number, seed = 1): Float32Array {
  const out = new Float32Array(length);
  let x = seed >>> 0;
  for (let i = 0; i < length; i++) {
    // mulberry32
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const noise = ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
    const burst = Math.floor(i / 6000) % 3 === 0 ? 1 : 0.1;
    out[i] = noise * burst;
  }
  return out;
}

describe('findLagSeconds', () => {
  const rate = 48000;
  const source = signal(rate * 4);

  it('finds decoded audio that starts earlier than the tap', () => {
    const lag = Math.round(0.0373 * rate);
    const reference = source.subarray(lag, lag + rate * 2.5);
    const target = source.subarray(0, rate * 3);
    expect(
      Math.abs(findLagSeconds(reference, target, rate) - 0.0373),
    ).toBeLessThan(0.001);
  });

  it('finds decoded audio that starts later than the tap', () => {
    const lag = Math.round(0.121 * rate);
    const reference = source.subarray(0, rate * 2.5);
    const target = source.subarray(lag, lag + rate * 3);
    expect(
      Math.abs(findLagSeconds(reference, target, rate) + 0.121),
    ).toBeLessThan(0.001);
  });

  it('assumes no lag over silence', () => {
    const silence = new Float32Array(rate * 3);
    expect(findLagSeconds(silence, source, rate)).toBe(0);
  });

  it('assumes no lag when the two are unrelated', () => {
    const other = signal(rate * 3, 777);
    expect(findLagSeconds(source.subarray(0, rate * 2), other, rate)).toBe(0);
  });
});

describe('monoHead', () => {
  it('mixes channels and stops at the shortest', () => {
    const mono = monoHead(
      [new Float32Array([1, 1, 1]), new Float32Array([0, 1])],
      5,
    );
    expect(Array.from(mono)).toEqual([0.5, 1]);
  });
});
