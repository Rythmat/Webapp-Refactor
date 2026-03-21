import { describe, it, expect } from 'vitest';
import type { MidiSequence } from '@/daw/prism-engine/types';
import { midiToUnison } from '../converters/midiToUnison';

function makeSequence(overrides?: Partial<MidiSequence>): MidiSequence {
  return {
    ticksPerQuarterNote: 480,
    trackName: 'Piano',
    events: [
      { note: 60, velocity: 80, startTick: 0, durationTicks: 480, channel: 1 },
      { note: 64, velocity: 80, startTick: 0, durationTicks: 480, channel: 1 },
      { note: 67, velocity: 80, startTick: 0, durationTicks: 480, channel: 1 },
      {
        note: 65,
        velocity: 80,
        startTick: 480,
        durationTicks: 480,
        channel: 1,
      },
      {
        note: 69,
        velocity: 80,
        startTick: 480,
        durationTicks: 480,
        channel: 1,
      },
      {
        note: 72,
        velocity: 80,
        startTick: 480,
        durationTicks: 480,
        channel: 1,
      },
    ],
    ...overrides,
  };
}

describe('midiToUnison', () => {
  it('returns empty document for empty sequences', () => {
    const doc = midiToUnison([]);
    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('midi-import');
    expect(doc.tracks).toHaveLength(0);
    expect(doc.analysis.chordTimeline).toHaveLength(0);
  });

  it('produces a valid UnisonDocument from a single sequence', () => {
    const seq = makeSequence();
    const doc = midiToUnison([seq], { title: 'Test Song', bpm: 120 });

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('midi-import');
    expect(doc.metadata.title).toBe('Test Song');
    expect(doc.tracks.length).toBeGreaterThanOrEqual(1);
    expect(doc.rhythm.bpm).toBe(120);
  });

  it('sets sourceFilename when provided', () => {
    const seq = makeSequence();
    const doc = midiToUnison([seq], { filename: 'test.mid' });
    expect(doc.metadata.sourceFilename).toBe('test.mid');
  });

  it('auto-detects key from MIDI events', () => {
    const seq = makeSequence();
    const doc = midiToUnison([seq]);
    // Should detect a key with non-zero confidence
    expect(doc.analysis.key.confidence).toBeGreaterThan(0);
    expect(doc.analysis.key.rootName).toBeTruthy();
  });

  it('converts tracks to UNISON format', () => {
    const seq = makeSequence();
    const doc = midiToUnison([seq]);
    expect(doc.tracks[0].name).toBe('Piano');
    expect(doc.tracks[0].events.length).toBeGreaterThan(0);
    expect(doc.tracks[0].events[0].pitch).toBe(60);
  });

  it('handles multiple sequences (multi-track)', () => {
    const piano = makeSequence({ trackName: 'Piano' });
    const bass: MidiSequence = {
      ticksPerQuarterNote: 480,
      trackName: 'Bass',
      events: [
        {
          note: 36,
          velocity: 90,
          startTick: 0,
          durationTicks: 960,
          channel: 2,
        },
        {
          note: 41,
          velocity: 90,
          startTick: 960,
          durationTicks: 960,
          channel: 2,
        },
      ],
    };
    const doc = midiToUnison([piano, bass], { bpm: 100 });
    expect(doc.tracks).toHaveLength(2);
    expect(doc.tracks[0].name).toBe('Piano');
    expect(doc.tracks[1].name).toBe('Bass');
  });

  it('rescales ticks when source PPQ differs from 480', () => {
    const seq: MidiSequence = {
      ticksPerQuarterNote: 240, // half of 480
      trackName: 'Low PPQ',
      events: [
        {
          note: 60,
          velocity: 80,
          startTick: 0,
          durationTicks: 240,
          channel: 1,
        },
        {
          note: 64,
          velocity: 80,
          startTick: 0,
          durationTicks: 240,
          channel: 1,
        },
        {
          note: 67,
          velocity: 80,
          startTick: 0,
          durationTicks: 240,
          channel: 1,
        },
      ],
    };
    const doc = midiToUnison([seq]);
    // Events should be scaled: 240 * (480/240) = 480
    expect(doc.tracks[0].events[0].durationTicks).toBe(480);
  });

  it('uses default BPM of 120 when not specified', () => {
    const seq = makeSequence();
    const doc = midiToUnison([seq]);
    expect(doc.rhythm.bpm).toBe(120);
  });

  it('uses filename as title fallback', () => {
    const seq = makeSequence();
    const doc = midiToUnison([seq], { filename: 'my_song.mid' });
    expect(doc.metadata.title).toBe('my_song.mid');
  });
});
