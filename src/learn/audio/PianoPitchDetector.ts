// ── PianoPitchDetector ───────────────────────────────────────────────────
// Real-time monophonic pitch detection optimized for acoustic piano.
//
// Uses a hybrid approach:
//   1. Multi-candidate YIN for precise frequency estimation (PYIN-inspired)
//   2. Harmonic Product Spectrum (HPS) for candidate scoring & octave disambiguation
//   3. Harmonic coherence scoring for noise/voice rejection
//   4. Spectral flatness gate for broadband noise rejection
//   5. Three-state temporal machine (searching → confirming → tracking)
//   6. EMA smoothing with intelligent reset on pitch jumps
//
// Outputs MIDI note numbers with velocity estimation and onset/offset events.

import { YinDetector, type YinCandidate } from '@/audio/pitch/YinCore';

// ── Types ────────────────────────────────────────────────────────────────

export interface PianoNoteDetection {
  type: 'noteOn' | 'noteOff';
  midiNumber: number; // 21 (A0) – 108 (C8)
  velocity: number; // Estimated from onset RMS (0–127)
  confidence: number; // 0–1 YIN confidence
}

// ── Constants (piano-tuned) ──────────────────────────────────────────────

const A4_FREQ = 440;
const MIN_FREQ = 27.5; // A0 — piano's lowest note
const MAX_FREQ = 4186; // C8 — piano's highest note
const YIN_THRESHOLD = 0.15; // standard YIN threshold for piano
const RMS_THRESHOLD = 0.02; // above voices and typical room noise
const MIN_YIN_CONFIDENCE = 0.65; // piano produces 0.85+; voices/noise are lower
const MAX_SPECTRAL_FLATNESS = 0.4; // piano ≈ 0.05-0.15; voices/noise ≈ 0.4-0.8

// HPS (Harmonic Product Spectrum) parameters
const HPS_HARMONICS = 5; // downsample by factors 1-5

// Harmonic coherence parameters
const MIN_HARMONICS_PRESENT = 2; // at least 2 of 4 upper harmonics must be present
const MIN_HARMONICS_QUIET = 1; // relax to 1 for quiet notes (RMS < QUIET_RMS_THRESHOLD)
const QUIET_RMS_THRESHOLD = 0.05; // below this, use relaxed harmonic check
const HARMONIC_PEAK_THRESHOLD_DB = -65; // harmonic must exceed this dB level

// Velocity mapping: log-scale RMS → MIDI velocity
const VELOCITY_MIN_RMS = 0.02; // pp ≈ velocity 30
const VELOCITY_MAX_RMS = 0.3; // ff ≈ velocity 110
const VELOCITY_MIN = 30;
const VELOCITY_MAX = 110;

// State machine parameters (adapted from apankrat/note-detector for 20Hz)
const CONFIRM_FRAMES = 2; // ~100ms confirmation window
const CONFIRM_MAX_MISSES = 1; // allow 1 missed frame during confirmation
const DETRACK_FRAMES = 3; // ~150ms before losing track
const DETRACK_MIN_RMS = 0.005; // absolute silence threshold during tracking

// EMA smoothing with intelligent reset (from sonovice/pitch-detector)
const EMA_ALPHA = 0.4; // balance: 0=no smoothing, 1=no history
const RESET_CENTS = 150; // reset if jump > 1.5 semitones

// Multi-candidate YIN (PYIN-inspired, from cho45/pitch-detector)
const MAX_YIN_CANDIDATES = 8;
const HPS_AGREEMENT_BONUS = 0.5; // multiply score by this if HPS agrees
const DIATONIC_AGREEMENT_BONUS = 0.85; // soft bias: prefer in-key candidates when scores are close
const EXPECTED_NOTE_BONUS = 0.4; // strong prior: heavily favor expected notes (Simply Piano trick)

// ── Helpers ──────────────────────────────────────────────────────────────

function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / A4_FREQ));
}

function rmsToVelocity(rms: number): number {
  if (rms <= VELOCITY_MIN_RMS) return VELOCITY_MIN;
  if (rms >= VELOCITY_MAX_RMS) return VELOCITY_MAX;
  const logMin = Math.log(VELOCITY_MIN_RMS);
  const logMax = Math.log(VELOCITY_MAX_RMS);
  const t = (Math.log(rms) - logMin) / (logMax - logMin);
  return Math.round(VELOCITY_MIN + t * (VELOCITY_MAX - VELOCITY_MIN));
}

// ── Class ────────────────────────────────────────────────────────────────

