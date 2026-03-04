// ── PitchRenderer ──────────────────────────────────────────────────────────
// Offline pitch-edit renderer: takes an original AudioBuffer, PitchSegment[],
// and PitchEdit[], then returns a new AudioBuffer with pitch edits baked in.
//
// Uses a direct TypeScript port of the SMB phase vocoder (from
// pitch-correction-processor.js) to shift each edited segment's pitch offline.
// Unedited regions pass through unchanged.

import type { PitchSegment } from './PitchAnalyzer';
import type { PitchEdit } from '@/daw/store/tracksSlice';

// ── FFT (radix-2 Cooley-Tukey, in-place) ──────────────────────────────────

function fft(re: Float64Array, im: Float64Array, invert: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI / len) * (invert ? -1 : 1);
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const tmpRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = tmpRe;
      }
    }
  }
  if (invert) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

// ── SMB Phase Vocoder (offline batch mode) ─────────────────────────────────

const FFT_SIZE = 2048;
const OVERSAMPLING = 4;

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Pitch-shift an entire Float32Array by a constant ratio using the SMB
 * phase vocoder algorithm. Returns a new Float32Array of the same length.
 */
function smbPitchShift(
  input: Float32Array,
  pitchShift: number,
  sampleRate: number,
): Float32Array {
  const fftSize = FFT_SIZE;
  const oversampling = OVERSAMPLING;
  const stepSize = Math.floor(fftSize / oversampling);
  const freqPerBin = sampleRate / fftSize;
  const expectedPhaseDiff = (2 * Math.PI * stepSize) / fftSize;
  const halfPlus1 = Math.floor(fftSize / 2) + 1;

  // Allocate working buffers
  const fftRe = new Float64Array(fftSize);
  const fftIm = new Float64Array(fftSize);
  const window = new Float64Array(fftSize);
  const lastPhase = new Float64Array(halfPlus1);
  const sumPhase = new Float64Array(halfPlus1);
  const anaMagn = new Float64Array(halfPlus1);
  const anaFreq = new Float64Array(halfPlus1);
  const synMagn = new Float64Array(halfPlus1);
  const synFreq = new Float64Array(halfPlus1);
  const inFifo = new Float64Array(fftSize);
  const outFifo = new Float64Array(fftSize);
  const outputAccum = new Float64Array(2 * fftSize);

  // Hann window
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
  }

  const output = new Float32Array(input.length);
  let rover = 0;

  for (let i = 0; i < input.length; i++) {
    inFifo[rover] = input[i];
    output[i] = outFifo[rover - (fftSize - stepSize) >= 0 ? rover - (fftSize - stepSize) : 0];
    rover++;

    if (rover >= fftSize) {
      rover = fftSize - stepSize;

      // Window + FFT
      for (let k = 0; k < fftSize; k++) {
        fftRe[k] = inFifo[k] * window[k];
        fftIm[k] = 0;
      }
      fft(fftRe, fftIm, false);

      // Analysis
      for (let k = 0; k < halfPlus1; k++) {
        const real = fftRe[k];
        const imag = fftIm[k];
        const magn = 2 * Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);

        let phaseDiff = phase - lastPhase[k];
        lastPhase[k] = phase;
        phaseDiff -= k * expectedPhaseDiff;

        let qpd = Math.floor(phaseDiff / Math.PI);
        if (qpd >= 0) qpd += qpd & 1;
        else qpd -= qpd & 1;
        phaseDiff -= Math.PI * qpd;

        phaseDiff = (oversampling * phaseDiff) / (2 * Math.PI);
        const trueFreq = (k + phaseDiff) * freqPerBin;

        anaMagn[k] = magn;
        anaFreq[k] = trueFreq;
      }

      // Pitch shifting — move bins
      for (let k = 0; k < halfPlus1; k++) {
        synMagn[k] = 0;
        synFreq[k] = 0;
      }
      for (let k = 0; k < halfPlus1; k++) {
        const newBin = Math.round(k * pitchShift);
        if (newBin < halfPlus1) {
          synMagn[newBin] += anaMagn[k];
          synFreq[newBin] = anaFreq[k] * pitchShift;
        }
      }

      // Synthesis
      for (let k = 0; k < halfPlus1; k++) {
        const magn = synMagn[k];
        const freq = synFreq[k];
        let pd = freq / freqPerBin - k;
        pd = (2 * Math.PI * pd) / oversampling;
        pd += k * expectedPhaseDiff;
        sumPhase[k] += pd;
        const phase = sumPhase[k];
        fftRe[k] = magn * Math.cos(phase);
        fftIm[k] = magn * Math.sin(phase);
      }
      for (let k = halfPlus1; k < fftSize; k++) {
        fftRe[k] = 0;
        fftIm[k] = 0;
      }

      // IFFT
      fft(fftRe, fftIm, true);

      // Window + overlap-add
      for (let k = 0; k < fftSize; k++) {
        outputAccum[k] += (2 * window[k] * fftRe[k] * fftSize) / (halfPlus1 * oversampling);
      }
      for (let k = 0; k < stepSize; k++) {
        outFifo[k] = outputAccum[k];
      }
      for (let k = 0; k < fftSize; k++) {
        outputAccum[k] = outputAccum[k + stepSize];
      }
      for (let k = 0; k < fftSize - stepSize; k++) {
        inFifo[k] = inFifo[k + stepSize];
      }
    }
  }

  return output;
}

