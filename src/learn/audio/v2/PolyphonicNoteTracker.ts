// ── PolyphonicNoteTracker ──────────────────────────────────────────────────
// Turns the two polyphonic sources already in the v2 pipeline — the ML peer's
// note set (BasicPitchPeer.getLatestNotes) and the NMF activation vector — into
// a stable per-note on/off stream for the Studio's Guitar-to-MIDI feature.
//
// The mono NoteHMM emits a single note; strummed guitar chords need a note SET.
// This tracker maintains one hysteresis state machine per candidate MIDI key so
// that a key must be "present" for a couple of frames before it fires noteOn,
// and "absent" for a few frames before it fires noteOff — the same anti-chatter
// role the HMM plays for the mono path.
//
// Latency/quality behavior:
//   - A fresh spectral-flux onset (~11ms) triggers an immediate attack for keys
//     already present, and re-articulates already-sounding keys (so a re-strummed
//     chord or repeated bass note fires again instead of being silently dropped).
//   - Sources fuse as a union: ML (basic-pitch) is accurate but slow; NMF is fast
//     but piano-template-tuned (noisier on guitar), contributing only when its
//     activation is strong relative to the frame peak.
//   - A hard RMS gate force-releases everything during silence.
//   - Velocity is per-note (from each key's NMF share) on a perceptual curve.

import { MIDI_OFFSET, type OnsetEvent } from './types';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PolyTrackerInputs {
  /** NMF activation vector, length 88 (index = MIDI - 21), or null. */
  nmf: Float64Array | null;
  /** ML sustained notes (MIDI numbers), or null if no ML/stale. */
  mlActiveKeys: number[] | null;
  /** ML note onsets this window (MIDI numbers), or null. */
  mlOnsets: number[] | null;
  /** Normalized input level 0–1 (already gated to 0 when no signal present). */
  rms: number;
}

export interface PolyTrackerOutput {
  noteOns: Array<{ note: number; velocity: number }>;
  noteOffs: number[];
}

// ── Config ──────────────────────────────────────────────────────────────────

/** Frames a key must be present before noteOn (~25ms/frame at 40Hz). */
const ATTACK_FRAMES = 2;
/** Frames a key must be absent before noteOff. Kept short because release now
 *  rides a fresher note-off signal (ML staleness cut + spectral-flux onset). */
const RELEASE_FRAMES = 2;
/** NMF activation must reach this fraction of the frame peak to count. */
const NMF_REL_THRESHOLD = 0.35;
/** Absolute NMF floor below which activation is ignored regardless. */
const NMF_ABS_FLOOR = 0.02;
/** RMS below which all notes are force-released (silence). */
const RMS_GATE = 0.008;
/** Min gap between accepted spectral-flux onsets (ms) — one re-articulation per
 *  strum/pluck. A strum transient can exceed the flux threshold for a few
 *  consecutive frames; this debounces those into a single articulation without
 *  machine-gunning (unlike ML onsets, which repeat for tens of frames). */
const REARTICULATION_REFRACTORY_MS = 70;

// ── Class ───────────────────────────────────────────────────────────────────

interface KeyState {
  on: boolean;
  onFrames: number;
  offFrames: number;
}

export class PolyphonicNoteTracker {
  private midiLow: number;
  private midiHigh: number;
  private states: Map<number, KeyState> = new Map();

  // Persistent membership sets (cleared + refilled each frame; avoids per-frame
  // Set allocation and the GC churn it caused in the 40Hz loop).
  private mlActiveSet: Set<number> = new Set();
  private mlOnsetSet: Set<number> = new Set();

  /** performance.now() of the last accepted articulation onset. */
  private lastArticulationTs = 0;

  /**
   * @param midiLow  Lowest candidate MIDI note (inclusive).
   * @param midiHigh Highest candidate MIDI note (inclusive).
   */
  constructor(midiLow = MIDI_OFFSET, midiHigh = MIDI_OFFSET + 87) {
    this.midiLow = Math.max(MIDI_OFFSET, Math.floor(midiLow));
    this.midiHigh = Math.min(MIDI_OFFSET + 87, Math.floor(midiHigh));
  }

