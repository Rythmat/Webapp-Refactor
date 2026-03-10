// ── AudioChordDetector ──────────────────────────────────────────────────
// Real-time chord detection from audio.
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

export interface AudioChordResult {
  rootPc: number; // 0-11 pitch class (0=C)
  quality: string; // key from CHORDS dictionary
  confidence: number; // 0-1 detection confidence
  tuningCents?: number; // estimated tuning offset in cents
}

export type InputType = 'guitar' | 'vocal';

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

// ── Constants ────────────────────────────────────────────────────────────

const REF_FREQ = 65.4064; // C2 in Hz (pitch class 0 = C)
const NUM_OCTAVES = 4; // C2 through C5
const BINS_TO_SEARCH = 2; // search +/- 2 bins around expected frequency
const RMS_THRESHOLD = 0.005; // time-domain silence gate
const CONFIDENCE_THRESHOLD = 0.4;
const MIN_ACTIVE_PCS = 2; // need ≥2 pitch classes for a chord

// Adaptive noise floor
const ADAPTIVE_NOISE_MARGIN = 10; // dB above spectrum median
const MIN_NOISE_FLOOR = -80; // absolute minimum floor

// Tuning compensation
const TUNING_EMA_ALPHA = 0.1; // smoothing for tuning estimate

// Harmonic suppression weights
const H3_WEIGHT = 0.4; // 3rd harmonic → perfect fifth (+7 semitones)
const H5_WEIGHT = 0.15; // 5th harmonic → major third (+4 semitones)
const H7_WEIGHT = 0.08; // 7th harmonic → minor 7th (+10 semitones)

// Weighted vote buffer
const VOTE_WINDOW = 10; // frames (~500ms at 20Hz)
const VOTE_DECAY = 0.85; // exponential decay per frame
const VOTE_WEIGHTED_THRESHOLD = 0.55; // weighted fraction to output chord

// Onset detection
const ONSET_RISE_DB = 6; // RMS must rise ≥6dB from recent minimum to trigger onset
const ENVELOPE_ALPHA = 0.3; // EMA smoothing for RMS envelope

// Diatonic prior boost
const DIATONIC_BOOST = 1.25; // 25% boost for chords with diatonic root

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

// Tier 1 core qualities
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

export class AudioChordDetector {
  private timeDomainBuffer: Float32Array<ArrayBuffer>;
  private fftData: Float32Array<ArrayBuffer>;
  private chroma = new Float64Array(12);
  private noteFrequencies: number[];
  private templates: ChordTemplate[];

  // Weighted vote buffer
  private voteBuffer: VoteEntry[];
  private voteIdx = 0;
  private lastVoteResult: AudioChordResult | null = null;

  // Tuning compensation
  private tuningOffsetCents = 0;

  // Onset detection
  private rmsEnvelope = 0;
  private rmsMin = 0;
  private onsetDetected = false;

  // Chord hold (resist decay degradation)
  private heldChord: AudioChordResult | null = null;

  // Key-aware diatonic priors
  private diatonicPCs: Set<number> | null = null;

  private sampleRate = 48000;
  private fftSize: number;

  constructor(fftSize: number = 16384, _inputType: InputType = 'guitar') {
    this.fftSize = fftSize;
    this.timeDomainBuffer = new Float32Array(fftSize);
    this.fftData = new Float32Array(fftSize / 2);
    this.noteFrequencies = Array.from(
      { length: 12 },
      (_, i) => REF_FREQ * Math.pow(2, i / 12),
    );
    this.templates = this.buildTemplates();
    this.voteBuffer = Array.from({ length: VOTE_WINDOW }, () => ({
      key: null,
      confidence: 0,
    }));
  }

