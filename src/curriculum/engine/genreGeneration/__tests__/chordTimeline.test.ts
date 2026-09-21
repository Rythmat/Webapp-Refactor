import { describe, expect, it } from 'vitest';
import {
  buildChordTimeline,
  chordAtTick,
  type TimedChord,
} from '../chordTimeline';
import type { GenreNoteEvent } from '../resolveStepContent';

const summary = (timeline: TimedChord[]) =>
  timeline.map((chord) => [chord.tick, chord.symbol]);

const strike = (
  midis: number[],
  onset: number,
  duration = 120,
): GenreNoteEvent[] => midis.map((midi) => ({ midi, onset, duration }));

describe('buildChordTimeline', () => {
  it('follows chords that change mid-bar in the target notes (Funk L2 D3.2)', () => {
    const targets = [
      ...strike([60, 67, 71], 0, 1200), // Am9
      { midi: 79, onset: 240, duration: 240 }, // melody
      ...strike([61, 65, 70], 1440, 240), // Eb9 on beat 4
      ...strike([60, 64, 69], 1800, 1320), // D9 on the last 16th, held
      { midi: 84, onset: 2160, duration: 240 },
      ...strike([60, 67, 71, 81], 3840, 240), // Am9 + melody A5
    ];
    expect(
      summary(buildChordTimeline(['Am9', 'Eb9', 'D9'], targets, 16)),
    ).toEqual([
      [0, 'Am9'],
      [1440, 'Eb9'],
      [1800, 'D9'],
      [3840, 'Am9'],
    ]);
  });

  it('lets a chromatic approach stab belong to the chord it leads into', () => {
    const targets = [
      ...strike([67, 71, 76], 0), // A funk9: G-B-E
      ...strike([71, 75, 80], 1800), // approach stab: B-D#-G#
      ...strike([72, 76, 81], 1920), // D funk9: C-E-A
    ];
    expect(
      summary(buildChordTimeline(['Afunk9', 'Dfunk9'], targets, 16)),
    ).toEqual([
      [0, 'Afunk9'],
      [1800, 'Dfunk9'],
    ]);
  });

  it('falls back to one chord per bar when the targets are a single line', () => {
    const melody = [0, 480, 1920, 2400].map((onset, i) => ({
      midi: 62 + i,
      onset,
      duration: 240,
    }));
    expect(summary(buildChordTimeline(['Dm7', 'G7'], melody, 4))).toEqual([
      [0, 'Dm7'],
      [1920, 'G7'],
      [3840, 'Dm7'],
      [5760, 'G7'],
    ]);
  });

  it('lets a moving bass name the chord under a held upper voicing (Pop power-chord jam)', () => {
    const targets = [
      ...strike([36, 60, 67], 0), // C2 under C4-G4
      ...strike([60, 67], 480),
      ...strike([43, 60, 67], 1920), // G2
      ...strike([60, 67], 2400),
      ...strike([45, 60, 67], 3840), // A2
      ...strike([41, 60, 67], 5760), // F2
      ...strike([36, 60, 67], 7680), // C2
    ];
    expect(
      summary(buildChordTimeline(['C', 'G', 'Am', 'F'], targets, 16)),
    ).toEqual([
      [0, 'C'],
      [1920, 'G'],
      [3840, 'Am'],
      [5760, 'F'],
      [7680, 'C'],
    ]);
  });

  it('is empty without chord symbols', () => {
    expect(buildChordTimeline(undefined, [], 4)).toEqual([]);
  });
});

describe('chordAtTick', () => {
  it('finds the chord sounding at a tick', () => {
    const timeline = buildChordTimeline(['Dm7', 'G7'], [], 2);
    expect(chordAtTick(timeline, 1919)?.symbol).toBe('Dm7');
    expect(chordAtTick(timeline, 1920)?.symbol).toBe('G7');
    expect(chordAtTick([], 0)).toBeNull();
  });
});