  /** Process one frame; returns the note on/off events to emit. */
  update(
    input: PolyTrackerInputs,
    onset?: OnsetEvent | null,
  ): PolyTrackerOutput {
    const noteOns: Array<{ note: number; velocity: number }> = [];
    const noteOffs: number[] = [];

    const silence = input.rms < RMS_GATE;

    // NMF peak for relative thresholding + per-note velocity normalization.
    let nmfPeak = 0;
    if (input.nmf) {
      for (let i = 0; i < input.nmf.length; i++) {
        if (input.nmf[i] > nmfPeak) nmfPeak = input.nmf[i];
      }
    }
    const nmfThreshold = Math.max(NMF_ABS_FLOOR, nmfPeak * NMF_REL_THRESHOLD);

    // Refill persistent membership sets (no allocation).
    this.mlActiveSet.clear();
    if (input.mlActiveKeys) {
      for (const k of input.mlActiveKeys) this.mlActiveSet.add(k);
    }
    this.mlOnsetSet.clear();
    if (input.mlOnsets) {
      for (const k of input.mlOnsets) this.mlOnsetSet.add(k);
    }

    // A fresh spectral-flux onset (edge, debounced) = a new articulation: drives
    // immediate attack AND re-articulation of sustained notes.
    let newArticulation = false;
    if (
      !silence &&
      onset &&
      onset.timestamp - this.lastArticulationTs >= REARTICULATION_REFRACTORY_MS
    ) {
      newArticulation = true;
      this.lastArticulationTs = onset.timestamp;
    }

    for (let midi = this.midiLow; midi <= this.midiHigh; midi++) {
      const present = silence
        ? false
        : this.keyPresent(midi, input.nmf, nmfThreshold);
      // Attack cues: ML onset for this key, or a fresh strum onset while present.
      const attackCue =
        !silence &&
        ((this.mlOnsetSet.has(midi) ?? false) || (newArticulation && present));

      let state = this.states.get(midi);
      if (!state) {
        state = { on: false, onFrames: 0, offFrames: 0 };
        this.states.set(midi, state);
      }

      if (present) {
        state.onFrames++;
        state.offFrames = 0;
        if (!state.on) {
          // Attack: fire immediately on an onset cue, else after ATTACK_FRAMES.
          if (attackCue || state.onFrames >= ATTACK_FRAMES) {
            state.on = true;
            noteOns.push({
              note: midi,
              velocity: this.velocityForKey(midi, input, nmfPeak, onset),
            });
          }
        } else if (newArticulation) {
          // Re-articulate a still-sounding note (re-strum / repeated pluck):
          // emit off then on so the synth re-triggers instead of dropping it.
          noteOffs.push(midi);
          noteOns.push({
            note: midi,
            velocity: this.velocityForKey(midi, input, nmfPeak, onset),
          });
        }
      } else {
        state.offFrames++;
        state.onFrames = 0;
        if (state.on && state.offFrames >= RELEASE_FRAMES) {
          state.on = false;
          noteOffs.push(midi);
        }
      }
    }

    return { noteOns, noteOffs };
  }

  /** MIDI notes currently sounding. */
  getActiveNotes(): number[] {
    const active: number[] = [];
    for (const [midi, state] of this.states) {
      if (state.on) active.push(midi);
    }
    return active;
  }

  /** Force-release everything and return the notes that were on. */
  flush(): number[] {
    const active = this.getActiveNotes();
    this.states.clear();
    return active;
  }

  reset(): void {
    this.states.clear();
    this.mlActiveSet.clear();
    this.mlOnsetSet.clear();
    this.lastArticulationTs = 0;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private keyPresent(
    midi: number,
    nmf: Float64Array | null,
    nmfThreshold: number,
  ): boolean {
    // Primary source: ML sustained notes.
    if (this.mlActiveSet.has(midi)) return true;
    // Secondary: strong NMF activation (relative to this frame's peak).
    if (nmf) {
      const idx = midi - MIDI_OFFSET;
      if (idx >= 0 && idx < nmf.length && nmf[idx] >= nmfThreshold) return true;
    }
    return false;
  }

  /**
   * Per-note velocity on a perceptual curve. Uses this key's NMF activation
   * share (so chord tones get individual dynamics) blended with frame energy,
   * nudged by onset strength. The incoming rms is already NodeTapCapture's
   * pre-scaled 0–1 level, so no further gain is applied here.
   */
  private velocityForKey(
    midi: number,
    input: PolyTrackerInputs,
    nmfPeak: number,
    onset?: OnsetEvent | null,
  ): number {
    let level = input.rms;
    if (input.nmf && nmfPeak > 0) {
      const idx = midi - MIDI_OFFSET;
      if (idx >= 0 && idx < input.nmf.length) {
        const keyLevel = Math.min(1, input.nmf[idx] / nmfPeak);
        level = 0.4 * input.rms + 0.6 * keyLevel;
      }
    }
    const boosted = Math.min(1, level + (onset ? 0.15 * onset.strength : 0));
    // Perceptual (concave) mapping lifts quiet playing and stops loud strums
    // from pinning at 127; floor keeps very soft notes audible.
    const perceptual = Math.pow(boosted, 0.6);
    return Math.max(20, Math.min(127, Math.round(12 + 115 * perceptual)));
  }
}
