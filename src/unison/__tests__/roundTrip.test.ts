import { describe, it, expect } from 'vitest';
import {
  sessionToUnison,
  type SessionSnapshot,
} from '../converters/sessionToUnison';
import { unisonToEvents } from '../converters/unisonToMidi';

describe('round-trip: session → UNISON → events', () => {
  it('preserves note events through the pipeline', () => {
    const originalEvents = [
      { note: 60, startTick: 0, durationTicks: 480, velocity: 100, channel: 1 },
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
        durationTicks: 960,
        velocity: 85,
        channel: 1,
      },
    ];

    const snapshot: SessionSnapshot = {
      tracks: [
        {
          id: 'track-1',
          name: 'Piano',
          type: 'midi',
          instrument: 'piano-sampler',
          midiClips: [{ events: originalEvents }],
        },
      ],
      chordRegions: [],
      bpm: 120,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      rootNote: 0,
      mode: 'ionian',
    };

    const doc = sessionToUnison(snapshot);
    const eventsMap = unisonToEvents(doc);
    const restored = eventsMap.get('track-1');

    expect(restored).toBeDefined();
    expect(restored).toHaveLength(3);

    for (let i = 0; i < originalEvents.length; i++) {
      expect(restored![i].note).toBe(originalEvents[i].note);
      expect(restored![i].startTick).toBe(originalEvents[i].startTick);
      expect(restored![i].durationTicks).toBe(originalEvents[i].durationTicks);
      expect(restored![i].velocity).toBe(originalEvents[i].velocity);
      expect(restored![i].channel).toBe(originalEvents[i].channel);
    }
  });

  it('preserves multiple tracks', () => {
    const snapshot: SessionSnapshot = {
      tracks: [
        {
          id: 'lead',
          name: 'Lead',
          type: 'midi',
          instrument: 'oracle-synth',
          midiClips: [
            {
              events: [
                {
                  note: 72,
                  startTick: 0,
                  durationTicks: 960,
                  velocity: 100,
                  channel: 1,
                },
              ],
            },
          ],
        },
        {
          id: 'bass',
          name: 'Bass',
          type: 'midi',
          instrument: 'oracle-synth',
          midiClips: [
            {
              events: [
                {
                  note: 36,
                  startTick: 0,
                  durationTicks: 1920,
                  velocity: 110,
                  channel: 2,
                },
              ],
            },
          ],
        },
      ],
      chordRegions: [],
      bpm: 90,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      rootNote: null,
      mode: 'ionian',
    };

    const doc = sessionToUnison(snapshot);
    const eventsMap = unisonToEvents(doc);

    expect(eventsMap.size).toBe(2);
    expect(eventsMap.get('lead')![0].note).toBe(72);
    expect(eventsMap.get('bass')![0].note).toBe(36);
  });

  it('preserves BPM in UNISON document', () => {
    const snapshot: SessionSnapshot = {
      tracks: [],
      chordRegions: [],
      bpm: 145,
      timeSignatureNumerator: 3,
      timeSignatureDenominator: 4,
      rootNote: null,
      mode: 'dorian',
    };

    const doc = sessionToUnison(snapshot);
    expect(doc.rhythm.bpm).toBe(145);
    expect(doc.rhythm.timeSignatureNumerator).toBe(3);
    expect(doc.rhythm.timeSignatureDenominator).toBe(4);
  });
});
