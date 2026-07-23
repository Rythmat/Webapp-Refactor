// ── PolyphonicNoteTracker.test.ts ──────────────────────────────────────────
// Set-valued note tracking for Studio guitar chords: ML + NMF fusion, per-note
// attack/release hysteresis, silence gating, and MIDI-range gating.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolyphonicNoteTracker,
  type PolyTrackerInputs,
} from '../PolyphonicNoteTracker';
import type { OnsetEvent } from '../types';

// Guitar range: E2 (40) – E6 (88) — matches the guitar pitch profile.
const GUITAR_LOW = 40;
const GUITAR_HIGH = 88;

let tracker: PolyphonicNoteTracker;

beforeEach(() => {
  tracker = new PolyphonicNoteTracker(GUITAR_LOW, GUITAR_HIGH);
});

/** Build a tracker input from ML active/onset key lists. */
function mlFrame(
  activeKeys: number[],
  onsets: number[] = [],
  rms = 0.3,
): PolyTrackerInputs {
  return { nmf: null, mlActiveKeys: activeKeys, mlOnsets: onsets, rms };
}

const onset = (strength = 0.8): OnsetEvent => ({
  timestamp: 0,
  strength,
  spectralCentroid: 1000,
});

/** Onset at a specific timestamp (ms) — for testing the re-articulation
 *  refractory, which debounces onsets by their timestamp. */
const onsetAt = (timestamp: number, strength = 0.8): OnsetEvent => ({
  timestamp,
  strength,
  spectralCentroid: 1000,
});

