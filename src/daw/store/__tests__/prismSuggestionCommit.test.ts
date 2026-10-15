import { beforeEach, describe, expect, it } from 'vitest';
import { MODES } from '@prism/engine';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { useStore, type AllSlices } from '../index';
import type { ChordRegion } from '../prismSlice';

// ── Prism Suggest Chords, through the store ────────────────────────────────
// Suggestions in a minor key are written with minor-key degrees, and a
// commit lays them over the chord lane without deleting the chords that only
// touch its window.

const BAR = 1920;
const A = 9;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const st = () => useStore.getState();

const chord = (
  id: string,
  startBar: number,
  endBar: number,
  extra: Partial<ChordRegion> = {},
): ChordRegion => ({
  id,
  startTick: startBar * BAR,
  endTick: endBar * BAR,
  name: '1 maj',
  noteName: 'C maj',
  color: [200, 120, 40],
  degreeKey: '1 major',
  ...extra,
});

beforeEach(() => {
  useStore.setState({
    chordRegions: [],
    rootNote: 0,
    mode: 'ionian',
  } as Partial<AllSlices>);
  st().closePrismSuggestion();
});

describe('Suggest Chords in A minor', () => {
  /** The pitch class a tonic-relative degree names in A: "b3 major" → C. */
  const fromA = (degree: string) => {
    const [, accidental, step] = /^([b#]?)([1-7])/.exec(degree)!;
    const shift = accidental === 'b' ? -1 : accidental === '#' ? 1 : 0;
    return (A + MODES.ionian[Number(step) - 1] + shift + 12) % 12;
  };
  /** The pitch class of a spelled chord's root: "Bb maj" → 10. */
  const rootOf = (noteName: string) =>
    noteNameToPitchClass(noteName.split(' ')[0]);

  it('continues from the Am already there and commits minor-key degrees', () => {
    useStore.setState({
      rootNote: A,
      mode: 'aeolian',
      chordRegions: [
        chord('am', 0, 1, {
          name: '1 min',
          noteName: 'A min',
          degreeKey: '1 minor',
        }),
      ],
    } as Partial<AllSlices>);

    st().openPrismSuggestion(BAR, 'track-1');
    const sets = st().prismSuggestSets;
    // What the graph lets follow vi (Am) in C major, counted from A. The old
    // engine dropped the Am and opened on an A-major chord instead.
    const afterAm = ['b3 major', '4 minor', '5 major/5', '5 sus4', 'b6 major'];
    for (const set of sets) {
      expect(afterAm).toContain(set.chords[0].degree);
      for (const c of set.chords)
        expect(rootOf(c.noteName)).toBe(fromA(c.degree));
    }

    const suggested = sets[0].chords;
    st().commitPrismSuggestion();
    const [am, ...written] = st().chordRegions;
    expect(am.id).toBe('am');
    expect(written.map((r) => r.degreeKey)).toEqual(
      suggested.map((c) => c.degree),
    );
    expect(written.map((r) => [r.startTick, r.endTick])).toEqual([
      [BAR, 2 * BAR],
      [2 * BAR, 3 * BAR],
      [3 * BAR, 4 * BAR],
      [4 * BAR, 5 * BAR],
    ]);
    for (const r of written) {
      expect(rootOf(r.noteName)).toBe(fromA(r.degreeKey!));
      expect(r.name).toBe(r.noteName);
      expect(r.id).toMatch(UUID);
    }
    expect(st().prismSuggestOpen).toBe(false);
  });
});

describe('Commit', () => {
  // Suggestions for bars 2–5 (ticks [BAR, 5 BAR)).
  const commitAtBar2 = () => {
    st().openPrismSuggestion(BAR, 'track-1');
    expect(st().prismSuggestSets[0].chords).toHaveLength(4);
    st().commitPrismSuggestion();
    return st().chordRegions;
  };

  it('keeps the parts of chords outside the window', () => {
    useStore.setState({
      chordRegions: [
        chord('before', 0, 2), // crosses the start
        chord('inside', 2, 3),
        chord('after', 4.5, 7, { rawStartTick: 4.5 * BAR }), // crosses the end
        chord('later', 8, 9),
      ],
    } as Partial<AllSlices>);

    const lane = commitAtBar2();
    expect(lane.find((r) => r.id === 'before')).toMatchObject({
      startTick: 0,
      endTick: BAR,
    });
    expect(lane.find((r) => r.id === 'inside')).toBeUndefined();
    const after = lane.find((r) => r.id === 'after');
    expect(after).toMatchObject({ startTick: 5 * BAR, endTick: 7 * BAR });
    // Its hit is now inside the suggestion, not under what is left of it.
    expect(after?.rawStartTick).toBeUndefined();
    expect(lane.find((r) => r.id === 'later')).toMatchObject({
      startTick: 8 * BAR,
      endTick: 9 * BAR,
    });
    expect(
      lane.filter((r) => r.startTick >= BAR && r.endTick <= 5 * BAR),
    ).toHaveLength(4);
  });

  it('splits a chord that spans the whole window around it', () => {
    useStore.setState({
      chordRegions: [chord('pad', 0, 8)],
    } as Partial<AllSlices>);

    const lane = commitAtBar2();
    const pads = lane.filter((r) => r.name === '1 maj');
    expect(pads.map((r) => [r.startTick, r.endTick])).toEqual([
      [0, BAR],
      [5 * BAR, 8 * BAR],
    ]);
    expect(pads[0].id).toBe('pad');
    expect(pads[1].id).not.toBe('pad');
    expect(lane.map((r) => r.startTick)).toEqual(
      [...lane.map((r) => r.startTick)].sort((a, b) => a - b),
    );
  });
});
