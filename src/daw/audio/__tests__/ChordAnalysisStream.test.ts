// ── ChordAnalysisStream.test.ts ────────────────────────────────────────────
// The DAW-free driving loop must report exactly what the Studio detector
// computes on the same frames (voted chord, raw frame match, chroma), at
// Studio's ~20 Hz, and must stay free of the Studio store.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioChordDetector } from '../AudioChordDetector';
import {
  CHORD_STREAM_THROTTLE_MS,
  ChordAnalysisStream,
  type ChordStreamFrame,
} from '../ChordAnalysisStream';
import streamSource from '../ChordAnalysisStream.ts?raw';
import { createMockAnalyser } from '../../../learn/audio/v2/__tests__/testUtils';

const SAMPLE_RATE = 48000;
const FFT_SIZE = 16384;
const BIN_HZ = SAMPLE_RATE / FFT_SIZE;
const SOUND = new Float32Array(FFT_SIZE).fill(0.1);
const SILENCE = new Float32Array(FFT_SIZE);
const IONIAN = [0, 2, 4, 5, 7, 9, 11];

/** dB spectrum with a fundamental and a quieter 2nd harmonic per note. */
function spectrum(midis: number[]): Float32Array {
  const data = new Float32Array(FFT_SIZE / 2).fill(-100);
  for (const midi of midis) {
    const hz = 440 * Math.pow(2, (midi - 69) / 12);
    data[Math.round(hz / BIN_HZ)] = -20;
    data[Math.round((2 * hz) / BIN_HZ)] = -35;
  }
  return data;
}

const OPEN_C = [48, 52, 55, 60, 64];
const OPEN_AM7 = [45, 52, 55, 60, 64];
const G7 = [43, 47, 50, 53, 55, 59];

type Frame = { midis: number[] | null; key?: [number, number[]] };
const SCRIPT: Frame[] = [
  { midis: null },
  ...Array.from({ length: 6 }, () => ({ midis: OPEN_C })),
  ...Array.from({ length: 6 }, () => ({ midis: OPEN_AM7 })),
  { midis: G7, key: [0, IONIAN] },
  ...Array.from({ length: 5 }, () => ({ midis: G7 })),
  { midis: null },
  { midis: null },
];

function makeAnalyser() {
  return createMockAnalyser({ sampleRate: SAMPLE_RATE, fftSize: FFT_SIZE });
}

function load(analyser: ReturnType<typeof makeAnalyser>, frame: Frame) {
  analyser.setTimeDomainData(frame.midis ? SOUND : SILENCE);
  analyser.setFrequencyData(spectrum(frame.midis ?? []));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChordAnalysisStream', () => {
  it('reports what AudioChordDetector computes, frame for frame', () => {
    const analyser = makeAnalyser();
    const frames: ChordStreamFrame[] = [];
    const stream = new ChordAnalysisStream(
      analyser as unknown as AnalyserNode,
      (f) => frames.push(f),
    );
    const direct = new AudioChordDetector(FFT_SIZE, 'guitar');
    const expected: Omit<ChordStreamFrame, 'perfMs'>[] = [];

    SCRIPT.forEach((frame, i) => {
      load(analyser, frame);
      if (frame.key) {
        stream.setKeyContext(...frame.key);
        direct.setKeyContext(...frame.key);
      }
      stream.step(i * CHORD_STREAM_THROTTLE_MS);
      expected.push({
        result: direct.analyze(analyser as unknown as AnalyserNode),
        frameMatch: direct.getLastFrameMatch(),
        chroma: direct.getLastChroma(),
      });
    });

    expect(frames.map(({ perfMs: _perfMs, ...rest }) => rest)).toEqual(
      expected,
    );
    expect(frames.map((f) => f.perfMs)).toEqual(
      SCRIPT.map((_, i) => i * CHORD_STREAM_THROTTLE_MS),
    );
    // The raw match moves before the vote does (why segmenting reads it).
    expect(frames[1].result).toBeNull();
    expect(frames[1].frameMatch).toMatchObject({ rootPc: 0, quality: 'major' });
  });

  it('analyses at most once per 50 ms', () => {
    const analyze = vi.spyOn(AudioChordDetector.prototype, 'analyze');
    const onFrame = vi.fn();
    const stream = new ChordAnalysisStream(
      makeAnalyser() as unknown as AnalyserNode,
      onFrame,
    );
    for (let t = 1000; t <= 1200; t += 10) stream.step(t);
    expect(analyze).toHaveBeenCalledTimes(5);
    expect(onFrame.mock.calls.map(([f]) => f.perfMs)).toEqual([
      1000, 1050, 1100, 1150, 1200,
    ]);
  });

  it('reset() clears the vote and analyses the next step at once', () => {
    const analyser = makeAnalyser();
    const frames: ChordStreamFrame[] = [];
    const stream = new ChordAnalysisStream(
      analyser as unknown as AnalyserNode,
      (f) => frames.push(f),
    );
    load(analyser, { midis: OPEN_C });
    for (let i = 0; i < 6; i++) stream.step(i * 50);
    expect(frames[frames.length - 1].result).toMatchObject({ rootPc: 0 });

    stream.reset();
    stream.step(260); // under the throttle, but a fresh start
    const fresh = new AudioChordDetector(FFT_SIZE, 'guitar');
    expect(frames).toHaveLength(7);
    expect(frames[6].result).toEqual(
      fresh.analyze(analyser as unknown as AnalyserNode),
    );
  });

  it('runs its own animation-frame loop until stopped', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callbacks.set(nextId, cb);
      return nextId++;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
    const runFrame = (time: number) => {
      const due = [...callbacks.values()];
      callbacks.clear();
      due.forEach((cb) => cb(time));
    };

    const onFrame = vi.fn();
    const stream = new ChordAnalysisStream(
      makeAnalyser() as unknown as AnalyserNode,
      onFrame,
    );
    stream.start();
    stream.start(); // idempotent
    expect(callbacks.size).toBe(1);
    for (let t = 16; t <= 1000; t += 16) runFrame(t);
    // 60 fps frames, throttled to one analysis per >= 50 ms.
    const times = onFrame.mock.calls.map(([f]) => f.perfMs);
    expect(times.length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(50);
    }

    stream.stop();
    const count = onFrame.mock.calls.length;
    runFrame(2000);
    expect(onFrame).toHaveBeenCalledTimes(count);
  });

  it('imports nothing from the Studio store or its hooks', () => {
    const imports = [...streamSource.matchAll(/from '([^']+)'/g)].map(
      (m) => m[1],
    );
    expect(imports).toEqual(['./AudioChordDetector']);
  });
});
