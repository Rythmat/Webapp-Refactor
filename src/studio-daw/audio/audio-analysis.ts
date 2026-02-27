import { guess } from 'web-audio-beat-detector';

export interface AudioAnalysis {
  bpm: number | null;
  key: string | null;
  spectralCentroid: number;
  rmsLevel: number;
  isPercussive: boolean;
  /** Detected instrument categories based on spectral band analysis */
  instruments: string[];
  /** Mood hint derived from energy + brightness (e.g. "meditative", "energetic") */
  moodHint: string;
}

// Krumhansl-Kessler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * In-place Cooley-Tukey radix-2 FFT.
 * Arrays must be power-of-2 length.
 */
function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      let tmp = real[i]; real[i] = real[j]; real[j] = tmp;
      tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
    }
  }

  // Cooley-Tukey butterfly stages
  for (let len = 2; len <= n; len *= 2) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let k = 0; k < halfLen; k++) {
        const idx = i + k;
        const idx2 = idx + halfLen;
        const tReal = curReal * real[idx2] - curImag * imag[idx2];
        const tImag = curReal * imag[idx2] + curImag * real[idx2];

        real[idx2] = real[idx] - tReal;
        imag[idx2] = imag[idx] - tImag;
        real[idx] += tReal;
        imag[idx] += tImag;

        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }
}

/**
 * Compute magnitude spectrum for a windowed frame using FFT.
 * Returns magnitudes for bins 0..fftSize/2.
 */
