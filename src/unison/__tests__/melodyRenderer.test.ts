import { describe, it, expect } from 'vitest';
import {
  renderMelody,
  applyMelody,
  type MelodyConfig,
} from '../engine/melodyRenderer';
import type { UnisonChordRegion, UnisonDocument } from '../types/schema';

const PPQ = 480;
const BAR = 4 * PPQ; // 1920

function region(
  id: string,
  startBar: number,
  endBar: number,
): UnisonChordRegion {
  return {
    id,
    startTick: startBar * BAR,
    endTick: endBar * BAR,
    rootPc: 0,
    quality: 'major',
    noteName: '',
    degree: '1',
    hybridName: '1 major',
    romanNumeral: 'I',
    color: [0, 0, 0],
    inversion: 0,
    confidence: 1,
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

const POP_PENTATONIC: MelodyConfig = {
  scale: [0, 2, 4, 7, 9], // major pentatonic
  contourNotes: [3],
  contourTiers: [1],
  zeroPoint: 0,
  phraseRhythmGenre: 'pop',
  phraseRhythmBars: 1,
};

describe('renderMelody', () => {
  it('emits at least one event per chord region when the config has matches', () => {
    const timeline = [region('r0', 0, 1), region('r1', 1, 2)];
    const events = renderMelody(timeline, 0, POP_PENTATONIC);
    expect(events.length).toBeGreaterThan(0);
    // Each region should contribute at least one event.
    const r0Events = events.filter((e) => e.startTick < BAR);
    const r1Events = events.filter(
      (e) => e.startTick >= BAR && e.startTick < 2 * BAR,
    );
    expect(r0Events.length).toBeGreaterThan(0);
    expect(r1Events.length).toBeGreaterThan(0);
  });

  it('is deterministic given a fixed seed and identical inputs', () => {
    const timeline = [region('r0', 0, 1), region('r1', 1, 2)];
    const a = renderMelody(timeline, 0, POP_PENTATONIC, { seed: 7 });
    const b = renderMelody(timeline, 0, POP_PENTATONIC, { seed: 7 });
    expect(a.map((e) => [e.pitch, e.startTick, e.durationTicks])).toEqual(
      b.map((e) => [e.pitch, e.startTick, e.durationTicks]),
    );
  });

  it('varies the phrase across regions (seed offset by region index)', () => {
    const timeline = [region('r0', 0, 1), region('r1', 1, 2)];
    const events = renderMelody(timeline, 0, POP_PENTATONIC, { seed: 0 });
    const r0Pitches = events
      .filter((e) => e.startTick < BAR)
      .map((e) => e.pitch);
    const r1Pitches = events
      .filter((e) => e.startTick >= BAR)
      .map((e) => e.pitch);
    // The two regions should differ in at least one pitch or timing.
    expect(r0Pitches.join(',') === r1Pitches.join(',')).toBe(false);
  });

  it('places pitches within the configured scale (relative to key root + base octave)', () => {
    const timeline = [region('r0', 0, 1)];
    const events = renderMelody(timeline, 0, POP_PENTATONIC);
    // Major pentatonic from C5 (72): { 72, 74, 76, 79, 81 } + octave wraps.
    const validPitchClasses = new Set([0, 2, 4, 7, 9]);
    for (const e of events) {
      expect(validPitchClasses.has(e.pitch % 12)).toBe(true);
    }
  });

  it('transposes when keyRootPc changes', () => {
    const timeline = [region('r0', 0, 1)];
    const c = renderMelody(timeline, 0, POP_PENTATONIC, { seed: 3 });
    const g = renderMelody(timeline, 7, POP_PENTATONIC, { seed: 3 });
    // Same seed, same config — pitches should differ by exactly 7 semitones.
    expect(g.length).toBe(c.length);
    for (let i = 0; i < c.length; i++) {
      expect(g[i].pitch - c[i].pitch).toBe(7);
    }
  });

  it('honours a custom baseOctaveMidi', () => {
    const timeline = [region('r0', 0, 1)];
    const high = renderMelody(timeline, 0, POP_PENTATONIC, {
      baseOctaveMidi: 84,
    });
    const low = renderMelody(timeline, 0, POP_PENTATONIC, {
      baseOctaveMidi: 60,
    });
    // Default 72 → C5 anchored. Shifting up by 12 should add 12 to every pitch.
    expect(high.length).toBe(low.length);
    for (let i = 0; i < low.length; i++) {
      expect(high[i].pitch - low[i].pitch).toBe(24);
    }
  });

  it('returns empty array when no rhythm matches the genre/noteCount', () => {
    const timeline = [region('r0', 0, 1)];
    const events = renderMelody(timeline, 0, {
      ...POP_PENTATONIC,
      phraseRhythmGenre: 'thisgenredoesnotexist',
    });
    expect(events).toEqual([]);
  });

  it('returns empty array on empty timeline', () => {
    expect(renderMelody([], 0, POP_PENTATONIC)).toEqual([]);
  });

  it('emits events sorted by startTick', () => {
    const timeline = [region('r0', 0, 2), region('r1', 2, 4)];
    const events = renderMelody(timeline, 0, POP_PENTATONIC);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].startTick).toBeGreaterThanOrEqual(
        events[i - 1].startTick,
      );
    }
  });

  it('clips events that would extend past the region end', () => {
    const timeline = [region('r0', 0, 1)];
    const events = renderMelody(timeline, 0, POP_PENTATONIC);
    for (const e of events) {
      expect(e.startTick + e.durationTicks).toBeLessThanOrEqual(BAR);
    }
  });

  it('zeroPoint shifts the starting scale index (and hence absolute pitch)', () => {
    const timeline = [region('r0', 0, 1)];
    const z0 = renderMelody(timeline, 0, POP_PENTATONIC, { seed: 5 });
    const z1 = renderMelody(
      timeline,
      0,
      { ...POP_PENTATONIC, zeroPoint: 1 },
      { seed: 5 },
    );
    // Same seed, same scale, but zeroPoint moves the anchor up to scale[1] = 2.
    // Every pitch should rise by 2 semitones (or by an octave-adjusted amount
    // if the wrap kicks in).
    expect(z1.length).toBe(z0.length);
    // At least the first pitch should be exactly 2 semitones higher.
    expect(z1[0].pitch - z0[0].pitch).toBe(2);
  });
});

