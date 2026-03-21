// ── InstrumentProfiler ────────────────────────────────────────────────────
// Learns the specific piano's spectral characteristics from the first
// few notes played. After 5–10 high-confidence detections, it:
//   1. Fits inharmonicity coefficient B per key (interpolated across range)
//   2. Estimates microphone/room spectral envelope correction
//
// The corrections are applied to PianoTemplates for better NMF matching.

import { PianoTemplates } from './PianoTemplates';
import { A4_FREQ } from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** Minimum notes observed before profiling is considered ready. */
const MIN_NOTES_FOR_CALIBRATION = 5;

/** Maximum notes to collect before stopping profiling. */
const MAX_PROFILED_NOTES = 20;

/** Number of harmonics to analyze per note. */
const HARMONICS_TO_ANALYZE = 10;

/** Default inharmonicity if estimation fails. */
const DEFAULT_INHARMONICITY = 0.0005;

/** Theoretical harmonic decay exponent (amplitude = 1/k^exp). */
const THEORETICAL_DECAY_EXPONENT = 0.7;

// ── Types ─────────────────────────────────────────────────────────────────

interface ProfiledNote {
  midiNote: number;
  inharmonicity: number;
  harmonicAmplitudes: number[]; // observed amplitudes for harmonics 1..N
}

// ── Class ─────────────────────────────────────────────────────────────────

export class InstrumentProfiler {
  private profiledNotes: ProfiledNote[] = [];
  private _isCalibrated = false;

  /** Fitted inharmonicity per key (interpolated). */
  private inharmonicityMap = new Map<number, number>();

  /** Spectral correction envelope (numBins-length array). */
  private spectralCorrection: Float64Array | null = null;

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Feed a detected note with its magnitude spectrum for profiling.
   * Call when a note is detected with high confidence.
   *
   * @param midiNote — Detected MIDI note number
   * @param spectrum — Float32Array from AnalyserNode.getFloatFrequencyData() (dB values)
   * @param sampleRate — Audio sample rate
   */
  observeNote(
    midiNote: number,
    spectrum: Float32Array,
    sampleRate: number,
  ): void {
    if (this.profiledNotes.length >= MAX_PROFILED_NOTES) return;

    const fftSize = spectrum.length * 2;
    const binWidth = sampleRate / fftSize;
    const f0 = A4_FREQ * Math.pow(2, (midiNote - 69) / 12);
    const nyquist = sampleRate / 2;

    // Find harmonic peaks and measure inharmonicity
    const harmonicAmplitudes: number[] = [];
    let inharmonicitySum = 0;
    let inharmonicityCount = 0;

    for (let k = 1; k <= HARMONICS_TO_ANALYZE; k++) {
      const expectedFreq = k * f0;
      if (expectedFreq >= nyquist * 0.9) break;

      const expectedBin = Math.round(expectedFreq / binWidth);
      if (expectedBin >= spectrum.length) break;

      // Search ±3 bins around expected for the actual peak
      let bestBin = expectedBin;
      let bestDb = -Infinity;
      for (
        let b = Math.max(0, expectedBin - 3);
        b <= Math.min(spectrum.length - 1, expectedBin + 3);
        b++
      ) {
        if (spectrum[b] > bestDb) {
          bestDb = spectrum[b];
          bestBin = b;
        }
      }

      const amplitude = Math.pow(10, bestDb / 20); // dB → linear
      harmonicAmplitudes.push(amplitude);

      // Estimate inharmonicity from peak frequency vs expected
      if (k >= 2) {
        const actualFreq = bestBin * binWidth;
        // f_k = k * f0 * sqrt(1 + B * k²)
        // B = ((actualFreq / (k * f0))² - 1) / k²
        const ratio = actualFreq / (k * f0);
        if (ratio > 0.9 && ratio < 1.5) {
          const B = (ratio * ratio - 1) / (k * k);
          if (B > 0 && B < 0.1) {
            inharmonicitySum += B;
            inharmonicityCount++;
          }
        }
      }
    }

    const inharmonicity =
      inharmonicityCount > 0
        ? inharmonicitySum / inharmonicityCount
        : DEFAULT_INHARMONICITY;

    this.profiledNotes.push({
      midiNote,
      inharmonicity,
      harmonicAmplitudes,
    });

    this.inharmonicityMap.set(midiNote, inharmonicity);

    // Check if we have enough notes for calibration
    if (
      this.profiledNotes.length >= MIN_NOTES_FOR_CALIBRATION &&
      !this._isCalibrated
    ) {
      this._isCalibrated = true;
    }
  }