function computeMagnitudes(frame: Float64Array, fftSize: number): Float64Array {
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  real.set(frame);
  // imag is already zeros

  fft(real, imag);

  const halfSize = fftSize >> 1;
  const magnitudes = new Float64Array(halfSize);
  for (let i = 0; i < halfSize; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return magnitudes;
}

function correlate(chroma: number[], profile: number[]): number {
  const n = 12;
  let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumXY += chroma[i] * profile[i];
    sumX += chroma[i];
    sumY += profile[i];
    sumX2 += chroma[i] * chroma[i];
    sumY2 += profile[i] * profile[i];
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function rotateArray(arr: number[], n: number): number[] {
  const len = arr.length;
  const shift = ((n % len) + len) % len;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

/** Yield to the main thread */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Detect musical key using chroma feature analysis and Krumhansl-Schmuckler algorithm.
 * Uses FFT instead of naive DFT for performance.
 */
export async function detectKey(buffer: AudioBuffer): Promise<string | null> {
  try {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // Analyze first 15 seconds max
    const maxSamples = Math.min(channelData.length, sampleRate * 15);
    const fftSize = 4096;
    const hopSize = fftSize; // No overlap — halves frame count vs fftSize/2
    const chroma = new Float64Array(12);

    const minBin = Math.floor(65 * fftSize / sampleRate);
    const maxBin = Math.min(Math.ceil(2100 * fftSize / sampleRate), fftSize >> 1);

    let frameCount = 0;

    for (let offset = 0; offset + fftSize <= maxSamples; offset += hopSize) {
      // Apply Hann window
      const frame = new Float64Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
        frame[i] = channelData[offset + i] * window;
      }

      // FFT — O(n log n) instead of O(n*bins) naive DFT
      const magnitudes = computeMagnitudes(frame, fftSize);

      // Map frequency bins to pitch classes
      for (let bin = minBin; bin < maxBin; bin++) {
        const freq = bin * sampleRate / fftSize;
        if (freq > 0) {
          const midi = 12 * Math.log2(freq / 440) + 69;
          const pitchClass = Math.round(midi) % 12;
          if (pitchClass >= 0 && pitchClass < 12) {
            chroma[pitchClass] += magnitudes[bin] * magnitudes[bin];
          }
        }
      }
      frameCount++;

      // Yield to main thread every 32 frames to keep UI responsive
      if (frameCount % 32 === 0) {
        await yieldToMain();
      }
    }

    if (frameCount === 0) return null;

    // Normalize chroma
    const chromaArr = Array.from(chroma);
    const maxChroma = Math.max(...chromaArr);
    if (maxChroma === 0) return null;
    const normalizedChroma = chromaArr.map(v => v / maxChroma);

    // Correlate with all 24 key profiles (12 major + 12 minor)
    let bestKey = '';
    let bestCorr = -Infinity;

    for (let shift = 0; shift < 12; shift++) {
      const rotatedChroma = rotateArray(normalizedChroma, shift);

      const majorCorr = correlate(rotatedChroma, MAJOR_PROFILE);
      if (majorCorr > bestCorr) {
        bestCorr = majorCorr;
        bestKey = `${PITCH_NAMES[shift]} major`;
      }

      const minorCorr = correlate(rotatedChroma, MINOR_PROFILE);
      if (minorCorr > bestCorr) {
        bestCorr = minorCorr;
        bestKey = `${PITCH_NAMES[shift]} minor`;
      }
    }

    return bestCorr > 0.3 ? bestKey : null;
  } catch {
    return null;
  }
}

/**
 * Detect BPM using web-audio-beat-detector.
 */
export async function detectBPM(buffer: AudioBuffer): Promise<number | null> {
  try {
    const { bpm } = await guess(buffer);
    if (bpm >= 30 && bpm <= 200) return Math.round(bpm * 10) / 10;
    return null;
  } catch {
    return null;
  }
}

/**
 * Compute spectral centroid (brightness, 0-1 normalized).
 * Uses FFT instead of naive DFT.
 */
export async function computeSpectralCentroid(buffer: AudioBuffer): Promise<number> {
  try {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const fftSize = 2048;
    const maxSamples = Math.min(channelData.length, sampleRate * 10);
    const halfSize = fftSize >> 1;

    let totalWeightedFreq = 0;
    let totalMagnitude = 0;
    let frames = 0;

    for (let offset = 0; offset + fftSize <= maxSamples; offset += fftSize) {
      // Apply Hann window
      const frame = new Float64Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
        frame[i] = channelData[offset + i] * window;
      }

      const magnitudes = computeMagnitudes(frame, fftSize);

      for (let bin = 1; bin < halfSize / 2; bin++) {
        const freq = bin * sampleRate / fftSize;
        totalWeightedFreq += freq * magnitudes[bin];
        totalMagnitude += magnitudes[bin];
      }
      frames++;
      if (frames >= 5) break;
    }

    if (totalMagnitude === 0) return 0.5;
    const centroid = totalWeightedFreq / totalMagnitude;
    // Normalize: 200 Hz = 0, 8000 Hz = 1
    return Math.max(0, Math.min(1, (centroid - 200) / 7800));
  } catch {
    return 0.5;
  }
}

/**
 * Compute RMS level (0-1 normalized).
 */
export function computeRMS(buffer: AudioBuffer): number {
  const channelData = buffer.getChannelData(0);
  let sumSquares = 0;
  const len = channelData.length;
  for (let i = 0; i < len; i++) {
    sumSquares += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sumSquares / len);
  return Math.min(1, rms / 0.3);
}

/**
 * Detect if audio is percussive based on transient density.
 */
export function detectPercussive(buffer: AudioBuffer): boolean {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.01);
  const maxWindows = Math.min(Math.floor(channelData.length / windowSize), 1000);

  let transients = 0;
  let prevEnergy = 0;

  for (let w = 0; w < maxWindows; w++) {
    let energy = 0;
    const start = w * windowSize;
    for (let i = start; i < start + windowSize && i < channelData.length; i++) {
      energy += channelData[i] * channelData[i];
    }
    energy /= windowSize;

    if (w > 0 && energy > prevEnergy * 3 && energy > 0.001) {
      transients++;
    }
    prevEnergy = energy;
  }

  const transientRate = transients / (maxWindows * (windowSize / sampleRate));
  return transientRate > 2;
}

/**
 * Detect likely instruments based on spectral band energy distribution.
 * Analyzes energy in frequency bands: sub-bass, bass, low-mid, mid, upper-mid, high.
 * Returns array of instrument category strings (e.g. "drums", "bass", "guitar").
 */
