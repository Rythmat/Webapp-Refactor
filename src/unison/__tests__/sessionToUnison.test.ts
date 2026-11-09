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

  it('enriches chord regions with hybrid names', () => {
    const doc = sessionToUnison(makeSnapshot());
    expect(doc.analysis.chordTimeline).toHaveLength(1);
    expect(doc.analysis.chordTimeline[0].hybridName).toBe('1 major');
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

// The progression Insight shows is matched on the analysis's chords, so
// they must be the chords the chord cards show (laneDegreeKey): a chord
// with only letter names, or written in another key, keeps its degree.
describe('sessionToUnison — the lane read as the chord cards read it', () => {
  type Region = SessionSnapshot['chordRegions'][number];
  const region = (
    i: number,
    fields: Pick<Region, 'name' | 'noteName'> & Partial<Region>,
  ): Region => ({
    id: `r${i}`,
    startTick: i * 1920,
    endTick: (i + 1) * 1920,
    color: [128, 128, 128],
    ...fields,
  });
  const hybrids = (snapshot: Partial<SessionSnapshot>) =>
    sessionToUnison(
      makeSnapshot({ tracks: [], ...snapshot }),
    ).analysis.chordTimeline.map((c) => c.hybridName);

  it('places chords named by letter only in the song key', () => {
    expect(
      hybrids({
        chordRegions: [
          region(0, { name: 'C', noteName: 'C' }),
          region(1, { name: 'G maj', noteName: 'G maj' }),
          region(2, { name: 'Am', noteName: 'A min' }),
          region(3, { name: 'F', noteName: 'F' }),
        ],
      }),
    ).toEqual(['1 major', '5 major', '6 minor', '4 major']);
  });

  it('reads a chord from its identity', () => {
    expect(
      hybrids({
        chordRegions: [
          region(0, {
            name: 'G',
            noteName: 'G',
            identity: {
              rootPc: 7,
              quality: 'dominant7',
              bassPc: 7,
              source: 'given',
              label: 'G',
            },
          }),
        ],
      }),
    ).toEqual(['5 dominant7']);
  });

  it('matches a minor song in its parent major, told in its own degrees', () => {
    const doc = sessionToUnison(
      makeSnapshot({
        tracks: [],
        rootNote: 9,
        mode: 'aeolian',
        chordRegions: [
          region(0, { name: 'Am', noteName: 'A min' }),
          region(1, { name: 'F', noteName: 'F' }),
          region(2, { name: 'C', noteName: 'C' }),
          region(3, { name: 'G', noteName: 'G' }),
        ],
      }),
    );
    expect(doc.analysis.chordTimeline.map((c) => c.hybridName)).toEqual([
      '1 minor',
      'b6 major',
      'b3 major',
      'b7 major',
    ]);
    const [best] = doc.analysis.progressionMatches;
    expect(best.progression).toBe('1 minor - b6 major - b3 major - b7 major');
    // The library has it as IV–I–V–vi: found mid-pattern, a touch less sure.
    expect(best.score).toBeGreaterThan(0.95);
  });

  it("keeps the lane's degrees in the song's own key", () => {
    expect(
      hybrids({
        chordRegions: [
          region(0, { name: '4 maj', noteName: 'F maj', degreeKey: '4 major' }),
        ],
      }),
    ).toEqual(['4 major']);
  });
});

describe('sessionToUnison — drum track isolation', () => {
  function melodyTrack(notes: Array<[number, number, number]>) {
    return {
      id: 'mel',
      name: 'Lead Melody',
      type: 'midi' as const,
      instrument: 'oracle-synth',
      midiClips: [
        {
          events: notes.map(([note, startTick, durationTicks]) => ({
            note,
            startTick,
            durationTicks,
            velocity: 100,
            channel: 1,
          })),
        },
      ],
    };
  }

  function drumTrack(notes: Array<[number, number, number]>) {
    return {
      id: 'drm',
      name: 'Drums',
      type: 'midi' as const,
      instrument: 'drum-machine',
      midiClips: [
        {
          events: notes.map(([note, startTick, durationTicks]) => ({
            note,
            startTick,
            durationTicks,
            velocity: 100,
            channel: 10,
          })),
        },
      ],
    };
  }

  it('excludes drum events from chord-voicing inversion detection', () => {
    // Pitched track: C major triad 60-64-67 sustained for the whole bar.
    // Drum track: kick at MIDI 24 — well below any plausible voicing.
    // Without filtering, harmonicAnalyzer would see 24 as the lowest pitch
    // overlapping the chord region and label the chord as having bassNote=24.
    const snapshot = makeSnapshot({
      tracks: [
        melodyTrack([
          [60, 0, 1920],
          [64, 0, 1920],
          [67, 0, 1920],
        ]),
        drumTrack([[24, 0, 240]]),
      ],
    });
    const doc = sessionToUnison(snapshot);
    expect(doc.analysis.chordTimeline.length).toBeGreaterThan(0);
    const chord = doc.analysis.chordTimeline[0];
    expect(chord.bassNote).not.toBe(24);
  });

  it('keeps the drum track in the output document', () => {
    const snapshot = makeSnapshot({
      tracks: [
        melodyTrack([[60, 0, 480]]),
        drumTrack([
          [36, 0, 120],
          [38, 480, 120],
          [42, 240, 120],
        ]),
      ],
    });
    const doc = sessionToUnison(snapshot);
    const drum = doc.tracks.find((t) => t.role === 'drums');
    expect(drum).toBeDefined();
    expect(drum!.events.length).toBe(3);
  });

  it('does not pick a drum track as the melody candidate', () => {
    // Only a drum track — melody analyzer should refuse it rather than
    // pick the kick/snare as a "melody".
    const snapshot = makeSnapshot({
      tracks: [
        drumTrack([
          [36, 0, 120],
          [38, 480, 120],
          [42, 240, 120],
        ]),
      ],
      chordRegions: [],
    });
    const doc = sessionToUnison(snapshot);
    expect(doc.melody).toBeNull();
  });

  it('still includes drum events when running rhythm analysis', () => {
    // Snapshot with only drums on a regular 8th-note hat pattern. Rhythm
    // analysis should still produce a populated, valid output — drums
    // ARE the rhythmic content here.
    const hatHits: Array<[number, number, number]> = [];
    for (let i = 0; i < 16; i++) hatHits.push([42, i * 240, 120]);
    const snapshot = makeSnapshot({
      tracks: [drumTrack(hatHits)],
      chordRegions: [],
    });
    const doc = sessionToUnison(snapshot);
    expect(doc.rhythm.timeSignatureNumerator).toBe(4);
    expect(doc.rhythm.subdivision).toBeDefined();
  });
});