describe('renderMelody — directionFilter (vibe-aware contour selection)', () => {
  const SINGLE_BAR_C_MAJOR = [region('r0', 0, 1)];

  function pitchesInOrder(events: ReturnType<typeof renderMelody>): number[] {
    return [...events]
      .sort((a, b) => a.startTick - b.startTick)
      .map((e) => e.pitch);
  }

  it('limits contour selection to ascending when filter = ["ascending"]', () => {
    const events = renderMelody(SINGLE_BAR_C_MAJOR, 0, {
      ...POP_PENTATONIC,
      directionFilter: ['ascending'],
    });
    const p = pitchesInOrder(events);
    for (let i = 1; i < p.length; i++) {
      expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]);
    }
  });

  it('limits contour selection to descending when filter = ["descending"]', () => {
    const events = renderMelody(SINGLE_BAR_C_MAJOR, 0, {
      ...POP_PENTATONIC,
      directionFilter: ['descending'],
    });
    const p = pitchesInOrder(events);
    for (let i = 1; i < p.length; i++) {
      expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
    }
  });

  it('limits contour selection to static (constant pitch) when filter = ["static"]', () => {
    // 3-note pentatonic at pop L1 tier 1 has static contours.
    const events = renderMelody(SINGLE_BAR_C_MAJOR, 0, {
      ...POP_PENTATONIC,
      directionFilter: ['static'],
    });
    const p = pitchesInOrder(events);
    if (p.length >= 2) {
      const all = new Set(p);
      expect(all.size).toBe(1);
    }
  });

  it('no filter → contour direction is unconstrained (default behaviour preserved)', () => {
    const a = renderMelody(SINGLE_BAR_C_MAJOR, 0, POP_PENTATONIC, { seed: 0 });
    const b = renderMelody(
      SINGLE_BAR_C_MAJOR,
      0,
      {
        ...POP_PENTATONIC,
        directionFilter: [],
      },
      { seed: 0 },
    );
    // Empty array filter == undefined filter: results identical.
    expect(a.map((e) => e.pitch)).toEqual(b.map((e) => e.pitch));
  });

  it('gracefully falls back when the filter would eliminate all candidates', () => {
    const events = renderMelody(SINGLE_BAR_C_MAJOR, 0, {
      ...POP_PENTATONIC,
      directionFilter: ['this-is-not-a-real-direction'],
    });
    // Should still emit notes (falls back to unfiltered pool), not crash or skip.
    expect(events.length).toBeGreaterThan(0);
  });
});

describe('applyMelody', () => {
  it('adds a melody track without mutating the input document', () => {
    const doc = emptyDoc([region('r0', 0, 1)]);
    const beforeCount = doc.tracks.length;
    const out = applyMelody(doc, POP_PENTATONIC);
    expect(out.tracks.length).toBe(beforeCount + 1);
    expect(doc.tracks.length).toBe(beforeCount);

    const added = out.tracks[out.tracks.length - 1];
    expect(added.role).toBe('melody');
    expect(added.id).toBe('unison-melody-pop');
    expect(added.events.length).toBeGreaterThan(0);
  });

  it('uses the document key root automatically', () => {
    const doc = emptyDoc([region('r0', 0, 1)]);
    // Doc key is C (rootPc=0). Apply with default options.
    const out = applyMelody(doc, POP_PENTATONIC, { seed: 1 });
    const fromApply = out.tracks[out.tracks.length - 1].events;
    const fromRender = renderMelody(
      doc.analysis.chordTimeline,
      doc.analysis.key.rootPc,
      POP_PENTATONIC,
      { seed: 1 },
    );
    expect(fromApply.map((e) => e.pitch)).toEqual(
      fromRender.map((e) => e.pitch),
    );
  });
});
