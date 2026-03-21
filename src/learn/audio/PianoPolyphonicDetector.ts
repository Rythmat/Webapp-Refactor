// ── PianoPolyphonicDetector ──────────────────────────────────────────────
// Extracts individual notes from the PianoChordDetector's chromagram
// with octave-accurate MIDI output.
//
// Approach: Chromagram Peak Picking + Octave Energy Lookup
//   1. Run PianoChordDetector's chromagram pipeline (steps 1-5)
//   2. Extract pitch classes whose energy exceeds a threshold
//   3. For each active PC, find the strongest octave from per-octave energy
//   4. Convert to octave-accurate MIDI note numbers
//   5. Track note-on/note-off state changes with jitter suppression
//
// Jitter suppression (from sonovice/pitch-detector):
//   - Minimum note duration: ignore noteOff if note held < 80ms
//   - Gap merging: defer noteOff and cancel if note re-appears within 120ms

import { PianoChordDetector } from './PianoChordDetector';

// ── Types ────────────────────────────────────────────────────────────────

export interface PolyphonicNoteEvent {
  type: 'noteOn' | 'noteOff';
  midiNumber: number; // 21-108 (octave-accurate piano range)
  velocity: number; // 0-127
  confidence: number; // 0-1
}

// ── Constants ────────────────────────────────────────────────────────────

// Verification mode: expected note is "present" if its chroma energy
// exceeds this absolute threshold (post-normalization)
const EXPECTED_CHROMA_THRESHOLD = 0.05;
// Expected note's octave must contribute ≥ this fraction of its pitch class energy
const EXPECTED_OCTAVE_FRACTION = 0.15;
// Minimum fraction of expected notes that must be present (below = noise)
const EXPECTED_MIN_PRESENT_RATIO = 0.2;

// Pitch class is "active" if its energy exceeds this fraction of the max
const ACTIVE_THRESHOLD = 0.35;

// In pedal mode (many pitch classes active), raise the threshold
const PEDAL_THRESHOLD = 0.55;
const PEDAL_PC_COUNT = 7; // ≥7 active PCs suggests sustain pedal or noise

// Minimum confidence to emit noteOn events
const MIN_CONFIDENCE = 0.5;

// Number of octaves tracked by PianoChordDetector
const NUM_OCTAVES = 7;

// Note segmentation (from sonovice/pitch-detector)
const MIN_NOTE_DURATION_MS = 80; // ignore noteOff if note held < 80ms
const NOTE_HOLD_FRAMES = 2; // allow up to 2 frame dropouts before noteOff (~100ms at 20Hz)

// ── Class ────────────────────────────────────────────────────────────────

interface OctaveCandidate {
  pc: number;
  octave1: number;
  energy1: number;
  octave2: number;
  energy2: number;
}

export class PianoPolyphonicDetector {
  private chordDetector: PianoChordDetector;
  private activeNotes = new Set<number>(); // currently held MIDI notes
  private onDetection: ((event: PolyphonicNoteEvent) => void) | null = null;

  // Verification mode: when set, only check these specific MIDI notes
  private expectedNotes: Set<number> | null = null;

  // Note segmentation: jitter suppression via hold counters
  private noteOnTimes = new Map<number, number>(); // midi → timestamp of noteOn
  private noteHoldCounters = new Map<number, number>(); // midi → frames since last seen

  // Pre-allocated buffers (zero-allocation hot path)
  private _noteEnergies = new Map<number, number>();
  private _newActive = new Set<number>();
  private _candidates: OctaveCandidate[] = [];
  private _sortedOctaves: number[] = [];
  private _activePcSet = new Set<number>();

  constructor(chordDetector?: PianoChordDetector) {
    this.chordDetector = chordDetector ?? new PianoChordDetector(16384);
  }

  /** Set the callback for polyphonic note events. */
  setCallback(cb: (event: PolyphonicNoteEvent) => void): void {
    this.onDetection = cb;
  }

  /** Get the underlying chord detector (for shared analyser setup). */
  getChordDetector(): PianoChordDetector {
    return this.chordDetector;
  }

