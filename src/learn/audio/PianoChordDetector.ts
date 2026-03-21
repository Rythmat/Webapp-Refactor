// ── PianoChordDetector ───────────────────────────────────────────────────
// Real-time chord detection from acoustic piano audio.
//
// Forked from AudioChordDetector.ts with piano-tuned parameters:
//   - Extended frequency range: A0 (27.5 Hz) through C7
//   - Larger FFT for low-frequency resolution
//   - Reduced harmonic suppression (piano harmonics decay faster)
//   - Evenly-weighted tone templates (piano voicings are less root-dominated)
//   - Wider vote window for piano sustain
//
// Pipeline:
//   1. Time-domain RMS silence gate
//   2. Adaptive noise floor from FFT spectrum median
//   3. Tuning compensation (EMA-smoothed cents offset)
//   4. dB-domain chromagram from smoothed FFT
//   5. Strongest-first harmonic suppression
//   6. L2-normalized cosine similarity (weighted templates + diatonic priors)
//   7. Exponentially-weighted vote buffer for temporal smoothing

import { CHORDS } from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

export interface PianoChordResult {
  rootPc: number; // 0-11 pitch class (0=C)
  quality: string; // key from CHORDS dictionary
  confidence: number; // 0-1 detection confidence
  tuningCents?: number; // estimated tuning offset in cents
}

interface ChordTemplate {
  rootPc: number;
  quality: string;
  profile: Float64Array; // 12-element weighted vector
  profileMag: number; // pre-computed L2 magnitude
  pcs: Set<number>; // pitch classes in this chord (for diatonic check)
}

interface VoteEntry {
  key: string | null;
  confidence: number;
}

// ── Constants (piano-tuned) ──────────────────────────────────────────────

const REF_FREQ = 27.5; // A0 in Hz — piano's lowest note
const NUM_OCTAVES = 7; // A0 through C7 (covers practical piano range)
const BINS_TO_SEARCH = 2; // search +/- 2 bins around expected frequency (tuning estimation only)

// CQT kernel parameters
const CQT_NOTES = 12 * NUM_OCTAVES; // 84 note bins (C0..B6)
const CQT_Q_FACTOR = 1.0 / (Math.pow(2, 1 / 24) - Math.pow(2, -1 / 24)); // ~34.13 (quarter-tone bandwidth)
const CQT_MIN_FREQ = 16.35; // C0 — lowest CQT bin center
const RMS_THRESHOLD = 0.02; // above voices and typical room noise
const CONFIDENCE_THRESHOLD = 0.4;
const MIN_ACTIVE_PCS = 2; // need ≥2 pitch classes for a chord

// Adaptive noise floor
const ADAPTIVE_NOISE_MARGIN = 10; // dB above spectrum median
const MIN_NOISE_FLOOR = -80; // absolute minimum floor

// Tuning compensation
const TUNING_EMA_ALPHA = 0.1;

// Harmonic suppression weights (reduced for piano — harmonics decay faster)
const H3_WEIGHT = 0.4; // 3rd harmonic → perfect fifth (+7 semitones)
const H5_WEIGHT = 0.2; // 5th harmonic → major third (+4 semitones)
const H7_WEIGHT = 0.08; // 7th harmonic → minor 7th (+10 semitones)

// Weighted vote buffer (wider window for piano sustain)
const VOTE_WINDOW = 8; // frames (~400ms at 20Hz)
const VOTE_DECAY = 0.8; // slightly faster decay for responsiveness
const VOTE_WEIGHTED_THRESHOLD = 0.55;

// Onset detection (higher threshold to reduce false onsets from sympathetic resonance)
const ONSET_RISE_DB = 8;
const ENVELOPE_ALPHA = 0.3;

// Attack blanking: skip N analysis frames after onset to avoid broadband transient
const ATTACK_BLANK_FRAMES = 2;

// Diatonic prior boost
const DIATONIC_BOOST = 1.25;

