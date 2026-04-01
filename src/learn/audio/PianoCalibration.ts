// ── PianoCalibration ──────────────────────────────────────────────────────
// 3-step calibration flow for acoustic piano detection:
//   1. Silence capture (3s) → room noise floor baseline
//   2. Single note (5s) → onset RMS, tuning offset, harmonic profile, decay rate
//   3. Chord (5s) → validates chord detection, adjusts harmonic weights
//
// Calibration is optional — defaults work without it. This improves accuracy
// for the user's specific piano and room acoustics.

import { PianoChordDetector } from './PianoChordDetector';

// ── Types ────────────────────────────────────────────────────────────────

export interface PianoCalibrationProfile {
  noiseFloorDb: number;
  tuningOffsetCents: number;
  onsetRmsBaseline: number;
  harmonicWeights: { h3: number; h5: number; h7: number };
  decayRatePerSecond: number;
  deviceId: string;
  timestamp: number;
}

export type CalibrationStep = 'silence' | 'single-note' | 'chord';

export interface CalibrationProgress {
  step: CalibrationStep;
  elapsed: number; // seconds elapsed in current step
  total: number; // total seconds for current step
  detectedNote?: string; // detected note name during single-note step
  detectedChord?: string; // detected chord during chord step
}

type ProgressCallback = (progress: CalibrationProgress) => void;

// ── Constants ────────────────────────────────────────────────────────────

const SILENCE_DURATION = 3; // seconds
const SINGLE_NOTE_DURATION = 5;
const CHORD_DURATION = 5;

const STORAGE_KEY = 'learn-piano-calibration';

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

export function loadCalibrationProfile(): PianoCalibrationProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PianoCalibrationProfile;
  } catch {
    return null;
  }
}

export function saveCalibrationProfile(profile: PianoCalibrationProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage may be unavailable
  }
}

export function clearCalibrationProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── Calibration Runner ───────────────────────────────────────────────────

export class PianoCalibrationRunner {
  private aborted = false;
  private rafId = 0;