describe('PolyphonicNoteTracker', () => {
  it('fires noteOn immediately on an ML onset', () => {
    const out = tracker.update(mlFrame([60], [60]), onset());
    expect(out.noteOns.map((n) => n.note)).toEqual([60]);
    expect(out.noteOffs).toEqual([]);
    expect(tracker.getActiveNotes()).toEqual([60]);
  });

  it('requires ATTACK_FRAMES of presence without an onset (debounces blips)', () => {
    // A single frame present with no onset must NOT fire (anti-chatter).
    let out = tracker.update(mlFrame([62]));
    expect(out.noteOns).toEqual([]);
    // Second consecutive present frame → fires.
    out = tracker.update(mlFrame([62]));
    expect(out.noteOns.map((n) => n.note)).toEqual([62]);
  });

  it('does not fire on a one-frame blip that disappears', () => {
    const out1 = tracker.update(mlFrame([65]));
    const out2 = tracker.update(mlFrame([])); // gone next frame
    expect(out1.noteOns).toEqual([]);
    expect(out2.noteOns).toEqual([]);
    expect(out2.noteOffs).toEqual([]);
    expect(tracker.getActiveNotes()).toEqual([]);
  });

  it('releases a note after RELEASE_FRAMES of absence', () => {
    tracker.update(mlFrame([60], [60]), onset()); // on
    expect(tracker.getActiveNotes()).toEqual([60]);

    // Absent frames — must hold for RELEASE_FRAMES (2) before releasing.
    expect(tracker.update(mlFrame([])).noteOffs).toEqual([]); // 1
    const out = tracker.update(mlFrame([])); // 2 → release
    expect(out.noteOffs).toEqual([60]);
    expect(tracker.getActiveNotes()).toEqual([]);
  });

  it('holds a sustained note across a 1-frame ML dropout (< release window)', () => {
    tracker.update(mlFrame([60], [60]), onset());
    tracker.update(mlFrame([])); // 1 absent (< RELEASE_FRAMES=2)
    tracker.update(mlFrame([60])); // present again → resets release counter
    expect(tracker.getActiveNotes()).toEqual([60]);
    // One absent frame is still not enough to drop it.
    tracker.update(mlFrame([]));
    expect(tracker.getActiveNotes()).toEqual([60]);
  });

  it('tracks a chord: multiple simultaneous notes on and off together', () => {
    const chord = [52, 55, 59]; // E3 major-ish
    const out = tracker.update(mlFrame(chord, chord), onset());
    expect(out.noteOns.map((n) => n.note).sort((a, b) => a - b)).toEqual(chord);

    // Release all — RELEASE_FRAMES=2.
    tracker.update(mlFrame([])); // 1 absent
    const off = tracker.update(mlFrame([])); // 2 → release
    expect(off.noteOffs.sort((a, b) => a - b)).toEqual(chord);
  });

  it('force-releases everything on silence (rms below gate)', () => {
    tracker.update(mlFrame([60], [60]), onset());
    expect(tracker.getActiveNotes()).toEqual([60]);
    // Silence — ML still lists the key, but rms is below the gate.
    tracker.update(mlFrame([60], [], 0.0)); // 1 gated → absent
    const out = tracker.update(mlFrame([60], [], 0.0)); // 2 → release
    expect(out.noteOffs).toEqual([60]);
  });

  it('attacks immediately on a fresh spectral-flux onset (no ML onset)', () => {
    // Key present via ML activeKeys but NOT in mlOnsets; a fresh flux onset
    // must still fire it on frame 1 (no 2-frame attack wait).
    const out = tracker.update(
      { nmf: null, mlActiveKeys: [60], mlOnsets: [], rms: 0.3 },
      onsetAt(100),
    );
    expect(out.noteOns.map((n) => n.note)).toEqual([60]);
  });

  it('re-articulates a held note on a new strum onset (repeated note)', () => {
    tracker.update(
      { nmf: null, mlActiveKeys: [60], mlOnsets: [60], rms: 0.3 },
      onsetAt(100),
    );
    expect(tracker.getActiveNotes()).toEqual([60]);
    // Same note still sounding; a new debounced onset re-fires it (off + on).
    const out = tracker.update(
      { nmf: null, mlActiveKeys: [60], mlOnsets: [], rms: 0.3 },
      onsetAt(200),
    );
    expect(out.noteOffs).toEqual([60]);
    expect(out.noteOns.map((n) => n.note)).toEqual([60]);
    expect(tracker.getActiveNotes()).toEqual([60]); // still on after retrigger
  });

  it('does not re-articulate on onsets within the refractory window', () => {
    tracker.update(
      { nmf: null, mlActiveKeys: [60], mlOnsets: [60], rms: 0.3 },
      onsetAt(100),
    );
    // Onset 30ms later (< 70ms refractory) must NOT retrigger (no machine-gun).
    const out = tracker.update(
      { nmf: null, mlActiveKeys: [60], mlOnsets: [], rms: 0.3 },
      onsetAt(130),
    );
    expect(out.noteOffs).toEqual([]);
    expect(out.noteOns).toEqual([]);
  });

  it('gives per-note velocity from NMF activation share', () => {
    const nmf = new Float64Array(88);
    nmf[60 - 21] = 1.0; // loud
    nmf[64 - 21] = 0.4; // quieter (still ≥ 0.35 rel threshold, so it fires)
    const out = tracker.update(
      { nmf, mlActiveKeys: [60, 64], mlOnsets: [60, 64], rms: 0.3 },
      onsetAt(100),
    );
    const v = new Map(out.noteOns.map((n) => [n.note, n.velocity]));
    expect(v.get(60)!).toBeGreaterThan(v.get(64)!); // louder NMF → higher velocity
  });

  it('ignores notes outside the instrument MIDI range', () => {
    // 30 (below guitar low) and 100 (above guitar high) must never fire.
    const out1 = tracker.update(mlFrame([30, 100], [30, 100]), onset());
    const out2 = tracker.update(mlFrame([30, 100], [30, 100]), onset());
    expect(out1.noteOns).toEqual([]);
    expect(out2.noteOns).toEqual([]);
    expect(tracker.getActiveNotes()).toEqual([]);
  });

  it('activates a key from strong NMF even without ML', () => {
    // NMF vector length 88 (index = MIDI - 21). Put a strong peak at MIDI 57.
    const nmf = new Float64Array(88);
    nmf[57 - 21] = 1.0; // well above relative threshold
    const frame: PolyTrackerInputs = {
      nmf,
      mlActiveKeys: null,
      mlOnsets: null,
      rms: 0.3,
    };
    tracker.update(frame);
    const out = tracker.update(frame); // needs ATTACK_FRAMES (no onset)
    expect(out.noteOns.map((n) => n.note)).toEqual([57]);
  });

  it('ignores weak NMF activation (noise floor)', () => {
    const nmf = new Float64Array(88);
    nmf[57 - 21] = 1.0; // one strong peak
    nmf[58 - 21] = 0.05; // weak neighbour, below relative threshold (0.35 * peak)
    const frame: PolyTrackerInputs = {
      nmf,
      mlActiveKeys: null,
      mlOnsets: null,
      rms: 0.3,
    };
    tracker.update(frame);
    const out = tracker.update(frame);
    expect(out.noteOns.map((n) => n.note)).toEqual([57]); // 58 excluded
  });

  it('maps input level to a musical velocity (louder → higher)', () => {
    const soft = new PolyphonicNoteTracker(GUITAR_LOW, GUITAR_HIGH);
    const loud = new PolyphonicNoteTracker(GUITAR_LOW, GUITAR_HIGH);
    const softVel = soft.update(mlFrame([60], [60], 0.05), onset(0)).noteOns[0]
      .velocity;
    const loudVel = loud.update(mlFrame([60], [60], 0.6), onset(0)).noteOns[0]
      .velocity;
    expect(loudVel).toBeGreaterThan(softVel);
    expect(softVel).toBeGreaterThanOrEqual(20); // velocity floor
    expect(loudVel).toBeLessThanOrEqual(127);
  });

  it('reset() clears all state', () => {
    tracker.update(mlFrame([60], [60]), onset());
    tracker.reset();
    expect(tracker.getActiveNotes()).toEqual([]);
    // A fresh note must re-run attack from scratch.
    const out = tracker.update(mlFrame([60]));
    expect(out.noteOns).toEqual([]);
  });

  it('flush() returns and clears currently-sounding notes', () => {
    tracker.update(mlFrame([60, 64], [60, 64]), onset());
    const flushed = tracker.flush().sort((a, b) => a - b);
    expect(flushed).toEqual([60, 64]);
    expect(tracker.getActiveNotes()).toEqual([]);
  });
});
