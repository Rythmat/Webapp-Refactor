// ── PianoCalibrationV2 ────────────────────────────────────────────────────
// Updated 3-step calibration wizard that feeds into the v2 adaptive
// infrastructure instead of producing static correction values.
//
// Steps:
//   1. Silence capture (3s) → seed AdaptiveNoiseFloor
//   2. Single note (5s) → seed InstrumentProfiler + tuning estimate
//   3. Chord (5s) → feed NMFDetector validation + additional profiling
//
// Unlike v1, this calibration is truly optional — the v2 system adapts
// continuously. Calibration just gives it a head start.

import { AdaptiveNoiseFloor } from './AdaptiveNoiseFloor';
import { InstrumentProfiler } from './InstrumentProfiler';
import { PianoTemplates } from './PianoTemplates';
import { StreamingAudioCapture } from './StreamingAudioCapture';
import { freqToMidi, freqToMidiContinuous } from './types';

// ── Types ────────────────────────────────────────────────────────────────

export interface CalibrationV2Profile {
  tuningOffsetCents: number;
  notesProfiled: number;
  noiseFloorSeeded: boolean;
  deviceId: string;
  timestamp: number;
}

export type CalibrationV2Step = 'silence' | 'single-note' | 'chord';

export interface CalibrationV2Progress {
  step: CalibrationV2Step;
  elapsed: number;
  total: number;
  detectedNote?: string;
  detectedChord?: string;
}

type ProgressCallback = (progress: CalibrationV2Progress) => void;

// ── Constants ────────────────────────────────────────────────────────────

const SILENCE_DURATION = 3;
const SINGLE_NOTE_DURATION = 5;
const CHORD_DURATION = 5;

const STORAGE_KEY = 'learn-piano-calibration-v2';

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

// ── Storage ──────────────────────────────────────────────────────────────

export function loadCalibrationV2Profile(): CalibrationV2Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationV2Profile;
  } catch {
    return null;
  }
}

export function saveCalibrationV2Profile(profile: CalibrationV2Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage may be unavailable
  }
}

export function clearCalibrationV2Profile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── Calibration Runner ───────────────────────────────────────────────────

export class PianoCalibrationV2Runner {
  private aborted = false;
  private rafId = 0;

  /**
   * Run the full 3-step calibration, feeding results into adaptive systems.
   *
   * @param capture — Active StreamingAudioCapture instance
   * @param noiseFloor — AdaptiveNoiseFloor to seed
   * @param profiler — InstrumentProfiler to seed
   * @param templates — PianoTemplates to update after profiling
   * @param deviceId — Current audio device ID
   * @param onProgress — Progress callback for UI
   */
  async run(
    capture: StreamingAudioCapture,
    noiseFloor: AdaptiveNoiseFloor,
    profiler: InstrumentProfiler,
    templates: PianoTemplates,
    deviceId: string,
    onProgress: ProgressCallback,
  ): Promise<CalibrationV2Profile | null> {
    this.aborted = false;

    const hiResAnalyser = capture.getHiResAnalyser();
    const fastAnalyser = capture.getFastPitchAnalyser();
    if (!hiResAnalyser || !fastAnalyser) return null;

    const sampleRate = hiResAnalyser.context.sampleRate;

    // Step 1: Silence capture → seed noise floor
    await this.captureSilence(hiResAnalyser, noiseFloor, onProgress);
    if (this.aborted) return null;

    // Step 2: Single note → seed profiler + measure tuning
    const tuningOffsetCents = await this.captureSingleNote(
      fastAnalyser,
      hiResAnalyser,
      profiler,
      sampleRate,
      onProgress,
    );
    if (this.aborted) return null;

    // Step 3: Chord → additional profiling
    await this.captureChord(hiResAnalyser, profiler, sampleRate, onProgress);
    if (this.aborted) return null;

    // Apply profiled corrections to templates
    if (profiler.isCalibrated) {
      profiler.applyToTemplates(templates, sampleRate);
    }

    const profile: CalibrationV2Profile = {
      tuningOffsetCents: tuningOffsetCents ?? 0,
      notesProfiled: profiler.notesProfiled,
      noiseFloorSeeded: true,
      deviceId,
      timestamp: Date.now(),
    };

    saveCalibrationV2Profile(profile);
    return profile;
  }