// Quality prior: favor common chords, penalize obscure ones
const CHORD_PRIOR: Record<string, number> = {
  major: 1.1,
  minor: 1.1,
  dominant7: 1.05,
  minor7: 1.05,
  major7: 1.05,
  sus4: 1.0,
  sus2: 1.0,
  '5': 1.0,
  Add2: 1.0,
  Add4: 1.0,
  diminished: 0.95,
  augmented: 0.95,
  diminished7: 0.95,
  minor7b5: 0.95,
  major6: 0.95,
  minor6: 0.95,
  dominant7sus4: 0.95,
  dominant7sus2: 0.9,
  major7sus2: 0.9,
  major7sus4: 0.9,
  minormajor7: 0.9,
  dominant9: 0.9,
  major9: 0.9,
  minor9: 0.9,
  major6add9: 0.9,
  minor6add9: 0.9,
  'dominant7#9': 0.85,
  dominant13: 0.85,
  major13: 0.85,
  minor13: 0.85,
  minor7b9: 0.85,
  dominant7b5: 0.85,
  'dominant7#5': 0.85,
  diminishedmajor7: 0.85,
  'minor7#5': 0.85,
  'major7#5': 0.9,
  dominant7b9: 0.9,
  'dominant7#5b9': 0.85,
};

// Parsimony: prefer simpler chords when scores are close
const PARSIMONY_MARGIN = 0.03;

// Tier 1 core qualities (same as guitar — these are instrument-agnostic)
const TIER1_QUALITIES = new Set([
  'major',
  'minor',
  'dominant7',
  'minor7',
  'major7',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  '5',
  'diminished7',
  'minor7b5',
  'major6',
  'minor6',
  'Add2',
  'Add4',
  'minormajor7',
  'dominant7sus4',
  'dominant7sus2',
  'major7sus2',
  'major7sus4',
  'dominant9',
  'major9',
  'minor9',
  'dominant7#9',
  'dominant13',
  'major13',
  'minor13',
  'major6add9',
  'minor6add9',
  'minor7b9',
  'dominant7b5',
  'dominant7#5',
  'diminishedmajor7',
  'minor7#5',
  'major7#5',
  'dominant7b9',
  'dominant7#5b9',
]);

// Slash chords skipped
const SKIP_QUALITIES = new Set<string>();
for (const key of Object.keys(CHORDS)) {
  if (key.includes('/')) SKIP_QUALITIES.add(key);
}

// ── Class ────────────────────────────────────────────────────────────────

// CQT kernel entry: which FFT bins contribute to a CQT note bin, with weights
interface CqtKernelEntry {
  fftBinStart: number;
  fftBinEnd: number;
  weights: Float64Array; // Hann window weights for bins in [start, end]
}

export class PianoChordDetector {
  private timeDomainBuffer: Float32Array;
  private fftData: Float32Array;
  private chroma = new Float64Array(12);
  private octaveEnergy = new Float64Array(12 * NUM_OCTAVES); // per-PC per-octave energy
  private noteFrequencies: number[];
  private templates: ChordTemplate[];

  // CQT kernel (pre-computed mapping from FFT bins to note bins)
  private cqtKernel: CqtKernelEntry[] = [];
  private cqtNoteFreqs: number[] = []; // center frequency for each of 84 CQT bins
  private cqtInitialized = false;
  private lastKernelSampleRate = 0;

  // Weighted vote buffer
  private voteBuffer: VoteEntry[];
  private voteIdx = 0;
  private lastVoteResult: PianoChordResult | null = null;

  // Tuning compensation
  private tuningOffsetCents = 0;

  // Onset detection
  private rmsEnvelope = 0;
  private rmsMin = 0;
  private onsetDetected = false;
  private attackBlankCounter = 0; // frames to skip after onset (attack blanking)

  // Chord hold (resist decay degradation)
  private heldChord: PianoChordResult | null = null;

  // Room noise profile (from calibration)
  private roomNoiseProfile: Float64Array | null = null;

  // Key-aware diatonic priors
  private diatonicPCs: Set<number> | null = null;

  // Calibration overrides
  private calibrationNoiseFloor: number | null = null;
  private calibrationTuning: number | null = null;
  private calibrationH3 = H3_WEIGHT;
  private calibrationH5 = H5_WEIGHT;
  private calibrationH7 = H7_WEIGHT;

  private sampleRate = 48000;
  private fftSize: number;

