import { NOTES } from '@prism/engine';
import { describe, expect, it } from 'vitest';
import { sessionToUnison } from '@/unison/converters/sessionToUnison';
import {
  buildChordInsights,
  buildLiveChord,
  unisonChordLookup,
} from '../buildChordInsights';

// ── Where a chord card's lessons go (owner, 2026-10-24) ────────────────────
// A chord in the key opens its mode in the key's parent scale. One from
// outside opens the scale it comes from: a borrowed chord's place in its
// source mode on the song's tonic, a secondary dominant's in the key it
// points at (a minor target's harmonic minor), a minor key's V in its own
// harmonic minor. Roots and parents are spelled in that scale.

const STEPS: Record<string, number> = {
  '1': 0,
  b2: 1,
  '2': 2,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  b6: 8,
  '6': 9,
  b7: 10,
  '7': 11,
};

/** The cards for a chord lane in a key, read with its analysis. */
function cards(tonic: number, mode: string, degreeKeys: string[]) {
  const regions = degreeKeys.map((degreeKey, i) => {
    const [degree, quality] = degreeKey.split(' ');
    return {
      id: `r${i}`,
      startTick: i * 1920,
      endTick: (i + 1) * 1920,
      name: degreeKey,
      noteName: `${NOTES[(tonic + STEPS[degree]) % 12]} ${quality}`,
      degreeKey,
      color: [0, 0, 0] as [number, number, number],
    };
  });
  const doc = sessionToUnison({
    tracks: [],
    chordRegions: regions,
    bpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    rootNote: tonic,
    mode,
  } as never);
  return buildChordInsights(degreeKeys, tonic, mode, unisonChordLookup(doc));
}

/** A card as its lessons read: "A♭ lydian · E♭ ionian". */
const lessons = (c: {
  rootLetter: string;
  chordRootMode: string | null;
  parentKeyLetter: string | null;
  parentMode: string | null;
}) =>
  `${c.rootLetter} ${c.chordRootMode} · ${c.parentKeyLetter} ${c.parentMode}`;

describe('chords in the key', () => {
  it('open their mode in the key’s parent scale', () => {
    const [two, five, slash] = cards(0, 'ionian', [
      '2 minor',
      '5 sus4',
      '5 major/3',
    ]);
    expect(lessons(two)).toBe('D dorian · C ionian');
    expect(lessons(five)).toBe('G mixolydian · C ionian');
    // G/B: the bass below the root doesn't take it out of the key.
    expect(lessons(slash)).toBe('G mixolydian · C ionian');
  });
});

describe('borrowed chords', () => {
  it('open their place in the source mode on the song’s tonic', () => {
    const [flatSix, fourMinor] = cards(0, 'ionian', ['b6 major', '4 minor']);
    // From C Aeolian, whose parent is E♭ major.
    expect(lessons(flatSix)).toBe('A♭ lydian · E♭ ionian');
    expect(lessons(fourMinor)).toBe('F dorian · E♭ ionian');
    expect(flatSix.modalInterchange?.sourceMode).toBe('aeolian');
  });

  it('are spelled in the scale they come from', () => {
    // E♭ minor's 6 is C♭, its parent G♭ major.
    const [flatSix] = cards(3, 'ionian', ['b6 major']);
    expect(lessons(flatSix)).toBe('C♭ lydian · G♭ ionian');
  });

  it('take a minor key’s V and vii° from its own harmonic minor', () => {
    const [five, seven] = cards(9, 'aeolian', ['5 major', '7 diminished']);
    expect(five.modalInterchange?.sourceMode).toBe('harmonicMinor');
    expect(lessons(five)).toBe('E phrygianDominant · A harmonicMinor');
    expect(lessons(seven)).toBe('G♯ alteredDiminished · A harmonicMinor');
  });

  it('take Dorian’s V from its melodic minor', () => {
    const [five] = cards(2, 'dorian', ['5 major']);
    expect(lessons(five)).toBe('A mixolydianFlat6 · D melodicMinor');
  });
});

describe('secondary dominants', () => {
  it('read as the 5 of their target even when they don’t resolve', () => {
    const [d7, a7] = cards(0, 'ionian', ['2 dominant7', '6 dominant7']);
    expect(d7.modalInterchange?.secondaryTarget).toBe('5 of 5');
    expect(a7.modalInterchange?.secondaryTarget).toBe('5 of 2');
  });

  it('open their place in the key they point at', () => {
    const [d7, e7] = cards(0, 'ionian', ['2 dominant7', '3 dominant7']);
    // D7 → G major; E7 → A minor, read in A harmonic minor.
    expect(lessons(d7)).toBe('D mixolydian · G ionian');
    expect(lessons(e7)).toBe('E phrygianDominant · A harmonicMinor');
  });
});

describe('the live chord', () => {
  it('opens the same lessons as its card', () => {
    // E G♯ B in A minor: the V of A harmonic minor.
    const e = buildLiveChord([52, 56, 59], 9, 'aeolian')!;
    expect(lessons(e)).toBe('E phrygianDominant · A harmonicMinor');
    // G♯ B D: its vii°, spelled with the leading tone.
    const gSharp = buildLiveChord([56, 59, 62], 9, 'aeolian')!;
    expect(gSharp.rootLetter).toBe('G♯');
  });
});
