// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tableDef } from '../../model/categories';
import { COLUMNS_STORAGE_KEY, useVisibleColumns } from '../useVisibleColumns';

/**
 * The Columns menu's memory: the defaults until chosen otherwise, one choice
 * per table in this browser, and the defaults whenever storage is missing,
 * refuses or holds something unreadable.
 */

const artists = tableDef('artists');
const OWNER = [
  'title',
  'born',
  'city',
  'genres',
  'years',
  'songs',
  'events',
  'instruments',
];

const ids = (result: { current: ReturnType<typeof useVisibleColumns> }) =>
  result.current.columns.map((c) => c.id);

const stored = () =>
  JSON.parse(window.localStorage.getItem(COLUMNS_STORAGE_KEY) ?? 'null');

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useVisibleColumns', () => {
  it('shows the owner’s columns by default, title first', () => {
    const { result } = renderHook(() => useVisibleColumns(artists));
    expect(ids(result)).toEqual(OWNER);
    expect(result.current.isDefault).toBe(true);
  });

  it('remembers a choice per table, in the table’s order', () => {
    const { result } = renderHook(() => useVisibleColumns(artists));
    act(() => result.current.toggle('bio'));
    act(() => result.current.toggle('aliases'));
    act(() => result.current.toggle('born'));
    // The registry's order, not the order they were ticked in.
    expect(ids(result)).toEqual([
      'title',
      'city',
      'genres',
      'years',
      'songs',
      'events',
      'instruments',
      'aliases',
      'bio',
    ]);
    expect(stored().artists).toEqual(ids(result).slice(1));
    // A new mount reads it back.
    const again = renderHook(() => useVisibleColumns(artists));
    expect(ids(again.result)).toEqual(ids(result));
  });

  it('never hides the title, and resets to the defaults', () => {
    const { result } = renderHook(() => useVisibleColumns(artists));
    act(() => result.current.toggle('title'));
    expect(ids(result)[0]).toBe('title');
    act(() => result.current.toggle('born'));
    expect(result.current.isDefault).toBe(false);
    act(() => result.current.reset());
    expect(ids(result)).toEqual(OWNER);
    // Back at the defaults, nothing is left stored.
    expect(window.localStorage.getItem(COLUMNS_STORAGE_KEY)).toBeNull();
  });

  it('drops columns the table no longer has', () => {
    window.localStorage.setItem(
      COLUMNS_STORAGE_KEY,
      JSON.stringify({ artists: ['gone', 'city'], songs: 'nonsense' }),
    );
    const { result } = renderHook(() => useVisibleColumns(artists));
    expect(ids(result)).toEqual(['title', 'city']);
    const songs = renderHook(() => useVisibleColumns(tableDef('songs')));
    expect(songs.result.current.isDefault).toBe(true);
  });

  it('falls back to the defaults when storage is unreadable or refuses', () => {
    window.localStorage.setItem(COLUMNS_STORAGE_KEY, '{not json');
    expect(ids(renderHook(() => useVisibleColumns(artists)).result)).toEqual(
      OWNER,
    );

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { result } = renderHook(() => useVisibleColumns(artists));
    expect(ids(result)).toEqual(OWNER);
    // The choice still holds for this page, just not remembered.
    act(() => result.current.toggle('bio'));
    expect(ids(result)).toContain('bio');
  });
});