  constructor(fftSize: number = 16384) {
    this.fftSize = fftSize;
    this.timeDomainBuffer = new Float32Array(fftSize);
    this.fftData = new Float32Array(fftSize / 2);
    // A0 is pitch class 9 (A), so noteFrequencies[0] = C at the A0 octave
    // REF_FREQ = 27.5 Hz = A0. C0 = 16.35 Hz. We use A0 as the reference.
    // noteFrequencies[pc] = frequency of pitch class pc in octave 0 relative to A0
    this.noteFrequencies = Array.from(
      { length: 12 },
      (_, i) => REF_FREQ * Math.pow(2, (i - 9) / 12), // i=9 → A0 = REF_FREQ
    );
    // Pre-compute CQT note center frequencies (C0, C#0, D0, ... B6)
    this.cqtNoteFreqs = Array.from(
      { length: CQT_NOTES },
      (_, k) => CQT_MIN_FREQ * Math.pow(2, k / 12),
    );
    this.templates = this.buildTemplates();
    this.voteBuffer = Array.from({ length: VOTE_WINDOW }, () => ({
      key: null,
      confidence: 0,
    }));
  }

  /** Apply calibration profile (from Phase 8 CalibrationWizard). */
  applyCalibration(profile: {
    noiseFloorDb?: number;
    tuningOffsetCents?: number;
    harmonicWeights?: { h3: number; h5: number; h7: number };
  }): void {
    if (profile.noiseFloorDb != null)
      this.calibrationNoiseFloor = profile.noiseFloorDb;
    if (profile.tuningOffsetCents != null)
      this.calibrationTuning = profile.tuningOffsetCents;
    if (profile.harmonicWeights) {
      this.calibrationH3 = profile.harmonicWeights.h3;
      this.calibrationH5 = profile.harmonicWeights.h5;
      this.calibrationH7 = profile.harmonicWeights.h7;
    }
  }

  /** Set room noise profile (12-element chromagram from silence capture). */
  setRoomNoiseProfile(profile: Float64Array): void {
    this.roomNoiseProfile = new Float64Array(profile);
  }

  analyze(analyser: AnalyserNode): PianoChordResult | null {
    this.sampleRate = analyser.context.sampleRate;

    // Step 1: Time-domain RMS silence gate
    analyser.getFloatTimeDomainData(
      this.timeDomainBuffer as Float32Array<ArrayBuffer>,
    );
    if (!this.checkSignal()) {
      this.attackBlankCounter = 0;
      return this.updateVote(null);
    }

    // Attack blanking: skip frames right after onset to avoid broadband transient
    if (this.onsetDetected) {
      this.attackBlankCounter = ATTACK_BLANK_FRAMES;
    }
    if (this.attackBlankCounter > 0) {
      this.attackBlankCounter--;
      return this.lastVoteResult; // hold previous result during blanking
    }

    // Step 2: Read smoothed frequency-domain data (dB values)
    analyser.getFloatFrequencyData(this.fftData as Float32Array<ArrayBuffer>);

    // Step 3: Estimate tuning offset from strong peaks
    this.estimateTuning();

    // Step 4: Build chromagram with adaptive noise floor and tuning correction
    this.buildChromagram();

    // Step 5: Suppress piano string harmonics (strongest-first)
    this.suppressHarmonics();

    // Check minimum active pitch classes
    if (this.countActivePCs() < MIN_ACTIVE_PCS) {
      return this.updateVote(null);
    }

    // Step 6: L2-normalize and match against templates (with diatonic priors)
    this.normalizeChroma();
    const match = this.matchChord();
    if (!match) {
      return this.updateVote(null);
    }

    // Step 7: Weighted vote
    return this.updateVote(match);
  }

  /** Expose current chromagram for polyphonic peak picking (Phase 3). */
  getChromagram(): Float64Array {
    return new Float64Array(this.chroma);
  }

  /** Per-pitch-class per-octave energy (12 * NUM_OCTAVES elements).
   *  Index: pc * NUM_OCTAVES + octave. Populated by buildChromagram(). */
  getOctaveEnergy(): Float64Array {
    return this.octaveEnergy;
  }