  analyze(analyser: AnalyserNode): AudioChordResult | null {
    this.sampleRate = analyser.context.sampleRate;

    // Step 1: Time-domain RMS silence gate
    analyser.getFloatTimeDomainData(this.timeDomainBuffer);
    if (!this.checkSignal()) {
      return this.updateVote(null);
    }

    // Step 2: Read smoothed frequency-domain data (dB values)
    analyser.getFloatFrequencyData(this.fftData);

    // Step 3: Estimate tuning offset from strong peaks
    this.estimateTuning();

    // Step 4: Build chromagram with adaptive noise floor and tuning correction
    this.buildChromagram();

    // Step 5: Suppress guitar string harmonics (strongest-first)
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
      // Silence — reset envelope state
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
    const binWidth = this.sampleRate / this.fftSize;
    const deviations: number[] = [];

    // Check strong peaks across pitch classes and octaves
    for (let pc = 0; pc < 12; pc++) {
      for (let octave = 0; octave < NUM_OCTAVES; octave++) {
        const freq = this.noteFrequencies[pc] * Math.pow(2, octave);
        const centerBin = Math.round(freq / binWidth);
        if (centerBin <= 1 || centerBin >= this.fftData.length - 2) continue;

        // Only consider bins with significant energy
        if (this.fftData[centerBin] < -50) continue;

        // Find peak in search window
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

  // ── Chromagram with adaptive noise floor and tuning correction ────────

  private buildChromagram(): void {
    const binWidth = this.sampleRate / this.fftSize;
    const tuningMultiplier = Math.pow(2, this.tuningOffsetCents / 1200);

    // Adaptive noise floor: median of bins in analysis range (~60Hz-2kHz)
    const loAnalysisBin = Math.max(1, Math.round(60 / binWidth));
    const hiAnalysisBin = Math.min(
      this.fftData.length - 1,
      Math.round(2000 / binWidth),
    );
    const samples: number[] = [];
    const step = Math.max(1, Math.floor((hiAnalysisBin - loAnalysisBin) / 100));
    for (let k = loAnalysisBin; k <= hiAnalysisBin; k += step) {
      samples.push(this.fftData[k]);
    }
    samples.sort((a, b) => a - b);
    const medianDb = samples[Math.floor(samples.length / 2)] ?? -80;
    const noiseFloor = Math.max(
      medianDb + ADAPTIVE_NOISE_MARGIN,
      MIN_NOISE_FLOOR,
    );

    for (let pc = 0; pc < 12; pc++) {
      let chromaSum = 0;

      for (let octave = 0; octave < NUM_OCTAVES; octave++) {
        const freq =
          this.noteFrequencies[pc] * tuningMultiplier * Math.pow(2, octave);
        const centerBin = Math.round(freq / binWidth);
        const minBin = Math.max(0, centerBin - BINS_TO_SEARCH);
        const maxBin = Math.min(
          this.fftData.length - 1,
          centerBin + BINS_TO_SEARCH,
        );

        let peakDb = -Infinity;
        for (let k = minBin; k <= maxBin; k++) {
          if (this.fftData[k] > peakDb) peakDb = this.fftData[k];
        }

        if (peakDb > noiseFloor) {
          chromaSum += peakDb - noiseFloor;
        }
      }

      this.chroma[pc] = chromaSum;
    }
  }

  // ── Harmonic suppression (strongest-first) ────────────────────────────

  private suppressHarmonics(): void {
    const raw = new Float64Array(this.chroma);

    // Sort pitch classes by descending energy
    const sorted = Array.from({ length: 12 }, (_, i) => i);
    sorted.sort((a, b) => raw[b] - raw[a]);

    for (const pc of sorted) {
      if (raw[pc] < 1e-10) continue;
      // Subtract from live chroma using original magnitude
      const h3bin = (pc + 7) % 12;
      const h5bin = (pc + 4) % 12;
      const h7bin = (pc + 10) % 12;
      this.chroma[h3bin] = Math.max(
        0,
        this.chroma[h3bin] - raw[pc] * H3_WEIGHT,
      );
      this.chroma[h5bin] = Math.max(
        0,
        this.chroma[h5bin] - raw[pc] * H5_WEIGHT,
      );
      this.chroma[h7bin] = Math.max(
        0,
        this.chroma[h7bin] - raw[pc] * H7_WEIGHT,
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

  private matchChord(): AudioChordResult | null {
    let bestScore = -Infinity;
    let bestTemplate: ChordTemplate | null = null;

    for (const tmpl of this.templates) {
      let dot = 0;
      for (let i = 0; i < 12; i++) {
        dot += this.chroma[i] * tmpl.profile[i];
      }
      let score = dot / tmpl.profileMag;

      // Quality prior: favor common chords over obscure ones
      score *= CHORD_PRIOR[tmpl.quality] ?? 0.8;

      // Diatonic prior: boost chords whose root is in the session key
      if (this.diatonicPCs && this.diatonicPCs.has(tmpl.rootPc)) {
        score *= DIATONIC_BOOST;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = tmpl;
      }
    }

    if (!bestTemplate || bestScore < CONFIDENCE_THRESHOLD) return null;

    // Parsimony: if a simpler chord (fewer notes) with the same root scores
    // within PARSIMONY_MARGIN of the best, prefer it
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
          break; // take the first simpler match
        }
      }
    }

    return {
      rootPc: bestTemplate.rootPc,
      quality: bestTemplate.quality,
      confidence: bestScore,
      tuningCents:
        Math.abs(this.tuningOffsetCents) > 1
          ? this.tuningOffsetCents
          : undefined,
    };
  }

  // ── Chord subset detection (for hold logic) ─────────────────────────

  private isSubsetChord(
    held: AudioChordResult,
    candidate: AudioChordResult,
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

  private updateVote(match: AudioChordResult | null): AudioChordResult | null {
    const key = match ? `${match.rootPc}:${match.quality}` : null;
    this.voteBuffer[this.voteIdx] = {
      key,
      confidence: match?.confidence ?? 0,
    };
    this.voteIdx = (this.voteIdx + 1) % VOTE_WINDOW;

    // Compute exponentially-weighted sums per chord
    const weightedCounts = new Map<string, number>();
    let totalWeight = 0;
    let nullWeight = 0;

    for (let i = 0; i < VOTE_WINDOW; i++) {
      // Distance from newest: newest = 0, oldest = VOTE_WINDOW - 1
      const age = (this.voteIdx - 1 - i + VOTE_WINDOW) % VOTE_WINDOW;
      const weight = Math.pow(VOTE_DECAY, age);
      totalWeight += weight;

      const entry = this.voteBuffer[i];
      if (entry.key === null) {
        nullWeight += weight;
      } else {
        // Weight by confidence so strong detections dominate over weak ones
        const confWeight = weight * entry.confidence;
        weightedCounts.set(
          entry.key,
          (weightedCounts.get(entry.key) ?? 0) + confWeight,
        );
      }
    }

    // Find the chord with highest weighted sum
    let bestKey: string | null = null;
    let bestWeight = 0;
    for (const [k, w] of weightedCounts) {
      if (w > bestWeight) {
        bestWeight = w;
        bestKey = k;
      }
    }

    // Winner must exceed threshold fraction of total weight and beat null
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

    const rawWinner: AudioChordResult = {
      rootPc,
      quality,
      confidence,
      tuningCents:
        Math.abs(this.tuningOffsetCents) > 1
          ? this.tuningOffsetCents
          : undefined,
    };

    // ── Chord hold logic: resist decay degradation ──
    const result = this.applyChordHold(rawWinner);
    this.lastVoteResult = result;
    return result;
  }

  private applyChordHold(winner: AudioChordResult): AudioChordResult {
    // On onset (new strum), accept the winner unconditionally
    if (this.onsetDetected) {
      this.heldChord = winner;
      return winner;
    }

    // No held chord yet — start holding
    if (!this.heldChord) {
      this.heldChord = winner;
      return winner;
    }

    // Same chord as held — no change
    if (
      winner.rootPc === this.heldChord.rootPc &&
      winner.quality === this.heldChord.quality
    ) {
      return this.heldChord;
    }

    // Winner is a subset of held (decay degradation) — hold the complex chord
    if (this.isSubsetChord(this.heldChord, winner)) {
      return this.heldChord;
    }

    // Winner is a superset of held (player added a note) — upgrade
    if (this.isSubsetChord(winner, this.heldChord)) {
      this.heldChord = winner;
      return winner;
    }

    // Different root or unrelated quality — accept the new chord
    this.heldChord = winner;
    return winner;
  }

  // ── Build weighted templates ──────────────────────────────────────────

  private buildTemplates(): ChordTemplate[] {
    const TONE_WEIGHTS: Record<string, number[]> = {
      major: [1.0, 0.6, 0.8],
      minor: [1.0, 0.6, 0.8],
      // Guitar drop voicings place the 7th on prominent strings,
      // so 7th weight is raised from 0.5 → 0.65 (Beato Book pp. 101-173)
      dominant7: [1.0, 0.6, 0.8, 0.65],
      minor7: [1.0, 0.6, 0.8, 0.65],
      major7: [1.0, 0.6, 0.8, 0.65],
      diminished: [1.0, 0.6, 0.6],
      augmented: [1.0, 0.6, 0.6],
      sus2: [1.0, 0.6, 0.8],
      sus4: [1.0, 0.7, 0.8],
      '5': [1.0, 0.9],
      diminished7: [1.0, 0.6, 0.6, 0.65],
      minor7b5: [1.0, 0.6, 0.6, 0.65],
      major6: [1.0, 0.6, 0.8, 0.65],
      minor6: [1.0, 0.6, 0.8, 0.65],
      Add2: [1.0, 0.5, 0.6, 0.8],
      Add4: [1.0, 0.6, 0.5, 0.8],
      minormajor7: [1.0, 0.6, 0.8, 0.65],
      dominant7sus4: [1.0, 0.7, 0.8, 0.65],
      dominant7sus2: [1.0, 0.6, 0.8, 0.65],
      major7sus2: [1.0, 0.6, 0.8, 0.65],
      major7sus4: [1.0, 0.7, 0.8, 0.65],
      // 9th chords
      dominant9: [1.0, 0.6, 0.7, 0.55, 0.35],
      major9: [1.0, 0.6, 0.7, 0.55, 0.35],
      minor9: [1.0, 0.6, 0.7, 0.55, 0.35],
      'dominant7#9': [1.0, 0.6, 0.7, 0.55, 0.35],
      minor7b9: [1.0, 0.6, 0.7, 0.55, 0.35],
      // 6/9 chords
      major6add9: [1.0, 0.6, 0.8, 0.65, 0.35],
      minor6add9: [1.0, 0.6, 0.8, 0.65, 0.35],
      // Altered 7ths
      dominant7b5: [1.0, 0.6, 0.6, 0.65],
      'dominant7#5': [1.0, 0.6, 0.6, 0.65],
      // Beato fundamental 7th types (p. 20)
      diminishedmajor7: [1.0, 0.6, 0.6, 0.65],
      'minor7#5': [1.0, 0.6, 0.6, 0.65],
      'major7#5': [1.0, 0.6, 0.6, 0.65],
      // Dom7 altered extensions (Beato Dom7 family)
      dominant7b9: [1.0, 0.6, 0.7, 0.55, 0.35],
      'dominant7#5b9': [1.0, 0.6, 0.6, 0.55, 0.35],
      // 13th chords
      dominant13: [1.0, 0.6, 0.6, 0.4, 0.3, 0.3],
      major13: [1.0, 0.6, 0.6, 0.4, 0.3, 0.3],
      minor13: [1.0, 0.6, 0.6, 0.4, 0.3, 0.3],
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
          const w = weights ? (weights[t] ?? 0.5) : 1;
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
