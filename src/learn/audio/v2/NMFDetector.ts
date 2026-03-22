// ── NMFDetector ───────────────────────────────────────────────────────────
// Polyphonic note detection via Non-negative Matrix Factorization (NMF).
//
// Replaces PianoChordDetector + PianoPolyphonicDetector with a principled
// approach: decompose the magnitude spectrum into a weighted sum of
// pre-computed piano key templates.
//
// Algorithm (Lee & Seung multiplicative updates):
//   Given magnitude spectrum V (numBins × 1)
//   and template matrix W (numBins × numKeys)
//   find activation H (numKeys × 1) ≥ 0 such that V ≈ W × H
//
//   Update rule: H ← H ⊙ (Wᵀ V) / (Wᵀ W H + ε)
//
// Run 10 iterations per frame, warm-started from previous result.
//
// When expected notes are set, only activate relevant template columns,
// eliminating false positives for non-expected keys entirely.

import { PianoTemplates } from './PianoTemplates';
import { MIDI_OFFSET, type NMFActivation } from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of NMF iterations per frame. */
const NUM_ITERATIONS = 10;

/** Small epsilon to prevent division by zero. */
const EPSILON = 1e-10;

/** Activation threshold: keys below this are considered silent. */
const ACTIVATION_THRESHOLD = 0.01;

/** RMS threshold below which we skip NMF (silence). */
const SILENCE_RMS = 0.01;

/** Number of piano keys. */
const NUM_KEYS = 88;

// ── Class ─────────────────────────────────────────────────────────────────

export class NMFDetector {
  private templates: PianoTemplates;

  /** Current activation vector (warm-start for next frame). */
  private H: Float64Array;

  /** Pre-computed WᵀW matrix (numKeys × numKeys). Recomputed when active keys change. */
  private WtW: Float64Array;

  /** Transposed template matrix Wᵀ (numKeys × numBins). */
  private Wt: Float64Array;

  /** Active key mask: only these columns of W participate. */
  private activeKeyMask: Uint8Array;

  /** Number of frequency bins per template. */
  private numBins: number;

  /** Frequency-domain buffer for reading analyser data (dB values). */
  private freqBuffer: Float32Array | null = null;

  /** Linear magnitude buffer (converted from dB). */
  private magnitudeBuffer: Float64Array | null = null;

  /** Working buffer for WᵀV product. */
  private WtV: Float64Array;

  /** Working buffer for WᵀWH product. */
  private WtWH: Float64Array;

  /** Frame counter. */
  private frameId = 0;

