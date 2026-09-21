import { describe, expect, it } from 'vitest';
import {
  applyItemClick,
  beatsOfMeasure,
  clickKind,
  itemKey,
  itemRange,
  measuresInSelection,
  parseItemKey,
  selectionKind,
  type LeadSheetItem,
  type RangeContext,
} from '../leadSheetSelection';

const context: RangeContext = {
  beatsPerMeasure: 4,
  chordOrder: ['r1', 'r2', 'r3', 'r4'],
  noteOrder: ['n1', 'n2', 'n3'],
};

const beat = (measureIndex: number, b: number): LeadSheetItem => ({
  kind: 'beat',
  measureIndex,
  beat: b,
});

describe('item keys', () => {
  const items: LeadSheetItem[] = [
    { kind: 'measure', measureIndex: 3 },
    { kind: 'beat', measureIndex: 3, beat: 2 },
    { kind: 'chord', regionId: 'chord-7' },
    { kind: 'note', noteId: 'track:clip:480:60' },
    { kind: 'barline', measureIndex: 0 },
  ];

  it.each(items)('round-trips %o', (item) => {
    expect(parseItemKey(itemKey(item))).toEqual(item);
  });

  it('keeps colons inside a note id intact', () => {
    const key = itemKey({ kind: 'note', noteId: 'a:b:c:d' });
    expect(parseItemKey(key)).toEqual({ kind: 'note', noteId: 'a:b:c:d' });
  });
});

describe('click modifiers', () => {
  it('reads plain, shift and ⌘/Ctrl clicks', () => {
    const base = { shiftKey: false, metaKey: false, ctrlKey: false };
    expect(clickKind(base)).toBe('replace');
    expect(clickKind({ ...base, shiftKey: true })).toBe('range');
    expect(clickKind({ ...base, metaKey: true })).toBe('toggle');
    expect(clickKind({ ...base, ctrlKey: true })).toBe('toggle');
  });
});

describe('ranges', () => {
  it('fills every beat between two beats, crossing barlines', () => {
    // Bar 1 beat 3 → bar 3 beat 1 is seven beats inclusive.
    const keys = itemRange(beat(1, 2), beat(3, 0), context);
    expect(keys).toEqual([
      'beat:1:2',
      'beat:1:3',
      'beat:2:0',
      'beat:2:1',
      'beat:2:2',
      'beat:2:3',
      'beat:3:0',
    ]);
  });

  it('fills beats the same way when dragged backwards', () => {
    expect(itemRange(beat(3, 0), beat(1, 2), context)).toEqual(
      itemRange(beat(1, 2), beat(3, 0), context),
    );
  });

  it('honours a non-4/4 bar', () => {
    const keys = itemRange(beat(0, 2), beat(1, 0), {
      ...context,
      beatsPerMeasure: 3,
    });
    expect(keys).toEqual(['beat:0:2', 'beat:1:0']);
  });

  it('fills measures between two measures', () => {
    const keys = itemRange(
      { kind: 'measure', measureIndex: 4 },
      { kind: 'measure', measureIndex: 2 },
      context,
    );
    expect(keys).toEqual(['measure:2', 'measure:3', 'measure:4']);
  });

  it('fills chords in the order they sound, not by id', () => {
    const keys = itemRange(
      { kind: 'chord', regionId: 'r3' },
      { kind: 'chord', regionId: 'r1' },
      context,
    );
    expect(keys).toEqual(['chord:r1', 'chord:r2', 'chord:r3']);
  });

  it('fills melody notes in the order they sound', () => {
    const keys = itemRange(
      { kind: 'note', noteId: 'n1' },
      { kind: 'note', noteId: 'n3' },
      context,
    );
    expect(keys).toEqual(['note:n1', 'note:n2', 'note:n3']);
  });

  it('leaves the target alone when the anchor is a different kind', () => {
    const keys = itemRange(
      { kind: 'measure', measureIndex: 0 },
      beat(2, 1),
      context,
    );
    expect(keys).toEqual(['beat:2:1']);
  });

  it('leaves the target alone when the anchor has since disappeared', () => {
    const keys = itemRange(
      { kind: 'chord', regionId: 'deleted' },
      { kind: 'chord', regionId: 'r2' },
      context,
    );
    expect(keys).toEqual(['chord:r2']);
  });
});

describe('applying a click', () => {
  const anchor = beat(0, 0);

  it('replaces the selection on a plain click', () => {
    const next = applyItemClick(
      new Set(['beat:0:0', 'beat:0:1']),
      'replace',
      beat(2, 2),
      anchor,
      context,
    );
    expect([...next]).toEqual(['beat:2:2']);
  });

  it('adds and removes one beat on ⌘-click', () => {
    const added = applyItemClick(
      new Set(['beat:0:0']),
      'toggle',
      beat(0, 3),
      anchor,
      context,
    );
    expect([...added].sort()).toEqual(['beat:0:0', 'beat:0:3']);

    const removed = applyItemClick(
      added,
      'toggle',
      beat(0, 3),
      anchor,
      context,
    );
    expect([...removed]).toEqual(['beat:0:0']);
  });

  it('connects everything between on shift-click', () => {
    const next = applyItemClick(
      new Set(['beat:0:0']),
      'range',
      beat(0, 3),
      anchor,
      context,
    );
    expect([...next]).toEqual(['beat:0:0', 'beat:0:1', 'beat:0:2', 'beat:0:3']);
  });

  it('starts over rather than mixing kinds', () => {
    const next = applyItemClick(
      new Set(['measure:1', 'measure:2']),
      'toggle',
      { kind: 'chord', regionId: 'r1' },
      { kind: 'measure', measureIndex: 1 },
      context,
    );
    expect([...next]).toEqual(['chord:r1']);
  });
});

describe('selection helpers', () => {
  it('reports the one kind a selection holds', () => {
    expect(selectionKind(['beat:0:0', 'beat:1:1'])).toBe('beat');
    expect(selectionKind([])).toBeNull();
    expect(selectionKind(['beat:0:0', 'measure:1'])).toBeNull();
  });

  it('lists the beats of a measure', () => {
    expect(beatsOfMeasure(2, 4)).toEqual([
      'beat:2:0',
      'beat:2:1',
      'beat:2:2',
      'beat:2:3',
    ]);
  });

  it('finds the measures a mixed selection touches', () => {
    const measures = measuresInSelection(
      ['measure:4', 'beat:1:2', 'chord:r1', 'note:n1'],
      (id) => (id === 'r1' ? 7 : undefined),
      (id) => (id === 'n1' ? 0 : undefined),
    );
    expect(measures).toEqual([0, 1, 4, 7]);
  });
});
