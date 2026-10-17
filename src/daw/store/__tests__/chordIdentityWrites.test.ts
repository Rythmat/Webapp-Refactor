/**
 * A chord region's identity (decision D3) never outlives the label it was
 * made for. A write that gives a region another chord brings that chord's
 * identity (one it is handed, else one read from the new labels, 'given':
 * the student named it); a key change carries the identity over to the
 * chord's new name; a write that only moves or resizes a region keeps it.
 * Analysis that changes a chord (a bass under it) drops it for the caller
 * to read again.
 *
 * Run: npx vitest run src/daw/store/__tests__/chordIdentityWrites.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import {
  identityIsCurrent,
  withoutIdentity,
  type ChordRegionIdentity,
} from '@/daw/harmony/chordIdentity';
import { useStore, type AllSlices } from '../index';
import {
  enrichWithBass,
  replaceChordRegionsInRange,
  type ChordRegion,
} from '../prismSlice';

const s = () => useStore.getState();
const BAR = 1920;

const identity = (label: string, rootPc = 0): ChordRegionIdentity => ({
  rootPc,
  quality: 'major',
  bassPc: rootPc,
  source: 'given',
  label,
});

/** C major in C, holding an identity that describes it. */
const cMajor = (id: string, startBar: number, endBar: number): ChordRegion => ({
  id,
  startTick: startBar * BAR,
  endTick: endBar * BAR,
  name: '1 maj',
  noteName: 'C maj',
  color: [200, 120, 40],
  degreeKey: '1 major',
  midis: [60, 64, 67],
  identity: identity('1 maj'),
});

const region = (id: string): ChordRegion => {
  const found = s().chordRegions.find((r) => r.id === id);
  if (!found) throw new Error(`no region ${id}`);
  return found;
};

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    rootNote: 0,
    chordRegions: [cMajor('a', 0, 1), cMajor('b', 1, 2), cMajor('c', 2, 4)],
  } as Partial<AllSlices>);
});

/** The identity a write reads from the labels the student gave a region. */
const given = (
  label: string,
  rootPc: number,
  quality = 'major',
): ChordRegionIdentity => ({
  rootPc,
  quality,
  bassPc: rootPc,
  source: 'given',
  label,
});

describe('writes that change the chord bring its identity', () => {
  it('renaming a chord', () => {
    s().renameChordRegion('b', 'Am', 'A min');
    expect(region('b').identity).toEqual(given('Am', 9, 'minor'));
    expect(region('a').identity).toEqual(identity('1 maj'));
  });

  it('renaming a chord to text that names none, which drops it', () => {
    s().renameChordRegion('b', 'hello', 'hello');
    expect(region('b').identity).toBeUndefined();
  });

  it('renaming a chord with the identity the writer read', () => {
    const typed = given('5 maj', 7);
    s().renameChordRegion('b', '5 maj', 'G maj', {
      degreeKey: '5 major',
      identity: typed,
    });
    expect(region('b')).toMatchObject({
      degreeKey: '5 major',
      identity: typed,
    });
  });

  it('dropping the degreeKey a rename leaves describing the old chord', () => {
    s().renameChordRegion('b', 'Am', 'A min');
    expect(region('b').degreeKey).toBeUndefined();
  });

  it('writing another chord on its first beat', () => {
    s().insertChordRegion(BAR, '5 maj', 'G maj');
    expect(region('b')).toMatchObject({ name: '5 maj', noteName: 'G maj' });
    expect(region('b').identity).toEqual(given('5 maj', 7));
  });

  it("the lead sheet's new chord over one: the name alone says too little", () => {
    // insertChordAt writes 'maj' with its root in noteName; a second one on
    // the same beat changes the chord while the name stays 'maj'.
    s().insertChordRegion(BAR, 'maj', 'C');
    useStore.setState({
      chordRegions: s().chordRegions.map((r) =>
        r.id === 'b' ? { ...r, identity: identity('maj') } : r,
      ),
    });
    s().insertChordRegion(BAR, 'maj', 'D');
    expect(region('b').identity).toEqual(given('maj', 2));
  });
});

