import { describe, expect, it } from 'vitest';
import type { NoteInfo } from '@/components/notation/StaffView';
import {
  applyClick,
  cellKey,
  cellRange,
  clickKind,
  noteRange,
  notesInCells,
} from '@/daw/components/Score/scoreSelection';

const note = (
  id: string,
  partIndex: number,
  tick: number,
  measureIndex = Math.floor(tick / 1920),
): NoteInfo => ({
  id,
  partIndex,
  tick,
  measureIndex,
  x: 0,
  y: 0,
  stem: 'up',
  letter: 'c',
  octave: 4,
  alteration: 0,
  line: 2,
  space: 5,
});

// Piano (part 1) plays a chord on beat 1 of bar 1; Bass (part 2) plays under it.
const NOTES: NoteInfo[] = [
  note('lead-1', 0, 0),
  note('lead-2', 0, 1920),
  note('piano-top', 1, 0),
  note('piano-mid', 1, 0),
  note('piano-low', 1, 0),
  note('piano-2', 1, 1920),
  note('bass-1', 2, 0),
  note('bass-2', 2, 3840),
];

describe('click kinds', () => {
  it('reads the modifiers', () => {
    const base = { shiftKey: false, metaKey: false, ctrlKey: false };
    expect(clickKind(base)).toBe('replace');
    expect(clickKind({ ...base, shiftKey: true })).toBe('range');
    expect(clickKind({ ...base, metaKey: true })).toBe('toggle');
    expect(clickKind({ ...base, ctrlKey: true })).toBe('toggle');
  });

  it('replaces, toggles or takes a range', () => {
    const current = new Set(['a']);
    expect([...applyClick(current, 'replace', 'b', () => [])]).toEqual(['b']);
    expect([...applyClick(current, 'toggle', 'b', () => [])]).toEqual([
      'a',
      'b',
    ]);
    expect([...applyClick(current, 'toggle', 'a', () => [])]).toEqual([]);
    expect([
      ...applyClick(current, 'range', 'c', () => ['a', 'b', 'c']),
    ]).toEqual(['a', 'b', 'c']);
  });
});

describe('measure ranges', () => {
  it('covers one instrument across bars', () => {
    expect(
      cellRange(
        { partIndex: 1, measureIndex: 0 },
        { partIndex: 1, measureIndex: 2 },
      ),
    ).toEqual(['1:0', '1:1', '1:2']);
  });

  it('covers several instruments across bars', () => {
    expect(
      cellRange(
        { partIndex: 1, measureIndex: 0 },
        { partIndex: 2, measureIndex: 2 },
      ),
    ).toEqual(['1:0', '1:1', '1:2', '2:0', '2:1', '2:2']);
  });

  it('keys a note by its own part and bar', () => {
    expect(cellKey(NOTES[5])).toBe('1:1');
    expect(notesInCells(NOTES, ['1:0'])).toEqual([
      'piano-top',
      'piano-mid',
      'piano-low',
    ]);
  });
});

describe('note ranges', () => {
  it('takes a whole chord from its top note to its bottom', () => {
    expect(noteRange(NOTES, 'piano-top', 'piano-low')).toEqual([
      'piano-top',
      'piano-mid',
      'piano-low',
    ]);
  });

  it('reaches down into another instrument', () => {
    expect(noteRange(NOTES, 'piano-top', 'bass-1')).toEqual([
      'piano-top',
      'piano-mid',
      'piano-low',
      'bass-1',
    ]);
  });

  it('runs along one instrument through time', () => {
    expect(noteRange(NOTES, 'piano-top', 'piano-2')).toEqual([
      'piano-top',
      'piano-mid',
      'piano-low',
      'piano-2',
    ]);
  });

  it('spans parts and time together', () => {
    expect(noteRange(NOTES, 'lead-1', 'piano-2')).toEqual([
      'lead-1',
      'lead-2',
      'piano-top',
      'piano-mid',
      'piano-low',
      'piano-2',
    ]);
  });
});
