import { describe, expect, it } from 'vitest';
import { getChordColor } from '../colorSystem';
import {
  analyzeChordStyle,
  extractGraphSeed,
  generateSuggestions,
  longQuality,
  type SuggestionSet,
} from '../suggestionEngine';

// ── Suggestions follow the key's mode ──────────────────────────────────────
// The progression graph is written in the parent major key, while chord
// regions count their degrees from the key's own tonic. Neither side used to
// be converted, so an A-minor project got A-major progressions (C#, F#, G#),
// and an Am already in the lane ("1 minor") was no graph key and was dropped.

const A = 9;
const D = 2;
const C = 0;
const BAR = 1920;
/** A natural minor: A B C D E F G. */
const A_MINOR = new Set([9, 11, 0, 2, 4, 5, 7]);
/** The style of an empty lane: plain triads. */
const TRIADS = analyzeChordStyle([]);

const region = (degreeKey: string | undefined, name: string, bar = 0) => ({
  startTick: bar * BAR,
  endTick: (bar + 1) * BAR,
  name,
  noteName: name,
  degreeKey,
});

const byLabel = (sets: SuggestionSet[], label: string) =>
  sets.find((set) => set.label === label)!;
const pitchClasses = (set: SuggestionSet) =>
  set.chords.flatMap((chord) => chord.midi.map((note) => note % 12));

describe('suggestions in A aeolian', () => {
  const sets = generateSuggestions([], A, 'aeolian', TRIADS, 4);
  const mostCommon = byLabel(sets, 'Most Common');

  it('open on the tonic and stay in A minor', () => {
    expect(mostCommon.chords.map((c) => c.noteName)).toEqual([
      'A min',
      'C maj',
      'F maj',
      'D min',
    ]);
    expect(mostCommon.chords[0].midi.map((n) => n % 12)).toEqual([9, 0, 4]);
    for (const label of ['Most Common', 'Variation B']) {
      for (const pc of pitchClasses(byLabel(sets, label))) {
        expect(A_MINOR.has(pc)).toBe(true);
      }
    }
  });

  it('count their degrees from A, as chord regions do', () => {
    expect(mostCommon.chords.map((c) => c.degree)).toEqual([
      '1 minor',
      'b3 major',
      'b6 major',
      '4 minor',
    ]);
    expect(mostCommon.chords.map((c) => c.quality)).toEqual([
      'minor',
      'major',
      'major',
      'minor',
    ]);
  });

  it('colour each chord as the key colours it, not as out of key', () => {
    const [am, cMajor] = mostCommon.chords;
    // The live chord colour reads a tonic-relative degree in the mode...
    expect(am.color).toEqual(getChordColor('1 minor', 57, 'aeolian'));
    // ...and Prism's own chords are coloured from the parent root.
    expect(am.color).toEqual(getChordColor('6 minor', 48));
    expect(cMajor.color).toEqual(getChordColor('b3 major', 57, 'aeolian'));
  });
});

describe('seeds from the chord lane', () => {
  it("read an Am region in A aeolian as the graph's vi", () => {
    expect(
      extractGraphSeed([region('1 minor', '1 min')], BAR, A, 'aeolian'),
    ).toEqual(['6 minor']);
  });

  it('read a degree-named region without a degreeKey the same way', () => {
    expect(
      extractGraphSeed([region(undefined, '1 min')], BAR, A, 'aeolian'),
    ).toEqual(['6 minor']);
  });

  it("read a G region in D dorian as the graph's V, not IV", () => {
    expect(
      extractGraphSeed([region('4 major', '4 maj')], BAR, D, 'dorian'),
    ).toEqual(['5 major']);
  });

  it('carry on from the chords already there, in the key', () => {
    const seed = extractGraphSeed(
      [region('1 minor', '1 min')],
      BAR,
      A,
      'aeolian',
    );
    const [first] = generateSuggestions(seed, A, 'aeolian', TRIADS, 4);
    expect(first.chords.map((c) => c.noteName)).toEqual([
      'C maj',
      'F maj',
      'D min',
      'G maj',
    ]);
    expect(first.chords.map((c) => c.degree)).toEqual([
      'b3 major',
      'b6 major',
      '4 minor',
      'b7 major',
    ]);
  });
});

describe('Ionian', () => {
  it('suggests exactly what it did before modes were handled', () => {
    const mostCommon = byLabel(
      generateSuggestions([], C, 'ionian', TRIADS, 4),
      'Most Common',
    );
    expect(mostCommon.chords.map((c) => c.degree)).toEqual([
      '1 major',
      '2 minor',
      '3 minor',
      '4 major',
    ]);
    expect(mostCommon.chords.map((c) => c.noteName)).toEqual([
      'C maj',
      'D min',
      'E min',
      'F maj',
    ]);
    expect(
      extractGraphSeed([region('5 major', '5 maj')], BAR, C, 'ionian'),
    ).toEqual(['5 major']);
  });
});

// ── The style is read from what the chords are ────────────────────────────
// It used to classify each region's display name ('1 maj', '5 dom7'), which
// no quality set holds, so every real lane counted as extended and
// suggestions preferred slash chords (prism-engine-01).

describe('the style of a lane', () => {
  it('counts triads and sevenths from the lane’s own labels', () => {
    const style = analyzeChordStyle([
      region('1 major', '1 maj', 0),
      region('5 dominant7', '5 dom7', 1),
      region(undefined, '6 min', 2),
      region(undefined, '4 maj7', 3),
    ]);
    expect([style.triadRatio, style.seventhRatio, style.extendedRatio]).toEqual(
      [0.5, 0.5, 0],
    );
    expect(style.preferredQualities).toEqual(
      expect.arrayContaining(['major', 'dominant7', 'minor', 'major7']),
    );
  });

  it("reads a region's identity first, and an engine slash chord as its triad", () => {
    const style = analyzeChordStyle([
      {
        ...region(undefined, 'whatever', 0),
        identity: { quality: 'minor7', label: 'whatever' },
      },
      region('1 major/5', '1 maj/5', 1),
    ]);
    expect([style.triadRatio, style.seventhRatio]).toEqual([0.5, 0.5]);
  });

  it('keeps an all-triad song on triads, not slash chords', () => {
    const style = analyzeChordStyle([
      region('1 major', '1 maj', 0),
      region('4 major', '4 maj', 1),
      region('5 major', '5 maj', 2),
      region('1 major', '1 maj', 3),
    ]);
    const mostCommon = byLabel(
      generateSuggestions(['1 major'], C, 'ionian', style, 4),
      'Most Common',
    );
    expect(mostCommon.chords.every((c) => !c.quality.includes('/'))).toBe(true);
  });

  it('writes short qualities out long, as the graph does', () => {
    expect(
      ['dom7', 'min7b5', 'maj/3', 'minmaj7', 'dim7', 'aug', 'dominant7'].map(
        longQuality,
      ),
    ).toEqual([
      'dominant7',
      'minor7b5',
      'major/3',
      'minormajor7',
      'diminished7',
      'augmented',
      'dominant7',
    ]);
    expect(
      extractGraphSeed([region(undefined, '5 dom7')], BAR, C, 'ionian'),
    ).toEqual(['5 dominant7']);
  });
});
