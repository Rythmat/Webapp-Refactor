// ── OnsetStream ───────────────────────────────────────────────────────────
// Spectral-flux-only onset detection at sub-frame resolution.
//
// Unlike the v1 OnsetDetector (dual-path: spectral flux + energy rise,
// boolean output, 80ms refractory period), this stream:
//   - Uses only spectral flux (the HMM handles onset confirmation)
//   - Emits OnsetEvent with continuous strength (not boolean)
//   - Has no refractory period (the HMM prevents rapid state changes)
//   - Computes spectral centroid for onset characterization
//
// Piano-weighted: only considers bins in the 27–4200 Hz range.

import { PIANO_MIN_FREQ, PIANO_MAX_FREQ, type OnsetEvent } from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** EMA smoothing for flux baseline tracking. */
const FLUX_EMA_ALPHA = 0.05;

/** Onset fires when flux > baseline × this multiplier. */
const FLUX_MULTIPLIER = 1.8; // matches librosa/madmom real-time range (1.5-2.0)

/** Minimum absolute flux threshold (prevent triggers during silence). */
const MIN_FLUX_THRESHOLD = 0.005;

// ── Class ─────────────────────────────────────────────────────────────────

export class OnsetStream {
  private fftSize: number;
  private freqBuffer: Float32Array;
  private prevSpectrum: Float32Array | null = null;
  private fluxEma = 0;
  private frameCount = 0;

  constructor(fftSize: number = 512) {
    this.fftSize = fftSize;
    this.freqBuffer = new Float32Array(fftSize / 2);
  }

  /**
   * Process one frame from the onset analyser.
   * Returns an OnsetEvent if onset detected, null otherwise.
   */
  process(analyser: AnalyserNode): OnsetEvent | null {
    const sampleRate = analyser.context.sampleRate;
    analyser.getFloatFrequencyData(
      this.freqBuffer as Float32Array<ArrayBuffer>,
    );

    if (!this.prevSpectrum) {
      this.prevSpectrum = new Float32Array(this.freqBuffer.length);
      this.prevSpectrum.set(this.freqBuffer);
      this.frameCount++;
      return null;
    }

    // Compute piano-weighted spectral flux (half-wave rectified)
    const binWidth = sampleRate / this.fftSize;
    const loBin = Math.max(1, Math.floor(PIANO_MIN_FREQ / binWidth));
    const hiBin = Math.min(
      this.freqBuffer.length - 1,
      Math.ceil(PIANO_MAX_FREQ / binWidth),
    );

    let flux = 0;
    let centroidNum = 0;
    let centroidDen = 0;
    let count = 0;

    for (let k = loBin; k <= hiBin; k++) {
      const diff = this.freqBuffer[k] - this.prevSpectrum[k];
      if (diff > 0) {
        flux += diff;
        count++;
      }
      // Spectral centroid (over positive differences only, for onset character)
      const mag = Math.max(0, diff);
      const freq = k * binWidth;
      centroidNum += freq * mag;
      centroidDen += mag;
    }

    // Normalize flux by number of bins
    const normalizedFlux = count > 0 ? flux / (hiBin - loBin + 1) : 0;

    // Update flux baseline (EMA), capped to prevent drift during sustained loud passages
    this.fluxEma =
      this.fluxEma * (1 - FLUX_EMA_ALPHA) + normalizedFlux * FLUX_EMA_ALPHA;
    this.fluxEma = Math.min(this.fluxEma, 0.1);

    // Store current spectrum for next frame
    this.prevSpectrum.set(this.freqBuffer);
    this.frameCount++;

    // Need at least a few frames to establish baseline
    if (this.frameCount < 4) return null;

    // Onset detection: flux exceeds adaptive threshold
    const threshold = Math.max(
      MIN_FLUX_THRESHOLD,
      this.fluxEma * FLUX_MULTIPLIER,
    );

    if (normalizedFlux > threshold) {
      // Compute onset strength as ratio above threshold (clamped 0–1)
      const strength = Math.min(1, (normalizedFlux - threshold) / threshold);

      const spectralCentroid =
        centroidDen > 0 ? centroidNum / centroidDen : 1000;

      return {
        timestamp: performance.now(),
        strength,
        spectralCentroid,
      };
    }

    return null;
  }

  /** Reset all state. */
  reset(): void {
    this.prevSpectrum = null;
    this.fluxEma = 0;
    this.frameCount = 0;
  }
}