  constructor(templates: PianoTemplates) {
    this.templates = templates;
    this.numBins = templates.numBins;

    // Initialize activation to small uniform values
    this.H = new Float64Array(NUM_KEYS);
    this.H.fill(0.01);

    // Initialize key mask (all keys active by default)
    this.activeKeyMask = new Uint8Array(NUM_KEYS);
    this.activeKeyMask.fill(1);

    // Pre-compute Wᵀ
    this.Wt = new Float64Array(NUM_KEYS * this.numBins);
    this.computeWt();

    // Pre-compute WᵀW
    this.WtW = new Float64Array(NUM_KEYS * NUM_KEYS);
    this.computeWtW();

    // Working buffers
    this.WtV = new Float64Array(NUM_KEYS);
    this.WtWH = new Float64Array(NUM_KEYS);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Decompose a magnitude spectrum into note activations.
   * Call with the hi-res analyser (FFT=8192).
   */
  process(analyser: AnalyserNode): NMFActivation {
    const now = performance.now();
    const id = this.frameId++;
    const numBins = this.numBins;

    // Ensure buffers match analyser
    const analyserBins = analyser.frequencyBinCount;
    if (!this.freqBuffer || this.freqBuffer.length !== analyserBins) {
      this.freqBuffer = new Float32Array(analyserBins);
      this.magnitudeBuffer = new Float64Array(Math.min(analyserBins, numBins));
    }

    // Get frequency data (dB values)
    analyser.getFloatFrequencyData(
      this.freqBuffer as Float32Array<ArrayBuffer>,
    );

    // Convert to linear magnitude and check RMS
    const magLen = Math.min(analyserBins, numBins);
    let magSum = 0;
    for (let i = 0; i < magLen; i++) {
      // dB to linear: 10^(dB/20)
      const linear = Math.pow(10, this.freqBuffer[i] / 20);
      this.magnitudeBuffer![i] = linear;
      magSum += linear * linear;
    }
    const rms = Math.sqrt(magSum / magLen);

    if (rms < SILENCE_RMS) {
      // Silence: decay activations
      for (let k = 0; k < NUM_KEYS; k++) {
        this.H[k] *= 0.5;
      }
      return {
        weights: new Float64Array(this.H),
        timestamp: now,
        frameId: id,
      };
    }

    // Run NMF multiplicative updates
    this.runNMF(this.magnitudeBuffer!, magLen);

    // Return a copy of activations
    return {
      weights: new Float64Array(this.H),
      timestamp: now,
      frameId: id,
    };
  }

  /**
   * Restrict NMF to only activate certain keys.
   * When set, non-active template columns are zeroed out, preventing
   * false activations entirely.
   * Pass null to activate all keys.
   */
  setActiveKeys(keys: number[] | null): void {
    if (keys === null) {
      this.activeKeyMask.fill(1);
    } else {
      this.activeKeyMask.fill(0);
      for (const midi of keys) {
        const idx = midi - MIDI_OFFSET;
        if (idx >= 0 && idx < NUM_KEYS) {
          this.activeKeyMask[idx] = 1;
        }
      }
    }
    // Recompute WᵀW with new mask
    this.computeWtW();
  }

  /** Reset activations (cold start next frame). */
  reset(): void {
    this.H.fill(0.01);
    this.frameId = 0;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Run Lee & Seung multiplicative updates. */
  private runNMF(V: Float64Array, vLen: number): void {
    const Wt = this.Wt;
    const WtW = this.WtW;
    const H = this.H;
    const WtV = this.WtV;
    const WtWH = this.WtWH;
    const numBins = this.numBins;
    const mask = this.activeKeyMask;

    for (let iter = 0; iter < NUM_ITERATIONS; iter++) {
      // Compute WᵀV (numKeys × 1)
      for (let k = 0; k < NUM_KEYS; k++) {
        if (!mask[k]) {
          WtV[k] = 0;
          continue;
        }
        let sum = 0;
        const wtOffset = k * numBins;
        for (let b = 0; b < vLen; b++) {
          sum += Wt[wtOffset + b] * V[b];
        }
        WtV[k] = sum;
      }

      // Compute WᵀWH (numKeys × 1)
      for (let k = 0; k < NUM_KEYS; k++) {
        if (!mask[k]) {
          WtWH[k] = EPSILON;
          continue;
        }
        let sum = 0;
        for (let j = 0; j < NUM_KEYS; j++) {
          if (!mask[j]) continue;
          sum += WtW[k * NUM_KEYS + j] * H[j];
        }
        WtWH[k] = sum + EPSILON;
      }

      // Multiplicative update: H ← H ⊙ WᵀV / WᵀWH
      for (let k = 0; k < NUM_KEYS; k++) {
        if (!mask[k]) {
          H[k] = 0;
          continue;
        }
        H[k] = (H[k] * WtV[k]) / WtWH[k];
      }
    }

    // Zero out sub-threshold activations
    for (let k = 0; k < NUM_KEYS; k++) {
      if (H[k] < ACTIVATION_THRESHOLD) H[k] = 0;
    }
  }

  /** Compute the transposed template matrix Wᵀ. */
  private computeWt(): void {
    const W = this.templates.getTemplateMatrix();
    const numBins = this.numBins;
    for (let k = 0; k < NUM_KEYS; k++) {
      for (let b = 0; b < numBins; b++) {
        // W is row-major: W[k * numBins + b]
        // Wᵀ is row-major: Wᵀ[k * numBins + b] (transpose is free for this layout)
        this.Wt[k * numBins + b] = W[k * numBins + b];
      }
    }
  }

  /** Compute WᵀW (numKeys × numKeys), respecting active key mask. */
  private computeWtW(): void {
    const W = this.templates.getTemplateMatrix();
    const numBins = this.numBins;
    const mask = this.activeKeyMask;

    for (let i = 0; i < NUM_KEYS; i++) {
      for (let j = 0; j < NUM_KEYS; j++) {
        if (!mask[i] || !mask[j]) {
          this.WtW[i * NUM_KEYS + j] = 0;
          continue;
        }
        let dot = 0;
        const iOffset = i * numBins;
        const jOffset = j * numBins;
        for (let b = 0; b < numBins; b++) {
          dot += W[iOffset + b] * W[jOffset + b];
        }
        this.WtW[i * NUM_KEYS + j] = dot;
      }
    }
  }
}
