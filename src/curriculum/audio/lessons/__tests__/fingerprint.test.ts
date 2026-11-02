import { describe, expect, it } from 'vitest';
import {
  BAND_COUNT,
  bandHz,
  bandsOf,
  fft,
  fingerprint,
  hzToX,
  xToHz,
} from '../hear-the-kit/fingerprint';

const RATE = 48000;
const sine = (hz: number, seconds = 1) =>
  Float32Array.from({ length: RATE * seconds }, (_, i) =>
    Math.sin((2 * Math.PI * hz * i) / RATE),
  );

const loudest = (print: Float32Array) =>
  print.reduce((best, v, i) => (v > print[best] ? i : best), 0);

describe('a stem’s fingerprint', () => {
  it('finds a tone in its own band', () => {
    for (const hz of [60, 220, 1000, 5000]) {
      const band = loudest(fingerprint(sine(hz), RATE));
      expect(Math.abs(Math.log2(bandHz(band) / hz))).toBeLessThan(0.2);
    }
  });

  it('transforms a known wave', () => {
    const re = Float64Array.from({ length: 8 }, (_, i) =>
      Math.cos((2 * Math.PI * i) / 8),
    );
    const im = new Float64Array(8);
    fft(re, im);
    expect(re[1]).toBeCloseTo(4, 9);
    expect(re[7]).toBeCloseTo(4, 9);
    expect(re[0]).toBeCloseTo(0, 9);
  });

  it('gathers a live reading into the same bands', () => {
    const data = new Float32Array(4096).fill(-200);
    data[Math.round(1000 / (RATE / 2 / 4096))] = -20;
    const out = new Float32Array(BAND_COUNT);
    bandsOf(data, RATE, out);
    expect(Math.abs(Math.log2(bandHz(loudest(out)) / 1000))).toBeLessThan(0.2);
    expect(out[loudest(out)]).toBeCloseTo(-20, 3);
  });

  it('spaces the picture by octaves, and back again', () => {
    expect(hzToX(200) - hzToX(100)).toBeCloseTo(hzToX(2000) - hzToX(1000), 9);
    expect(xToHz(hzToX(440))).toBeCloseTo(440, 6);
  });
});
