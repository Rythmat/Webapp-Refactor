// ── AdaptiveNoiseFloor ────────────────────────────────────────────────────
// Per-band spectral noise estimation using Martin's minimum statistics.
//
// Unlike the v1 system's simple RMS threshold, this tracks the noise
// spectrum per frequency band, enabling:
//   - Rejection of specific noise frequencies (60Hz hum, fan broadband)
//   - Maintained sensitivity in quiet bands even when other bands are noisy
//   - Continuous adaptation to changing room conditions
//
// Algorithm: Minimum statistics (Martin 2001) — tracks the minimum
// spectral power in each band over a sliding window. The noise floor
// is estimated as this minimum scaled by a bias correction factor.

// ── Constants ─────────────────────────────────────────────────────────────

/** Default number of frequency bands for noise tracking. */
const DEFAULT_NUM_BANDS = 24;

/** Sliding window length in frames for minimum tracking. */
const MIN_WINDOW_FRAMES = 96; // ~2.4s at 40Hz analysis rate

/** Bias correction: minimum is biased low; scale up to estimate mean noise. */
const MIN_TO_MEAN_BIAS = 1.5;

/** How many dB above the noise floor a signal must be to be "present". */
const SIGNAL_MARGIN_DB = 6;

/** EMA smoothing for band power estimates. */
const POWER_SMOOTHING = 0.3;

/** Minimum noise floor in dB (prevents division by zero / infinite SNR). */
const MIN_NOISE_FLOOR_DB = -100;

// ── Class ─────────────────────────────────────────────────────────────────

export class AdaptiveNoiseFloor {
  /** Number of frequency bands. */
  private numBands: number;

  /** Current smoothed power per band (dB). */
  private bandPower: Float64Array;

  /** Minimum power per band over sliding window (dB). */
  private bandMinimum: Float64Array;

  /** Circular buffer of recent band powers for minimum tracking.
   *  Shape: numBands × MIN_WINDOW_FRAMES (row-major). */
  private powerHistory: Float64Array;

  /** Write position in the circular buffer. */
  private historyPos = 0;

  /** Number of frames observed so far. */
  private framesObserved = 0;

  /** Estimated noise floor per band (dB). */
  private noiseFloor: Float64Array;

  /** Whether initial calibration is complete. */
  private calibrated = false;

  /** Band edge frequencies in Hz. Length = numBands + 1. */
  private bandEdges: Float64Array;

