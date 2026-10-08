import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computePeaks } from '../AudioBufferStore';
import { PEAK_BUCKET_SIZES, buildPeakLevels } from '../peakLevels';
import type { PeakPyramid, PeaksRequest, PeaksResponse } from '../peaks';

// ── Waveform peak pyramid ───────────────────────────────────────────────────
// The timeline used to rescan every sample of every visible clip on each
// redraw. These check the pyramid against brute force, the windowed reads the
// timeline makes, and the worker that builds long takes off the page.

const RATE = 48000;

/** Deterministic noise in [-1, 1), so a failure reproduces. */
function noise(length: number, seed: number): Float32Array<ArrayBuffer> {
  const data = new Float32Array(length);
  let s = seed >>> 0;
  for (let i = 0; i < length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    data[i] = (s / 0x100000000) * 2 - 1;
  }
  return data;
}

/** The part of an AudioBuffer the peaks read, over the given channels. */
function fakeBuffer(channels: Float32Array<ArrayBuffer>[], sampleRate = RATE) {
  const length = channels[0]?.length ?? 0;
  return {
    length,
    sampleRate,
    duration: length / sampleRate,
    numberOfChannels: channels.length,
    getChannelData: vi.fn((c: number) => channels[c]),
  };
}

/**
 * Sample-for-sample equality. A take long enough for the worker has 1.5M
 * samples a channel, and toEqual walks each one through the matcher's generic
 * equality: seconds a call, past the test timeout under a full parallel run.
 */
function sameSamples(a: Float32Array, b: Float32Array): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