  /** Run steps 1-5 without vote buffer (for polyphonic detector). */
  analyzeChromagram(analyser: AnalyserNode): Float64Array | null {
    this.sampleRate = analyser.context.sampleRate;

    analyser.getFloatTimeDomainData(
      this.timeDomainBuffer as Float32Array<ArrayBuffer>,
    );
    if (!this.checkSignal()) return null;

    analyser.getFloatFrequencyData(this.fftData as Float32Array<ArrayBuffer>);
    this.estimateTuning();
    this.buildChromagram();
    this.suppressHarmonics();
    this.normalizeChroma();

    return new Float64Array(this.chroma);
  }

  reset(): void {
    for (const entry of this.voteBuffer) {
      entry.key = null;
      entry.confidence = 0;
    }
    this.voteIdx = 0;
    this.lastVoteResult = null;
    this.tuningOffsetCents = 0;
    this.heldChord = null;
    this.rmsEnvelope = 0;
    this.rmsMin = 0;
    this.attackBlankCounter = 0;
  }

  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.diatonicPCs = new Set(modeIntervals.map((iv) => (rootPc + iv) % 12));
  }

  clearKeyContext(): void {
    this.diatonicPCs = null;
  }

  // ── Signal detection (time-domain RMS) ────────────────────────────────

  private checkSignal(): boolean {
    let sum = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      sum += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
    }
    const rms = Math.sqrt(sum / this.timeDomainBuffer.length);
    if (rms <= RMS_THRESHOLD) {
      this.rmsEnvelope = 0;
      this.rmsMin = 0;
      this.onsetDetected = false;
      this.heldChord = null;
      return false;
    }

    // Onset detection via RMS envelope
    const rmsDb = 20 * Math.log10(rms + 1e-10);
    this.rmsEnvelope =
      this.rmsEnvelope * (1 - ENVELOPE_ALPHA) + rmsDb * ENVELOPE_ALPHA;
    if (this.rmsEnvelope - this.rmsMin > ONSET_RISE_DB) {
      this.onsetDetected = true;
      this.rmsMin = this.rmsEnvelope;
    } else {
      this.onsetDetected = false;
      this.rmsMin = Math.min(this.rmsMin, this.rmsEnvelope);
    }

    return true;
  }

  // ── Tuning compensation ───────────────────────────────────────────────

  private estimateTuning(): void {
    // If calibration provided a fixed tuning, use it
    if (this.calibrationTuning != null) {
      this.tuningOffsetCents = this.calibrationTuning;
      return;
    }

    const binWidth = this.sampleRate / this.fftSize;
    const deviations: number[] = [];

    for (let pc = 0; pc < 12; pc++) {
      for (let octave = 0; octave < NUM_OCTAVES; octave++) {
        const freq = this.noteFrequencies[pc] * Math.pow(2, octave);
        if (freq < 27 || freq > 4200) continue; // stay within piano range
        const centerBin = Math.round(freq / binWidth);
        if (centerBin <= 1 || centerBin >= this.fftData.length - 2) continue;
        if (this.fftData[centerBin] < -50) continue;

        let peakBin = centerBin;
        let peakDb = this.fftData[centerBin];
        for (
          let k = centerBin - BINS_TO_SEARCH;
          k <= centerBin + BINS_TO_SEARCH;
          k++
        ) {
          if (k >= 0 && k < this.fftData.length && this.fftData[k] > peakDb) {
            peakDb = this.fftData[k];
            peakBin = k;
          }
        }

        // Parabolic interpolation for sub-bin accuracy
        if (peakBin > 0 && peakBin < this.fftData.length - 1) {
          const y0 = this.fftData[peakBin - 1];
          const y1 = this.fftData[peakBin];
          const y2 = this.fftData[peakBin + 1];
          const denom = 2 * (2 * y1 - y0 - y2);
          if (Math.abs(denom) > 1e-6) {
            const shift = (y2 - y0) / denom;
            if (Math.abs(shift) < 1) {
              const peakFreq = (peakBin + shift) * binWidth;
              const cents = 1200 * Math.log2(peakFreq / freq);
              if (Math.abs(cents) < 50) {
                deviations.push(cents);
              }
            }
          }
        }
      }
    }

    if (deviations.length >= 2) {
      deviations.sort((a, b) => a - b);
      const mid = Math.floor(deviations.length / 2);
      const median =
        deviations.length % 2 === 0
          ? (deviations[mid - 1] + deviations[mid]) / 2
          : deviations[mid];
      this.tuningOffsetCents =
        this.tuningOffsetCents * (1 - TUNING_EMA_ALPHA) +
        median * TUNING_EMA_ALPHA;
    }
  }

  // ── CQT kernel initialization ────────────────────────────────────────
  // Pre-computes a sparse kernel mapping FFT bins → CQT note bins.
  // Each CQT bin gets a Hann-windowed bandwidth proportional to its
  // center frequency (constant-Q = logarithmic spacing).

  private initCqtKernel(): void {
    if (this.cqtInitialized && this.lastKernelSampleRate === this.sampleRate) {
      return;
    }

    const binWidth = this.sampleRate / this.fftSize;
    const numFftBins = this.fftData.length;
    this.cqtKernel = [];

    for (let k = 0; k < CQT_NOTES; k++) {
      const fCenter = this.cqtNoteFreqs[k];
      // Bandwidth = fCenter / Q  (constant-Q property)
      const bw = fCenter / CQT_Q_FACTOR;
      const fLo = fCenter - bw / 2;
      const fHi = fCenter + bw / 2;

      const binStart = Math.max(0, Math.floor(fLo / binWidth));
      const binEnd = Math.min(numFftBins - 1, Math.ceil(fHi / binWidth));

      if (binStart >= numFftBins || binEnd < 0) {
        this.cqtKernel.push({
          fftBinStart: 0,
          fftBinEnd: 0,
          weights: new Float64Array(0),
        });
        continue;
      }

      const len = binEnd - binStart + 1;
      const weights = new Float64Array(len);

      // Hann window across the bandwidth
      for (let b = 0; b < len; b++) {
        const fBin = (binStart + b) * binWidth;
        // Normalize position in [0, 1] across the bandwidth
        const t = (fBin - fLo) / (fHi - fLo);
        // Hann window: 0.5 * (1 - cos(2πt))
        weights[b] = 0.5 * (1 - Math.cos(2 * Math.PI * t));
      }

      this.cqtKernel.push({
        fftBinStart: binStart,
        fftBinEnd: binEnd,
        weights,
      });
    }

    this.cqtInitialized = true;
    this.lastKernelSampleRate = this.sampleRate;
  }

  // ── CQT-based chromagram ───────────────────────────────────────────────
  // Replaces the old linear FFT peak-picking approach.
  // Each CQT bin has logarithmic bandwidth matched to its musical note,
  // giving equal semitone resolution across the entire piano range.

  private buildChromagram(): void {
    // Lazily initialize kernel on first call (needs sampleRate from analyser)
    this.initCqtKernel();

    const binWidth = this.sampleRate / this.fftSize;

    // Adaptive noise floor: median of bins in analysis range
    const loAnalysisBin = Math.max(1, Math.round(27 / binWidth));
    const hiAnalysisBin = Math.min(
      this.fftData.length - 1,
      Math.round(4200 / binWidth),
    );
    const samples: number[] = [];
    const step = Math.max(1, Math.floor((hiAnalysisBin - loAnalysisBin) / 100));
    for (let k = loAnalysisBin; k <= hiAnalysisBin; k += step) {
      samples.push(this.fftData[k]);
    }
    samples.sort((a, b) => a - b);
    const medianDb = samples[Math.floor(samples.length / 2)] ?? -80;
    const noiseFloor =
      this.calibrationNoiseFloor != null
        ? this.calibrationNoiseFloor
        : Math.max(medianDb + ADAPTIVE_NOISE_MARGIN, MIN_NOISE_FLOOR);

    this.octaveEnergy.fill(0);
    this.chroma.fill(0);

    // Tuning correction: the CQT kernel bandwidth (~quarter-tone = ±50 cents)
    // already covers typical piano tuning offsets. The tuningOffsetCents from
    // estimateTuning() is tracked for reporting but doesn't shift the kernel.

    for (let k = 0; k < CQT_NOTES; k++) {
      const entry = this.cqtKernel[k];
      if (entry.weights.length === 0) continue;

      // Weighted sum of linear power from dB FFT data
      let energy = 0;
      for (let b = 0; b < entry.weights.length; b++) {
        const fftBin = entry.fftBinStart + b;
        const db = this.fftData[fftBin];
        if (db > noiseFloor) {
          // Convert dB above noise floor to linear energy, weighted by kernel
          energy += (db - noiseFloor) * entry.weights[b];
        }
      }

      if (energy > 0) {
        const pc = k % 12;
        const octave = Math.floor(k / 12);

        // Clamp to our tracked octave range
        if (octave < NUM_OCTAVES) {
          this.chroma[pc] += energy;
          this.octaveEnergy[pc * NUM_OCTAVES + octave] = energy;
        }
      }
    }

    // Subtract room noise profile if calibrated
    if (this.roomNoiseProfile) {
      for (let pc = 0; pc < 12; pc++) {
        this.chroma[pc] = Math.max(
          0,
          this.chroma[pc] - this.roomNoiseProfile[pc],
        );
      }
    }
  }

  // ── Harmonic suppression (strongest-first) ────────────────────────────

  private suppressHarmonics(): void {
    const raw = new Float64Array(this.chroma);
    const sorted = Array.from({ length: 12 }, (_, i) => i);
    sorted.sort((a, b) => raw[b] - raw[a]);

    for (const pc of sorted) {
      if (raw[pc] < 1e-10) continue;
      const h3bin = (pc + 7) % 12;
      const h5bin = (pc + 4) % 12;
      const h7bin = (pc + 10) % 12;
      this.chroma[h3bin] = Math.max(
        0,
        this.chroma[h3bin] - raw[pc] * this.calibrationH3,
      );
      this.chroma[h5bin] = Math.max(
        0,
        this.chroma[h5bin] - raw[pc] * this.calibrationH5,
      );
      this.chroma[h7bin] = Math.max(
        0,
        this.chroma[h7bin] - raw[pc] * this.calibrationH7,
      );
    }
  }

  // ── Active pitch class count ──────────────────────────────────────────

  private countActivePCs(): number {
    let max = 0;
    for (let i = 0; i < 12; i++) {
      if (this.chroma[i] > max) max = this.chroma[i];
    }
    if (max < 1e-10) return 0;
    const threshold = max * 0.2;
    let count = 0;
    for (let i = 0; i < 12; i++) {
      if (this.chroma[i] > threshold) count++;
    }
    return count;
  }

  // ── L2 normalization ──────────────────────────────────────────────────

  private normalizeChroma(): void {
    let sumSq = 0;
    for (let i = 0; i < 12; i++) sumSq += this.chroma[i] * this.chroma[i];
    const mag = Math.sqrt(sumSq);
    if (mag > 1e-10) {
      for (let i = 0; i < 12; i++) this.chroma[i] /= mag;
    }
  }

  // ── Template matching with diatonic priors ────────────────────────────

  private matchChord(): PianoChordResult | null {
    let bestScore = -Infinity;
    let bestTemplate: ChordTemplate | null = null;

    for (const tmpl of this.templates) {
      let dot = 0;
      for (let i = 0; i < 12; i++) {
        dot += this.chroma[i] * tmpl.profile[i];
      }
      let score = dot / tmpl.profileMag;
      score *= CHORD_PRIOR[tmpl.quality] ?? 0.8;

      if (this.diatonicPCs && this.diatonicPCs.has(tmpl.rootPc)) {
        score *= DIATONIC_BOOST;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = tmpl;
      }
    }

    if (!bestTemplate || bestScore < CONFIDENCE_THRESHOLD) return null;

    // Parsimony: prefer simpler chord if within margin
    const bestIntervals = CHORDS[bestTemplate.quality];
    if (bestIntervals && bestIntervals.length > 3) {
      for (const tmpl of this.templates) {
        if (tmpl.rootPc !== bestTemplate!.rootPc) continue;
        const intervals = CHORDS[tmpl.quality];
        if (!intervals || intervals.length >= bestIntervals.length) continue;
        let dot = 0;
        for (let i = 0; i < 12; i++) dot += this.chroma[i] * tmpl.profile[i];
        let score = dot / tmpl.profileMag;
        score *= CHORD_PRIOR[tmpl.quality] ?? 0.8;
        if (this.diatonicPCs && this.diatonicPCs.has(tmpl.rootPc)) {
          score *= DIATONIC_BOOST;
        }
        if (score >= bestScore - PARSIMONY_MARGIN) {
          bestScore = score;
          bestTemplate = tmpl;
          break;
        }
      }
    }

    return {
      rootPc: bestTemplate.rootPc,
      quality: bestTemplate.quality,
      confidence: Math.min(1, bestScore),
      tuningCents:
        Math.abs(this.tuningOffsetCents) > 1
          ? this.tuningOffsetCents
          : undefined,
    };
  }

  // ── Chord subset detection (for hold logic) ─────────────────────────

  private isSubsetChord(
    held: PianoChordResult,
    candidate: PianoChordResult,
  ): boolean {
    if (held.rootPc !== candidate.rootPc) return false;
    const heldIntervals = CHORDS[held.quality];
    const candIntervals = CHORDS[candidate.quality];
    if (!heldIntervals || !candIntervals) return false;
    if (candIntervals.length >= heldIntervals.length) return false;
    const heldSet = new Set(
      heldIntervals.map((iv: number) => ((iv % 12) + 12) % 12),
    );
    return candIntervals.every((iv: number) =>
      heldSet.has(((iv % 12) + 12) % 12),
    );
  }

  // ── Weighted vote buffer ──────────────────────────────────────────────

  private updateVote(match: PianoChordResult | null): PianoChordResult | null {
    const key = match ? `${match.rootPc}:${match.quality}` : null;
    this.voteBuffer[this.voteIdx] = {
      key,
      confidence: match?.confidence ?? 0,
    };
    this.voteIdx = (this.voteIdx + 1) % VOTE_WINDOW;

    const weightedCounts = new Map<string, number>();
    let totalWeight = 0;
    let nullWeight = 0;

    for (let i = 0; i < VOTE_WINDOW; i++) {
      const age = (this.voteIdx - 1 - i + VOTE_WINDOW) % VOTE_WINDOW;
      const weight = Math.pow(VOTE_DECAY, age);
      totalWeight += weight;

      const entry = this.voteBuffer[i];
      if (entry.key === null) {
        nullWeight += weight;
      } else {
        const confWeight = weight * entry.confidence;
        weightedCounts.set(
          entry.key,
          (weightedCounts.get(entry.key) ?? 0) + confWeight,
        );
      }
    }

    let bestKey: string | null = null;
    let bestWeight = 0;
    for (const [k, w] of weightedCounts) {
      if (w > bestWeight) {
        bestWeight = w;
        bestKey = k;
      }
    }

    if (
      !bestKey ||
      bestWeight / totalWeight < VOTE_WEIGHTED_THRESHOLD ||
      nullWeight > bestWeight
    ) {
      this.lastVoteResult = null;
      this.heldChord = null;
      return null;
    }

    const [rootStr, quality] = bestKey.split(':');
    const rootPc = parseInt(rootStr, 10);

    const confidence =
      match && match.rootPc === rootPc && match.quality === quality
        ? match.confidence
        : this.lastVoteResult?.rootPc === rootPc &&
            this.lastVoteResult?.quality === quality
          ? this.lastVoteResult.confidence
          : bestWeight / totalWeight;

    const rawWinner: PianoChordResult = {
      rootPc,
      quality,
      confidence,
      tuningCents:
        Math.abs(this.tuningOffsetCents) > 1
          ? this.tuningOffsetCents
          : undefined,
    };

    const result = this.applyChordHold(rawWinner);
    this.lastVoteResult = result;
    return result;
  }

  private applyChordHold(winner: PianoChordResult): PianoChordResult {
    if (this.onsetDetected) {
      this.heldChord = winner;
      return winner;
    }

    if (!this.heldChord) {
      this.heldChord = winner;
      return winner;
    }

    if (
      winner.rootPc === this.heldChord.rootPc &&
      winner.quality === this.heldChord.quality
    ) {
      return this.heldChord;
    }

    if (this.isSubsetChord(this.heldChord, winner)) {
      return this.heldChord;
    }

    if (this.isSubsetChord(winner, this.heldChord)) {
      this.heldChord = winner;
      return winner;
    }

    this.heldChord = winner;
    return winner;
  }

  // ── Build weighted templates (piano-tuned voicing weights) ─────────────

  private buildTemplates(): ChordTemplate[] {
    // Piano voicings distribute energy more evenly across chord tones
    // than guitar open voicings — weights raised toward 0.85-0.9
    const TONE_WEIGHTS: Record<string, number[]> = {
      major: [1.0, 0.85, 0.9],
      minor: [1.0, 0.85, 0.9],
      dominant7: [1.0, 0.85, 0.9, 0.75],
      minor7: [1.0, 0.85, 0.9, 0.75],
      major7: [1.0, 0.85, 0.9, 0.75],
      diminished: [1.0, 0.8, 0.8],
      augmented: [1.0, 0.8, 0.8],
      sus2: [1.0, 0.8, 0.9],
      sus4: [1.0, 0.85, 0.9],
      '5': [1.0, 0.9],
      diminished7: [1.0, 0.8, 0.8, 0.75],
      minor7b5: [1.0, 0.8, 0.8, 0.75],
      major6: [1.0, 0.85, 0.9, 0.75],
      minor6: [1.0, 0.85, 0.9, 0.75],
      Add2: [1.0, 0.7, 0.8, 0.9],
      Add4: [1.0, 0.8, 0.7, 0.9],
      minormajor7: [1.0, 0.85, 0.9, 0.75],
      dominant7sus4: [1.0, 0.85, 0.9, 0.75],
      dominant7sus2: [1.0, 0.8, 0.9, 0.75],
      major7sus2: [1.0, 0.8, 0.9, 0.75],
      major7sus4: [1.0, 0.85, 0.9, 0.75],
      // 9th chords
      dominant9: [1.0, 0.8, 0.8, 0.65, 0.5],
      major9: [1.0, 0.8, 0.8, 0.65, 0.5],
      minor9: [1.0, 0.8, 0.8, 0.65, 0.5],
      'dominant7#9': [1.0, 0.8, 0.8, 0.65, 0.5],
      minor7b9: [1.0, 0.8, 0.8, 0.65, 0.5],
      // 6/9 chords
      major6add9: [1.0, 0.8, 0.9, 0.75, 0.5],
      minor6add9: [1.0, 0.8, 0.9, 0.75, 0.5],
      // Altered 7ths
      dominant7b5: [1.0, 0.8, 0.8, 0.75],
      'dominant7#5': [1.0, 0.8, 0.8, 0.75],
      diminishedmajor7: [1.0, 0.8, 0.8, 0.75],
      'minor7#5': [1.0, 0.8, 0.8, 0.75],
      'major7#5': [1.0, 0.8, 0.8, 0.75],
      dominant7b9: [1.0, 0.8, 0.8, 0.65, 0.5],
      'dominant7#5b9': [1.0, 0.8, 0.8, 0.65, 0.5],
      // 13th chords
      dominant13: [1.0, 0.75, 0.75, 0.55, 0.45, 0.45],
      major13: [1.0, 0.75, 0.75, 0.55, 0.45, 0.45],
      minor13: [1.0, 0.75, 0.75, 0.55, 0.45, 0.45],
    };

    const templates: ChordTemplate[] = [];

    for (const [quality, intervals] of Object.entries(CHORDS)) {
      if (SKIP_QUALITIES.has(quality)) continue;
      if (!TIER1_QUALITIES.has(quality)) continue;

      const weights = TONE_WEIGHTS[quality];
      const pcsArr = intervals.map((iv) => ((iv % 12) + 12) % 12);

      for (let root = 0; root < 12; root++) {
        const profile = new Float64Array(12);
        const pcsSet = new Set<number>();
        for (let t = 0; t < pcsArr.length; t++) {
          const bin = (pcsArr[t] + root) % 12;
          const w = weights ? (weights[t] ?? 0.7) : 1;
          profile[bin] = Math.max(profile[bin], w);
          pcsSet.add(bin);
        }
        let mag = 0;
        for (let i = 0; i < 12; i++) mag += profile[i] * profile[i];

        templates.push({
          rootPc: root,
          quality,
          profile,
          profileMag: Math.sqrt(mag),
          pcs: pcsSet,
        });
      }
    }

    return templates;
  }
}
