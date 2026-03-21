import { describe, it, expect } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { analyzeMelody } from '../engine/melodyAnalyzer';
import type { KeyDetection } from '../types/schema';

function note(pitch: number, startTick = 0): MidiNoteEvent {
  return {
    note: pitch,
    startTick,
    durationTicks: 480,
    velocity: 80,
    channel: 1,
  };
}

const cMajorKey: KeyDetection = {
  rootPc: 0,
  rootName: 'C',
  mode: 'ionian',
  modeDisplay: 'Ionian',
  confidence: 0.9,
  alternateKeys: [],
};

describe('analyzeMelody', () => {
  it('returns empty analysis for no events', () => {
    const result = analyzeMelody([], 'track1', cMajorKey);
    expect(result.trackId).toBe('track1');
    expect(result.pitchRange).toEqual({ low: 0, high: 0 });
    expect(result.scaleDegrees).toEqual([]);
    expect(result.contour).toBe('static');
    expect(result.intervalHistogram).toEqual({});
  });

  it('computes correct pitch range', () => {
    const events = [note(60, 0), note(72, 480), note(48, 960)];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.pitchRange).toEqual({ low: 48, high: 72 });
  });

  it('computes scale degrees in C major', () => {
    // C=60 → 1, D=62 → 2, E=64 → 3, F=65 → 4, G=67 → 5
    const events = [
      note(60, 0),
      note(62, 480),
      note(64, 960),
      note(65, 1440),
      note(67, 1920),
    ];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.scaleDegrees.map((d) => d.degree)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('detects ascending contour', () => {
    // Stepwise ascending melody
    const events = [
      note(60, 0),
      note(62, 480),
      note(64, 960),
      note(65, 1440),
      note(67, 1920),
      note(69, 2400),
      note(71, 2880),
      note(72, 3360),
    ];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.contour).toBe('ascending');
  });

  it('detects descending contour', () => {
    const events = [
      note(72, 0),
      note(71, 480),
      note(69, 960),
      note(67, 1440),
      note(65, 1920),
      note(64, 2400),
      note(62, 2880),
      note(60, 3360),
    ];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.contour).toBe('descending');
  });

  it('detects arch contour (rise then fall)', () => {
    const events = [
      note(60, 0),
      note(62, 480),
      note(64, 960),
      note(67, 1440),
      note(72, 1920),
      note(72, 2400),
      note(67, 2880),
      note(64, 3360),
      note(62, 3840),
      note(60, 4320),
      note(60, 4800),
      note(60, 5280),
    ];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.contour).toBe('arch');
  });

  it('detects static contour for repeated notes', () => {
    const events = [note(60, 0), note(60, 480), note(61, 960), note(60, 1440)];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.contour).toBe('static');
  });

  it('builds interval histogram', () => {
    // C→E (4 semitones), E→G (3 semitones), G→C (5 semitones)
    const events = [note(60, 0), note(64, 480), note(67, 960), note(72, 1440)];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.intervalHistogram[4]).toBe(1); // C→E
    expect(result.intervalHistogram[3]).toBe(1); // E→G
    expect(result.intervalHistogram[5]).toBe(1); // G→C
  });

  it('handles non-diatonic notes with chromatic degree labels', () => {
    // C#=61 in C major → b2, F#=66 → b5
    const events = [note(61, 0), note(66, 480)];
    const result = analyzeMelody(events, 'track1', cMajorKey);
    expect(result.scaleDegrees[0].degree).toBe('b2');
    expect(result.scaleDegrees[1].degree).toBe('b5');
  });
});
