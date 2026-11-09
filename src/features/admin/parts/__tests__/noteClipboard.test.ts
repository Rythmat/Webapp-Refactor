import { describe, expect, it } from 'vitest';
import type { PartNote } from '@/curriculum/engine/parts/part';
import { copiedCount, copyNotes, notesAt, pasteNotes } from '../noteClipboard';

const note = (tick: number, midi: number, extra: Partial<PartNote> = {}) => ({
  tick,
  duration: 240,
  midi,
  velocity: 90,
  ...extra,
});

// A bar of C–G on the beat, the left hand's C under it.
const notes: PartNote[] = [
  note(0, 48, { hand: 'lh' }),
  note(0, 60, { hand: 'rh' }),
  note(0, 67, { hand: 'rh' }),
  note(480, 60, { hand: 'rh', offset: 12 }),
  note(480, 67, { hand: 'rh' }),
];

describe('copy and paste in the roll', () => {
  it('copies the selection and pastes it at the playhead, in its spacing', () => {
    expect(copyNotes(notes, [3, 4])).toBe(2);
    expect(copiedCount()).toBe(2);
    const { notes: after, pasted } = pasteNotes(notes, 1920);
    expect(pasted).toBe(2);
    expect(after.slice(5)).toEqual([
      note(1920, 60, { hand: 'rh', offset: 12 }),
      note(1920, 67, { hand: 'rh' }),
    ]);
  });

  it('keeps the notes before the paste where they were, so the selection holds', () => {
    copyNotes(notes, [0, 1, 2]);
    const { notes: after } = pasteNotes(notes, 960);
    expect(after.slice(0, notes.length)).toEqual(notes);
  });

  it('never doubles a note already there', () => {
    copyNotes(notes, [1, 2]);
    expect(pasteNotes(notes, 0).pasted).toBe(0);
    expect(pasteNotes(notes, 480).pasted).toBe(0);
  });

  it('keeps the copy when nothing is selected', () => {
    copyNotes(notes, [0]);
    expect(copyNotes(notes, [])).toBe(0);
    expect(copiedCount()).toBe(1);
  });

  it('places the earliest note on the tick, never before the start', () => {
    expect(
      notesAt([note(480, 60), note(720, 64)], 0).map((n) => n.tick),
    ).toEqual([0, 240]);
    expect(notesAt([note(480, 60)], -100)[0].tick).toBe(0);
  });
});
