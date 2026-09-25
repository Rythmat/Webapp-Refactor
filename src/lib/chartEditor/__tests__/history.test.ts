import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  createHistory,
  current,
  record,
  redo,
  redoLabel,
  seal,
  undo,
  undoLabel,
} from '../history';

/** `at` is passed in rather than read from the clock, so coalescing is testable. */
const h0 = () => createHistory('a', { limit: 4, coalesceMs: 500 });

describe('recording edits', () => {
  it('starts with nothing to undo', () => {
    expect(canUndo(h0())).toBe(false);
    expect(canRedo(h0())).toBe(false);
    expect(current(h0())).toBe('a');
    expect(undoLabel(h0())).toBeNull();
  });

  it('keeps each edit as a step', () => {
    let h = record(h0(), 'b', 'Type');
    h = record(h, 'c', 'Type');
    expect(current(h)).toBe('c');
    expect(h.past.map((e) => e.value)).toEqual(['a', 'b']);
  });

  it('ignores an edit that changed nothing', () => {
    // Clicking a bar without editing it must not cost an undo.
    const h = h0();
    expect(record(h, 'a', 'No-op')).toBe(h);
  });

  it('forgets the oldest steps past the limit', () => {
    let h = h0();
    for (const v of ['b', 'c', 'd', 'e', 'f']) h = record(h, v, 'Type');
    expect(h.past).toHaveLength(4);
    expect(h.past[0].value).toBe('b'); // 'a' has fallen off
  });
});

describe('coalescing', () => {
  it('merges quick edits that share a key into one step', () => {
    // Typing "Bmin7" is one edit to a musician, five keystrokes to a computer.
    let h = h0();
    const key = 'chord:s0b0c0';
    'Bmin7'.split('').forEach((_, i) => {
      h = record(h, 'Bmin7'.slice(0, i + 1), 'Rename chord', {
        coalesceKey: key,
        at: i * 100,
      });
    });
    expect(current(h)).toBe('Bmin7');
    expect(h.past).toHaveLength(1);
    expect(undo(h)).toMatchObject({ present: { value: 'a' } });
  });

  it('starts a new step once the pause is long enough', () => {
    const key = 'chord:s0b0c0';
    let h = record(h0(), 'b', 'Rename chord', { coalesceKey: key, at: 0 });
    h = record(h, 'c', 'Rename chord', { coalesceKey: key, at: 501 });
    expect(h.past.map((e) => e.value)).toEqual(['a', 'b']);
  });

  it('does not merge edits to different things', () => {
    let h = record(h0(), 'b', 'Rename chord', { coalesceKey: 'c1', at: 0 });
    h = record(h, 'c', 'Rename chord', { coalesceKey: 'c2', at: 10 });
    expect(h.past).toHaveLength(2);
  });

  it('never merges edits with no key', () => {
    let h = record(h0(), 'b', 'Delete bar', { at: 0 });
    h = record(h, 'c', 'Delete bar', { at: 1 });
    expect(h.past).toHaveLength(2);
  });

  it('seal ends the run, so the next edit is its own step', () => {
    const key = 'chord:s0b0c0';
    let h = record(h0(), 'b', 'Rename chord', { coalesceKey: key, at: 0 });
    h = seal(h);
    h = record(h, 'c', 'Rename chord', { coalesceKey: key, at: 10 });
    expect(h.past.map((e) => e.value)).toEqual(['a', 'b']);
  });
});

describe('undo and redo', () => {
  it('walks back and forward through the steps', () => {
    let h = record(record(h0(), 'b', 'One'), 'c', 'Two');
    h = undo(h);
    expect(current(h)).toBe('b');
    h = undo(h);
    expect(current(h)).toBe('a');
    expect(canUndo(h)).toBe(false);
    h = redo(h);
    expect(current(h)).toBe('b');
    h = redo(h);
    expect(current(h)).toBe('c');
    expect(canRedo(h)).toBe(false);
  });

  it('does nothing at either end', () => {
    const h = h0();
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('drops the redo stack once you edit again', () => {
    // The future you undid out of is no longer reachable.
    let h = record(record(h0(), 'b', 'One'), 'c', 'Two');
    h = undo(h);
    expect(canRedo(h)).toBe(true);
    h = record(h, 'd', 'Three');
    expect(canRedo(h)).toBe(false);
    expect(current(h)).toBe('d');
  });

  it('names what the menu items would do', () => {
    let h = record(h0(), 'b', 'Delete bar');
    expect(undoLabel(h)).toBe('Delete bar');
    expect(redoLabel(h)).toBeNull();
    h = undo(h);
    expect(redoLabel(h)).toBe('Delete bar');
    expect(undoLabel(h)).toBeNull();
  });

  it('survives a long session without growing without bound', () => {
    let h = createHistory(0, { limit: 10 });
    for (let i = 1; i <= 500; i++) h = record(h, i, `Edit ${i}`);
    expect(h.past).toHaveLength(10);
    for (let i = 0; i < 10; i++) h = undo(h);
    expect(current(h)).toBe(490);
    expect(canUndo(h)).toBe(false);
    expect(h.future).toHaveLength(10);
  });
});
