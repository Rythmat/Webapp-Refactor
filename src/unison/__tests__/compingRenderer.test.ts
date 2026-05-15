import { describe, it, expect } from 'vitest';
import {
  renderComping,
  applyComping,
  listCompingPatternsForGenre,
} from '../engine/compingRenderer';
import type { UnisonChordRegion, UnisonDocument } from '../types/schema';

const PPQ = 480;
const BAR = 4 * PPQ; // 1920

function region(
  id: string,
  startBar: number,
  endBar: number,
  rootPc: number,
  quality: string,
  voicingNotes?: number[],
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
    ...(voicingNotes ? { voicingNotes } : {}),
  };
}

function emptyDoc(timeline: UnisonChordRegion[]): UnisonDocument {
  return {
    version: '1.0.0',
    metadata: {
      title: 't',
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

describe('renderComping', () => {
  it('emits one event per voicing note per pattern hit (comp_pop_01: 4 quarter notes)', () => {
    // One 1-bar C major chord, voicing of [60, 64, 67].
    const timeline = [region('r0', 0, 1, 0, 'major', [60, 64, 67])];
    const events = renderComping(timeline, 'comp_pop_01');

    // comp_pop_01 has 4 hits; 3-note voicing -> 12 events.
    expect(events.length).toBe(12);
    // All voicing pitches appear at startTick 0, 480, 960, 1440.
    const starts = [...new Set(events.map((e) => e.startTick))].sort(
      (a, b) => a - b,
    );
    expect(starts).toEqual([0, 480, 960, 1440]);
  });

  it('preserves pattern durations on emitted events', () => {
    const timeline = [region('r0', 0, 1, 0, 'major', [60, 64, 67])];
    const events = renderComping(timeline, 'comp_pop_01');
    // comp_pop_01 durations are 480 each.
    for (const e of events) {
      expect(e.durationTicks).toBe(480);
    }
  });

  it('honours velocity and channel options', () => {
    const timeline = [region('r0', 0, 1, 0, 'major', [60, 64, 67])];
    const events = renderComping(timeline, 'comp_pop_01', {
      velocity: 80,
      channel: 4,
    });
    for (const e of events) {
      expect(e.velocity).toBe(80);
      expect(e.channel).toBe(4);
    }
  });

  it('falls back to root-position voicing when voicingNotes is absent', () => {
    // C major with no voicing — should default to [60, 64, 67].
    const timeline = [region('r0', 0, 1, 0, 'major')];
    const events = renderComping(timeline, 'comp_pop_01');

    expect(events.length).toBe(12);
    const pitchesAt0 = events
      .filter((e) => e.startTick === 0)
      .map((e) => e.pitch)
      .sort();
    expect(pitchesAt0).toEqual([60, 64, 67]);
  });

  it('returns no events for an unknown engine quality with no voicing', () => {
    const timeline = [region('r0', 0, 1, 0, 'not-a-quality')];
    const events = renderComping(timeline, 'comp_pop_01');
    expect(events).toEqual([]);
  });

  it('returns empty array for unknown patternId', () => {
    const timeline = [region('r0', 0, 1, 0, 'major', [60, 64, 67])];
    expect(renderComping(timeline, 'comp_does_not_exist')).toEqual([]);
  });

  it('tiles a 1-bar pattern across a multi-bar chord region', () => {
    // 4-bar C major chord, root-position voicing.
    const timeline = [region('r0', 0, 4, 0, 'major', [60, 64, 67])];
    const events = renderComping(timeline, 'comp_pop_01');

    // 4 loops × 4 hits × 3 pitches = 48 events.
    expect(events.length).toBe(48);
    const uniqueStarts = [...new Set(events.map((e) => e.startTick))].sort(
      (a, b) => a - b,
    );
    // Quarter-note hits at every 480 ticks across 4 bars (16 hits).
    expect(uniqueStarts.length).toBe(16);
    expect(uniqueStarts[0]).toBe(0);
    expect(uniqueStarts[15]).toBe(7200); // 1920*3 + 1440
  });

  it('truncates pattern hits beyond the chord region', () => {
    // Half-bar chord (960 ticks). comp_pop_01 has hits at 0, 480, 960, 1440.
    // Only hits at 0 and 480 should fit; 960 is exactly at the end (skipped).
    const halfBarEnd = BAR / 2;
    const timeline: UnisonChordRegion[] = [
      {
        ...region('r0', 0, 0, 0, 'major', [60, 64, 67]),
        endTick: halfBarEnd,
      },
    ];
    const events = renderComping(timeline, 'comp_pop_01');

    const starts = [...new Set(events.map((e) => e.startTick))].sort(
      (a, b) => a - b,
    );
    expect(starts).toEqual([0, 480]);
  });

  it('clips final event duration so it never crosses region.endTick', () => {
    // Chord runs 0..600. comp_pop_01 hit at 480 with dur 480 would end at 960
    // — should be clipped to 120.
    const timeline: UnisonChordRegion[] = [
      {
        ...region('r0', 0, 0, 0, 'major', [60, 64, 67]),
        endTick: 600,
      },
    ];
    const events = renderComping(timeline, 'comp_pop_01');
    const eventsAt480 = events.filter((e) => e.startTick === 480);
    for (const e of eventsAt480) {
      expect(e.durationTicks).toBe(120);
    }
  });

  it('emits events sorted by startTick', () => {
    const timeline = [
      region('r0', 0, 2, 0, 'major', [60, 64, 67]),
      region('r1', 2, 4, 7, 'major', [67, 71, 74]),
    ];
    const events = renderComping(timeline, 'comp_pop_01');
    for (let i = 1; i < events.length; i++) {
      expect(events[i].startTick).toBeGreaterThanOrEqual(
        events[i - 1].startTick,
      );
    }
  });
});

describe('applyComping', () => {
  it('adds a chords track without mutating the input document', () => {
    const timeline = [region('r0', 0, 1, 0, 'major', [60, 64, 67])];
    const doc = emptyDoc(timeline);
    const beforeTrackCount = doc.tracks.length;

    const out = applyComping(doc, 'comp_pop_01');

    expect(out.tracks.length).toBe(beforeTrackCount + 1);
    expect(doc.tracks.length).toBe(beforeTrackCount); // unchanged
    const added = out.tracks[out.tracks.length - 1];
    expect(added.role).toBe('chords');
    expect(added.id).toBe('unison-comping-comp_pop_01');
    expect(added.events.length).toBe(12);
  });

  it('returns a doc with empty events track when the pattern is unknown', () => {
    const doc = emptyDoc([region('r0', 0, 1, 0, 'major', [60, 64, 67])]);
    const out = applyComping(doc, 'comp_nope');
    const added = out.tracks[out.tracks.length - 1];
    expect(added.events).toEqual([]);
  });
});

describe('listCompingPatternsForGenre', () => {
  it('returns multiple Pop patterns', () => {
    const pop = listCompingPatternsForGenre('pop');
    expect(pop.length).toBeGreaterThan(5);
    expect(pop.every((p) => p.genreUse.toLowerCase().includes('pop'))).toBe(
      true,
    );
  });

  it('is case-insensitive', () => {
    const a = listCompingPatternsForGenre('JAZZ');
    const b = listCompingPatternsForGenre('jazz');
    expect(a.length).toBe(b.length);
  });

  it('returns empty for unknown genres', () => {
    expect(listCompingPatternsForGenre('klingon-folk')).toEqual([]);
  });
});