describe('a key change', () => {
  it('carries each identity over to the chord’s new name', () => {
    s().setRootNote(7); // G: C major is now the 4 chord
    expect(region('a').name).toBe('4 maj');
    expect(s().chordRegions.map((r) => r.identity)).toEqual([
      identity('4 maj'),
      identity('4 maj'),
      identity('4 maj'),
    ]);
  });

  it('relabels a slash chord from its identity, bass and all', () => {
    useStore.setState({
      chordRegions: [
        {
          ...cMajor('slash', 0, 1),
          name: '5 maj/3',
          noteName: 'G maj/3',
          degreeKey: '5 major/3',
          identity: { ...given('5 maj/3', 7), bassPc: 11 },
        },
      ],
    });
    s().setRootNote(2); // D: G/B is IV over the key's 6th
    expect(region('slash')).toMatchObject({
      name: '4 maj/6',
      noteName: 'G maj/B',
      degreeKey: '4 major/3',
    });
    expect(region('slash').identity).toMatchObject({
      rootPc: 7,
      bassPc: 11,
      label: '4 maj/6',
    });
  });
});

describe('analysis that changes the chord drops its identity', () => {
  it('a bass under it that makes a slash chord, or names a chord from below', () => {
    const bassAt = (pitch: number, startTick = 0): MidiNoteEvent => ({
      note: pitch,
      velocity: 100,
      startTick,
      durationTicks: BAR,
      channel: 0,
    });
    // E under C major: C maj/E.
    const [slash] = enrichWithBass([cMajor('a', 0, 1)], [bassAt(40)], 60);
    expect(slash.noteName).toBe('C maj/E');
    expect(slash.identity).toBeUndefined();

    // D under F-A-C-E: D min9, named from the bass.
    const rootless: ChordRegion = {
      ...cMajor('r', 0, 1),
      name: '4 maj7',
      noteName: 'F maj7',
      midis: [65, 69, 72, 76],
      identity: identity('4 maj7', 5),
    };
    const [fromBelow] = enrichWithBass([rootless], [bassAt(38)], 60);
    expect(fromBelow.noteName).toBe('D min9');
    expect(fromBelow.identity).toBeUndefined();

    // A♭ under G♭-C-F: A♭13 played 1-3-♭7-13 (no 5th, no 9th) — a chord
    // with tones left out, not "F susb2/A♭" (an exotic chord over a bass).
    const ab13: ChordRegion = {
      ...cMajor('t', 0, 1),
      name: '4 susb2',
      noteName: 'F susb2',
      midis: [54, 60, 65],
    };
    const [thirteenth] = enrichWithBass([ab13], [bassAt(44)], 60, 'aeolian');
    expect(thirteenth.noteName).toBe('Ab dom13');

    // F-A-C over G stays F maj/G: an add9 with its 9th in the bass is no
    // simpler than the slash chord everyone writes.
    const fOverG: ChordRegion = {
      ...cMajor('g', 0, 1),
      name: '4 maj',
      noteName: 'F maj',
      midis: [65, 69, 72],
    };
    const [upper] = enrichWithBass([fOverG], [bassAt(43)], 60);
    expect(upper.noteName).toBe('F maj/G');
  });
});