export class PianoPitchDetector {
  private timeDomainBuffer: Float32Array;
  private freqDomainBuffer: Float32Array;
  private fftSize: number;

  // Shared YIN detector (pre-allocated buffers, multi-candidate)
  private yinDetector: YinDetector | null = null;
  private yinSampleRate = 0;

  // State machine (replaces noteHoldCount/pendingNote hysteresis)
  private state: 'searching' | 'confirming' | 'tracking' = 'searching';
  private candidateNote: number | null = null;
  private candidateCount = 0;
  private candidateConfidence = 0;
  private confirmMissCount = 0; // missed frames during confirmation (tolerates brief dropouts)
  private trackMissCount = 0;

  // Active note
  private currentNote: number | null = null;
  private onsetRms = 0;

  // EMA smoothing (replaces median filter)
  private smoothedFreq = 0;

  // Callback
  private onDetection: ((event: PianoNoteDetection) => void) | null = null;

  // Verification mode: when set, only accept notes in this set (±1 semitone)
  private expectedNotes: Set<number> | null = null;

  // Key-aware diatonic pitch classes for soft bias during candidate scoring
  private diatonicPCs: Set<number> | null = null;

  // Adaptive noise floor: calibrates from ambient noise on startup
  private noiseFloorRms = RMS_THRESHOLD; // start at static threshold
  private noiseCalibrationSamples: number[] = [];
  private noiseCalibrated = false;
  private readonly NOISE_CAL_FRAMES = 20; // ~500ms of calibration
  private readonly NOISE_MULTIPLIER = 3; // threshold = noise × 3

  constructor(fftSize: number = 16384) {
    this.fftSize = fftSize;
    this.timeDomainBuffer = new Float32Array(fftSize);
    this.freqDomainBuffer = new Float32Array(fftSize / 2);
  }

  /** Set the callback for note detection events. */
  setCallback(cb: (event: PianoNoteDetection) => void): void {
    this.onDetection = cb;
  }

  /** Set expected MIDI notes for verification mode. Null = open-ended. */
  setExpectedNotes(notes: number[] | null): void {
    this.expectedNotes = notes && notes.length > 0 ? new Set(notes) : null;
  }

