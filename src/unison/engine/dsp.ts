/**
 * Shared DSP utilities for UNISON audio analysis.
 *
 * Self-contained FFT (radix-2 Cooley-Tukey), Hann windowing,
 * and amplitude-to-dB conversion. No Web Audio API dependency.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const FFT_SIZE = 4096;
export const HOP_SIZE = 2048;
export const DB_FLOOR = -120;

// ── Windowing ────────────────────────────────────────────────────────────────

export function hannWindow(
  samples: Float32Array,
  offset: number,
  N: number,
): Float64Array {
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    out[i] = (samples[offset + i] ?? 0) * w;
  }
  return out;
}

// ── FFT ──────────────────────────────────────────────────────────────────────

/**
 * Compute magnitude spectrum (first N/2 bins) using radix-2 Cooley-Tukey FFT.
 */
export function fftMagnitude(input: Float64Array): Float64Array {
  const N = input.length;
  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  // Bit-reversal permutation
  for (let i = 0; i < N; i++) {
    let j = 0;
    let x = i;
    for (let k = 0; k < Math.log2(N); k++) {
      j = (j << 1) | (x & 1);
      x >>= 1;
    }
    real[j] = input[i];
  }

  // Cooley-Tukey butterfly
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2;
    const angle = (-2 * Math.PI) / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const wReal = Math.cos(angle * j);
        const wImag = Math.sin(angle * j);
        const tReal =
          wReal * real[i + j + halfSize] - wImag * imag[i + j + halfSize];
        const tImag =
          wReal * imag[i + j + halfSize] + wImag * real[i + j + halfSize];
        real[i + j + halfSize] = real[i + j] - tReal;
        imag[i + j + halfSize] = imag[i + j] - tImag;
        real[i + j] += tReal;
        imag[i + j] += tImag;
      }
    }
  }

  // Magnitude
  const half = N / 2;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mag;
}

// ── dB Conversion ────────────────────────────────────────────────────────────

/**
 * Convert a linear amplitude to dBFS with a -120 dB floor.
 */
export function amplitudeToDb(amplitude: number): number {
  if (!Number.isFinite(amplitude) || amplitude <= 0) return DB_FLOOR;
  const db = 20 * Math.log10(amplitude);
  return Number.isFinite(db) ? Math.max(DB_FLOOR, db) : DB_FLOOR;
}
