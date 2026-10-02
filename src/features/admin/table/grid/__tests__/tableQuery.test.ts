import { describe, expect, it } from 'vitest';
import { tableDef } from '../../model/categories';
import {
  defaultDir,
  nextSort,
  parseSort,
  parseTableQuery,
  searchOf,
  toggledFilters,
  writeTableQuery,
} from '../tableQuery';

/**
 * A table's query in its URL: what a link says is what the grid shows, a
 * default is never written, and whatever else the URL holds is left alone.
 */

const artists = tableDef('artists');
const params = (search: string) => new URLSearchParams(search);

describe('reading the URL', () => {
  it('reads a bare URL as the table’s defaults', () => {
    expect(parseTableQuery(artists, params(''))).toEqual({
      q: '',
      sort: artists.defaultSort,
      filters: [],
      status: 'all',
    });
  });

  it('reads every part, and drops what the table does not have', () => {
    const state = parseTableQuery(
      artists,
      params(
        'q=toto&sort=-born&f=missing-city,groups,no-such,groups&status=draft&view=credited',
      ),
    );
    expect(state).toEqual({
      q: 'toto',
      sort: { column: 'born', dir: 'desc' },
      // Known filters only, each once, in the order they were turned on.
      filters: ['missing-city', 'groups'],
      status: 'draft',
      view: 'credited',
    });
    expect(
      parseTableQuery(
        artists,
        params('sort=-nope&status=sideways&view=elsewhere&more=1&narrow=x'),
      ),
    ).toEqual({
      q: '',
      sort: artists.defaultSort,
      filters: [],
      status: 'all',
    });
  });

  it('reads the subgenre toggle and the narrowing only where a table has them', () => {
    expect(parseTableQuery(tableDef('genres'), params('more=1')).more).toBe(
      true,
    );
    expect(
      parseTableQuery(tableDef('keys'), params('narrow=mode%3Aminor')).narrow,
    ).toBe('mode:minor');
    expect(parseTableQuery(artists, params('more=1')).more).toBeUndefined();
  });

  it('falls back to the default sort for a column the table lacks', () => {
    expect(parseSort(artists, 'city')).toEqual({ column: 'city', dir: 'asc' });
    expect(parseSort(artists, '-city')).toEqual({
      column: 'city',
      dir: 'desc',
    });
    expect(parseSort(artists, 'bpm')).toEqual(artists.defaultSort);
    expect(parseSort(artists, null)).toEqual(artists.defaultSort);
  });
});

describe('writing the URL', () => {
  it('leaves defaults out and keeps what is not the query', () => {
    const next = writeTableQuery(artists, params('field=born&q=old'), {
      q: '',
      sort: artists.defaultSort,
      filters: [],
      status: 'all',
      view: 'acts',
      more: false,
      narrow: undefined,
    });
    expect(next.toString()).toBe('field=born');
  });

  it('round-trips a full query', () => {
    const state = {
      q: 'hall & oates',
      sort: { column: 'songs', dir: 'desc' as const },
      filters: ['missing-born', 'people'],
      status: 'pending' as const,
      view: 'credited',
    };
    const url = writeTableQuery(artists, params(''), state);
    expect(url.get('sort')).toBe('-songs');
    expect(url.get('f')).toBe('missing-born,people');
    expect(parseTableQuery(artists, url)).toEqual(state);
  });

  it('writes a search as typed, and drops one of spaces only', () => {
    expect(writeTableQuery(artists, params(''), { q: 'hall ' }).get('q')).toBe(
      'hall ',
    );
    expect(writeTableQuery(artists, params('q=x'), { q: '  ' }).has('q')).toBe(
      false,
    );
  });

  it('changes only the parts it is given', () => {
    const next = writeTableQuery(artists, params('q=toto&status=draft'), {
      filters: ['groups'],
    });
    expect(searchOf(next)).toBe('?q=toto&status=draft&f=groups');
    expect(searchOf(params(''))).toBe('');
  });
});

describe('sorting and filtering', () => {
  it('sorts names and fields up, counts down, on the first click', () => {
    const column = (id: string) => artists.columns.find((c) => c.id === id)!;
    expect(defaultDir(column('title'))).toBe('asc');
    expect(defaultDir(column('born'))).toBe('asc');
    expect(defaultDir(column('songs'))).toBe('desc');
  });

  it('turns the same column the other way', () => {
    const byName = { column: 'title', dir: 'asc' as const };
    expect(nextSort(artists, byName, 'title')).toEqual({
      column: 'title',
      dir: 'desc',
    });
    expect(nextSort(artists, byName, 'songs')).toEqual({
      column: 'songs',
      dir: 'desc',
    });
    expect(nextSort(artists, byName, 'born')).toEqual({
      column: 'born',
      dir: 'asc',
    });
  });

  it('turns a filter on, and off again', () => {
    expect(toggledFilters([], 'groups')).toEqual(['groups']);
    expect(toggledFilters(['groups', 'people'], 'groups')).toEqual(['people']);
  });
});