describe('writes that leave the chord alone keep it', () => {
  it('a rename or a rewrite on its first beat to the same labels', () => {
    const before = region('b');
    s().renameChordRegion('b', '1 maj', 'C maj');
    s().insertChordRegion(BAR, '1 maj', 'C maj', [1, 2, 3]);
    expect(region('b').identity).toBe(before.identity);
    expect(identityIsCurrent(region('b'))).toBe(true);
  });

  it('a key change that keeps its name, and one that relabels a placeholder', () => {
    useStore.setState({
      chordRegions: [
        cMajor('a', 0, 1),
        // The lead sheet's old placeholder label: noteName has no quality.
        {
          ...cMajor('typed', 1, 2),
          name: 'maj',
          noteName: 'C',
          identity: identity('maj'),
        },
      ],
    });
    s().setRootNote(0); // the same key again
    expect(region('a').identity).toEqual(identity('1 maj'));
    s().setRootNote(7);
    // The identity says the chord, so it gets the lane's labels in G.
    expect(region('typed')).toMatchObject({ name: '4 maj', noteName: 'C maj' });
    expect(region('typed').identity).toEqual(identity('4 maj'));
  });

  it('moving, resizing, shifting and deleting around it', () => {
    s().moveChordRegion('c', 2.5 * BAR);
    s().resizeChordRegion('a', 0.75 * BAR);
    s().insertMeasures(0);
    s().deleteChordRegion('b'); // the region before it grows into the gap
    expect(s().chordRegions.map((r) => [r.id, r.identity])).toEqual([
      ['a', identity('1 maj')],
      ['c', identity('1 maj')],
    ]);
  });

  it('splitting it with a chord written inside it', () => {
    s().insertChordRegion(3 * BAR, '5 maj', 'G maj');
    const [head, inserted] = s().chordRegions.filter(
      (r) => r.startTick >= 2 * BAR,
    );
    expect(head).toMatchObject({ id: 'c', endTick: 3 * BAR });
    expect(head.identity).toEqual(identity('1 maj'));
    expect(inserted.identity).toEqual(given('5 maj', 7));
  });

  it('cutting a measure out of it, or laying chords over part of it', () => {
    s().deleteMeasures(3); // c loses its second bar
    expect(region('c')).toMatchObject({ startTick: 2 * BAR, endTick: 3 * BAR });
    expect(region('c').identity).toEqual(identity('1 maj'));

    const lane = replaceChordRegionsInRange(
      [cMajor('long', 0, 4)],
      [],
      BAR,
      2 * BAR,
    );
    expect(lane.map((r) => r.identity)).toEqual([
      identity('1 maj'),
      identity('1 maj'),
    ]);
  });

  it('keeping the region whole through setChordRegions', () => {
    s().setChordRegions([cMajor('x', 0, 1)], true);
    expect(region('x').identity).toEqual(identity('1 maj'));
  });
});

describe('setChordRegions fills what has none', () => {
  it('reads one from the labels, as derived unless the caller says', () => {
    const bare = withoutIdentity(cMajor('x', 0, 1));
    s().setChordRegions([bare], true);
    expect(region('x').identity).toEqual({
      ...identity('1 maj'),
      source: 'derived',
    });
    s().setChordRegions([{ ...bare, id: 'y' }], true, 'given');
    expect(region('y').identity).toEqual(identity('1 maj'));
  });

  it('leaves a region whose labels name no chord without one', () => {
    s().setChordRegions(
      [
        {
          ...cMajor('n', 0, 1),
          name: 'N.C.',
          noteName: 'N.C.',
          degreeKey: undefined,
          identity: undefined,
        },
      ],
      true,
    );
    expect(region('n').identity).toBeUndefined();
  });
});

describe('marking a chord as melody', () => {
  it('takes it out of the lane and writes nothing else', () => {
    const before = s();
    s().markAsMelody('b');
    expect(s().chordRegions.map((r) => r.id)).toEqual(['a', 'c']);
    const changed = (Object.keys(before) as (keyof AllSlices)[]).filter(
      (key) => s()[key] !== before[key],
    );
    expect(changed).toEqual(['chordRegions']);
    expect('melodyOverrides' in s()).toBe(false);
  });

  it('leaves the store as it is for a chord that is gone', () => {
    const before = s();
    s().markAsMelody('nope');
    expect(s()).toBe(before);
  });
});
