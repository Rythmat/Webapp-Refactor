// ── PianoTemplates ────────────────────────────────────────────────────────
// Pre-computed spectral templates for all 88 piano keys (MIDI 21–108).
// Used by NMFDetector to decompose a magnitude spectrum into per-key
// activations. Each template models the expected harmonic series of a
// piano note, including inharmonicity and realistic amplitude decay.
//
// Template generation follows:
//   f_k = k × f0 × √(1 + B × k²)    — stretched partials (Fletcher model)
//   A_k = 1 / k^0.7                    — piano partial amplitude decay
//   Each partial smeared across FFT bins via Gaussian window

import { A4_FREQ, MIDI_OFFSET } from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of piano keys. */
const NUM_KEYS = 88;

/** Maximum number of harmonics per template (or until Nyquist). */
const MAX_HARMONICS = 20;

/** Amplitude decay exponent: A_k = 1 / k^DECAY_EXPONENT. */
const DECAY_EXPONENT = 0.7;

/** Gaussian smearing sigma in bins (widens for high frequencies). */
const BASE_SIGMA_BINS = 0.8;

/**
 * Default inharmonicity coefficients by key region.
 * B varies from ~0.0001 for bass strings to ~0.005 for treble.
 * These are typical values for an upright piano.
 */
const INHARMONICITY_BASS = 0.0003; // MIDI 21–44 (A0–G#2)
const INHARMONICITY_MID = 0.0005; // MIDI 45–68 (A2–G#4)
const INHARMONICITY_TREBLE = 0.002; // MIDI 69–92 (A4–G#6)
const INHARMONICITY_HIGH = 0.005; // MIDI 93–108 (A6–C8)

// ── Class ─────────────────────────────────────────────────────────────────

export class PianoTemplates {
  /** Row-major template matrix: numKeys × numBins. */
  private templates: Float64Array;

  /** Number of frequency bins per template (fftSize / 2 + 1). */
  private _numBins: number;

  /** Inharmonicity coefficient per key (can be updated by InstrumentProfiler). */
  private inharmonicity: Float64Array;

  /** Sample rate used for template generation. */
  private sampleRate: number;

  /** FFT size used for template generation. */
  private fftSize: number;

  constructor(sampleRate: number, fftSize: number) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this._numBins = fftSize / 2 + 1;
    this.inharmonicity = new Float64Array(NUM_KEYS);
    this.templates = new Float64Array(NUM_KEYS * this._numBins);

    this.initDefaultInharmonicity();
    this.buildTemplates();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Get the full template matrix (numKeys × numBins, row-major). */
  getTemplateMatrix(): Float64Array {
    return this.templates;
  }

  /** Get a single key's template (view into the matrix, not a copy). */
  getTemplate(midiNote: number): Float64Array {
    const keyIdx = midiNote - MIDI_OFFSET;
    if (keyIdx < 0 || keyIdx >= NUM_KEYS) {
      return new Float64Array(this._numBins);
    }
    return this.templates.subarray(
      keyIdx * this._numBins,
      (keyIdx + 1) * this._numBins,
    );
  }

  /** Number of frequency bins per template. */
  get numBins(): number {
    return this._numBins;
  }

  /** Number of keys (always 88). */
  get numKeys(): number {
    return NUM_KEYS;
  }

  /**
   * Update the inharmonicity coefficient for a specific key.
   * Called by InstrumentProfiler after learning from real audio.
   */
  setInharmonicity(midiNote: number, B: number): void {
    const keyIdx = midiNote - MIDI_OFFSET;
    if (keyIdx >= 0 && keyIdx < NUM_KEYS) {
      this.inharmonicity[keyIdx] = B;
      this.buildTemplateForKey(keyIdx);
    }
  }

  /**
   * Apply a spectral correction envelope (e.g., from mic frequency response).
   * Multiplies each template by the correction vector bin-by-bin.
   */
  applySpectralCorrection(correction: Float64Array): void {
    if (correction.length !== this._numBins) return;
    for (let key = 0; key < NUM_KEYS; key++) {
      const offset = key * this._numBins;
      for (let bin = 0; bin < this._numBins; bin++) {
        this.templates[offset + bin] *= correction[bin];
      }
      // Re-normalize this key's template
      this.normalizeTemplate(key);
    }
  }

  /** Rebuild all templates (e.g., after bulk inharmonicity update). */
  rebuild(): void {
    this.buildTemplates();
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Initialize default inharmonicity per key region. */
  private initDefaultInharmonicity(): void {
    for (let key = 0; key < NUM_KEYS; key++) {
      const midi = key + MIDI_OFFSET;
      if (midi <= 44) {
        this.inharmonicity[key] = INHARMONICITY_BASS;
      } else if (midi <= 68) {
        this.inharmonicity[key] = INHARMONICITY_MID;
      } else if (midi <= 92) {
        this.inharmonicity[key] = INHARMONICITY_TREBLE;
      } else {
        this.inharmonicity[key] = INHARMONICITY_HIGH;
      }
    }
  }

  /** Build all 88 templates. */
  private buildTemplates(): void {
    for (let key = 0; key < NUM_KEYS; key++) {
      this.buildTemplateForKey(key);
    }
  }

  /** Build a single key's template. */
  private buildTemplateForKey(keyIdx: number): void {
    const midi = keyIdx + MIDI_OFFSET;
    const f0 = A4_FREQ * Math.pow(2, (midi - 69) / 12);
    const B = this.inharmonicity[keyIdx];
    const binWidth = this.sampleRate / this.fftSize;
    const nyquist = this.sampleRate / 2;
    const offset = keyIdx * this._numBins;

    // Zero out
    for (let bin = 0; bin < this._numBins; bin++) {
      this.templates[offset + bin] = 0;
    }

    // Add each harmonic
    for (let k = 1; k <= MAX_HARMONICS; k++) {
      // Fletcher model: stretched partials
      const fk = k * f0 * Math.sqrt(1 + B * k * k);
      if (fk >= nyquist) break;

      // Amplitude decay
      const amplitude = 1 / Math.pow(k, DECAY_EXPONENT);

      // Map to FFT bin
      const centerBin = fk / binWidth;

      // Gaussian smearing: sigma widens slightly for higher harmonics
      const sigma = BASE_SIGMA_BINS * (1 + 0.1 * (k - 1));

      // Apply Gaussian across nearby bins
      const spreadBins = Math.ceil(sigma * 3);
      const loBin = Math.max(0, Math.floor(centerBin - spreadBins));
      const hiBin = Math.min(
        this._numBins - 1,
        Math.ceil(centerBin + spreadBins),
      );

      for (let bin = loBin; bin <= hiBin; bin++) {
        const dist = bin - centerBin;
        const gauss = Math.exp((-0.5 * dist * dist) / (sigma * sigma));
        this.templates[offset + bin] += amplitude * gauss;
      }
    }

    // Normalize template to unit L2 norm
    this.normalizeTemplate(keyIdx);
  }

  /** Normalize a single template to unit L2 norm. */
  private normalizeTemplate(keyIdx: number): void {
    const offset = keyIdx * this._numBins;
    let sumSq = 0;
    for (let bin = 0; bin < this._numBins; bin++) {
      const val = this.templates[offset + bin];
      sumSq += val * val;
    }
    if (sumSq > 0) {
      const invNorm = 1 / Math.sqrt(sumSq);
      for (let bin = 0; bin < this._numBins; bin++) {
        this.templates[offset + bin] *= invNorm;
      }
    }
  }
}
