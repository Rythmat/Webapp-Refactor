import { describe, expect, it } from 'vitest';
import {
  addToSelection,
  articulationMarkKey,
  markRange,
  sameKind,
  slurMarkKey,
  tieMarkKey,
  type ScoreMark,
} from '@/daw/components/Score/scoreMarks';

const art = (
  noteId: string,
  kind: 'staccato' | 'accent',
  tick: number,
  partIndex = 0,
): ScoreMark => ({
  key: articulationMarkKey(noteId, kind),
  kind: { type: 'articulation', kind },
  partIndex,
  tick,
  noteIds: [noteId],
});

// A bar of staccatos with an accent and a slur mixed in among them.
const MARKS: ScoreMark[] = [
  art('n1', 'staccato', 0),
  art('n2', 'accent', 480),
  art('n3', 'staccato', 960),
  art('n4', 'staccato', 1440),
  {
    key: slurMarkKey('n1', 'n4'),
    kind: { type: 'slur' },
    partIndex: 0,
    tick: 0,
    noteIds: ['n1', 'n4'],
  },
  {
    key: tieMarkKey('n4', 1920),
    kind: { type: 'tie' },
    partIndex: 0,
    tick: 1440,
    noteIds: ['n4'],
    splitTick: 1920,
  },
  art('p1', 'staccato', 480, 1),
];

describe('marking kinds', () => {
  it('tells articulations of different sorts apart', () => {
    expect(
      sameKind(
        { type: 'articulation', kind: 'staccato' },
        { type: 'articulation', kind: 'staccato' },
      ),
    ).toBe(true);
    expect(
      sameKind(
        { type: 'articulation', kind: 'staccato' },
        { type: 'articulation', kind: 'accent' },
      ),
    ).toBe(false);
    expect(sameKind({ type: 'slur' }, { type: 'tie' })).toBe(false);
  });
});

describe('a run of markings', () => {
  it('gathers only the kind it started from', () => {
    const run = markRange(
      MARKS,
      articulationMarkKey('n1', 'staccato'),
      articulationMarkKey('n4', 'staccato'),
    );
    // The accent and the slur lying between them are left alone.
    expect(run).toEqual([
      articulationMarkKey('n1', 'staccato'),
      articulationMarkKey('n3', 'staccato'),
      articulationMarkKey('n4', 'staccato'),
    ]);
  });

  it('reaches across parts when the ends do', () => {
    const run = markRange(
      MARKS,
      articulationMarkKey('n1', 'staccato'),
      articulationMarkKey('p1', 'staccato'),
    );
    expect(run).toContain(articulationMarkKey('p1', 'staccato'));
    expect(run).not.toContain(articulationMarkKey('n2', 'accent'));
  });

  it('refuses to run between two different kinds', () => {
    const run = markRange(
      MARKS,
      articulationMarkKey('n1', 'staccato'),
      slurMarkKey('n1', 'n4'),
    );
    expect(run).toEqual([slurMarkKey('n1', 'n4')]);
  });
});

describe('adding one at a time', () => {
  it('adds and removes markings of the kind already held', () => {
    const first = new Set([articulationMarkKey('n1', 'staccato')]);
    const two = addToSelection(
      MARKS,
      first,
      articulationMarkKey('n3', 'staccato'),
    );
    expect([...two]).toHaveLength(2);
    expect([
      ...addToSelection(MARKS, two, articulationMarkKey('n3', 'staccato')),
    ]).toHaveLength(1);
  });

  it('starts over when a different kind is picked', () => {
    const held = new Set([articulationMarkKey('n1', 'staccato')]);
    expect([...addToSelection(MARKS, held, slurMarkKey('n1', 'n4'))]).toEqual([
      slurMarkKey('n1', 'n4'),
    ]);
    expect([
      ...addToSelection(MARKS, held, articulationMarkKey('n2', 'accent')),
    ]).toEqual([articulationMarkKey('n2', 'accent')]);
  });
});
