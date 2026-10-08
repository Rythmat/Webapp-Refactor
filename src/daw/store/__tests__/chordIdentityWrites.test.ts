/**
 * A chord region's identity (decision D3) never outlives the label it was
 * made for. Milestone 1.3 only keeps identities as they come (1.16a fills
 * them in), so every write that changes which chord a region holds, or the
 * name its identity describes, drops it; a write that only moves or resizes
 * a region keeps it. That way a 1.16a identity can't describe the wrong
 * chord after an edit in this build.
 *
 * Run: npx vitest run src/daw/store/__tests__/chordIdentityWrites.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import {
  identityIsCurrent,
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

describe('writes that change the chord drop its identity', () => {
  it('renaming a chord', () => {
    s().renameChordRegion('b', 'Am', 'A min');
    expect(region('b').identity).toBeUndefined();
    expect(region('a').identity).toEqual(identity('1 maj'));
  });

  it('writing another chord on its first beat', () => {
    s().insertChordRegion(BAR, '5 maj', 'G maj');
    expect(region('b')).toMatchObject({ name: '5 maj', noteName: 'G maj' });
    expect(region('b').identity).toBeUndefined();
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
    expect(region('b').identity).toBeUndefined();
  });

  it('a key change that renames it', () => {
    s().setRootNote(7); // G: C major is now the 4 chord
    expect(region('a').name).toBe('4 maj');
    expect(s().chordRegions.map((r) => r.identity)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

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

  it('a key change that keeps its name, and one its label parse skips', () => {
    useStore.setState({
      chordRegions: [
        cMajor('a', 0, 1),
        // The lead sheet's own label: noteName has no quality to parse.
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
    expect(region('typed')).toMatchObject({ name: 'maj', noteName: 'C' });
    expect(region('typed').identity).toEqual(identity('maj'));
  });

  it('moving, resizing, shifting and deleting around it', () => {
    s().moveChordRegion('c', 2.5 * BAR);
    s().resizeChordRegion('a', 0.75 * BAR);
    s().offsetChordRegions(480);
    s().insertMeasure(0);
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
    expect(inserted.identity).toBeUndefined();
  });

  it('cutting a measure out of it, or laying chords over part of it', () => {
    s().deleteMeasure(3); // c loses its second bar
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
