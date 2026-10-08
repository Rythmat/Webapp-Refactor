import { describe, expect, it, vi } from 'vitest';

// The engine's audio graph isn't under test, only its note → pad mapping.
vi.mock('tone', () => ({}));

import { DRUM_PADS, canonicalPadNote } from '../DrumMachineEngine';

// ── One note → pad mapping for the drum engine and its grid ────────────────
// DrumMachineView kept its own copy of the engine's mapping (dock-instruments-
// 24); the grid now places notes with the engine's, so a hit is drawn on the
// row of the pad that plays it.

describe('canonicalPadNote', () => {
  it('maps each pad to itself', () => {
    for (const pad of DRUM_PADS) {
      expect(canonicalPadNote(pad.note)).toBe(pad.note);
    }
  });

  it.each([
    [35, 36], // Acoustic Bass Drum → Kick
    [37, 38], // Side Stick → Snare
    [39, 38], // Hand Clap → Snare
    [50, 48], // High Tom → Rack Tom 1
    [47, 45], // Low-Mid Tom → Rack Tom 2
    [43, 41], // High Floor Tom → Floor Tom
    [57, 49], // Crash 2 → Crash
    [53, 51], // Ride Bell → Ride
  ])('plays GM note %i on pad %i', (note, pad) => {
    expect(canonicalPadNote(note)).toBe(pad);
  });

  it('falls back to the kick for any other note', () => {
    expect(canonicalPadNote(60)).toBe(36);
    expect(canonicalPadNote(0)).toBe(36);
  });
});
