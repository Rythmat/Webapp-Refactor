import { describe, it, expect } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { detectKey } from '../engine/keyDetector';

/** Helper: create a note event at a given pitch with duration weight */
function note(
  pitch: number,
  startTick = 0,
  durationTicks = 480,
  velocity = 80,
): MidiNoteEvent {
  return { note: pitch, startTick, durationTicks, velocity, channel: 1 };
}

/** Generate events for a scale ascending from a root */
function scaleEvents(rootMidi: number, intervals: number[]): MidiNoteEvent[] {
  return intervals.map((semitone, i) =>
    note(rootMidi + semitone, i * 480, 480),
  );
}

describe('detectKey', () => {
  it('returns zero-confidence result for empty input', () => {
    const result = detectKey([]);
    expect(result.confidence).toBe(0);
    expect(result.rootPc).toBe(0);
  });

  it('detects C major from C major scale notes', () => {
    // C D E F G A B — ionian intervals
    const events = scaleEvents(60, [0, 2, 4, 5, 7, 9, 11]);
    const result = detectKey(events);
    expect(result.rootPc).toBe(0); // C
    expect(result.rootName).toBe('C');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects A minor when A is emphasized as tonic', () => {
    // A natural minor scale with strong tonic emphasis
    // Without root emphasis, K-S correctly finds C major (relative major)
    const events = [
      note(57, 0, 1920, 127), // A held long, loud (tonic emphasis)
      note(57, 1920, 960, 100), // A again
      note(59, 2880, 480, 70), // B
      note(60, 3360, 480, 70), // C
      note(62, 3840, 480, 70), // D
      note(64, 4320, 480, 70), // E
      note(65, 4800, 480, 70), // F
      note(67, 5280, 480, 70), // G
    ];
    const result = detectKey(events);
    expect(result.rootPc).toBe(9); // A
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('detects G major from G major scale', () => {
    // G A B C D E F#
    const events = scaleEvents(55, [0, 2, 4, 5, 7, 9, 11]);
    const result = detectKey(events);
    expect(result.rootPc).toBe(7); // G
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects D dorian when D is emphasized with dorian intervals', () => {
    // D E F G A B C — dorian has natural 6th (B) vs aeolian's Bb
    const dorian = [0, 2, 3, 5, 7, 9, 10];
    // Weight the root D heavily
    const events = [
      // Emphasize D as root: longer duration, higher velocity
      note(62, 0, 1920, 127), // D held for 4 beats
      note(62, 1920, 960, 100), // D again
      ...dorian.slice(1).map((s, i) => note(62 + s, (i + 3) * 480, 480, 70)),
    ];
    const result = detectKey(events);
    expect(result.rootPc).toBe(2); // D
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('provides alternate key suggestions', () => {
    const events = scaleEvents(60, [0, 2, 4, 5, 7, 9, 11]);
    const result = detectKey(events);
    expect(result.alternateKeys.length).toBeGreaterThan(0);
    expect(result.alternateKeys.length).toBeLessThanOrEqual(3);
    // Alternates should have lower confidence than primary
    for (const alt of result.alternateKeys) {
      expect(alt.confidence).toBeLessThanOrEqual(result.confidence);
    }
  });

  it('handles chromatic/atonal input with low confidence', () => {
    // All 12 pitch classes equally weighted
    const events = Array.from({ length: 12 }, (_, i) =>
      note(60 + i, i * 480, 480, 80),
    );
    const result = detectKey(events);
    // Should still return something but with lower confidence
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('weights longer notes more heavily', () => {
    // Bb major scale but with C held much longer → should still detect Bb
    const events = [
      note(58, 0, 3840, 127), // Bb held 8 beats (root emphasis)
      note(60, 3840, 480, 60), // C
      note(62, 4320, 480, 60), // D
      note(63, 4800, 480, 60), // Eb
      note(65, 5280, 480, 60), // F
      note(67, 5760, 480, 60), // G
      note(69, 6240, 480, 60), // A
    ];
    const result = detectKey(events);
    expect(result.rootPc).toBe(10); // Bb
  });

  describe('the tonic from the bass (2026-10-21)', () => {
    const prog = (chords: number[][]) =>
      chords.flatMap((c, i) => c.map((p) => note(p, i * 1920, 1920, 90)));

    it('reads I–V–vi–IV as C major, surely, not A minor', () => {
      const result = detectKey(
        prog([
          [48, 60, 64, 67],
          [43, 59, 62, 67],
          [45, 57, 60, 64],
          [41, 57, 60, 65],
          [48, 60, 64, 67],
        ]),
      );
      expect(result.rootPc).toBe(0);
      expect(result.mode).toBe('ionian');
      expect(result.confidence).toBeGreaterThan(0.9);
      // The alternates are other tonics, and less sure.
      expect(result.alternateKeys[0].rootPc).not.toBe(0);
      expect(result.alternateKeys[0].confidence).toBeLessThan(
        result.confidence,
      );
    });

    it('reads the same chords from A as A minor', () => {
      const result = detectKey(
        prog([
          [45, 57, 60, 64],
          [41, 57, 60, 65],
          [48, 60, 64, 67],
          [43, 59, 62, 67],
          [45, 57, 60, 64],
        ]),
      );
      expect(result.rootPc).toBe(9);
      expect(result.mode).toBe('aeolian');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('reads a Dm7–G7 vamp as D Dorian', () => {
      const result = detectKey(
        prog([
          [50, 62, 65, 69, 72],
          [43, 59, 62, 65, 67],
          [50, 62, 65, 69, 72],
          [43, 59, 62, 65, 67],
          [50, 62, 65, 69, 72],
        ]),
      );
      expect(result.rootPc).toBe(2);
      expect(result.mode).toBe('dorian');
    });
  });
});
