import { describe, it, expect } from 'vitest';
import { decodeCbor } from '../cbor.ts';
import { bucketFilterType } from '../mapping/filters.ts';
import { cycleToBar } from '../mapping/lfos.ts';
import { packTableName } from '../mapping/oscillators.ts';
import {
  filterFreqToHz,
  resoToQ,
  panToUnit,
  tablePosToUnit,
  foldPitch,
} from '../serumDefaults.ts';
import { downsampleFrames, FRAME_SIZE } from '../wavetable.ts';

describe('cbor decoder', () => {
  it('decodes a nested map with strings, floats, and arrays', () => {
    // {"a": 1.5(f64), "b": [true, null, -3], "s": "hi"}
    const buf = new Uint8Array([
      0xa3, // map(3)
      0x61,
      0x61, // "a"
      0xfb,
      0x3f,
      0xf8,
      0,
      0,
      0,
      0,
      0,
      0, // 1.5
      0x61,
      0x62, // "b"
      0x83,
      0xf5,
      0xf6,
      0x22, // [true, null, -3]
      0x61,
      0x73, // "s"
      0x62,
      0x68,
      0x69, // "hi"
    ]);
    expect(decodeCbor(buf)).toEqual({ a: 1.5, b: [true, null, -3], s: 'hi' });
  });

  it('decodes float32 and uint16 lengths', () => {
    // [f32(0.25), text(len via 8-bit)]
    const label = 'x'.repeat(30);
    const buf = new Uint8Array([
      0x82,
      0xfa,
      0x3e,
      0x80,
      0,
      0, // 0.25f
      0x78,
      30,
      ...[...label].map((c) => c.charCodeAt(0)),
    ]);
    expect(decodeCbor(buf)).toEqual([0.25, label]);
  });
});

describe('unit converters', () => {
  it('filter freq: 0 → 20Hz floor, 1 → 20kHz ceil, 0.5 → geometric middle', () => {
    expect(filterFreqToHz(0)).toBe(20);
    expect(filterFreqToHz(1)).toBe(20000);
    const mid = filterFreqToHz(0.5);
    expect(mid).toBeGreaterThan(300);
    expect(mid).toBeLessThan(700); // sqrt(8·22050) ≈ 420
  });

  it('resonance taper is gentle low, hot high', () => {
    expect(resoToQ(0)).toBeCloseTo(0.5);
    expect(resoToQ(50)).toBeLessThan(10);
    expect(resoToQ(100)).toBe(30);
  });

  it('pan and table position normalize', () => {
    expect(panToUnit(-50)).toBe(-1);
    expect(panToUnit(25)).toBe(0.5);
    expect(tablePosToUnit(128)).toBe(0.5);
    expect(tablePosToUnit(300)).toBe(1);
  });

  it('foldPitch clamps into Oracle ranges preserving total semitones', () => {
    expect(foldPitch(0, 5)).toEqual({ octave: 0, semitone: 5 });
    expect(foldPitch(4, 0)).toEqual({ octave: 3, semitone: 12 });
    expect(foldPitch(-4, -6)).toEqual({ octave: -3, semitone: -12 });
    expect(foldPitch(2, 14)).toEqual({ octave: 3, semitone: 2 });
  });
});

describe('filter type buckets', () => {
  it.each([
    ['L12', 'lowpass', true],
    ['MgL24', 'lowpass', false],
    ['LadderEMS', 'lowpass', false],
    ['H24', 'highpass', true],
    ['B12', 'bandpass', true],
    ['BandReject', 'notch', true],
    ['Phase48P', 'allpass', false],
    ['Comb2', 'bandpass', false],
    ['FormantTWO', 'bandpass', false],
    ['TotallyUnknownType', 'lowpass', false],
  ])('%s → %s (exact=%s)', (serum, oracle, exact) => {
    const bucket = bucketFilterType(serum);
    expect(bucket.type).toBe(oracle);
    expect(bucket.exact).toBe(exact);
  });
});

describe('LFO cycle conversion', () => {
  const triangle = {
    x: [0, 0.5, 1],
    y: [1, 0, 1], // Serum y: 0 = top
    curve: [0.5, 0.5, 0.5],
  };

  it('inverts Serum y and spans the bar', () => {
    const bar = cycleToBar(triangle, 1);
    expect(bar[0]).toMatchObject({ time: 0, value: 0 });
    expect(bar.find((n) => n.value === 1)?.time).toBeCloseTo(0.5);
    expect(bar[bar.length - 1].time).toBe(1);
  });

  it('replicates cycles for higher rates', () => {
    const bar = cycleToBar(triangle, 4);
    const peaks = bar.filter((n) => n.value === 1);
    expect(peaks.length).toBe(4);
    for (const node of bar) {
      expect(node.time).toBeGreaterThanOrEqual(0);
      expect(node.time).toBeLessThanOrEqual(1);
    }
  });

  it('thins dense cycles to stay under the node budget', () => {
    const dense = {
      x: Array.from({ length: 65 }, (_, i) => i / 64),
      y: Array.from({ length: 65 }, (_, i) => (i % 2) as number),
      curve: [],
    };
    const bar = cycleToBar(dense, 8, 64);
    expect(bar.length).toBeLessThanOrEqual(66); // budget + closing nodes
  });
});

describe('wavetable helpers', () => {
  it('pack table name strips path and extension', () => {
    expect(packTableName('S2 Tables/Analog/Basic Shapes.wav')).toBe(
      'S2/Basic Shapes',
    );
    expect(packTableName('/Analog/PWM Square.wav')).toBe('S2/PWM Square');
  });

  it('downsample keeps ends and count', () => {
    const frames = Array.from({ length: 100 }, (_, i) =>
      new Float32Array(FRAME_SIZE).fill(i),
    );
    const out = downsampleFrames(frames, 8);
    expect(out.length).toBe(8);
    expect(out[0][0]).toBe(0);
    expect(out[7][0]).toBe(99);
  });

  it('short tables pass through untouched', () => {
    const frames = [new Float32Array(FRAME_SIZE)];
    expect(downsampleFrames(frames, 32)).toBe(frames);
  });
});
