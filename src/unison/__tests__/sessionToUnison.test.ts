import { describe, it, expect } from 'vitest';
import {
  sessionToUnison,
  type SessionSnapshot,
} from '../converters/sessionToUnison';

function makeSnapshot(
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return {
    tracks: [
      {
        id: 'track-1',
        name: 'Lead Melody',
        type: 'midi',
        instrument: 'oracle-synth',
        midiClips: [
          {
            events: [
              {
                note: 60,
                startTick: 0,
                durationTicks: 480,
                velocity: 100,
                channel: 1,
              },
              {
                note: 64,
                startTick: 480,
                durationTicks: 480,
                velocity: 90,
                channel: 1,
              },
              {
                note: 67,
                startTick: 960,
                durationTicks: 480,
                velocity: 85,
                channel: 1,
              },
              {
                note: 72,
                startTick: 1440,
                durationTicks: 480,
                velocity: 95,
                channel: 1,
              },
            ],
          },
        ],
      },
    ],
    chordRegions: [
      {
        id: 'cr1',
        startTick: 0,
        endTick: 1920,
        name: '1 major',
        noteName: 'C',
        color: [120, 80, 50] as [number, number, number],
        degreeKey: '1 major',
      },
    ],
    bpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    rootNote: 0,
    mode: 'ionian',
    ...overrides,
  };
}

describe('sessionToUnison', () => {
  it('produces a valid UnisonDocument structure', () => {
    const doc = sessionToUnison(makeSnapshot());

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('daw-session');
    expect(doc.metadata.ticksPerQuarterNote).toBe(480);
    expect(typeof doc.metadata.createdAt).toBe('string');
  });

  it('populates key detection from rootNote when set', () => {
    const doc = sessionToUnison(makeSnapshot({ rootNote: 0, mode: 'ionian' }));
    expect(doc.analysis.key.rootPc).toBe(0);
    expect(doc.analysis.key.rootName).toBe('C');
  });

  it('auto-detects key when rootNote is null', () => {
    const doc = sessionToUnison(makeSnapshot({ rootNote: null }));
    // Should still produce a key detection result
    expect(typeof doc.analysis.key.rootPc).toBe('number');
    expect(doc.analysis.key.confidence).toBeGreaterThan(0);
  });

  it('enriches chord regions with hybrid names and roman numerals', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.analysis.chordTimeline).toHaveLength(1);
    expect(doc.analysis.chordTimeline[0].hybridName).toBe('1 major');
    expect(doc.analysis.chordTimeline[0].romanNumeral).toBe('I');
  });

  it('converts tracks to UNISON format', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.tracks).toHaveLength(1);
    expect(doc.tracks[0].name).toBe('Lead Melody');
    expect(doc.tracks[0].events).toHaveLength(4);
    expect(doc.tracks[0].events[0].pitch).toBe(60);
  });

  it('guesses track role from name', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.tracks[0].role).toBe('melody'); // "Lead Melody" contains "melody"
  });

  it('produces rhythm analysis', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.rhythm.bpm).toBe(120);
    expect(doc.rhythm.timeSignatureNumerator).toBe(4);
    expect(doc.rhythm.timeSignatureDenominator).toBe(4);
  });

  it('produces melody analysis for melody track', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.melody).not.toBeNull();
    expect(doc.melody!.trackId).toBe('track-1');
    expect(doc.melody!.pitchRange.low).toBe(60);
    expect(doc.melody!.pitchRange.high).toBe(72);
  });

  it('returns null melody when no MIDI tracks exist', () => {
    const doc = sessionToUnison(
      makeSnapshot({
        tracks: [
          {
            id: 't1',
            name: 'Audio',
            type: 'audio',
            instrument: 'none',
            midiClips: [],
          },
        ],
      }),
    );
    expect(doc.melody).toBeNull();
  });

  it('computes duration from events and chord regions', () => {
    const doc = sessionToUnison(makeSnapshot());
    // Last event ends at 1440 + 480 = 1920, chord region ends at 1920
    expect(doc.metadata.durationTicks).toBe(1920);
  });

  it('timbre and mix are null stubs', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.timbre).toBeNull();
    expect(doc.mix).toBeNull();
  });

  it('aggregates vibes and styles from progression matches', () => {
    const doc = sessionToUnison(makeSnapshot());
    // vibes/styles are arrays (may be empty if no progression match)
    expect(Array.isArray(doc.analysis.vibes)).toBe(true);
    expect(Array.isArray(doc.analysis.styles)).toBe(true);
  });

  it('handles empty session gracefully', () => {
    const doc = sessionToUnison(
      makeSnapshot({
        tracks: [],
        chordRegions: [],
        rootNote: null,
      }),
    );
    expect(doc.tracks).toEqual([]);
    expect(doc.analysis.chordTimeline).toEqual([]);
    expect(doc.melody).toBeNull();
    expect(doc.metadata.durationTicks).toBe(0);
  });
});