  /** Run the full 3-step calibration. Resolves with the profile or null if aborted. */
  async run(
    onsetAnalyser: AnalyserNode,
    chromaAnalyser: AnalyserNode,
    deviceId: string,
    onProgress: ProgressCallback,
  ): Promise<PianoCalibrationProfile | null> {
    this.aborted = false;

    // Step 1: Silence capture
    const noiseFloorDb = await this.captureSilence(onsetAnalyser, onProgress);
    if (this.aborted) return null;

    // Step 2: Single note capture (middle C)
    const noteData = await this.captureSingleNote(
      onsetAnalyser,
      chromaAnalyser,
      onProgress,
    );
    if (this.aborted || !noteData) return null;

    // Step 3: Chord capture (C major)
    const chordData = await this.captureChord(chromaAnalyser, onProgress);
    if (this.aborted || !chordData) return null;

    const profile: PianoCalibrationProfile = {
      noiseFloorDb,
      tuningOffsetCents: noteData.tuningOffsetCents,
      onsetRmsBaseline: noteData.onsetRms,
      harmonicWeights: chordData.harmonicWeights,
      decayRatePerSecond: noteData.decayRate,
      deviceId,
      timestamp: Date.now(),
    };

    saveCalibrationProfile(profile);
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
    onProgress: ProgressCallback,
  ): Promise<number> {
    return new Promise((resolve) => {
      const buffer = new Float32Array(analyser.fftSize);
      const startTime = performance.now();
      const rmsValues: number[] = [];

      const tick = () => {
        if (this.aborted) {
          resolve(-60);
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;
        onProgress({ step: 'silence', elapsed, total: SILENCE_DURATION });

        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        if (rms > 0) rmsValues.push(rms);

        if (elapsed >= SILENCE_DURATION) {
          // Compute average RMS → dB
          const avgRms =
            rmsValues.length > 0
              ? rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length
              : 0.001;
          const noiseFloorDb = 20 * Math.log10(Math.max(avgRms, 1e-10));
          resolve(noiseFloorDb);
        } else {
          this.rafId = requestAnimationFrame(tick);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  // ── Step 2: Single Note ──────────────────────────────────────────────

  private captureSingleNote(
    onsetAnalyser: AnalyserNode,
    chromaAnalyser: AnalyserNode,
    onProgress: ProgressCallback,
  ): Promise<{
    tuningOffsetCents: number;
    onsetRms: number;
    decayRate: number;
  } | null> {
    return new Promise((resolve) => {
      const timeBuffer = new Float32Array(onsetAnalyser.fftSize);
      const freqBuffer = new Float32Array(chromaAnalyser.frequencyBinCount);
      const sampleRate = chromaAnalyser.context.sampleRate;
      const startTime = performance.now();

      let peakRms = 0;
      const rmsOverTime: { time: number; rms: number }[] = [];
      const centsMeasurements: number[] = [];
      let noteDetected = false;

      const tick = () => {
        if (this.aborted) {
          resolve(null);
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;

        // Measure RMS
        onsetAnalyser.getFloatTimeDomainData(timeBuffer);
        let sum = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          sum += timeBuffer[i] * timeBuffer[i];
        }
        const rms = Math.sqrt(sum / timeBuffer.length);
        if (rms > peakRms) peakRms = rms;
        rmsOverTime.push({ time: elapsed, rms });

        // Try to detect the note's pitch and tuning
        let detectedNote: string | undefined;
        if (rms > 0.01) {
          noteDetected = true;
          chromaAnalyser.getFloatFrequencyData(freqBuffer);

          // Find peak frequency
          let maxVal = -Infinity;
          let maxBin = 0;
          // Search C4 range (200-300 Hz)
          const minBin = Math.floor(
            (200 * chromaAnalyser.fftSize) / sampleRate,
          );
          const maxBinIdx = Math.ceil(
            (350 * chromaAnalyser.fftSize) / sampleRate,
          );
          for (let i = minBin; i <= maxBinIdx && i < freqBuffer.length; i++) {
            if (freqBuffer[i] > maxVal) {
              maxVal = freqBuffer[i];
              maxBin = i;
            }
          }

          if (maxVal > -60) {
            // Parabolic interpolation for sub-bin accuracy
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
            const peakBin = maxBin + peakOffset;
            const peakFreq = (peakBin * sampleRate) / chromaAnalyser.fftSize;

            // Middle C = 261.626 Hz
            const expectedC4 = 261.626;
            const centsFromC4 = 1200 * Math.log2(peakFreq / expectedC4);
            // Round to nearest semitone to identify note
            const semitonesFromC4 = Math.round(centsFromC4 / 100);
            const centsOffset = centsFromC4 - semitonesFromC4 * 100;
            centsMeasurements.push(centsOffset);

            const notePc = ((semitonesFromC4 % 12) + 12) % 12;
            detectedNote = NOTE_NAMES[notePc];
          }
        }

        onProgress({
          step: 'single-note',
          elapsed,
          total: SINGLE_NOTE_DURATION,
          detectedNote,
        });

        if (elapsed >= SINGLE_NOTE_DURATION) {
          if (!noteDetected) {
            resolve({ tuningOffsetCents: 0, onsetRms: 0.01, decayRate: 0.5 });
            return;
          }

          // Compute tuning offset (median of cents measurements)
          centsMeasurements.sort((a, b) => a - b);
          const tuningOffsetCents =
            centsMeasurements.length > 0
              ? centsMeasurements[Math.floor(centsMeasurements.length / 2)]
              : 0;

          // Compute decay rate from RMS over time
          // Find onset point (first time RMS > 50% of peak)
          const onsetIdx = rmsOverTime.findIndex((r) => r.rms > peakRms * 0.5);
          let decayRate = 0.5; // default
          if (onsetIdx >= 0 && rmsOverTime.length > onsetIdx + 5) {
            const onsetTime = rmsOverTime[onsetIdx].time;
            const onsetRmsVal = rmsOverTime[onsetIdx].rms;
            // Find where RMS drops to 1/e of onset
            const targetRms = onsetRmsVal / Math.E;
            const decayIdx = rmsOverTime.findIndex(
              (r, i) => i > onsetIdx && r.rms <= targetRms,
            );
            if (decayIdx >= 0) {
              const decayTime = rmsOverTime[decayIdx].time - onsetTime;
              decayRate = decayTime > 0 ? 1 / decayTime : 0.5;
            }
          }

          resolve({
            tuningOffsetCents,
            onsetRms: peakRms,
            decayRate,
          });
        } else {
          this.rafId = requestAnimationFrame(tick);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  // ── Step 3: Chord ────────────────────────────────────────────────────

  private captureChord(
    chromaAnalyser: AnalyserNode,
    onProgress: ProgressCallback,
  ): Promise<{
    harmonicWeights: { h3: number; h5: number; h7: number };
  } | null> {
    return new Promise((resolve) => {
      const detector = new PianoChordDetector(chromaAnalyser.fftSize);
      const startTime = performance.now();
      const h3Values: number[] = [];
      const h5Values: number[] = [];
      const h7Values: number[] = [];

      const tick = () => {
        if (this.aborted) {
          resolve(null);
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;

        const result = detector.analyze(chromaAnalyser);
        let detectedChord: string | undefined;
        if (result && result.confidence > 0.3) {
          detectedChord = `${NOTE_NAMES[result.rootPc]} ${result.quality}`;
        }

        onProgress({
          step: 'chord',
          elapsed,
          total: CHORD_DURATION,
          detectedChord,
        });

        // Collect chromagram data for harmonic weight analysis
        const chromagram = detector.analyzeChromagram(chromaAnalyser);
        if (chromagram) {
          // Measure how much energy exists at harmonic intervals
          // relative to the fundamental. Use C major chord (C=0, E=4, G=7).
          const maxPc = chromagram.indexOf(Math.max(...Array.from(chromagram)));

          const h3Pc = (maxPc + 7) % 12; // perfect fifth
          const h5Pc = (maxPc + 4) % 12; // major third
          const h7Pc = (maxPc + 10) % 12; // minor seventh

          const fundamental = chromagram[maxPc];
          if (fundamental > 0.01) {
            h3Values.push(chromagram[h3Pc] / fundamental);
            h5Values.push(chromagram[h5Pc] / fundamental);
            h7Values.push(chromagram[h7Pc] / fundamental);
          }
        }

        if (elapsed >= CHORD_DURATION) {
          // Compute median harmonic weights
          const median = (arr: number[]) => {
            if (arr.length === 0) return 0.25;
            const sorted = [...arr].sort((a, b) => a - b);
            return sorted[Math.floor(sorted.length / 2)];
          };

          resolve({
            harmonicWeights: {
              h3: Math.min(0.5, Math.max(0.05, median(h3Values))),
              h5: Math.min(0.3, Math.max(0.02, median(h5Values))),
              h7: Math.min(0.15, Math.max(0.01, median(h7Values))),
            },
          });
        } else {
          this.rafId = requestAnimationFrame(tick);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }
}