  /** Set key context for diatonic pitch bias during candidate scoring. */
  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.diatonicPCs = new Set(modeIntervals.map((iv) => (rootPc + iv) % 12));
  }

  /** Clear key context (disables diatonic bias). */
  clearKeyContext(): void {
    this.diatonicPCs = null;
  }

  /** Analyze a single frame from the analyser node. Call at ~20-40Hz.
   *  When onsetDetected is true (from OnsetDetector), skip the confirmation
   *  state and emit noteOn immediately on first detection. */
  analyze(
    analyser: AnalyserNode,
    onsetDetected = false,
  ): PianoNoteDetection | null {
    const sampleRate = analyser.context.sampleRate;
    analyser.getFloatTimeDomainData(
      this.timeDomainBuffer as Float32Array<ArrayBuffer>,
    );

    // Compute current RMS
    let rmsSum = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      rmsSum += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
    }
    const rms = Math.sqrt(rmsSum / this.timeDomainBuffer.length);

    // Get frequency domain data (used by spectral flatness, HPS, and harmonic coherence)
    analyser.getFloatFrequencyData(
      this.freqDomainBuffer as Float32Array<ArrayBuffer>,
    );

    // ── State machine ────────────────────────────────────────────────────

    if (this.state === 'tracking') {
      // In tracking: check if note should end
      if (rms < DETRACK_MIN_RMS) {
        // Absolute silence → immediate note-off
        return this.emitNoteOff();
      }

      // Try to detect current pitch
      const detected = this.detectPitch(sampleRate, rms);

      if (detected !== null && detected === this.currentNote) {
        // Still tracking the same note — reset miss counter
        this.trackMissCount = 0;
        return null;
      } else {
        // Detection failed or different note
        this.trackMissCount++;
        if (this.trackMissCount >= DETRACK_FRAMES) {
          // Lost track for too long → note-off, transition to searching
          const noteOff = this.emitNoteOff();
          // If we detected a different note, seed it as candidate
          if (detected !== null) {
            this.state = 'confirming';
            this.candidateNote = detected;
            this.candidateCount = 1;
            this.candidateConfidence = 0;
          }
          return noteOff;
        }
        return null; // Still within grace period
      }
    }

    if (this.state === 'searching') {
      // In searching: look for a new note candidate
      const detected = this.detectPitch(sampleRate, rms);
      if (detected !== null) {
        // Fast-confirm: if onset detector triggered, skip confirmation and emit immediately
        if (onsetDetected && this.candidateConfidence >= MIN_YIN_CONFIDENCE) {
          this.currentNote = detected;
          this.onsetRms = rms;
          this.trackMissCount = 0;
          this.state = 'tracking';

          const velocity = rmsToVelocity(rms);
          const noteOn: PianoNoteDetection = {
            type: 'noteOn',
            midiNumber: detected,
            velocity,
            confidence: this.candidateConfidence,
          };
          this.onDetection?.(noteOn);
          return noteOn;
        }

        this.state = 'confirming';
        this.candidateNote = detected;
        this.candidateCount = 1;
        this.candidateConfidence = 0;
      }
      return null;
    }

    // state === 'confirming'
    const detected = this.detectPitch(sampleRate, rms);

    if (detected === this.candidateNote) {
      // Same candidate — accumulate
      this.candidateCount++;
      this.confirmMissCount = 0; // reset miss counter on successful detection
      // Fast-confirm: onset + at least 1 confirming frame = immediate emit
      if (onsetDetected || this.candidateCount >= CONFIRM_FRAMES) {
        // Confirmed! Emit note-on, transition to tracking
        this.currentNote = this.candidateNote;
        this.onsetRms = rms;
        this.trackMissCount = 0;
        this.state = 'tracking';

        const velocity = rmsToVelocity(rms);
        const noteOn: PianoNoteDetection = {
          type: 'noteOn',
          midiNumber: this.candidateNote!,
          velocity,
          confidence: this.candidateConfidence,
        };
        this.candidateNote = null;
        this.candidateCount = 0;
        this.confirmMissCount = 0;
        this.onDetection?.(noteOn);
        return noteOn;
      }
      return null;
    } else if (detected !== null) {
      // Different note — restart confirming with new candidate
      this.candidateNote = detected;
      this.candidateCount = 1;
      this.candidateConfidence = 0;
      this.confirmMissCount = 0;
      return null;
    } else {
      // No detection — tolerate brief dropouts instead of resetting
      this.confirmMissCount++;
      if (this.confirmMissCount > CONFIRM_MAX_MISSES) {
        // Too many consecutive misses — back to searching
        this.state = 'searching';
        this.candidateNote = null;
        this.candidateCount = 0;
        this.confirmMissCount = 0;
      }
      return null;
    }
  }

  /** Reset all state. */
  reset(): void {
    if (this.currentNote !== null) {
      this.onDetection?.({
        type: 'noteOff',
        midiNumber: this.currentNote,
        velocity: 0,
        confidence: 0,
      });
    }
    this.currentNote = null;
    this.onsetRms = 0;
    this.smoothedFreq = 0;
    this.state = 'searching';
    this.candidateNote = null;
    this.candidateCount = 0;
    this.candidateConfidence = 0;
    this.confirmMissCount = 0;
    this.trackMissCount = 0;
    // Re-calibrate noise floor on next start
    this.noiseCalibrated = false;
    this.noiseCalibrationSamples = [];
    this.noiseFloorRms = RMS_THRESHOLD;
  }

  /** Get the currently active note, or null if silent. */
  getCurrentNote(): number | null {
    return this.currentNote;
  }

  // ── Internal: pitch detection pipeline ─────────────────────────────────

  /**
   * Run the full detection pipeline and return a MIDI note number, or null.
   * This is called by the state machine — it does NOT emit events.
   */
  private detectPitch(sampleRate: number, rms: number): number | null {
    // Adaptive noise floor: calibrate from first frames when no note is active
    if (!this.noiseCalibrated && this.state === 'searching') {
      this.noiseCalibrationSamples.push(rms);
      if (this.noiseCalibrationSamples.length >= this.NOISE_CAL_FRAMES) {
        // Use 90th percentile as noise floor estimate
        const sorted = [...this.noiseCalibrationSamples].sort((a, b) => a - b);
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        this.noiseFloorRms = Math.max(
          RMS_THRESHOLD,
          p90 * this.NOISE_MULTIPLIER,
        );
        this.noiseCalibrated = true;
      }
    }

    // RMS gate (uses adaptive noise floor after calibration)
    if (rms < this.noiseFloorRms) return null;

    // Spectral flatness gate: reject broadband signals (voices, noise)
    const flatness = this.computeSpectralFlatness(sampleRate);
    if (flatness > MAX_SPECTRAL_FLATNESS) return null;

    // Multi-candidate YIN detection (shared YinCore)
    if (!this.yinDetector || this.yinSampleRate !== sampleRate) {
      this.yinSampleRate = sampleRate;
      this.yinDetector = new YinDetector({
        frameLength: this.fftSize,
        sampleRate,
        threshold: YIN_THRESHOLD,
        minFreq: MIN_FREQ,
        maxFreq: MAX_FREQ,
        maxCandidates: MAX_YIN_CANDIDATES,
      });
    }
    const candidates = this.yinDetector.detectCandidates(this.timeDomainBuffer);
    if (candidates.length === 0) return null;

    // HPS for octave disambiguation / candidate scoring
    const hpsFreq = this.hpsDetect(sampleRate);

    // Score candidates: CMNDF score × HPS agreement bonus
    let bestCandidate: YinCandidate | null = null;
    let bestScore = Infinity;

    for (const c of candidates) {
      let score = c.score;

      // Bonus if this candidate agrees with HPS (within 1 semitone)
      if (hpsFreq !== null) {
        const semitoneDiff = Math.abs(12 * Math.log2(c.frequency / hpsFreq));
        if (semitoneDiff < 1.0) {
          score *= HPS_AGREEMENT_BONUS; // reward HPS agreement
        }
      }

      // Soft diatonic bias: prefer in-key candidates when scores are close
      if (this.diatonicPCs) {
        const pc = freqToMidi(c.frequency) % 12;
        if (this.diatonicPCs.has(pc)) {
          score *= DIATONIC_AGREEMENT_BONUS;
        }
      }

      // Strong expected-note prior: heavily favor notes the user should play
      if (this.expectedNotes) {
        const midi = freqToMidi(c.frequency);
        if (
          this.expectedNotes.has(midi) ||
          this.expectedNotes.has(midi - 1) ||
          this.expectedNotes.has(midi + 1)
        ) {
          score *= EXPECTED_NOTE_BONUS;
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = c;
      }
    }

    if (!bestCandidate) return null;

    const confidence = 1 - bestCandidate.score;
    if (confidence < MIN_YIN_CONFIDENCE) return null;

    let frequency = bestCandidate.frequency;

    // HPS octave correction for the winning candidate
    if (hpsFreq && hpsFreq > MIN_FREQ && hpsFreq < MAX_FREQ) {
      const ratio = frequency / hpsFreq;
      if (ratio > 1.8 && ratio < 2.2) {
        // YIN detected an octave too high
        const yinMidi = freqToMidi(frequency);
        const hpsMidi = freqToMidi(hpsFreq);
        if (yinMidi - hpsMidi === 12) {
          frequency = hpsFreq;
        }
      } else if (ratio > 0.45 && ratio < 0.55) {
        // YIN detected an octave too low
        const yinMidi = freqToMidi(frequency);
        const hpsMidi = freqToMidi(hpsFreq);
        if (hpsMidi - yinMidi === 12) {
          frequency = hpsFreq;
        }
      }
    }

    // Harmonic coherence: verify the detected pitch has real piano harmonics
    if (!this.checkHarmonicCoherence(frequency, sampleRate, rms)) return null;

    // EMA smoothing with intelligent reset
    frequency = this.emaSmooth(frequency);

    const midiNote = freqToMidi(frequency);

    // Clamp to piano range
    if (midiNote < 21 || midiNote > 108) return null;

    // Verification mode: suppress notes far from expected set (±2 semitone safety net)
    // The expected-note prior in candidate scoring handles accuracy; this is a wide safety net.
    if (this.expectedNotes) {
      let match = false;
      for (let d = -2; d <= 2; d++) {
        if (this.expectedNotes.has(midiNote + d)) {
          match = true;
          break;
        }
      }
      if (!match) return null;
    }

    // Store confidence for the state machine to use on noteOn emission
    this.candidateConfidence = confidence;

    return midiNote;
  }

  // ── HPS (Harmonic Product Spectrum) ────────────────────────────────────

  private hpsDetect(sampleRate: number): number | null {
    const binWidth = sampleRate / this.fftSize;
    const numBins = this.freqDomainBuffer.length;

    const minBin = Math.max(1, Math.floor(MIN_FREQ / binWidth));
    const maxBin = Math.min(
      Math.floor(numBins / HPS_HARMONICS),
      Math.floor(MAX_FREQ / binWidth),
    );

    if (maxBin <= minBin) return null;

    let bestBin = minBin;
    let bestProduct = -Infinity;

    for (let bin = minBin; bin <= maxBin; bin++) {
      let product = 0;
      for (let h = 1; h <= HPS_HARMONICS; h++) {
        const hBin = bin * h;
        if (hBin >= numBins) {
          product += -100;
        } else {
          product += this.freqDomainBuffer[hBin];
        }
      }
      if (product > bestProduct) {
        bestProduct = product;
        bestBin = bin;
      }
    }

    // Parabolic interpolation for sub-bin accuracy
    if (bestBin > minBin && bestBin < maxBin) {
      const getHps = (b: number) => {
        let s = 0;
        for (let h = 1; h <= HPS_HARMONICS; h++) {
          const hb = b * h;
          s += hb < numBins ? this.freqDomainBuffer[hb] : -100;
        }
        return s;
      };
      const y0 = getHps(bestBin - 1);
      const y1 = bestProduct;
      const y2 = getHps(bestBin + 1);
      const denom = 2 * (2 * y1 - y0 - y2);
      if (Math.abs(denom) > 1e-6) {
        const shift = (y2 - y0) / denom;
        if (Math.abs(shift) < 1) {
          return (bestBin + shift) * binWidth;
        }
      }
    }

    return bestBin * binWidth;
  }

  // ── EMA Smoothing with Intelligent Reset ───────────────────────────────

  private emaSmooth(rawFreq: number): number {
    if (this.smoothedFreq === 0) {
      // First detection — no history
      this.smoothedFreq = rawFreq;
      return rawFreq;
    }

    const centsDiff = 1200 * Math.abs(Math.log2(rawFreq / this.smoothedFreq));

    if (centsDiff > RESET_CENTS) {
      // Large pitch jump (new note) — instant reset, no lag
      this.smoothedFreq = rawFreq;
    } else {
      // Small variation (same note) — smooth
      this.smoothedFreq =
        EMA_ALPHA * rawFreq + (1 - EMA_ALPHA) * this.smoothedFreq;
    }

    return this.smoothedFreq;
  }

  // ── Note-off emission ──────────────────────────────────────────────────

  private emitNoteOff(): PianoNoteDetection | null {
    if (this.currentNote === null) {
      this.state = 'searching';
      return null;
    }

    const noteOff: PianoNoteDetection = {
      type: 'noteOff',
      midiNumber: this.currentNote,
      velocity: 0,
      confidence: 0,
    };
    this.currentNote = null;
    this.onsetRms = 0;
    this.smoothedFreq = 0;
    this.state = 'searching';
    this.candidateNote = null;
    this.candidateCount = 0;
    this.trackMissCount = 0;
    this.onDetection?.(noteOff);
    return noteOff;
  }

  // ── Harmonic Coherence ─────────────────────────────────────────────────

  private checkHarmonicCoherence(
    f0: number,
    sampleRate: number,
    rms: number,
  ): boolean {
    const binWidth = sampleRate / this.fftSize;
    let harmonicsPresent = 0;

    for (let h = 2; h <= 5; h++) {
      const hFreq = f0 * h;
      if (hFreq > sampleRate / 2) break;
      const expectedBin = Math.round(hFreq / binWidth);
      if (expectedBin >= this.freqDomainBuffer.length) break;

      let peakDb = -Infinity;
      for (
        let b = Math.max(0, expectedBin - 1);
        b <= Math.min(this.freqDomainBuffer.length - 1, expectedBin + 1);
        b++
      ) {
        if (this.freqDomainBuffer[b] > peakDb)
          peakDb = this.freqDomainBuffer[b];
      }

      if (peakDb > HARMONIC_PEAK_THRESHOLD_DB) {
        harmonicsPresent++;
      }
    }

    // Relax threshold for quiet notes — soft piano has weaker upper partials
    const minRequired =
      rms < QUIET_RMS_THRESHOLD ? MIN_HARMONICS_QUIET : MIN_HARMONICS_PRESENT;
    return harmonicsPresent >= minRequired;
  }

  // ── Spectral Flatness ──────────────────────────────────────────────────

  private computeSpectralFlatness(sampleRate: number): number {
    const binWidth = sampleRate / this.fftSize;
    const loBin = Math.max(1, Math.round(27 / binWidth));
    const hiBin = Math.min(
      this.freqDomainBuffer.length - 1,
      Math.round(4200 / binWidth),
    );
    const count = hiBin - loBin + 1;
    if (count <= 0) return 1;

    let logSum = 0;
    let linSum = 0;
    for (let k = loBin; k <= hiBin; k++) {
      const power = Math.pow(10, this.freqDomainBuffer[k] / 10);
      logSum += Math.log(power + 1e-20);
      linSum += power;
    }

    const geometricMean = Math.exp(logSum / count);
    const arithmeticMean = linSum / count;
    if (arithmeticMean < 1e-20) return 1;

    return geometricMean / arithmeticMean;
  }
}
