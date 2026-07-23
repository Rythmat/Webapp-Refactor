import { describe, it, expect } from 'vitest';
import {
  CHROMATIC_MASK,
  ScaleQuantizer,
  quantizePitch,
  scaleMask,
} from '../ScaleQuantizer';

// C major / C ionian: C D E F G A B → pcs 0,2,4,5,7,9,11
const C_MAJOR = scaleMask(0, 'ionian');
// A minor / A aeolian: same pitch classes as C major
const A_MINOR = scaleMask(9, 'aeolian');
// G mixolydian: G A B C D E F → pcs 7,9,11,0,2,4,5
const G_MIXO = scaleMask(7, 'mixolydian');

describe('scaleMask', () => {
  it('builds the C major mask', () => {
    expect(C_MAJOR).toBe(
      (1 << 0) |
        (1 << 2) |
        (1 << 4) |
        (1 << 5) |
        (1 << 7) |
        (1 << 9) |
        (1 << 11),
    );
  });

  it('relative modes share pitch classes', () => {
    expect(A_MINOR).toBe(C_MAJOR);
  });

  it('unknown mode falls back to chromatic', () => {
    expect(scaleMask(0, 'not-a-mode')).toBe(CHROMATIC_MASK);
  });

  it('normalizes root pitch class', () => {
    expect(scaleMask(12, 'ionian')).toBe(C_MAJOR);
  });
});

describe('quantizePitch', () => {
  it('passes in-scale notes through unchanged', () => {
    for (const note of [60, 62, 64, 65, 67, 69, 71, 72]) {
      expect(quantizePitch(note, C_MAJOR, 'nearest')).toBe(note);
    }
  });

  it('chromatic and empty masks pass everything through', () => {
    expect(quantizePitch(61, CHROMATIC_MASK, 'nearest')).toBe(61);
    expect(quantizePitch(61, 0, 'nearest')).toBe(61);
  });

  it('nearest snaps C#→C (tie goes down)', () => {
    expect(quantizePitch(61, C_MAJOR, 'nearest')).toBe(60);
  });

  it('nearest snaps F#→F (tie goes down)', () => {
    expect(quantizePitch(66, C_MAJOR, 'nearest')).toBe(65);
  });

  it('down and up force direction', () => {
    expect(quantizePitch(61, C_MAJOR, 'down')).toBe(60);
    expect(quantizePitch(61, C_MAJOR, 'up')).toBe(62);
  });

  it('preserves register across octaves', () => {
    expect(quantizePitch(37, C_MAJOR, 'nearest')).toBe(36); // C#2 → C2
    expect(quantizePitch(97, C_MAJOR, 'nearest')).toBe(96); // C#7 → C7
  });

  it('works in G mixolydian (F# is out, F is in)', () => {
    expect(quantizePitch(66, G_MIXO, 'nearest')).toBe(65); // F# → F
    expect(quantizePitch(67, G_MIXO, 'nearest')).toBe(67); // G stays
  });

  it('fold maps chromatic positions onto scale degrees', () => {
    // C major degrees: [0,2,4,5,7,9,11]; pc 1 (C#) → degree 1 (D)
    expect(quantizePitch(61, C_MAJOR, 'fold')).toBe(62);
    // pc 0 (C) → degree 0 (C)
    expect(quantizePitch(60, C_MAJOR, 'fold')).toBe(60);
    // pc 7 (G) → degree 7 wraps: 7 % 7 = 0 → C one octave up
    expect(quantizePitch(67, C_MAJOR, 'fold')).toBe(72);
  });

  it('directional snap falls back at MIDI range edges', () => {
    // Note 0 (C-1) is in C major; note 1 (C#-1) snapped down would go
    // below 0, so 'down' falls back to snapping up
    expect(quantizePitch(1, C_MAJOR, 'down')).toBe(0); // C# → C (down ok)
    const csharpOnlyMask = 1 << 1; // scale containing only C#
    expect(quantizePitch(0, csharpOnlyMask, 'down')).toBe(1); // fallback up
  });
});

describe('ScaleQuantizer (note-off pairing)', () => {
  it('disabled quantizer is a passthrough', () => {
    const q = new ScaleQuantizer();
    expect(q.mapNoteOn(61)).toBe(61);
    expect(q.mapNoteOff(61)).toBe(61);
  });

  it('quantizes note-on and releases the same played note', () => {
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', true);
    expect(q.mapNoteOn(61)).toBe(60);
    expect(q.mapNoteOff(61)).toBe(60);
  });

  it('releases the recorded note even after a key change mid-note', () => {
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', true);
    expect(q.mapNoteOn(61)).toBe(60); // C# → C
    q.setScale(G_MIXO, 'nearest', true); // key changes while held
    expect(q.mapNoteOff(61)).toBe(60); // still releases C — no stuck note
  });

  it('collision: releasing one of two colliding keys is suppressed, last release wins', () => {
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', true);
    expect(q.mapNoteOn(61)).toBe(60); // C# → C
    expect(q.mapNoteOn(60)).toBe(60); // C → C (collision, refcount 2)
    // First release must NOT silence the note the other key still holds
    expect(q.mapNoteOff(61)).toBeNull();
    // Last release actually frees the output note
    expect(q.mapNoteOff(60)).toBe(60);
  });

  it('collision in either release order', () => {
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', true);
    q.mapNoteOn(60); // C → C
    q.mapNoteOn(61); // C# → C
    expect(q.mapNoteOff(60)).toBeNull();
    expect(q.mapNoteOff(61)).toBe(60);
  });

  it('same-input retrigger under key change releases both voices (no stuck note)', () => {
    // Overlapping same-pitch clips: on(61), on(61), off(61), off(61),
    // with the key changing between the two note-ons.
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', true);
    expect(q.mapNoteOn(61)).toBe(60); // C# → C
    q.setScale(scaleMask(1, 'ionian'), 'nearest', true); // C# now in scale
    expect(q.mapNoteOn(61)).toBe(61); // C# passes through
    // LIFO: most recent mapping released first, then the original —
    // both played notes get their note-off, nothing drones.
    expect(q.mapNoteOff(61)).toBe(61);
    expect(q.mapNoteOff(61)).toBe(60);
  });

  it('getMask reflects enabled state', () => {
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', false);
    expect(q.getMask()).toBe(CHROMATIC_MASK);
    q.setScale(C_MAJOR, 'nearest', true);
    expect(q.getMask()).toBe(C_MAJOR);
  });

  it('clear() empties the held map', () => {
    const q = new ScaleQuantizer();
    q.setScale(C_MAJOR, 'nearest', true);
    q.mapNoteOn(61);
    q.clear();
    // After clear, note-off falls back to best-effort quantization
    expect(q.mapNoteOff(61)).toBe(60);
  });
});