/** Largest |sample| over [from, to) of every channel, by brute force. */
function bruteMaxAbs(channels: Float32Array[], from: number, to: number) {
  let peak = 0;
  for (const data of channels) {
    for (let i = Math.max(0, from); i < Math.min(to, data.length); i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  return peak;
}

async function freshPeaks() {
  vi.resetModules();
  return import('../peaks');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildPeakLevels', () => {
  it('matches brute force at every level, for both channels', () => {
    // Not a multiple of any bucket size, so every level ends on a part bucket.
    const length = 100_003;
    const channels = [noise(length, 1), noise(length, 2)];
    const levels = buildPeakLevels(channels, length);

    expect(levels.map((l) => l.bucketSize)).toEqual([...PEAK_BUCKET_SIZES]);
    for (const level of levels) {
      const count = Math.ceil(length / level.bucketSize);
      for (let c = 0; c < 2; c++) {
        expect(level.min[c]).toHaveLength(count);
        for (let b = 0; b < count; b++) {
          const from = b * level.bucketSize;
          const to = Math.min(from + level.bucketSize, length);
          let lo = Infinity;
          let hi = -Infinity;
          for (let i = from; i < to; i++) {
            lo = Math.min(lo, channels[c][i]);
            hi = Math.max(hi, channels[c][i]);
          }
          expect(level.min[c][b]).toBe(lo);
          expect(level.max[c][b]).toBe(hi);
        }
      }
    }
  });

  it('skips NaN samples and reads an empty buffer as no buckets', () => {
    const data = new Float32Array(300);
    data[3] = NaN;
    data[10] = 0.5;
    data[290] = -0.25;
    const [fine] = buildPeakLevels([data], 300);
    expect([...fine.max[0]]).toEqual([0.5, 0]);
    expect([...fine.min[0]]).toEqual([0, -0.25]);

    const empty = buildPeakLevels([new Float32Array(0)], 0);
    expect(empty.every((l) => l.min[0].length === 0)).toBe(true);
  });
});

describe('readPeaks', () => {
  const length = 400_000;
  const channels = [noise(length, 7), noise(length, 8)];
  // A loud transient in the right channel only, mid-buffer.
  channels[1][250_000] = 3;
  const source = fakeBuffer(channels);
  const pyramid: PeakPyramid = {
    length,
    levels: buildPeakLevels(channels, length),
  };

  it('matches brute force at a level’s own resolution', async () => {
    const { readPeaks } = await freshPeaks();
    // 1024 samples a point, from sample 0: each point is one 1k bucket.
    const points = Math.floor(length / 1024);
    const end = points * 1024;
    const peaks = readPeaks(pyramid, source, points, 0, end);
    const scale = bruteMaxAbs(channels, 0, end);
    expect(peaks).toHaveLength(points);
    for (let i = 0; i < points; i++) {
      expect(peaks[i]).toBeCloseTo(
        bruteMaxAbs(channels, i * 1024, (i + 1) * 1024) / scale,
        6,
      );
    }
    expect(Math.max(...peaks)).toBe(1);
  });

  it('agrees with the old full scan on a mono take at an aligned zoom', async () => {
    const { readPeaks } = await freshPeaks();
    const mono = fakeBuffer([channels[0]]);
    const monoPyramid: PeakPyramid = {
      length,
      levels: buildPeakLevels([channels[0]], length),
    };
    // A trimmed window starting on a bucket edge, 4096 samples a point.
    const start = 16 * 4096;
    const end = start + 40 * 4096;
    const old = computePeaks(mono as unknown as AudioBuffer, 40, start, end);
    const now = readPeaks(monoPyramid, mono, 40, start, end);
    expect(now).toHaveLength(40);
    now.forEach((v, i) => expect(v).toBeCloseTo(old[i], 6));
  });

  it('reads the samples themselves when a point is finer than 256 samples', async () => {
    const { readPeaks } = await freshPeaks();
    const start = 1000;
    const end = 1000 + 100 * 37; // 37 samples a point
    const peaks = readPeaks(pyramid, source, 100, start, end);
    const scale = bruteMaxAbs(channels, start, end);
    peaks.forEach((v, i) => {
      const from = start + Math.floor(i * 37);
      expect(v).toBeCloseTo(bruteMaxAbs(channels, from, from + 37) / scale, 6);
    });
  });

  it('reads coarse zooms from the coarse buckets that touch each point', async () => {
    const { readPeaks } = await freshPeaks();
    // ~20k samples a point uses the 16k level; a point covers the buckets it
    // touches, never fewer samples than its own.
    const start = 5000;
    const end = length - 3000;
    const points = Math.floor((end - start) / 20_000);
    const perPoint = (end - start) / points;
    const peaks = readPeaks(pyramid, source, points, start, end);
    const bucket = 16384;
    const scale = bruteMaxAbs(
      channels,
      Math.floor(start / bucket) * bucket,
      Math.ceil(end / bucket) * bucket,
    );
    peaks.forEach((v, i) => {
      const from = start + Math.floor(i * perPoint);
      const to =
        i === points - 1 ? end : start + Math.floor((i + 1) * perPoint);
      const expected = bruteMaxAbs(
        channels,
        Math.floor(from / bucket) * bucket,
        Math.ceil(to / bucket) * bucket,
      );
      expect(v).toBeCloseTo(expected / scale, 6);
      expect(v).toBeGreaterThanOrEqual(
        bruteMaxAbs(channels, from, to) / scale - 1e-6,
      );
    });
  });

  it('reads a visible window as exactly those points of the whole clip', async () => {
    const { readPeaks } = await freshPeaks();
    // What the timeline asks for while scrolling: the same clip, the same
    // points, only the ones on screen.
    for (const points of [90, 1500, 20_000]) {
      const whole = readPeaks(pyramid, source, points, 777, length - 555);
      const first = Math.floor(points / 3);
      const last = Math.floor((points * 2) / 3);
      const visible = readPeaks(
        pyramid,
        source,
        points,
        777,
        length - 555,
        first,
        last,
      );
      expect(visible).toEqual(whole.slice(first, last + 1));
    }
  });

  it('scales the visible points by the loudest point of the whole window', async () => {
    const { readPeaks } = await freshPeaks();
    // The transient at 250 000 is off screen, but still sets the height.
    const points = 400;
    const visible = readPeaks(pyramid, source, points, 0, length, 0, 50);
    const quiet = bruteMaxAbs(channels, 0, 51 * 1000);
    expect(Math.max(...visible)).toBeCloseTo(quiet / 3, 2);
  });

  it('draws a take panned hard right instead of a flat line', async () => {
    const { readPeaks } = await freshPeaks();
    const silent = new Float32Array(50_000);
    const right = noise(50_000, 3);
    const stereo: PeakPyramid = {
      length: 50_000,
      levels: buildPeakLevels([silent, right], 50_000),
    };
    const peaks = readPeaks(stereo, fakeBuffer([silent, right]), 40, 0, 50_000);
    expect(Math.max(...peaks)).toBe(1);
    expect(Math.min(...peaks)).toBeGreaterThan(0.5);
  });

  it('reads an empty or reversed window as silence, and no points as none', async () => {
    const { readPeaks } = await freshPeaks();
    expect(readPeaks(pyramid, source, 10, 500, 500)).toEqual(Array(10).fill(0));
    expect(readPeaks(pyramid, source, 10, 900, 100)).toEqual(Array(10).fill(0));
    expect(readPeaks(pyramid, source, 10, length + 10, length + 999)).toEqual(
      Array(10).fill(0),
    );
    expect(readPeaks(pyramid, source, 10, 0, length, 6, 3)).toEqual([]);
  });
});

describe('getPeakPyramid on the page', () => {
  it('builds once per buffer and keys replaced buffers by identity', async () => {
    const { getPeakPyramid } = await freshPeaks();
    const take = fakeBuffer([noise(RATE * 2, 4)]);
    const first = getPeakPyramid(take);
    expect(first).not.toBeNull();
    expect(getPeakPyramid(take)).toBe(first);
    expect(take.getChannelData).toHaveBeenCalledTimes(1);

    // A pitch-shifted or re-recorded copy is a different buffer: its own
    // pyramid, built from its own samples.
    const replaced = fakeBuffer([noise(RATE * 2, 5)]);
    const second = getPeakPyramid(replaced);
    expect(second).not.toBe(first);
    expect(second!.levels[0].max[0]).not.toEqual(first!.levels[0].max[0]);
  });

  it('summarises a long take on the page when there are no workers', async () => {
    vi.stubGlobal('Worker', undefined);
    const { getPeakPyramid } = await freshPeaks();
    const long = fakeBuffer([noise(RATE * 31, 6)]);
    expect(getPeakPyramid(long)).not.toBeNull();
  });
});

// ── The worker path ─────────────────────────────────────────────────────────

/** Stands in for the peaks worker, answering only when a test says so. */
class StandInWorker {
  static made: StandInWorker[] = [];
  static failToConstruct = false;
  onmessage: ((event: MessageEvent<PeaksResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requests: { request: PeaksRequest; transfer: Transferable[] }[] = [];
  terminated = false;

  constructor(
    readonly url: URL,
    readonly options: WorkerOptions,
  ) {
    if (StandInWorker.failToConstruct) throw new Error('refused');
    StandInWorker.made.push(this);
  }

  postMessage(request: PeaksRequest, transfer: Transferable[]) {
    this.requests.push({ request, transfer });
  }

  terminate() {
    this.terminated = true;
  }

  /** Answer the oldest request the way peaksWorker.ts does. */
  reply() {
    const { request } = this.requests.shift()!;
    const levels = buildPeakLevels(request.channels, request.length);
    this.onmessage?.({ data: { id: request.id, levels } } as MessageEvent);
  }

  replyError() {
    const { request } = this.requests.shift()!;
    this.onmessage?.({
      data: { id: request.id, error: 'unreadable' },
    } as MessageEvent);
  }

  crash() {
    this.onerror?.({ preventDefault() {} } as ErrorEvent);
  }
}

describe('getPeakPyramid with the worker', () => {
  beforeEach(() => {
    StandInWorker.made = [];
    StandInWorker.failToConstruct = false;
    vi.stubGlobal('Worker', StandInWorker);
  });

  it('builds a take of 30 s or less on the page', async () => {
    const { getPeakPyramid } = await freshPeaks();
    expect(getPeakPyramid(fakeBuffer([noise(RATE * 30, 1)]))).not.toBeNull();
    expect(StandInWorker.made).toHaveLength(0);
  });

  it('sends a longer take to the worker as transferred channel copies', async () => {
    const { getPeakPyramid, subscribePeakPyramids } = await freshPeaks();
    const left = noise(RATE * 31, 2);
    const right = noise(RATE * 31, 3);
    const take = fakeBuffer([left, right]);
    const arrived = vi.fn();
    subscribePeakPyramids(arrived);

    expect(getPeakPyramid(take)).toBeNull();
    // Still pending: asking again sends nothing new.
    expect(getPeakPyramid(take)).toBeNull();
    const [worker] = StandInWorker.made;
    expect(worker.options).toEqual({ type: 'module' });
    expect(String(worker.url)).toMatch(/workers\/peaksWorker\.ts$/);
    expect(worker.requests).toHaveLength(1);

    const { request, transfer } = worker.requests[0];
    expect(request.length).toBe(take.length);
    expect(request.channels).toHaveLength(2);
    // Copies, never the buffer's own channel data, and each one transferred.
    // Identity is checked as a boolean: given two different arrays, not.toBe
    // deep-compares them for its message, which takes seconds at this length.
    expect(request.channels[0] === left || request.channels[1] === right).toBe(
      false,
    );
    expect(sameSamples(request.channels[0], left)).toBe(true);
    expect(sameSamples(request.channels[1], right)).toBe(true);
    expect(transfer).toEqual(request.channels.map((c) => c.buffer));

    worker.reply();
    expect(arrived).toHaveBeenCalledTimes(1);
    const pyramid = getPeakPyramid(take);
    expect(pyramid!.levels).toEqual(
      buildPeakLevels([left, right], take.length),
    );
  });

  it('builds on the page when the worker cannot be made', async () => {
    StandInWorker.failToConstruct = true;
    const { getPeakPyramid } = await freshPeaks();
    expect(getPeakPyramid(fakeBuffer([noise(RATE * 40, 4)]))).not.toBeNull();
  });

  it('falls back to the page when the worker fails', async () => {
    const { getPeakPyramid, subscribePeakPyramids } = await freshPeaks();
    const arrived = vi.fn();
    subscribePeakPyramids(arrived);
    const a = fakeBuffer([noise(RATE * 35, 5)]);
    const b = fakeBuffer([noise(RATE * 36, 6)]);
    expect(getPeakPyramid(a)).toBeNull();
    expect(getPeakPyramid(b)).toBeNull();

    const [worker] = StandInWorker.made;
    worker.crash();
    expect(worker.terminated).toBe(true);
    // The timeline redraws, and both takes are summarised on the page.
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(getPeakPyramid(a)).not.toBeNull();
    expect(getPeakPyramid(b)).not.toBeNull();
    // A later long take never waits on the broken worker.
    expect(getPeakPyramid(fakeBuffer([noise(RATE * 50, 7)]))).not.toBeNull();
    expect(StandInWorker.made).toHaveLength(1);
  });

  it('builds one take on the page when the worker cannot read it', async () => {
    const { getPeakPyramid } = await freshPeaks();
    const take = fakeBuffer([noise(RATE * 33, 8)]);
    expect(getPeakPyramid(take)).toBeNull();
    StandInWorker.made[0].replyError();
    expect(getPeakPyramid(take)).not.toBeNull();
    expect(StandInWorker.made[0].requests).toHaveLength(0);
  });
});

describe('peaksWorker', () => {
  it('answers a request with every level, transferring them back', async () => {
    const scope = {
      onmessage: null as ((event: { data: PeaksRequest }) => void) | null,
      postMessage: vi.fn(),
    };
    vi.stubGlobal('self', scope);
    vi.resetModules();
    await import('../../workers/peaksWorker');

    const left = noise(70_000, 9);
    const right = noise(70_000, 10);
    scope.onmessage!({
      data: { id: 12, length: 70_000, channels: [left, right] },
    });

    const [message, transfer] = scope.postMessage.mock.lastCall!;
    expect(message.id).toBe(12);
    expect(message.levels).toEqual(buildPeakLevels([left, right], 70_000));
    expect(transfer).toHaveLength(PEAK_BUCKET_SIZES.length * 4);
    expect(transfer).toContain(message.levels[0].min[0].buffer);
  });
});
