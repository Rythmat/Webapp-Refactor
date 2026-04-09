import { describe, it, expect } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { analyzeRhythm } from '../engine/rhythmAnalyzer';

const PPQ = 480; // standard ticks per quarter note

function note(startTick: number, durationTicks = 240): MidiNoteEvent {
  return { note: 60, startTick, durationTicks, velocity: 80, channel: 1 };
}

describe('analyzeRhythm', () => {
  it('returns defaults for empty input', () => {
    const result = analyzeRhythm([], PPQ, 120);
    expect(result.bpm).toBe(120);
    expect(result.subdivision).toBe('straight');
    expect(result.swingAmount).toBe(0);
    expect(result.timeSignatureNumerator).toBe(4);
    expect(result.timeSignatureDenominator).toBe(4);
  });

  it('detects straight subdivision from 16th-note grid', () => {
    // Notes on every 16th note (PPQ/4 = 120 ticks apart)
    const events = Array.from({ length: 16 }, (_, i) => note(i * 120));
    const result = analyzeRhythm(events, PPQ, 120);
    expect(result.subdivision).toBe('straight');
  });

  it('detects triplet subdivision from triplet grid', () => {
    // Notes on 8th-note triplet grid (PPQ/3 = 160 ticks apart)
    const events = Array.from({ length: 12 }, (_, i) => note(i * 160));
    const result = analyzeRhythm(events, PPQ, 120);
    expect(result.subdivision).toBe('triplet');
  });

  it('detects no swing from evenly spaced 8th notes', () => {
    // Even 8th notes: every PPQ/2 = 240 ticks
    const events = Array.from({ length: 8 }, (_, i) => note(i * 240));
    const result = analyzeRhythm(events, PPQ, 120);
    expect(result.swingAmount).toBeLessThan(0.2);
  });

  it('detects swing from uneven 8th-note pairs', () => {
    // Swung 8ths: long-short pattern (2:1 ratio)
    // Even 8ths at 0, 480, 960, 1440... Odd 8ths shifted late
    const events: MidiNoteEvent[] = [];
    for (let beat = 0; beat < 4; beat++) {
      const beatStart = beat * PPQ;
      events.push(note(beatStart)); // on-beat (even 8th)
      events.push(note(beatStart + 320)); // swung off-beat (2:1 = 320/480)
    }
    const result = analyzeRhythm(events, PPQ, 120);
    expect(result.swingAmount).toBeGreaterThan(0.3);
  });

  it('passes through BPM and time signature', () => {
    const events = [note(0), note(480)];
    const result = analyzeRhythm(events, PPQ, 140, 3, 4);
    expect(result.bpm).toBe(140);
    expect(result.timeSignatureNumerator).toBe(3);
    expect(result.timeSignatureDenominator).toBe(4);
    expect(result.bpmConfidence).toBe(1.0);
  });
});
