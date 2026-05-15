import { describe, it, expect } from 'vitest';
import {
  renderDrums,
  applyDrums,
  listDrumGenres,
} from '../engine/drumRenderer';
import type { UnisonDocument } from '../types/schema';

const PPQ = 480;
const BAR = 4 * PPQ; // 1920

function emptyDoc(durationTicks: number): UnisonDocument {
  return {
    version: '1.0.0',
    metadata: {
      title: 't',
      source: 'manual',
      createdAt: '2026-01-01T00:00:00Z',
      durationTicks,
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
      chordTimeline: [],
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

describe('renderDrums', () => {
  it('produces events that match Pop pattern at 4 bars (2 loops of the 2-bar pattern)', () => {
    const events = renderDrums({ genreName: 'Pop', bars: 4 });
    // Pop pattern per 2-bar loop: kick=4 + snare=4 + hihat=16 = 24 events.
    // 4 bars => 2 loops => 48 events.
    expect(events.length).toBe(48);
    // GM drum channel
    for (const e of events) {
      expect(e.channel).toBe(10);
    }
  });

  it('emits the GM kick / snare / hi-hat MIDI pitches', () => {
    const events = renderDrums({ genreName: 'Pop', bars: 2 });
    const pitches = new Set(events.map((e) => e.pitch));
    expect(pitches.has(36)).toBe(true); // kick
    expect(pitches.has(38)).toBe(true); // snare
    expect(pitches.has(42)).toBe(true); // hi-hat closed
  });

  it('places the first kick at tick 0 in a Pop pattern', () => {
    const events = renderDrums({ genreName: 'Pop', bars: 2 });
    const firstKick = events
      .filter((e) => e.pitch === 36)
      .sort((a, b) => a.startTick - b.startTick)[0];
    expect(firstKick.startTick).toBe(0);
  });

  it('returns empty events for an unknown genre (no silent Pop fallback)', () => {
    // Force an unknown name through the type system via a cast.
    const events = renderDrums({
      genreName: 'NotAGenre' as never,
      bars: 4,
    });
    expect(events).toEqual([]);
  });

  it('honours the channel override', () => {
    const events = renderDrums({ genreName: 'Pop', bars: 2, channel: 9 });
    for (const e of events) expect(e.channel).toBe(9);
  });
});

describe('applyDrums', () => {
  it('adds a drums track without mutating the input document', () => {
    const doc = emptyDoc(BAR * 2);
    const beforeCount = doc.tracks.length;

    const out = applyDrums(doc, { genreName: 'Pop' });

    expect(out.tracks.length).toBe(beforeCount + 1);
    expect(doc.tracks.length).toBe(beforeCount);

    const added = out.tracks[out.tracks.length - 1];
    expect(added.role).toBe('drums');
    expect(added.id).toBe('unison-drums-Pop');
    expect(added.events.length).toBeGreaterThan(0);
  });

  it('derives bar count from doc duration (rounds up to next 4/4 bar)', () => {
    // 2.5 bars of duration → 3 bars rendered → looped 2× (drum pattern is 2-bar).
    const doc = emptyDoc(BAR * 2 + BAR / 2);
    const out = applyDrums(doc, { genreName: 'Pop' });
    const drumTrack = out.tracks[out.tracks.length - 1];
    const lastTick = Math.max(...drumTrack.events.map((e) => e.startTick));
    // Last event must land within 4 bars (the rounded-up bar count of 3 → 2 loops of 2-bar pattern = 4 bars).
    expect(lastTick).toBeLessThan(4 * BAR);
  });

  it('respects an explicit bars option over doc duration', () => {
    const doc = emptyDoc(BAR * 8);
    const out = applyDrums(doc, { genreName: 'Pop', bars: 2 });
    const drumTrack = out.tracks[out.tracks.length - 1];
    const lastTick = Math.max(...drumTrack.events.map((e) => e.startTick));
    expect(lastTick).toBeLessThan(2 * BAR);
  });
});

describe('listDrumGenres', () => {
  it('exposes the canonical Studio pattern names', () => {
    const genres = listDrumGenres();
    expect(genres).toContain('Pop');
    expect(genres).toContain('Rock');
    expect(genres).toContain('Jazz');
    expect(genres).toContain('Funk');
    expect(genres.length).toBeGreaterThanOrEqual(15);
  });
});
