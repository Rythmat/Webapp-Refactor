// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onlyQueriesDiffer, useColoringGroups } from '../MindMapPage';
import type { ColorGroup } from '../map/model/colorGroups';

/**
 * The groups Cortex colours by: typing in a query waits for 250 ms of quiet,
 * as Obsidian's does; a colour dragged in the picker, a new order, a group
 * added or deleted recolour at once.
 */

const SONGS: ColorGroup = {
  name: 'Songs',
  query: 'kind:song',
  color: '#e5484d',
};
const ARTISTS: ColorGroup = {
  name: 'Artists',
  query: 'kind:artist',
  color: '#3987e5',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('which changes wait', () => {
  it('waits only when nothing but query text changed', () => {
    expect(onlyQueriesDiffer([SONGS], [{ ...SONGS, query: 'kind:s' }])).toBe(
      true,
    );
    expect(onlyQueriesDiffer([SONGS], [{ ...SONGS, color: '#00ffff' }])).toBe(
      false,
    );
    expect(onlyQueriesDiffer([SONGS, ARTISTS], [ARTISTS, SONGS])).toBe(false);
    expect(onlyQueriesDiffer([SONGS], [SONGS, ARTISTS])).toBe(false);
    expect(onlyQueriesDiffer([SONGS], [{ ...SONGS }])).toBe(false);
  });
});

describe('useColoringGroups', () => {
  const setup = () =>
    renderHook(({ live }) => useColoringGroups(live, 250), {
      initialProps: { live: [SONGS, ARTISTS] as readonly ColorGroup[] },
    });

  it('recolours at once as the colour picker moves', () => {
    vi.useFakeTimers();
    const hook = setup();
    for (const color of ['#00ffff', '#00eeee', '#00dddd']) {
      const live = [{ ...SONGS, color }, ARTISTS];
      hook.rerender({ live });
      // No wait: every step of the picker shows.
      expect(hook.result.current).toBe(live);
      act(() => {
        vi.advanceTimersByTime(80);
      });
    }
  });

  it('waits for a query to stop changing for 250 ms', () => {
    vi.useFakeTimers();
    const hook = setup();
    const before = hook.result.current;
    hook.rerender({ live: [{ ...SONGS, query: 'kind:s' }, ARTISTS] });
    expect(hook.result.current).toBe(before);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const typed = [{ ...SONGS, query: 'kind:so' }, ARTISTS];
    hook.rerender({ live: typed });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Still typing: the groups as they were.
    expect(hook.result.current).toBe(before);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(hook.result.current).toBe(typed);
  });

  it('shows a new order, a new group and a deleted one at once', () => {
    const hook = setup();
    const swapped = [ARTISTS, SONGS];
    hook.rerender({ live: swapped });
    expect(hook.result.current).toBe(swapped);
    const added = [...swapped, { query: '', color: '#f5a623' }];
    hook.rerender({ live: added });
    expect(hook.result.current).toBe(added);
    const deleted = [ARTISTS];
    hook.rerender({ live: deleted });
    expect(hook.result.current).toBe(deleted);
  });
});