  /**
   * Get the estimated inharmonicity coefficient for a key.
   * If the key was profiled, returns its measured value.
   * Otherwise, interpolates from nearby profiled keys.
   */
  getInharmonicity(midiNote: number): number {
    // Direct measurement
    const direct = this.inharmonicityMap.get(midiNote);
    if (direct !== undefined) return direct;

    // Interpolate from nearest profiled notes
    let lowerMidi = -Infinity;
    let lowerB = DEFAULT_INHARMONICITY;
    let upperMidi = Infinity;
    let upperB = DEFAULT_INHARMONICITY;

    for (const [midi, B] of this.inharmonicityMap) {
      if (midi <= midiNote && midi > lowerMidi) {
        lowerMidi = midi;
        lowerB = B;
      }
      if (midi >= midiNote && midi < upperMidi) {
        upperMidi = midi;
        upperB = B;
      }
    }

    if (lowerMidi === -Infinity && upperMidi === Infinity) {
      return DEFAULT_INHARMONICITY;
    }
    if (lowerMidi === -Infinity) return upperB;
    if (upperMidi === Infinity) return lowerB;
    if (lowerMidi === upperMidi) return lowerB;

    // Linear interpolation
    const t = (midiNote - lowerMidi) / (upperMidi - lowerMidi);
    return lowerB + t * (upperB - lowerB);
  }

  /**
   * Get spectral envelope correction for the microphone/room.
   * Compares observed harmonic amplitudes to theoretical decay
   * and returns a per-bin correction factor.
   *
   * Call after isCalibrated becomes true.
   *
   * @param numBins — Number of frequency bins (fftSize / 2 + 1)
   * @param sampleRate — Audio sample rate
   */
  getSpectralCorrection(numBins: number, sampleRate: number): Float64Array {
    if (this.spectralCorrection && this.spectralCorrection.length === numBins) {
      return this.spectralCorrection;
    }

    const correction = new Float64Array(numBins).fill(1);

    if (this.profiledNotes.length === 0) {
      this.spectralCorrection = correction;
      return correction;
    }

    // For each profiled note, compare observed vs theoretical harmonic decay
    // and accumulate per-bin correction factors
    const binWidth = sampleRate / ((numBins - 1) * 2);
    const correctionCount = new Float64Array(numBins);

    for (const note of this.profiledNotes) {
      const f0 = A4_FREQ * Math.pow(2, (note.midiNote - 69) / 12);

      for (let k = 0; k < note.harmonicAmplitudes.length; k++) {
        const harmonicNum = k + 1;
        const freq = harmonicNum * f0;
        const bin = Math.round(freq / binWidth);
        if (bin >= numBins || bin < 0) continue;

        const theoretical =
          1 / Math.pow(harmonicNum, THEORETICAL_DECAY_EXPONENT);
        const observed = note.harmonicAmplitudes[k];

        if (observed > 0 && theoretical > 0) {
          // Correction = theoretical / observed
          // If mic rolls off bass, observed will be low, correction > 1
          const ratio = theoretical / observed;
          // Clamp to reasonable range
          const clampedRatio = Math.max(0.1, Math.min(10, ratio));

          correction[bin] += clampedRatio;
          correctionCount[bin] += 1;
        }
      }
    }

    // Average corrections where we have multiple observations
    for (let b = 0; b < numBins; b++) {
      if (correctionCount[b] > 0) {
        correction[b] /= correctionCount[b] + 1; // +1 because we started at 1
      }
    }

    // Smooth the correction envelope (5-bin moving average)
    const smoothed = new Float64Array(numBins);
    for (let b = 0; b < numBins; b++) {
      let sum = 0;
      let count = 0;
      for (let d = -2; d <= 2; d++) {
        const idx = b + d;
        if (idx >= 0 && idx < numBins) {
          sum += correction[idx];
          count++;
        }
      }
      smoothed[b] = sum / count;
    }

    this.spectralCorrection = smoothed;
    return smoothed;
  }

  /**
   * Apply profiled corrections to a PianoTemplates instance.
   * Updates inharmonicity per key and applies spectral correction.
   */
  applyToTemplates(templates: PianoTemplates, sampleRate: number): void {
    // Update inharmonicity for all keys
    for (let midi = 21; midi <= 108; midi++) {
      const B = this.getInharmonicity(midi);
      templates.setInharmonicity(midi, B);
    }

    // Apply spectral correction
    const correction = this.getSpectralCorrection(
      templates.numBins,
      sampleRate,
    );
    templates.applySpectralCorrection(correction);
  }

  /** Whether enough notes have been profiled for reliable correction. */
  get isCalibrated(): boolean {
    return this._isCalibrated;
  }

  /** Number of notes profiled so far. */
  get notesProfiled(): number {
    return this.profiledNotes.length;
  }

  /** Reset all profiling data. */
  reset(): void {
    this.profiledNotes = [];
    this._isCalibrated = false;
    this.inharmonicityMap.clear();
    this.spectralCorrection = null;
  }
}