export function detectInstruments(buffer: AudioBuffer, isPercussive: boolean): string[] {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const fftSize = 4096;
  const maxSamples = Math.min(channelData.length, sampleRate * 15);
  const halfSize = fftSize >> 1;

  // Band definitions (Hz ranges)
  const bands = {
    subBass:  { lo: 20,   hi: 80 },    // kick, sub bass
    bass:     { lo: 80,   hi: 300 },    // bass guitar, low synth
    lowMid:   { lo: 300,  hi: 800 },    // guitar body, warmth
    mid:      { lo: 800,  hi: 2500 },   // vocals, keys, guitar
    upperMid: { lo: 2500, hi: 5000 },   // presence, strings, vocal clarity
    high:     { lo: 5000, hi: 12000 },  // cymbals, air, brightness
  };

  const bandEnergy: Record<string, number> = {};
  for (const key of Object.keys(bands)) bandEnergy[key] = 0;
  let totalEnergy = 0;
  let frames = 0;

  for (let offset = 0; offset + fftSize <= maxSamples; offset += fftSize) {
    const frame = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
      frame[i] = channelData[offset + i] * window;
    }

    const magnitudes = computeMagnitudes(frame, fftSize);

    for (let bin = 1; bin < halfSize; bin++) {
      const freq = bin * sampleRate / fftSize;
      const mag2 = magnitudes[bin] * magnitudes[bin];
      totalEnergy += mag2;

      for (const [bandName, { lo, hi }] of Object.entries(bands)) {
        if (freq >= lo && freq < hi) {
          bandEnergy[bandName] += mag2;
          break;
        }
      }
    }
    frames++;
    if (frames >= 20) break;
  }

  if (totalEnergy === 0) return ['pads']; // fallback

  // Normalize bands as fraction of total
  const norm: Record<string, number> = {};
  for (const [key, val] of Object.entries(bandEnergy)) {
    norm[key] = val / totalEnergy;
  }

  const instruments: string[] = [];

  // Drums: percussive transients + sub-bass energy (kicks) or high energy (cymbals)
  if (isPercussive && (norm.subBass > 0.05 || norm.high > 0.08)) {
    instruments.push('drums');
  }

  // Bass: strong sub-bass + bass energy
  if (norm.subBass + norm.bass > 0.25) {
    instruments.push('bass');
  }

  // Guitar: significant low-mid + mid energy
  if (norm.lowMid > 0.08 && norm.mid > 0.10) {
    instruments.push('guitar');
  }

  // Keys/Piano: mid + upper-mid presence
  if (norm.mid > 0.15 && norm.upperMid > 0.08) {
    instruments.push('keys');
  }

  // Strings: sustained upper-mid energy without strong percussiveness
  if (!isPercussive && norm.upperMid > 0.12 && norm.mid > 0.10) {
    instruments.push('strings');
  }

  // Vocals: strong mid presence
  if (norm.mid > 0.20 && norm.upperMid > 0.10) {
    instruments.push('vocals');
  }

  // Pads: broad smooth spectral content, low percussiveness
  if (!isPercussive && norm.lowMid > 0.05 && norm.mid > 0.05 && norm.high < 0.10) {
    instruments.push('pads');
  }

  // Ensure at least one instrument
  if (instruments.length === 0) {
    if (isPercussive) instruments.push('drums');
    else instruments.push('pads');
  }

  // Deduplicate
  return [...new Set(instruments)];
}

/**
 * Derive a mood hint from energy (RMS) and brightness (spectral centroid).
 */
export function deriveMood(rmsLevel: number, spectralCentroid: number, isPercussive: boolean): string {
  if (rmsLevel < 0.25 && spectralCentroid < 0.35) return 'meditative';
  if (rmsLevel < 0.25 && spectralCentroid >= 0.35) return 'ethereal';
  if (rmsLevel < 0.45 && !isPercussive) return 'calm';
  if (rmsLevel < 0.45 && isPercussive) return 'groovy';
  if (rmsLevel < 0.65 && spectralCentroid < 0.5) return 'warm';
  if (rmsLevel < 0.65) return 'uplifting';
  if (spectralCentroid > 0.55) return 'energetic';
  return 'powerful';
}

/**
 * Run full analysis on an AudioBuffer.
 * All CPU-intensive work yields to the main thread to prevent UI freezes.
 */
export async function analyzeBuffer(buffer: AudioBuffer): Promise<AudioAnalysis> {
  // Run BPM detection and key detection concurrently (both are async now)
  const [bpm, key] = await Promise.all([
    detectBPM(buffer),
    detectKey(buffer),
  ]);

  // Yield before next CPU work
  await yieldToMain();
  const spectralCentroid = await computeSpectralCentroid(buffer);

  await yieldToMain();
  const rmsLevel = computeRMS(buffer);

  await yieldToMain();
  const isPercussive = detectPercussive(buffer);

  await yieldToMain();
  const instruments = detectInstruments(buffer, isPercussive);

  const moodHint = deriveMood(rmsLevel, spectralCentroid, isPercussive);

  return { bpm, key, spectralCentroid, rmsLevel, isPercussive, instruments, moodHint };
}
