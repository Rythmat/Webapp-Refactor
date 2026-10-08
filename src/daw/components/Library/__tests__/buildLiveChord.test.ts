import { describe, expect, it } from 'vitest';
import {
  CHORDS,
  degreeMidi,
  generateChord,
  resolveDegreeKey,
  unstepChord,
} from '@prism/engine';
import { buildChordInsights, buildLiveChord } from '../buildChordInsights';

// ── Insight's live chord is built by the same code as its chord cards ─────
// InsightContent re-implemented the degree, colour, modes and alternatives
// the cards get from buildChordInsights (insight-21). buildLiveChord now
// shares that code, so a played chord and a written one read the same.

const C = 0;
const A = 9;
const D = 2;
const none = new Map();

describe('buildLiveChord', () => {
  it('needs two notes that make a known chord', () => {
    expect(buildLiveChord([], C, 'ionian')).toBeNull();
    expect(buildLiveChord([60], C, 'ionian')).toBeNull();
    expect(buildLiveChord(new Set([60, 64, 67]), C, 'ionian')).not.toBeNull();
  });

  it('names a root-position chord in the key', () => {
    const chord = buildLiveChord([60, 64, 67], C, 'ionian')!;
    expect(chord).toEqual(
      expect.objectContaining({
        chordLabel: 'C maj',
        hybrid: '1 maj',
        quality: 'major',
        inversion: 0,
        rootLetter: 'C',
        noteNames: ['C', 'E', 'G'],
        intervals: 'R 3 5',
        chordRootMode: 'ionian',
        sessionMode: 'ionian',
        isSessionParent: true,
      }),
    );
  });

  it('says which inversion is held', () => {
    expect(buildLiveChord([64, 67, 72], C, 'ionian')!.chordLabel).toBe(
      'C maj (1st Inversion)',
    );
    expect(buildLiveChord([67, 72, 76], C, 'ionian')!.chordLabel).toBe(
      'C maj (2nd Inversion)',
    );
  });

  it('never prints an inversion it has no word for', () => {
    // C9 with its 9th (D) in the bass is its fourth inversion, which used to
    // read "C dom9 (undefined)".
    const ninth = CHORDS.dominant9.map((v) => 48 + v);
    const chord = buildLiveChord(
      [ninth[4] - 24, ...ninth.slice(0, 4)],
      C,
      'ionian',
    )!;
    expect(chord.inversion).toBe(4);
    expect(chord.chordLabel).toBe('C dom9');
  });

  it('reads the chord alone when no key is set', () => {
    const chord = buildLiveChord([62, 65, 69], null, 'ionian')!;
    expect(chord).toEqual(
      expect.objectContaining({
        chordLabel: 'D min',
        hybrid: null,
        color: null,
        chordRootMode: null,
        sessionMode: null,
        parentKeyLetter: null,
        parentMode: null,
        isSessionParent: true,
        alternatives: [],
      }),
    );
  });

  it.each([
    [C, 'ionian', '1 major'],
    [C, 'ionian', '2 minor'],
    [C, 'ionian', '5 dominant7'],
    [C, 'ionian', '6 minor7'],
    [C, 'ionian', '7 minor7b5'],
    [C, 'ionian', 'b7 major'],
    [A, 'aeolian', '1 minor'],
    [A, 'aeolian', 'b3 major'],
    [A, 'aeolian', 'b7 major'],
    [D, 'dorian', '4 dominant7'],
  ])(
    'agrees with the chord card in key %i %s for %s',
    (rootNote, mode, degreeName) => {
      const quality = unstepChord(degreeName);
      const bass = degreeMidi(rootNote + 48, degreeName);
      // The live chord reads its degree the way the live colours do.
      expect(resolveDegreeKey(bass % 12, quality, rootNote)).toBe(degreeName);

      const [card] = buildChordInsights([degreeName], rootNote, mode, none);
      const live = buildLiveChord(
        generateChord(bass, quality),
        rootNote,
        mode,
      )!;

      expect(live.quality).toBe(card.quality);
      expect({
        hybrid: live.hybrid,
        color: live.color,
        chordRootMode: live.chordRootMode,
        sessionMode: live.sessionMode,
        parentKeyLetter: live.parentKeyLetter,
        parentMode: live.parentMode,
        isSessionParent: live.isSessionParent,
        alternatives: live.alternatives,
      }).toEqual({
        hybrid: card.hybrid,
        color: card.color,
        chordRootMode: card.chordRootMode,
        sessionMode: card.sessionMode,
        parentKeyLetter: card.parentKeyLetter,
        parentMode: card.parentMode,
        isSessionParent: card.isSessionParent,
        alternatives: card.alternatives,
      });
    },
  );
});