  /** Set key context on the underlying chord detector. */
  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.chordDetector.setKeyContext(rootPc, modeIntervals);
  }

  /** Clear key context. */
  clearKeyContext(): void {
    this.chordDetector.clearKeyContext();
  }

  /** Set expected MIDI notes for verification mode. Null = open-ended. */
  setExpectedNotes(notes: number[] | null): void {
    this.expectedNotes = notes && notes.length > 0 ? new Set(notes) : null;
  }

  /**
   * Analyze a single frame. Call at ~20Hz with the chromagram analyser node.
   * @param rmsLevel - Current input RMS (0-1) for velocity estimation.
   * Returns the set of currently active MIDI notes (octave-accurate).
   */
  analyze(analyser: AnalyserNode, rmsLevel?: number): number[] {
    const now = performance.now();

    // Run the chromagram pipeline (steps 1-5 + normalization)
    const chroma = this.chordDetector.analyzeChromagram(analyser);
    if (!chroma) {
      // Silence — release all held notes (bypass segmentation for full silence)
      this.releaseAll();
      return [];
    }

    // Verification mode: only check expected note bins
    if (this.expectedNotes) {
      return this.analyzeExpected(chroma, rmsLevel, now);
    }

    // Find the max energy in the chromagram
    let maxEnergy = 0;
    for (let i = 0; i < 12; i++) {
      if (chroma[i] > maxEnergy) maxEnergy = chroma[i];
    }

    if (maxEnergy < 1e-10) {
      this.releaseAll();
      return [];
    }

    // Count active pitch classes to detect sustain pedal
    let rawActiveCount = 0;
    for (let i = 0; i < 12; i++) {
      if (chroma[i] > maxEnergy * ACTIVE_THRESHOLD) rawActiveCount++;
    }

    // Use higher threshold in pedal mode
    const threshold =
      rawActiveCount >= PEDAL_PC_COUNT ? PEDAL_THRESHOLD : ACTIVE_THRESHOLD;

    // Get per-octave energy for octave-accurate MIDI output
    const octaveEnergy = this.chordDetector.getOctaveEnergy();

    // Determine which pitch classes are active and collect octave candidates
    this._activePcSet.clear();
    this._candidates.length = 0;

    for (let pc = 0; pc < 12; pc++) {
      if (chroma[pc] > maxEnergy * threshold) {
        this._activePcSet.add(pc);

        let best1 = -1,
          energy1 = 0;
        let best2 = -1,
          energy2 = 0;
        for (let o = 0; o < NUM_OCTAVES; o++) {
          const e = octaveEnergy[pc * NUM_OCTAVES + o];
          if (e > energy1) {
            best2 = best1;
            energy2 = energy1;
            best1 = o;
            energy1 = e;
          } else if (e > energy2) {
            best2 = o;
            energy2 = e;
          }
        }

        if (best1 >= 0) {
          this._candidates.push({
            pc,
            octave1: best1,
            energy1,
            octave2: best2 >= 0 ? best2 : best1,
            energy2: best2 >= 0 ? energy2 : 0,
          });
        }
      }
    }

    // Phase 2: Octave coherence — compute median octave, prefer candidates
    // within ±1 octave of median for plausible chord voicings
    this._newActive.clear();

    if (this._candidates.length > 0) {
      // Median of best octaves
      this._sortedOctaves.length = 0;
      for (const c of this._candidates) this._sortedOctaves.push(c.octave1);
      this._sortedOctaves.sort((a, b) => a - b);

      const mid = Math.floor(this._sortedOctaves.length / 2);
      const medianOctave =
        this._sortedOctaves.length % 2 === 0
          ? (this._sortedOctaves[mid - 1] + this._sortedOctaves[mid]) / 2
          : this._sortedOctaves[mid];

      for (const c of this._candidates) {
        let chosenOctave = c.octave1;

        // If best octave is >1 octave from median and alternative is closer,
        // use alternative (if it has ≥50% of best energy)
        const dist1 = Math.abs(c.octave1 - medianOctave);
        const dist2 = Math.abs(c.octave2 - medianOctave);
        if (dist1 > 1 && dist2 < dist1 && c.energy2 >= c.energy1 * 0.5) {
          chosenOctave = c.octave2;
        }

        // Convert to MIDI: C0=12, C1=24, ..., C4=60
        const midi = 12 + c.pc + 12 * chosenOctave;
        // Clamp to piano range (A0=21 through C8=108)
        if (midi >= 21 && midi <= 108) {
          this._newActive.add(midi);
        }
      }
    }

    // Compute confidence as the ratio of active energy to total
    let activeEnergy = 0;
    let totalEnergy = 0;
    for (let i = 0; i < 12; i++) {
      totalEnergy += chroma[i];
      if (this._activePcSet.has(i)) activeEnergy += chroma[i];
    }
    const confidence =
      totalEnergy > 0 ? Math.min(1, activeEnergy / totalEnergy) : 0;

    // Skip low-confidence detections
    if (confidence < MIN_CONFIDENCE && this._newActive.size > 0) {
      return Array.from(this.activeNotes);
    }

    const velocityInput = rmsLevel != null ? rmsLevel : 0.5;
    const velocity = Math.round(
      30 + Math.min(1, velocityInput * 2) * 80, // range 30-110
    );

    this.applyNoteChanges(this._newActive, velocity, confidence, now);
    return Array.from(this.activeNotes);
  }

  /** Get currently active notes. */
  getActiveNotes(): number[] {
    return Array.from(this.activeNotes);
  }

  /** Release all held notes and reset state. */
  reset(): void {
    this.releaseAll();
    this.chordDetector.reset();
    this.noteOnTimes.clear();
    this.noteHoldCounters.clear();
  }

  /**
   * Verification mode: instead of open-ended peak-picking, check energy
   * at the exact CQT bins corresponding to expected MIDI notes.
   * Eliminates octave ambiguity, harmonic false positives, and noise.
   */
  private analyzeExpected(
    chroma: Float64Array,
    rmsLevel: number | undefined,
    now: number,
  ): number[] {
    const octaveEnergy = this.chordDetector.getOctaveEnergy();

    // Phase 1: collect energy for each expected note
    this._noteEnergies.clear();
    for (const midi of this.expectedNotes!) {
      if (midi < 12 || midi > 95) continue; // CQT range: C0(12)–B6(95)

      const pc = midi % 12;
      const octave = Math.floor((midi - 12) / 12);
      if (octave >= NUM_OCTAVES) continue;

      const energy = octaveEnergy[pc * NUM_OCTAVES + octave];
      const pcTotal = chroma[pc];

      // Note is present if its pitch class has energy AND this specific
      // octave contributes a meaningful fraction of that energy
      if (
        pcTotal > EXPECTED_CHROMA_THRESHOLD &&
        energy > pcTotal * EXPECTED_OCTAVE_FRACTION
      ) {
        this._noteEnergies.set(midi, energy);
      }
    }

    // Phase 2: suppress harmonic ghosts — if a detected note is the 3rd harmonic
    // (+7 semitones = perfect 5th) or 5th harmonic (+4 semitones = major 3rd)
    // of another detected note with MORE energy, it's likely an overtone, not real
    this._newActive.clear();
    for (const [midi, energy] of this._noteEnergies) {
      let isHarmonicGhost = false;

      for (const [otherMidi, otherEnergy] of this._noteEnergies) {
        if (otherMidi === midi) continue;

        const interval = midi - otherMidi;

        // 3rd harmonic: perfect 5th above (or +19 semitones = 5th + octave)
        // 5th harmonic: major 3rd above (or +16 = 3rd + octave, +28 = 3rd + 2 octaves)
        const isThirdHarmonic = interval === 7 || interval === 19;
        const isFifthHarmonic =
          interval === 4 || interval === 16 || interval === 28;

        if ((isThirdHarmonic || isFifthHarmonic) && otherEnergy > energy) {
          isHarmonicGhost = true;
          break;
        }
      }

      if (!isHarmonicGhost) {
        this._newActive.add(midi);
      }
    }

    // Confidence: fraction of expected notes present
    const confidence =
      this.expectedNotes!.size > 0
        ? this._newActive.size / this.expectedNotes!.size
        : 0;

    // Too few notes detected — likely noise, hold current state
    if (confidence < EXPECTED_MIN_PRESENT_RATIO && this._newActive.size > 0) {
      return Array.from(this.activeNotes);
    }

    const velocityInput = rmsLevel != null ? rmsLevel : 0.5;
    const velocity = Math.round(30 + Math.min(1, velocityInput * 2) * 80);

    this.applyNoteChanges(this._newActive, velocity, confidence, now);
    return Array.from(this.activeNotes);
  }

  // ── Note segmentation: min duration + hold counter ──────────────────────

  /**
   * Apply note-on/note-off changes with jitter suppression.
   * - Min duration: ignore noteOff if note held < MIN_NOTE_DURATION_MS
   * - Hold counter: allow up to NOTE_HOLD_FRAMES of dropout before noteOff
   */
  private applyNoteChanges(
    newActive: Set<number>,
    velocity: number,
    confidence: number,
    now: number,
  ): void {
    // Handle note-offs: notes that were active but aren't in newActive
    // Collect notes to remove (can't modify Set during iteration)
    const toRemove: number[] = [];

    for (const note of this.activeNotes) {
      if (!newActive.has(note)) {
        const onTime = this.noteOnTimes.get(note);

        // Min duration: if note hasn't been held long enough, keep it active
        if (onTime !== undefined && now - onTime < MIN_NOTE_DURATION_MS) {
          continue;
        }

        // Hold counter: allow brief dropouts before emitting noteOff
        const holdCount = (this.noteHoldCounters.get(note) ?? 0) + 1;
        if (holdCount <= NOTE_HOLD_FRAMES) {
          this.noteHoldCounters.set(note, holdCount);
          // Keep in activeNotes — still within grace period
        } else {
          // Grace period exceeded — emit noteOff
          toRemove.push(note);
        }
      } else {
        // Note still active — reset hold counter
        this.noteHoldCounters.delete(note);
      }
    }

    // Remove expired notes
    for (const note of toRemove) {
      this.activeNotes.delete(note);
      this.noteOnTimes.delete(note);
      this.noteHoldCounters.delete(note);
      this.onDetection?.({
        type: 'noteOff',
        midiNumber: note,
        velocity: 0,
        confidence: 0,
      });
    }

    // Handle note-ons: notes in newActive that aren't currently active
    for (const note of newActive) {
      if (!this.activeNotes.has(note)) {
        // Genuinely new note — emit noteOn
        this.activeNotes.add(note);
        this.noteOnTimes.set(note, now);
        this.noteHoldCounters.delete(note);
        this.onDetection?.({
          type: 'noteOn',
          midiNumber: note,
          velocity,
          confidence,
        });
      }
    }
  }

  private releaseAll(): void {
    this.noteHoldCounters.clear();

    for (const note of this.activeNotes) {
      this.onDetection?.({
        type: 'noteOff',
        midiNumber: note,
        velocity: 0,
        confidence: 0,
      });
    }
    this.activeNotes.clear();
    this.noteOnTimes.clear();
  }
}
