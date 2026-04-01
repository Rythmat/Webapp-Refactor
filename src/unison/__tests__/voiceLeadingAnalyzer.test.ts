import { describe, it, expect } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { analyzeVoiceLeading } from '../engine/voiceLeadingAnalyzer';
import type { UnisonChordRegion } from '../types/schema';

function chord(
  id: string,
  startTick: number,
  endTick: number,
): UnisonChordRegion {
  return {
    id,
    startTick,
    endTick,
    rootPc: 0,
    quality: 'major',
    noteName: 'C',
    degree: '1',
    hybridName: '1 major',
    romanNumeral: 'I',
    color: [0, 100, 50],
    inversion: 0,
    confidence: 1.0,
  };
}

function note(
  midi: number,
  startTick: number,
  durationTicks = 480,
): MidiNoteEvent {
  return { note: midi, velocity: 80, startTick, durationTicks, channel: 1 };
}

describe('analyzeVoiceLeading', () => {
  it('returns null for fewer than 2 chords', () => {
    expect(analyzeVoiceLeading([], [])).toBeNull();
    expect(analyzeVoiceLeading([chord('c1', 0, 960)], [])).toBeNull();
  });

  it('detects all common tones (smoothness = 1)', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // Same voicing in both regions: C-E-G
    const events = [
      note(60, 0),
      note(64, 0),
      note(67, 0),
      note(60, 480),
      note(64, 480),
      note(67, 480),
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result).not.toBeNull();
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0].commonTones).toBe(3);
    expect(result.transitions[0].totalSemitoneMotion).toBe(0);
    expect(result.transitions[0].smoothness).toBe(1);
    expect(result.avgSmoothness).toBe(1);
    expect(result.commonTonePercentage).toBe(1);
  });

  it('computes smooth voice leading (C → F with common tone C)', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // C maj: C4-E4-G4 → F maj: C4-F4-A4
    const events = [
      note(60, 0),
      note(64, 0),
      note(67, 0),
      note(60, 480),
      note(65, 480),
      note(69, 480),
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions[0].commonTones).toBe(1); // C stays
    expect(result.transitions[0].totalSemitoneMotion).toBe(3); // E→F (1) + G→A (2)
    expect(result.transitions[0].smoothness).toBeGreaterThan(0.5);
  });

  it('detects large jumps (low smoothness)', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // C4-E4-G4 → C6-E6-G6 (all voices jump 2 octaves)
    const events = [
      note(60, 0),
      note(64, 0),
      note(67, 0),
      note(84, 480),
      note(88, 480),
      note(91, 480),
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions[0].maxVoiceMovement).toBe(24);
    expect(result.transitions[0].smoothness).toBe(0); // clamped to 0
  });

  it('detects contrary motion', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // Bass goes down, soprano goes up
    // C3-G3-E4 → B2-G3-F4
    const events = [
      note(48, 0),
      note(55, 0),
      note(64, 0),
      note(47, 480),
      note(55, 480),
      note(65, 480),
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions[0].contraryMotion).toBe(true);
  });

  it('detects no contrary motion when outer voices move same direction', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // Both outer voices go up
    // C3-E3-G3 → D3-F3-A3
    const events = [
      note(48, 0),
      note(52, 0),
      note(55, 0),
      note(50, 480),
      note(53, 480),
      note(57, 480),
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions[0].contraryMotion).toBe(false);
  });

  it('detects parallel fifths', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // Two voices a P5 apart, both moving up by whole step
    // C4-G4 → D4-A4
    const events = [note(60, 0), note(67, 0), note(62, 480), note(69, 480)];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions[0].parallelFifths).toBe(true);
    expect(result.parallelFifthCount).toBe(1);
  });

  it('no parallel fifths when voices are not a P5 apart', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // C4-E4 → D4-F4 (thirds, not fifths)
    const events = [note(60, 0), note(64, 0), note(62, 480), note(65, 480)];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions[0].parallelFifths).toBe(false);
  });

  it('handles multiple transitions', () => {
    const chords = [
      chord('c1', 0, 480),
      chord('c2', 480, 960),
      chord('c3', 960, 1440),
    ];
    const events = [
      note(60, 0),
      note(64, 0),
      note(67, 0),
      note(60, 480),
      note(65, 480),
      note(69, 480),
      note(62, 960),
      note(65, 960),
      note(69, 960),
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.transitions).toHaveLength(2);
    expect(result.avgSmoothness).toBeGreaterThan(0);
  });

  it('skips chords with no matching events', () => {
    const chords = [chord('c1', 0, 480), chord('c2', 480, 960)];
    // Only events for first chord, none for second
    const events = [note(60, 0), note(64, 0), note(67, 0)];
    const result = analyzeVoiceLeading(chords, events);
    // No valid transitions possible
    expect(result).toBeNull();
  });

  it('commonTonePercentage is correct across transitions', () => {
    const chords = [
      chord('c1', 0, 480),
      chord('c2', 480, 960),
      chord('c3', 960, 1440),
    ];
    // Transition 1: has common tone, Transition 2: no common tones
    const events = [
      note(60, 0),
      note(64, 0),
      note(67, 0), // C-E-G
      note(60, 480),
      note(65, 480),
      note(69, 480), // C-F-A (common: C)
      note(62, 960),
      note(66, 960),
      note(69, 960), // D-F#-A (common: A from prev)
    ];
    const result = analyzeVoiceLeading(chords, events)!;
    expect(result.commonTonePercentage).toBe(1); // both transitions have >= 1 common tone
  });
});
