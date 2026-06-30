import { describe, it, expect } from 'vitest';
import { arrangeForStyle } from '../engine/arrangeForStyle';
import type { UnisonChordRegion, UnisonDocument } from '../types/schema';

const PPQ = 480;
const BAR = 4 * PPQ; // 1920

function region(
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

function docFromTimeline(timeline: UnisonChordRegion[]): UnisonDocument {
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

const SAMPLE_TIMELINE: UnisonChordRegion[] = [
  region('r0', 0, 1, 0, 'major'),
  region('r1', 1, 2, 9, 'minor'),
  region('r2', 2, 3, 5, 'major'),
  region('r3', 3, 4, 7, 'major'),
];

describe('arrangeForStyle — happy paths', () => {
  it('arranges "advanced funk" by adding bass / drums / melody tracks', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out, parsed } = arrangeForStyle(doc, 'advanced funk');

    expect(parsed?.primaryGenre).toBe('FUNK');
    expect(parsed?.level).toBe('L3');

    // FUNK_L3 doesn't list compingPatterns, so the chords track is correctly skipped.
    const roles = out.tracks.map((t) => t.role);
    expect(roles).toContain('bass');
    expect(roles).toContain('drums');
    expect(roles).toContain('melody');
  });

  it('arranges "pop" by adding chords + bass + drums + melody (POP_L2 has comping)', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out } = arrangeForStyle(doc, 'pop');
    const roles = out.tracks.map((t) => t.role).sort();
    expect(roles).toEqual(['bass', 'chords', 'drums', 'melody']);
  });

  it('populates voicingNotes on chord regions for genres the taxonomy covers', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out } = arrangeForStyle(doc, 'pop'); // POP L2 covers major + minor.
    const withVoicings = out.analysis.chordTimeline.filter(
      (c) => c.voicingNotes,
    );
    expect(withVoicings.length).toBeGreaterThan(0);
  });

  it('uses the modifier genre for drums and the primary for melody on "pop jazz"', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out, parsed } = arrangeForStyle(doc, 'pop jazz');

    expect(parsed?.primaryGenre).toBe('JAZZ');
    expect(parsed?.modifierGenre).toBe('POP');

    // Drum track id comes from the modifier — POP → "Pop".
    const drum = out.tracks.find((t) => t.role === 'drums');
    expect(drum?.id).toBe('unison-drums-Pop');

    // Melody track id is tagged with the primary's phraseRhythmGenre — for JAZZ this is 'jazz'.
    const melody = out.tracks.find((t) => t.role === 'melody');
    expect(melody?.id).toContain('jazz');
  });

  it('renders the rhythm section from the primary when no modifier is present', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out } = arrangeForStyle(doc, 'funk');
    const drum = out.tracks.find((t) => t.role === 'drums');
    expect(drum?.id).toBe('unison-drums-Funk');
  });

  it('is deterministic with the same input + same seed', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const a = arrangeForStyle(doc, 'pop jazz', { seed: 7 }).doc;
    const b = arrangeForStyle(doc, 'pop jazz', { seed: 7 }).doc;
    expect(a.tracks.map((t) => t.events.length)).toEqual(
      b.tracks.map((t) => t.events.length),
    );
    // Spot-check: melody event pitches identical.
    const aMelody = a.tracks
      .find((t) => t.role === 'melody')!
      .events.map((e) => e.pitch);
    const bMelody = b.tracks
      .find((t) => t.role === 'melody')!
      .events.map((e) => e.pitch);
    expect(aMelody).toEqual(bMelody);
  });

  it('different vibes change the seed enough to vary at least one track', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const a = arrangeForStyle(doc, 'pop').doc;
    const b = arrangeForStyle(doc, 'dark pop').doc;
    // Track structure unchanged (4 added).
    expect(a.tracks.length).toBe(b.tracks.length);
    // Pattern IDs differ for at least one of the seed-driven pools.
    const aIds = a.tracks.map((t) => t.id).sort();
    const bIds = b.tracks.map((t) => t.id).sort();
    expect(aIds.join('|')).not.toBe(bIds.join('|'));
  });
});

