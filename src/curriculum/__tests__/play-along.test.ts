/**
 * Phase 17 — Play-Along Generator Tests.
 */

import { describe, it, expect } from 'vitest';
import type { GeneratedActivity } from '../engine/contentOrchestrator';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import { generatePlayAlongTrack } from '../engine/playAlongGenerator';
import type { VoicedProgressionChord } from '../engine/progressionPipeline';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTestActivity(
  overrides?: Partial<GeneratedActivity>,
): GeneratedActivity {
  const melody: MidiNoteEvent[] = [
    { note: 60, onset: 0, duration: 480 },
    { note: 64, onset: 480, duration: 480 },
    { note: 67, onset: 960, duration: 480 },
    { note: 72, onset: 1440, duration: 480 },
  ];

  const progression: VoicedProgressionChord[] = [
    {
      rh: [64, 67, 72],
      lh: 48,
      onset: 0,
      duration: 960,
      degree: '1',
      qualityId: 'maj',
      chordRoot: 60,
      name: 'Cmaj',
      chord: '1 maj',
    },
    {
      rh: [65, 69, 72],
      lh: 53,
      onset: 960,
      duration: 960,
      degree: '4',
      qualityId: 'maj',
      chordRoot: 65,
      name: 'Fmaj',
      chord: '4 maj',
    },
  ];

  const bass: MidiNoteEvent[] = [
    { note: 36, onset: 0, duration: 480 },
    { note: 36, onset: 480, duration: 480 },
    { note: 41, onset: 960, duration: 480 },
    { note: 41, onset: 1440, duration: 480 },
  ];

  return {
    genre: 'POP',
    level: 'L1',
    keyRoot: 60,
    tempo: 120,
    swing: 0,
    melody,
    progression,
    bass,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('playAlongGenerator', () => {
  it('generates a track with all four instrument arrays', () => {
    const activity = makeTestActivity();
    const track = generatePlayAlongTrack(activity, 4);

    expect(track).toHaveProperty('drums');
    expect(track).toHaveProperty('bass');
    expect(track).toHaveProperty('chords');
    expect(track).toHaveProperty('melody');
    expect(Array.isArray(track.drums)).toBe(true);
    expect(Array.isArray(track.bass)).toBe(true);
    expect(Array.isArray(track.chords)).toBe(true);
    expect(Array.isArray(track.melody)).toBe(true);
  });

  it('sets correct totalTicks and bars', () => {
    const activity = makeTestActivity();
    const track = generatePlayAlongTrack(activity, 4);

    expect(track.bars).toBe(4);
    expect(track.totalTicks).toBe(4 * 1920);
  });

  it('loops bass events to fill target bars', () => {
    const activity = makeTestActivity();
    // Activity has 1 bar of content (1920 ticks), loop to 4 bars
    const track = generatePlayAlongTrack(activity, 4);

    // Bass should be repeated 4 times (4 events × 4 loops = 16)
    expect(track.bass.length).toBe(16);

    // Verify bar 2 events are offset by 1920
    const bar2Events = track.bass.filter(
      (e) => e.onset >= 1920 && e.onset < 3840,
    );
    expect(bar2Events.length).toBe(4);
  });

  it('converts progression chords to individual note events', () => {
    const activity = makeTestActivity();
    const track = generatePlayAlongTrack(activity, 1);

    // 2 chords: first has 3 RH + 1 LH = 4 events, second = 4 events = 8 total
    expect(track.chords.length).toBe(8);
  });

  it('loops melody events to fill target bars', () => {
    const activity = makeTestActivity();
    const track = generatePlayAlongTrack(activity, 2);

    // 4 melody events × 2 loops = 8
    expect(track.melody.length).toBe(8);
  });

  it('handles empty activity gracefully', () => {
    const activity = makeTestActivity({
      melody: [],
      progression: [],
      bass: [],
    });
    const track = generatePlayAlongTrack(activity, 4);

    expect(track.melody).toEqual([]);
    expect(track.bass).toEqual([]);
    expect(track.chords).toEqual([]);
    expect(track.totalTicks).toBe(4 * 1920);
  });

  it('no events exceed totalTicks', () => {
    const activity = makeTestActivity();
    const track = generatePlayAlongTrack(activity, 4);

    for (const e of [
      ...track.melody,
      ...track.bass,
      ...track.chords,
      ...track.drums,
    ]) {
      expect(e.onset).toBeLessThan(track.totalTicks);
    }
  });

  it('respects loopBars parameter', () => {
    const activity = makeTestActivity();

    const track2 = generatePlayAlongTrack(activity, 2);
    const track8 = generatePlayAlongTrack(activity, 8);

    expect(track2.bars).toBe(2);
    expect(track2.totalTicks).toBe(2 * 1920);
    expect(track8.bars).toBe(8);
    expect(track8.totalTicks).toBe(8 * 1920);
  });
});