  /** Abort the calibration. */
  abort(): void {
    this.aborted = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  // ── Step 1: Silence ──────────────────────────────────────────────────

  private captureSilence(
    analyser: AnalyserNode,
    noiseFloor: AdaptiveNoiseFloor,
    onProgress: ProgressCallback,
  ): Promise<void> {
    return new Promise((resolve) => {
      const freqBuffer = new Float32Array(analyser.frequencyBinCount);
      const sampleRate = analyser.context.sampleRate;
      const startTime = performance.now();

      const tick = () => {
        if (this.aborted) {
          resolve();
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;
        onProgress({ step: 'silence', elapsed, total: SILENCE_DURATION });

        // Feed frequency data to noise floor estimator
        analyser.getFloatFrequencyData(freqBuffer);
        noiseFloor.update(freqBuffer, sampleRate);

        if (elapsed >= SILENCE_DURATION) {
          resolve();
        } else {
          this.rafId = requestAnimationFrame(tick);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  // ── Step 2: Single Note ──────────────────────────────────────────────

  private captureSingleNote(
    fastAnalyser: AnalyserNode,
    hiResAnalyser: AnalyserNode,
    profiler: InstrumentProfiler,
    sampleRate: number,
    onProgress: ProgressCallback,
  ): Promise<number | null> {
    return new Promise((resolve) => {
      const timeBuffer = new Float32Array(fastAnalyser.fftSize);
      const freqBuffer = new Float32Array(hiResAnalyser.frequencyBinCount);
      const startTime = performance.now();
      const centsMeasurements: number[] = [];
      let noteDetected = false;

      const tick = () => {
        if (this.aborted) {
          resolve(null);
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;

        // Measure RMS from fast analyser
        fastAnalyser.getFloatTimeDomainData(timeBuffer);
        let sum = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          sum += timeBuffer[i] * timeBuffer[i];
        }
        const rms = Math.sqrt(sum / timeBuffer.length);

        let detectedNote: string | undefined;

        if (rms > 0.01) {
          noteDetected = true;
          hiResAnalyser.getFloatFrequencyData(freqBuffer);

          // Find peak frequency in C4 range (200–350 Hz)
          const fftSize = hiResAnalyser.fftSize;
          const binWidth = sampleRate / fftSize;
          const minBin = Math.floor(200 / binWidth);
          const maxBinIdx = Math.ceil(350 / binWidth);

          let maxVal = -Infinity;
          let maxBin = 0;
          for (let i = minBin; i <= maxBinIdx && i < freqBuffer.length; i++) {
            if (freqBuffer[i] > maxVal) {
              maxVal = freqBuffer[i];
              maxBin = i;
            }
          }

          if (maxVal > -60) {
            // Parabolic interpolation
            const alpha =
              maxBin > 0 ? freqBuffer[maxBin - 1] : freqBuffer[maxBin];
            const beta = freqBuffer[maxBin];
            const gamma =
              maxBin < freqBuffer.length - 1
                ? freqBuffer[maxBin + 1]
                : freqBuffer[maxBin];
            const denom = alpha - 2 * beta + gamma;
            const peakOffset =
              denom !== 0 ? (0.5 * (alpha - gamma)) / denom : 0;
            const peakFreq = (maxBin + peakOffset) * binWidth;

            // Measure tuning offset from nearest semitone
            const midiContinuous = freqToMidiContinuous(peakFreq);
            const midiRounded = Math.round(midiContinuous);
            const centsOffset = (midiContinuous - midiRounded) * 100;
            centsMeasurements.push(centsOffset);

            // Note name for UI
            const notePc = (((midiRounded - 60) % 12) + 12) % 12;
            detectedNote = NOTE_NAMES[notePc];

            // Feed to profiler
            profiler.observeNote(midiRounded, freqBuffer, sampleRate);
          }
        }

        onProgress({
          step: 'single-note',
          elapsed,
          total: SINGLE_NOTE_DURATION,
          detectedNote,
        });

        if (elapsed >= SINGLE_NOTE_DURATION) {
          if (!noteDetected || centsMeasurements.length === 0) {
            resolve(0);
            return;
          }

          // Median tuning offset
          centsMeasurements.sort((a, b) => a - b);
          const median =
            centsMeasurements[Math.floor(centsMeasurements.length / 2)];
          resolve(median);
        } else {
          this.rafId = requestAnimationFrame(tick);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  // ── Step 3: Chord ────────────────────────────────────────────────────

  private captureChord(
    hiResAnalyser: AnalyserNode,
    profiler: InstrumentProfiler,
    sampleRate: number,
    onProgress: ProgressCallback,
  ): Promise<void> {
    return new Promise((resolve) => {
      const freqBuffer = new Float32Array(hiResAnalyser.frequencyBinCount);
      const timeBuffer = new Float32Array(hiResAnalyser.fftSize);
      const startTime = performance.now();
      const binWidth = sampleRate / hiResAnalyser.fftSize;

      const tick = () => {
        if (this.aborted) {
          resolve();
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;

        // Measure RMS
        hiResAnalyser.getFloatTimeDomainData(timeBuffer);
        let sum = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          sum += timeBuffer[i] * timeBuffer[i];
        }
        const rms = Math.sqrt(sum / timeBuffer.length);

        let detectedChord: string | undefined;

        if (rms > 0.01) {
          hiResAnalyser.getFloatFrequencyData(freqBuffer);

          // Find top 3 peaks for chord display
          const peaks = this.findSpectralPeaks(freqBuffer, binWidth, 3);
          if (peaks.length >= 2) {
            const noteNames = peaks.map((freq) => {
              const midi = freqToMidi(freq);
              const pc = (((midi - 60) % 12) + 12) % 12;
              return NOTE_NAMES[pc];
            });
            detectedChord = noteNames.join('-');
          }

          // Feed each detected peak to profiler
          for (const freq of peaks) {
            const midi = freqToMidi(freq);
            if (midi >= 21 && midi <= 108) {
              profiler.observeNote(midi, freqBuffer, sampleRate);
            }
          }
        }

        onProgress({
          step: 'chord',
          elapsed,
          total: CHORD_DURATION,
          detectedChord,
        });

        if (elapsed >= CHORD_DURATION) {
          resolve();
        } else {
          this.rafId = requestAnimationFrame(tick);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  /**
   * Find top N spectral peaks above -40 dB, separated by at least 3 semitones.
   */
  private findSpectralPeaks(
    spectrum: Float32Array,
    binWidth: number,
    maxPeaks: number,
  ): number[] {
    const peaks: { freq: number; db: number }[] = [];

    // Search 80Hz–2000Hz (piano chord fundamental range)
    const minBin = Math.floor(80 / binWidth);
    const maxBin = Math.min(spectrum.length - 1, Math.ceil(2000 / binWidth));

    for (let b = minBin + 1; b < maxBin; b++) {
      if (
        spectrum[b] > spectrum[b - 1] &&
        spectrum[b] > spectrum[b + 1] &&
        spectrum[b] > -40
      ) {
        const freq = b * binWidth;
        peaks.push({ freq, db: spectrum[b] });
      }
    }

    // Sort by magnitude descending
    peaks.sort((a, b) => b.db - a.db);

    // Select top peaks with minimum semitone separation
    const selected: number[] = [];
    for (const peak of peaks) {
      if (selected.length >= maxPeaks) break;

      const tooClose = selected.some((existing) => {
        const semitoneDist = Math.abs(12 * Math.log2(peak.freq / existing));
        return semitoneDist < 3;
      });

      if (!tooClose) {
        selected.push(peak.freq);
      }
    }

    return selected;
  }
}