describe('arrangeForStyle — parse failures', () => {
  it('returns the input doc unchanged when the phrase has no genre', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out, parsed } = arrangeForStyle(doc, 'klingon opera');
    expect(parsed).toBeNull();
    expect(out).toBe(doc); // same reference
    expect(out.tracks.length).toBe(0);
  });

  it('throws on unrecognized input when strict: true', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    expect(() =>
      arrangeForStyle(doc, 'klingon opera', { strict: true }),
    ).toThrow();
  });
});

describe('arrangeForStyle — vibe-driven melody direction', () => {
  function melodyPitchesByRegion(doc: UnisonDocument): number[][] {
    const melody = doc.tracks.find((t) => t.role === 'melody');
    if (!melody) return [];
    // Group events by chord region (each region is one bar in SAMPLE_TIMELINE).
    const byRegion: number[][] = [];
    for (const region of doc.analysis.chordTimeline) {
      const inRegion = melody.events
        .filter(
          (e) =>
            e.startTick >= region.startTick && e.startTick < region.endTick,
        )
        .sort((a, b) => a.startTick - b.startTick)
        .map((e) => e.pitch);
      byRegion.push(inRegion);
    }
    return byRegion;
  }

  it('different vibe directions ("happy" vs "dark") produce different melodies', () => {
    // The library tags contours by general tendency, not strict monotonicity
    // — so the cleanest property test is that swapping vibe direction
    // changes the chosen contours, which surfaces as a different pitch
    // sequence at the same seed.
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const happy = arrangeForStyle(doc, 'happy pop').doc;
    const dark = arrangeForStyle(doc, 'dark pop').doc;

    const happyPitches = happy.tracks
      .find((t) => t.role === 'melody')!
      .events.map((e) => e.pitch);
    const darkPitches = dark.tracks
      .find((t) => t.role === 'melody')!
      .events.map((e) => e.pitch);

    expect(happyPitches).not.toEqual(darkPitches);
  });

  it('"happy pop" melodies end at or above their starting pitch per region', () => {
    // Loose direction check: an "ascending"-filtered contour ends with a
    // net-upward gesture even if it dips in the middle.
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out } = arrangeForStyle(doc, 'happy pop');
    const regions = melodyPitchesByRegion(out);
    expect(regions.length).toBeGreaterThan(0);
    let netUpRegions = 0;
    for (const pitches of regions) {
      if (pitches.length >= 2 && pitches[pitches.length - 1] >= pitches[0]) {
        netUpRegions++;
      }
    }
    // At least one region should net-ascend (the filter is doing its job).
    expect(netUpRegions).toBeGreaterThan(0);
  });

  it('bare "pop" with no vibe imposes no direction constraint', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out } = arrangeForStyle(doc, 'pop');
    // Just confirm a melody track was produced — the assertion is the
    // absence of crash / empty output, not a specific direction.
    const melody = out.tracks.find((t) => t.role === 'melody');
    expect(melody?.events.length).toBeGreaterThan(0);
  });
});

describe('arrangeForStyle — composition with the rest of UNISON', () => {
  it('does not mutate the input document', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const beforeTracks = doc.tracks.length;
    const beforeTimeline = JSON.stringify(doc.analysis.chordTimeline);

    arrangeForStyle(doc, 'advanced funk');

    expect(doc.tracks.length).toBe(beforeTracks);
    expect(JSON.stringify(doc.analysis.chordTimeline)).toBe(beforeTimeline);
  });

  it('preserves analysis fields (key, progressionMatches) from the input doc', () => {
    const doc = docFromTimeline(SAMPLE_TIMELINE);
    const { doc: out } = arrangeForStyle(doc, 'pop');
    expect(out.analysis.key).toEqual(doc.analysis.key);
    expect(out.analysis.progressionMatches).toEqual(
      doc.analysis.progressionMatches,
    );
  });
});
