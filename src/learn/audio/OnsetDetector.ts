// ── OnsetDetector ────────────────────────────────────────────────────────
// Fast onset detection from a small-FFT analyser node (~42ms latency).
//
// Uses DUAL detection for robustness:
//   1. Spectral flux: detects frequency-domain changes (catches soft attacks,
//      rejects non-pitched transients like desk thumps)
//   2. Energy rise: RMS envelope comparison (catches loud transients quickly)
//
// Either path triggers an onset. Spectral flux catches what energy misses
// (soft legato, notes without strong amplitude change) and energy rise
// catches what spectral flux misses (very fast attacks where spectral bins
// haven't updated yet).

// ── Types ────────────────────────────────────────────────────────────────

export interface OnsetEvent {
  /** Timestamp from performance.now() */
  time: number;
  /** RMS level at onset (0–1 normalized) */
  level: number;
}

type OnsetCallback = (event: OnsetEvent) => void;

// ── Constants ────────────────────────────────────────────────────────────

// Energy-based onset
const ONSET_RISE_DB = 8; // dB rise above envelope to trigger onset
const ENVELOPE_ALPHA = 0.15; // EMA smoothing (fast follower)

// Spectral flux onset
const FLUX_THRESHOLD = 0.15; // spectral flux above this = onset
const FLUX_EMA_ALPHA = 0.2; // EMA for adaptive flux threshold
const FLUX_MULTIPLIER = 2.5; // onset when flux > mean * multiplier

// Piano frequency range for weighted flux (bins outside are downweighted)
const PIANO_LO_HZ = 27; // A0
const PIANO_HI_HZ = 4200; // ~C8

// Shared
const MIN_INTERVAL_MS = 80; // minimum ms between onsets
const NOISE_FLOOR_RMS = 0.003; // ignore signals below this

// ── Class ────────────────────────────────────────────────────────────────

export class OnsetDetector {
  // Energy path
  private envelope = 0;

  // Spectral flux path
  private prevSpectrum: Float32Array | null = null;
  private fluxEma = 0;

  // Shared
  private lastOnsetTime = 0;
  private callback: OnsetCallback | null = null;
  private timeBuffer: Float32Array;
  private freqBuffer: Float32Array;
  private fftSize: number;

  constructor(fftSize: number = 2048) {
    this.fftSize = fftSize;
    this.timeBuffer = new Float32Array(fftSize);
    this.freqBuffer = new Float32Array(fftSize / 2);
  }

  /** Set the onset callback. */
  setCallback(cb: OnsetCallback): void {
    this.callback = cb;
  }

  /** Process one frame from the onset analyser. Call at RAF rate (~60Hz). */
  process(analyser: AnalyserNode): boolean {
    analyser.getFloatTimeDomainData(
      this.timeBuffer as Float32Array<ArrayBuffer>,
    );
    analyser.getFloatFrequencyData(
      this.freqBuffer as Float32Array<ArrayBuffer>,
    );

    const sampleRate = analyser.context.sampleRate;

    // Compute RMS
    let sum = 0;
    for (let i = 0; i < this.timeBuffer.length; i++) {
      sum += this.timeBuffer[i] * this.timeBuffer[i];
    }
    const rms = Math.sqrt(sum / this.timeBuffer.length);

    // Below noise floor — decay and skip
    if (rms < NOISE_FLOOR_RMS) {
      this.envelope *= 0.95;
      this.fluxEma *= 0.9;
      return false;
    }

    // ── Path 1: Spectral flux ──────────────────────────────────────────
    let fluxTriggered = false;

    if (this.prevSpectrum) {
      const flux = this.computeSpectralFlux(sampleRate);

      // Adaptive threshold: onset when flux > max(absolute, relative to mean)
      const adaptiveThreshold = Math.max(
        FLUX_THRESHOLD,
        this.fluxEma * FLUX_MULTIPLIER,
      );

      if (flux > adaptiveThreshold) {
        fluxTriggered = true;
      }

      // Update flux EMA
      this.fluxEma =
        FLUX_EMA_ALPHA * flux + (1 - FLUX_EMA_ALPHA) * this.fluxEma;
    }

    // Store current spectrum for next frame's flux computation
    if (!this.prevSpectrum) {
      this.prevSpectrum = new Float32Array(this.freqBuffer.length);
    }
    this.prevSpectrum.set(this.freqBuffer);

    // ── Path 2: Energy rise ────────────────────────────────────────────
    let energyTriggered = false;

    const rmsDb = 20 * Math.log10(rms);
    const envelopeDb =
      this.envelope > 0 ? 20 * Math.log10(this.envelope) : -100;

    // Update envelope (EMA)
    this.envelope = ENVELOPE_ALPHA * rms + (1 - ENVELOPE_ALPHA) * this.envelope;

    const rise = rmsDb - envelopeDb;
    if (rise >= ONSET_RISE_DB) {
      energyTriggered = true;
    }

    // ── Combine: either path triggers onset ────────────────────────────
    const now = performance.now();

    if (
      (fluxTriggered || energyTriggered) &&
      now - this.lastOnsetTime >= MIN_INTERVAL_MS
    ) {
      this.lastOnsetTime = now;
      const normalizedLevel = Math.min(1, rms * 2);

      this.callback?.({
        time: now,
        level: normalizedLevel,
      });

      // Reset envelope to current level so we don't re-trigger
      this.envelope = rms;
      return true;
    }

    return false;
  }

  /** Reset detector state. */
  reset(): void {
    this.envelope = 0;
    this.lastOnsetTime = 0;
    this.prevSpectrum = null;
    this.fluxEma = 0;
  }

  // ── Spectral flux computation ────────────────────────────────────────

  /**
   * Compute weighted spectral flux: sum of positive dB differences between
   * current and previous spectrum, weighted toward piano frequency range.
   */
  private computeSpectralFlux(sampleRate: number): number {
    const prev = this.prevSpectrum!;
    const curr = this.freqBuffer;
    const binWidth = sampleRate / this.fftSize;

    // Piano-range bin indices
    const loBin = Math.max(1, Math.floor(PIANO_LO_HZ / binWidth));
    const hiBin = Math.min(curr.length - 1, Math.ceil(PIANO_HI_HZ / binWidth));

    let flux = 0;
    let count = 0;

    for (let k = loBin; k <= hiBin; k++) {
      // Positive half-wave rectified difference (only increases = onsets)
      const diff = curr[k] - prev[k];
      if (diff > 0) {
        // Convert dB difference to linear scale for meaningful summation
        flux += diff;
        count++;
      }
    }

    // Normalize by number of bins for scale independence
    return count > 0 ? flux / (hiBin - loBin + 1) : 0;
  }
}
