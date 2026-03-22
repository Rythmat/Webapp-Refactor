// ── AdaptiveNoiseFloor.test.ts ───────────────────────────────────────────
// Tests for per-band spectral noise estimation.

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveNoiseFloor } from '../AdaptiveNoiseFloor';

let nf: AdaptiveNoiseFloor;

beforeEach(() => {
  nf = new AdaptiveNoiseFloor();
});

/** Create a fake frequency-domain frame (dB values). */
function makeFreqFrame(numBins: number, fillDb: number): Float32Array {
  return new Float32Array(numBins).fill(fillDb);
}

/** Create a frame with a tone at a specific frequency. */
function makeToneFrame(
  numBins: number,
  toneFreq: number,
  sampleRate: number,
  toneDb: number,
  noiseDb: number,
): Float32Array {
  const frame = new Float32Array(numBins).fill(noiseDb);
  const fftSize = numBins * 2;
  const binWidth = sampleRate / fftSize;
  const toneBin = Math.round(toneFreq / binWidth);
  if (toneBin >= 0 && toneBin < numBins) {
    // Spread the tone across a few bins
    for (
      let b = Math.max(0, toneBin - 2);
      b <= Math.min(numBins - 1, toneBin + 2);
      b++
    ) {
      frame[b] = toneDb;
    }
  }
  return frame;
}

const SR = 48000;
const NUM_BINS = 4097; // fftSize=8192 → 4097 bins

describe('Calibration', () => {
  it('starts uncalibrated', () => {
    expect(nf.isCalibrated).toBe(false);
  });

  it('calibrates after 96 updates (MIN_WINDOW_FRAMES)', () => {
    const frame = makeFreqFrame(NUM_BINS, -80);
    for (let i = 0; i < 95; i++) {
      nf.update(frame, SR);
    }
    expect(nf.isCalibrated).toBe(false);

    nf.update(frame, SR);
    expect(nf.isCalibrated).toBe(true);
  });
});

describe('Noise floor estimation', () => {
  it('converges on steady noise input', () => {
    const noiseDb = -60;
    const frame = makeFreqFrame(NUM_BINS, noiseDb);

    // Feed enough frames to calibrate
    for (let i = 0; i < 100; i++) {
      nf.update(frame, SR);
    }

    const floor = nf.getNoiseFloor();
    // Each band's noise floor should be near the input noise level
    // (biased slightly higher by MIN_TO_MEAN_BIAS factor ≈ +1.76 dB)
    for (let b = 0; b < floor.length; b++) {
      expect(floor[b]).toBeGreaterThan(noiseDb - 5);
      expect(floor[b]).toBeLessThan(noiseDb + 10);
    }
  });
});

describe('isSignalPresent', () => {
  it('returns true during calibration phase', () => {
    const frame = makeFreqFrame(NUM_BINS, -80);
    nf.update(frame, SR);
    // Not calibrated → assume signal
    expect(nf.isSignalPresent(frame, SR)).toBe(true);
  });

  it('returns false for silence after calibration', () => {
    const silenceFrame = makeFreqFrame(NUM_BINS, -80);

    // Calibrate with silence
    for (let i = 0; i < 100; i++) {
      nf.update(silenceFrame, SR);
    }
    expect(nf.isCalibrated).toBe(true);

    // Check: silence should not register as signal
    expect(nf.isSignalPresent(silenceFrame, SR)).toBe(false);
  });

  it('returns true for loud broadband signal above noise floor', () => {
    const silenceFrame = makeFreqFrame(NUM_BINS, -80);

    // Calibrate with silence
    for (let i = 0; i < 100; i++) {
      nf.update(silenceFrame, SR);
    }

    // Create a frame with loud content across piano range (27–4200 Hz)
    // isSignalPresent requires ≥2 bands above noise floor
    const loudFrame = new Float32Array(NUM_BINS).fill(-80);
    const fftSize = NUM_BINS * 2;
    const binWidth = SR / fftSize;
    // Fill bins from 100 Hz to 2000 Hz with loud signal
    const loBin = Math.floor(100 / binWidth);
    const hiBin = Math.ceil(2000 / binWidth);
    for (let b = loBin; b <= Math.min(hiBin, NUM_BINS - 1); b++) {
      loudFrame[b] = -20;
    }
    expect(nf.isSignalPresent(loudFrame, SR)).toBe(true);
  });
});

describe('getSNR', () => {
  it('returns positive SNR for signal above noise', () => {
    const silenceFrame = makeFreqFrame(NUM_BINS, -80);

    // Calibrate
    for (let i = 0; i < 100; i++) {
      nf.update(silenceFrame, SR);
    }

    // Feed a loud frame to update band power
    const toneFrame = makeToneFrame(NUM_BINS, 440, SR, -20, -80);
    nf.update(toneFrame, SR);

    // SNR at 440 Hz should be positive
    const snr = nf.getSNR(440);
    expect(snr).toBeGreaterThan(0);
  });
});

describe('Band properties', () => {
  it('has 24 bands by default', () => {
    expect(nf.bands).toBe(24);
  });

  it('getBandForFreq maps correctly', () => {
    const band440 = nf.getBandForFreq(440);
    const band100 = nf.getBandForFreq(100);
    const band8000 = nf.getBandForFreq(8000);

    // Higher frequencies should map to higher bands
    expect(band440).toBeGreaterThan(band100);
    expect(band8000).toBeGreaterThan(band440);
  });
});

describe('Reset', () => {
  it('clears calibration state', () => {
    const frame = makeFreqFrame(NUM_BINS, -60);
    for (let i = 0; i < 100; i++) nf.update(frame, SR);
    expect(nf.isCalibrated).toBe(true);

    nf.reset();
    expect(nf.isCalibrated).toBe(false);
  });
});
