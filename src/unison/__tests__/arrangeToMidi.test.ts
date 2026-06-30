import { describe, it, expect } from 'vitest';
import { importMidiFile } from '@/daw/midi/MidiFileIO';
import { unisonToMidi, unisonToEvents } from '../converters/unisonToMidi';
import { arrangeForStyle } from '../engine/arrangeForStyle';
import type { UnisonChordRegion, UnisonDocument } from '../types/schema';

const PPQ = 480;
const BAR = 4 * PPQ;

function chordRegion(
  id: string,
  startBar: number,
  endBar: number,
  rootPc: number,
  quality: string,
): UnisonChordRegion {
  return {
    id,
    startTick: startBar * BAR,
    endTick: endBar * BAR,
    rootPc,
    quality,
    noteName: '',
    degree: '1',
    hybridName: `1 ${quality}`,
    romanNumeral: 'I',
    color: [0, 0, 0],
    inversion: 0,
    confidence: 1,
  };
}

function blankDoc(timeline: UnisonChordRegion[]): UnisonDocument {
  return {
    version: '1.0.0',
    metadata: {
      title: 'arrangement-export-test',
      source: 'manual',
      createdAt: '2026-01-01T00:00:00Z',
      durationTicks: timeline[timeline.length - 1]?.endTick ?? 0,
      ticksPerQuarterNote: PPQ,
    },
    tracks: [],
    analysis: {
      key: {
        rootPc: 0,
        rootName: 'C',
        mode: 'ionian',
        modeDisplay: 'major',
        confidence: 1,
        alternateKeys: [],
      },
      chordTimeline: timeline,
      progressionMatches: [],
      vibes: [],
      styles: [],
    },
    rhythm: {
      bpm: 120,
      bpmConfidence: 1,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      subdivision: 'straight',
      swingAmount: 0,
    },
    melody: null,
    form: null,
    timbre: null,
    mix: null,
  };
}

const POP_TIMELINE: UnisonChordRegion[] = [
  chordRegion('r0', 0, 1, 0, 'major'),
  chordRegion('r1', 1, 2, 9, 'minor'),
  chordRegion('r2', 2, 3, 5, 'major'),
  chordRegion('r3', 3, 4, 7, 'major'),
];

describe('arrange → unisonToMidi → MIDI Blob', () => {
  it('produces a non-empty Blob for a fully-arranged doc', () => {
    const { doc } = arrangeForStyle(blankDoc(POP_TIMELINE), 'pop');
    const blob = unisonToMidi(doc);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('routes each renderer output to its declared MIDI channel via unisonToEvents', () => {
    const { doc } = arrangeForStyle(blankDoc(POP_TIMELINE), 'pop');
    const eventsMap = unisonToEvents(doc);

    const chordsTrack = doc.tracks.find((t) => t.role === 'chords');
    const bassTrack = doc.tracks.find((t) => t.role === 'bass');
    const drumsTrack = doc.tracks.find((t) => t.role === 'drums');
    const melodyTrack = doc.tracks.find((t) => t.role === 'melody');

    expect(chordsTrack && eventsMap.get(chordsTrack.id)![0].channel).toBe(1);
    expect(bassTrack && eventsMap.get(bassTrack.id)![0].channel).toBe(2);
    expect(melodyTrack && eventsMap.get(melodyTrack.id)![0].channel).toBe(4);
    expect(drumsTrack && eventsMap.get(drumsTrack.id)![0].channel).toBe(10);
  });

  it('round-trips through Blob → importMidiFile preserving track count and event counts', async () => {
    const { doc } = arrangeForStyle(blankDoc(POP_TIMELINE), 'pop');
    const blob = unisonToMidi(doc);
    const buffer = await blob.arrayBuffer();
    const importedTracks = importMidiFile(buffer);

    // Every non-empty UNISON track should round-trip to at least one
    // imported track. (importMidiFile filters out empty tracks.)
    const nonEmptyUnisonTracks = doc.tracks.filter((t) => t.events.length > 0);
    expect(importedTracks.length).toBe(nonEmptyUnisonTracks.length);

    const originalCount = nonEmptyUnisonTracks.reduce(
      (sum, t) => sum + t.events.length,
      0,
    );
    const importedCount = importedTracks.reduce(
      (sum, seq) => sum + seq.events.length,
      0,
    );
    expect(importedCount).toBe(originalCount);
  });

  it('does not drop tracks when two UnisonTracks request the same MIDI channel', () => {
    // Construct a doc with two tracks that both want channel 5 — the
    // pre-fix unisonToMidi would Map-overwrite and drop one.
    const doc = blankDoc(POP_TIMELINE);
    doc.tracks = [
      {
        id: 'a',
        name: 'A',
        channel: 5,
        role: 'melody',
        events: [
          {
            pitch: 60,
            velocity: 100,
            startTick: 0,
            durationTicks: 480,
            channel: 5,
          },
        ],
        ccEvents: [],
      },
      {
        id: 'b',
        name: 'B',
        channel: 5,
        role: 'melody',
        events: [
          {
            pitch: 64,
            velocity: 100,
            startTick: 0,
            durationTicks: 480,
            channel: 5,
          },
        ],
        ccEvents: [],
      },
    ];

    const blob = unisonToMidi(doc);
    expect(blob.size).toBeGreaterThan(0);

    // Both tracks should appear in the export via importMidiFile.
    return blob.arrayBuffer().then((buf) => {
      const imported = importMidiFile(buf);
      expect(imported.length).toBe(2);
    });
  });
});
