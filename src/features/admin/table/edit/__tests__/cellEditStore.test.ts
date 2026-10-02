import { describe, expect, it, vi } from 'vitest';
import { CellEditStore, cellKeyOf, type Timers } from '../cellEditStore';

/**
 * The store the grid reads each edited cell from: one row's snapshot keeps
 * its identity until one of its cells changes, a row's listeners hear only
 * about that row (so a commit re-renders one row), and a saved cell lets
 * go of its overlay when the model catches up, or after ten seconds.
 */

const YEAR = { table: 'songs', rowKey: 'africa', column: 'year' };
const TITLE = { table: 'songs', rowKey: 'africa', column: 'title' };
const OTHER = { table: 'songs', rowKey: 'rosanna', column: 'year' };

/** Timers that run only when told to. */
function manualTimers() {
  const pending = new Map<number, { run: () => void; at: number }>();
  let clock = 0;
  let seq = 0;
  const timers: Timers = {
    set: (run, ms) => {
      seq += 1;
      pending.set(seq, { run, at: clock + ms });
      return seq;
    },
    clear: (handle) => {
      pending.delete(handle as number);
    },
  };
  const advance = (ms: number) => {
    clock += ms;
    for (const [handle, { run, at }] of [...pending])
      if (at <= clock) {
        pending.delete(handle);
        run();
      }
  };
  return { timers, advance, pending };
}

describe('the cell edit store', () => {
  it('names a cell table|row|column', () => {
    expect(cellKeyOf(YEAR)).toBe('songs|africa|year');
  });

  it('keeps a row’s snapshot until one of its cells changes', () => {
    const { timers } = manualTimers();
    const store = new CellEditStore({ timers });
    const empty = store.row('songs', 'africa');
    expect(empty.size).toBe(0);
    expect(store.row('songs', 'africa')).toBe(empty);

    store.set(YEAR, { status: 'saving', overlay: { year: 1983 } });
    const first = store.row('songs', 'africa');
    expect(first.get('year')).toMatchObject({ status: 'saving' });
    // Another row's change leaves this one's snapshot as it was.
    store.set(OTHER, { status: 'saving' });
    expect(store.row('songs', 'africa')).toBe(first);

    store.set(TITLE, { status: 'queued' });
    const second = store.row('songs', 'africa');
    expect(second).not.toBe(first);
    expect([...second.keys()].sort()).toEqual(['title', 'year']);
  });

  it('tells a row’s listeners about that row only', () => {
    const store = new CellEditStore({ timers: manualTimers().timers });
    const africa = vi.fn();
    const rosanna = vi.fn();
    const any = vi.fn();
    const off = store.subscribeRow('songs', 'africa', africa);
    store.subscribeRow('songs', 'rosanna', rosanna);
    store.subscribe(any);

    store.set(YEAR, { status: 'saving' });
    expect(africa).toHaveBeenCalledTimes(1);
    expect(rosanna).not.toHaveBeenCalled();
    store.set(OTHER, { status: 'saving' });
    expect(africa).toHaveBeenCalledTimes(1);
    expect(rosanna).toHaveBeenCalledTimes(1);
    expect(any).toHaveBeenCalledTimes(2);

    off();
    store.clear(YEAR);
    expect(africa).toHaveBeenCalledTimes(1);
    // Clearing a cell with no state tells nobody.
    store.clear(YEAR);
    expect(any).toHaveBeenCalledTimes(3);
  });

  it('lets a saved cell go once the model holds what was written', () => {
    const store = new CellEditStore({ timers: manualTimers().timers });
    store.set(YEAR, {
      status: 'saved',
      overlay: { year: 1983 },
      written: [{ item: 'song:africa', path: 'year', value: 1983 }],
    });
    store.set(TITLE, {
      status: 'saving',
      written: [{ item: 'song:africa', path: 'title', value: 'Africa' }],
    });
    // The model is still behind: nothing settles.
    expect(store.settle(() => ({ year: 1982, title: 'Africa' }))).toBe(0);
    expect(store.get(YEAR)).toBeDefined();
    // Caught up; a cell still saving is left alone whatever the model says.
    expect(store.settle(() => ({ year: 1983, title: 'Africa' }))).toBe(1);
    expect(store.get(YEAR)).toBeUndefined();
    expect(store.get(TITLE)?.status).toBe('saving');
  });

  it('reads a list’s path whole, and settles nothing for an item the model lacks', () => {
    const store = new CellEditStore({ timers: manualTimers().timers });
    const genres = { table: 'artists', rowKey: 'toto', column: 'genres' };
    store.set(genres, {
      status: 'proposed',
      written: [{ item: 'artist:toto', path: 'genreIds[]', value: ['rock'] }],
    });
    expect(store.settle(() => undefined)).toBe(0);
    expect(store.settle(() => ({ genreIds: ['rock'] }))).toBe(1);
  });

  it('lets a saved cell go after ten seconds, unless it changed since', () => {
    const { timers, advance } = manualTimers();
    const store = new CellEditStore({ timers, settleAfterMs: 10_000 });
    store.set(YEAR, { status: 'saved', overlay: { year: 1983 } });
    advance(9_999);
    expect(store.get(YEAR)).toBeDefined();
    advance(1);
    expect(store.get(YEAR)).toBeUndefined();

    store.set(YEAR, { status: 'saved' });
    advance(5_000);
    // A new edit of the cell: the old timer no longer applies.
    store.set(YEAR, { status: 'saving' });
    advance(10_000);
    expect(store.get(YEAR)?.status).toBe('saving');
  });

  it('never times out a cell that failed or waits in the panel', () => {
    const { timers, advance, pending } = manualTimers();
    const store = new CellEditStore({ timers });
    store.set(YEAR, { status: 'error', message: 'offline' });
    store.set(TITLE, { status: 'in-panel' });
    expect(pending.size).toBe(0);
    advance(60_000);
    expect(store.get(YEAR)?.status).toBe('error');
    expect(store.get(TITLE)?.status).toBe('in-panel');
  });
});