// ── Cross-fade helper ──────────────────────────────────────────────────────

const CROSSFADE_SAMPLES = 128; // ~3ms at 44.1 kHz — smooths segment boundaries

function crossfade(
  dst: Float32Array,
  src: Float32Array,
  startSample: number,
  length: number,
): void {
  const fadeLen = Math.min(CROSSFADE_SAMPLES, Math.floor(length / 2));

  // Fade-in region: blend original → shifted
  for (let i = 0; i < fadeLen; i++) {
    const t = i / fadeLen;
    const idx = startSample + i;
    dst[idx] = dst[idx] * (1 - t) + src[i] * t;
  }

  // Middle: overwrite with shifted
  for (let i = fadeLen; i < length - fadeLen; i++) {
    dst[startSample + i] = src[i];
  }

  // Fade-out region: blend shifted → original
  for (let i = 0; i < fadeLen; i++) {
    const t = i / fadeLen;
    const idx = startSample + length - fadeLen + i;
    const srcIdx = length - fadeLen + i;
    dst[idx] = src[srcIdx] * (1 - t) + dst[idx] * t;
  }
}

// ── renderPitchEdits ───────────────────────────────────────────────────────

/**
 * Render an AudioBuffer with pitch edits baked in.
 *
 * For each edited segment, extracts the original PCM samples, applies the SMB
 * phase vocoder with the appropriate pitch ratio, and cross-fades the result
 * back into the output buffer. Unedited regions pass through unchanged.
 *
 * @returns A new AudioBuffer with edits applied, or the original if no edits.
 */
export function renderPitchEdits(
  originalBuffer: AudioBuffer,
  segments: PitchSegment[],
  edits: PitchEdit[],
): AudioBuffer {
  if (edits.length === 0) return originalBuffer;

  const sampleRate = originalBuffer.sampleRate;
  const numChannels = originalBuffer.numberOfChannels;
  const totalSamples = originalBuffer.length;

  // Build edit lookup: segmentId → targetMidiNote
  const editMap = new Map<string, number>();
  for (const edit of edits) {
    editMap.set(edit.segmentId, edit.targetMidiNote);
  }

  // Create output buffer (copy of original)
  const outputBuffer = new AudioBuffer({
    numberOfChannels: numChannels,
    length: totalSamples,
    sampleRate,
  });
  for (let ch = 0; ch < numChannels; ch++) {
    outputBuffer.getChannelData(ch).set(originalBuffer.getChannelData(ch));
  }

  // Process each edited segment
  for (const seg of segments) {
    const targetNote = editMap.get(seg.id);
    if (targetNote === undefined) continue; // not edited

    const pitchRatio = midiToHz(targetNote) / midiToHz(seg.midiNote);
    if (Math.abs(pitchRatio - 1.0) < 0.001) continue; // negligible shift

    const startSample = Math.max(0, Math.floor((seg.startTimeMs / 1000) * sampleRate));
    const endSample = Math.min(totalSamples, Math.ceil((seg.endTimeMs / 1000) * sampleRate));
    const segLength = endSample - startSample;
    if (segLength < FFT_SIZE) continue; // too short for FFT processing

    // Process each channel
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = originalBuffer.getChannelData(ch);
      const segSamples = channelData.slice(startSample, endSample);
      const shifted = smbPitchShift(segSamples, pitchRatio, sampleRate);
      const outChannel = outputBuffer.getChannelData(ch);
      crossfade(outChannel, shifted, startSample, segLength);
    }
  }

  return outputBuffer;
}

// ── Cache key helper ───────────────────────────────────────────────────────

/** Generate a deterministic cache key for a set of pitch edits. */
export function pitchEditCacheKey(edits: PitchEdit[]): string {
  if (edits.length === 0) return '';
  return edits
    .map((e) => `${e.segmentId}:${e.targetMidiNote}`)
    .sort()
    .join('|');
}