  constructor(numBands: number = DEFAULT_NUM_BANDS) {
    this.numBands = numBands;
    this.bandPower = new Float64Array(numBands);
    this.bandMinimum = new Float64Array(numBands).fill(0);
    this.powerHistory = new Float64Array(numBands * MIN_WINDOW_FRAMES);
    this.noiseFloor = new Float64Array(numBands).fill(MIN_NOISE_FLOOR_DB);
    this.bandEdges = new Float64Array(numBands + 1);

    // Initialize band edges: logarithmically spaced from 20Hz to 20kHz
    const logMin = Math.log2(20);
    const logMax = Math.log2(20000);
    for (let i = 0; i <= numBands; i++) {
      this.bandEdges[i] = Math.pow(
        2,
        logMin + (i / numBands) * (logMax - logMin),
      );
    }

    // Fill power history with zeros (= -Infinity dB equivalent)
    this.powerHistory.fill(-120);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Update noise estimate from a frequency-domain frame.
   * Should be called every analysis frame (both silence and signal).
   *
   * @param freqData - Float32Array from AnalyserNode.getFloatFrequencyData() (dB values)
   * @param sampleRate - Audio sample rate in Hz
   */
  update(freqData: Float32Array, sampleRate: number): void {
    const binWidth = sampleRate / (freqData.length * 2);

    // Compute per-band average power
    for (let band = 0; band < this.numBands; band++) {
      const loFreq = this.bandEdges[band];
      const hiFreq = this.bandEdges[band + 1];
      const loBin = Math.max(1, Math.floor(loFreq / binWidth));
      const hiBin = Math.min(freqData.length - 1, Math.ceil(hiFreq / binWidth));

      let sum = 0;
      let count = 0;
      for (let bin = loBin; bin <= hiBin; bin++) {
        sum += freqData[bin];
        count++;
      }

      const avgDb = count > 0 ? sum / count : -120;

      // EMA smooth
      this.bandPower[band] =
        this.bandPower[band] * POWER_SMOOTHING + avgDb * (1 - POWER_SMOOTHING);
    }

    // Store in circular buffer
    for (let band = 0; band < this.numBands; band++) {
      this.powerHistory[band * MIN_WINDOW_FRAMES + this.historyPos] =
        this.bandPower[band];
    }
    this.historyPos = (this.historyPos + 1) % MIN_WINDOW_FRAMES;
    this.framesObserved++;

    // Update minimum statistics
    const windowLen = Math.min(this.framesObserved, MIN_WINDOW_FRAMES);
    for (let band = 0; band < this.numBands; band++) {
      let min = Infinity;
      const bandOffset = band * MIN_WINDOW_FRAMES;
      for (let i = 0; i < windowLen; i++) {
        const val = this.powerHistory[bandOffset + i];
        if (val < min) min = val;
      }
      this.bandMinimum[band] = min;

      // Noise floor = biased minimum
      this.noiseFloor[band] = Math.max(
        MIN_NOISE_FLOOR_DB,
        min + 10 * Math.log10(MIN_TO_MEAN_BIAS),
      );
    }

    if (!this.calibrated && this.framesObserved >= MIN_WINDOW_FRAMES) {
      this.calibrated = true;
    }
  }

  /**
   * Update specifically during known silence (first seconds or gaps >2s).
   * Uses a faster adaptation rate than the general update.
   */
  updateFromSilence(freqData: Float32Array, sampleRate: number): void {
    // Same as update — minimum statistics naturally favors silence frames
    this.update(freqData, sampleRate);
  }

  /**
   * Get the estimated noise floor per frequency band (in dB).
   * Returns a Float64Array of length numBands.
   */
  getNoiseFloor(): Float64Array {
    return this.noiseFloor;
  }

  /**
   * Estimate the noise floor as an RMS value derived from the mean
   * noise floor across bands (dB → linear → RMS approximation).
   */
  getNoiseFloorRms(): number {
    if (!this.calibrated) return 0;
    let sumLinear = 0;
    for (let band = 0; band < this.numBands; band++) {
      sumLinear += Math.pow(10, this.noiseFloor[band] / 20);
    }
    return sumLinear / this.numBands;
  }

  /**
   * Check if the current frame's spectral content is above the noise floor.
   * Returns true if the average SNR across bands exceeds the margin.
   */
  isSignalPresent(freqData: Float32Array, sampleRate: number): boolean {
    if (!this.calibrated) return true; // Assume signal during calibration

    const binWidth = sampleRate / (freqData.length * 2);
    let signalBands = 0;

    for (let band = 0; band < this.numBands; band++) {
      const loFreq = this.bandEdges[band];
      const hiFreq = this.bandEdges[band + 1];

      // Only check piano-relevant bands (27–4200 Hz)
      if (hiFreq < 27 || loFreq > 4200) continue;

      const loBin = Math.max(1, Math.floor(loFreq / binWidth));
      const hiBin = Math.min(freqData.length - 1, Math.ceil(hiFreq / binWidth));

      let sum = 0;
      let count = 0;
      for (let bin = loBin; bin <= hiBin; bin++) {
        sum += freqData[bin];
        count++;
      }

      const avgDb = count > 0 ? sum / count : -120;
      if (avgDb > this.noiseFloor[band] + SIGNAL_MARGIN_DB) {
        signalBands++;
      }
    }

    // Signal present if ≥2 bands are above noise floor
    return signalBands >= 2;
  }

  /**
   * Get the estimated SNR (in dB) for a specific frequency.
   * Positive = signal above noise, negative = below noise.
   */
  getSNR(freqHz: number): number {
    const band = this.freqToBand(freqHz);
    if (band < 0 || band >= this.numBands) return 0;
    return this.bandPower[band] - this.noiseFloor[band];
  }

  /**
   * Get the band index for a given frequency.
   */
  getBandForFreq(freqHz: number): number {
    return this.freqToBand(freqHz);
  }

  /** Whether initial calibration is complete (~2.4s of observation). */
  get isCalibrated(): boolean {
    return this.calibrated;
  }

  /** Number of frequency bands. */
  get bands(): number {
    return this.numBands;
  }

  /** Reset all state. */
  reset(): void {
    this.bandPower.fill(0);
    this.bandMinimum.fill(0);
    this.powerHistory.fill(-120);
    this.noiseFloor.fill(MIN_NOISE_FLOOR_DB);
    this.historyPos = 0;
    this.framesObserved = 0;
    this.calibrated = false;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Map a frequency to a band index. */
  private freqToBand(freqHz: number): number {
    for (let i = 0; i < this.numBands; i++) {
      if (freqHz >= this.bandEdges[i] && freqHz < this.bandEdges[i + 1]) {
        return i;
      }
    }
    return freqHz < this.bandEdges[0] ? 0 : this.numBands - 1;
  }
}
