import { describe, expect, it } from 'vitest';
import { getTableModel } from '../model/buildTableModel';
import {
  coverageOf,
  filterCounts,
  holdPositions,
  queryRows,
  rowMatches,
  searchTokens,
  testRule,
} from '../model/query';
import type { TableModel, TableQueryState } from '../model/types';
import type { TableId } from '../tableIds';
import { fixtureInput } from './tableFixtures';

/**
 * Asking a built table which rows to show, in what order: the search box,
 * the status control, views, filters and sort, over tableFixtures.ts.
 */

const input = fixtureInput();
const model = (table: TableId) => getTableModel(input, table);

const state = (over: Partial<TableQueryState> = {}): TableQueryState => ({
  q: '',
  sort: { column: 'title', dir: 'asc' },
  filters: [],
  status: 'all',
  ...over,
});

const keys = (m: TableModel, order: Int32Array) =>
  [...order].map((i) => m.rows[i].key);

const query = (
  table: TableId,
  over: Partial<TableQueryState> = {},
  keep?: ReadonlySet<string>,
) => keys(model(table), queryRows(model(table), state(over), { keep }));

describe('search', () => {
  it('folds case, accents, apostrophes and “&”', () => {
    expect(searchTokens('  Sinéad O’Connor ')).toEqual(['sinead', 'oconnor']);
    expect(query('artists', { q: 'sinead oconnor' })).toEqual([
      'sinead-oconnor',
    ]);
    expect(query('artists', { q: 'SINÉAD' })).toEqual(['sinead-oconnor']);
    expect(query('artists', { q: 'hall & oates' })).toEqual(['hall-and-oates']);
    expect(query('artists', { q: 'hall and' })).toEqual(['hall-and-oates']);
  });

  it('needs every word, each anywhere in the row', () => {
    const credited = { view: 'credited' };
    expect(query('artists', { ...credited, q: 'por jeff' })).toEqual([
      'jeff-porcaro',
    ]);
    expect(query('artists', { ...credited, q: 'jeff toto' })).toEqual([]);
    // The events table searches a city too.
    expect(query('events', { q: 'gary' })).toEqual(['evt-live-aid']);
  });
});

describe('status and views', () => {
  it('leaves archived rows out unless asked for them', () => {
    expect(query('artists', {}, undefined)).not.toContain('old-act');
    expect(query('artists', { status: 'archived' })).toEqual(['old-act']);
  });

  it('finds proposals waiting and sent back', () => {
    expect(query('artists', { status: 'pending' })).toEqual(['toto']);
    // Paich and Castro are credited people, not acts.
    const credited = { view: 'credited' };
    expect(query('artists', { ...credited, status: 'rejected' })).toEqual([
      'david-paich',
    ]);
    expect(query('artists', { ...credited, status: 'missing' })).toEqual([
      'lenny-castro',
    ]);
    expect(query('artists', { ...credited, status: 'draft' })).toEqual([
      'david-paich',
    ]);
  });

  it('opens the Artist table on its acts, credited people beside', () => {
    const acts = query('artists');
    expect(acts).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
    // Only credited — wrote, played on — with a record or without one.
    expect(query('artists', { view: 'credited' })).toEqual([
      'david-paich',
      'jeff-porcaro',
      'lenny-castro',
    ]);
    // An unknown view is the first one.
    expect(query('artists', { view: 'nope' })).toEqual(acts);
  });

  it('shows the subgenres only when asked', () => {
    expect(query('genres', { q: 'acid rock' })).toEqual([]);
    expect(query('genres', { q: 'acid rock', more: true })).toEqual([
      'acid-rock',
    ]);
  });
});

describe('filters', () => {
  it('find the gaps in a stored column', () => {
    expect(query('artists', { filters: ['missing-born'] })).toEqual([
      'hall-and-oates',
      'sinead-oconnor',
    ]);
    expect(query('songs', { filters: ['missing-year'] })).toEqual([
      'hold_the_line',
    ]);
  });

  it('find empty and all-guessed cells', () => {
    // Castro is on Africa only by name; Toto's Rosanna is linked.
    const credited = { view: 'credited' };
    expect(
      query('artists', { ...credited, filters: ['only-guessed-songs'] }),
    ).toEqual(['lenny-castro']);
    expect(query('artists', { filters: ['only-guessed-songs'] })).toEqual([]);
    expect(query('artists', { filters: ['no-songs'] })).toEqual([
      'hall-and-oates',
      'sinead-oconnor',
    ]);
    // Only Africa's lead act is still a guess from its billing line.
    expect(query('songs', { filters: ['unlinked-lead-act'] })).toEqual([
      'africa',
      'hold_the_line',
    ]);
  });

  it('read fields and combine rules', () => {
    // Live Aid names a city the registry cannot place.
    expect(query('events', { filters: ['unresolved-place'] })).toEqual([
      'evt-live-aid',
    ]);
    // A progression that names a song but links none.
    expect(query('progressions', { filters: ['names-song-unlinked'] })).toEqual(
      ['1'],
    );
  });

  it('must all pass, and ignore one the table does not have', () => {
    expect(
      query('artists', { filters: ['missing-born', 'orphan'], view: 'acts' }),
    ).toEqual(['hall-and-oates', 'sinead-oconnor']);
    expect(query('artists', { filters: ['no-such-filter'] })).toEqual(
      query('artists'),
    );
  });

  it('count what each would leave', () => {
    const counts = filterCounts(model('artists'), state());
    expect(counts['missing-born']).toBe(2);
    expect(counts.groups).toBe(2);
    expect(counts.orphan).toBe(2);
    // The search narrows the counts too.
    expect(filterCounts(model('artists'), state({ q: 'toto' })).groups).toBe(1);
  });

  it('test a rule on its own', () => {
    const toto = model('artists').rows[model('artists').byKey.get('toto')!];
    expect(testRule({ type: 'flag', flag: 'group' }, toto)).toBe(true);
    expect(testRule({ type: 'field', path: 'aliases[]' }, toto)).toBe(true);
    expect(testRule({ type: 'field', path: 'bio' }, toto)).toBe(true);
    expect(
      testRule(
        {
          type: 'all',
          rules: [
            { type: 'missing', column: 'born' },
            { type: 'not', rule: { type: 'flag', flag: 'group' } },
          ],
        },
        toto,
      ),
    ).toBe(false);
    // A column the table does not have is never missing.
    expect(testRule({ type: 'missing', column: 'nope' }, toto)).toBe(false);
  });
});

describe('sort', () => {
  it('orders text by the collator, numbers as numbers', () => {
    expect(query('artists', { status: 'code', view: 'acts' })).toEqual([
      'hall-and-oates',
      'sinead-oconnor',
    ]);
    expect(query('songs', { sort: { column: 'year', dir: 'asc' } })).toEqual([
      'africa',
      'rosanna',
      'hold_the_line',
    ]);
  });

  it('puts an empty value last, whichever way', () => {
    expect(query('songs', { sort: { column: 'year', dir: 'desc' } })).toEqual([
      'africa',
      'rosanna',
      'hold_the_line',
    ]);
    // Equal years fall back to the title.
    expect(
      query('artists', { sort: { column: 'born', dir: 'desc' } }).at(-1),
    ).toBe('sinead-oconnor');
  });

  it('sorts a connections column by its stated facts first', () => {
    // One song each: Paich's and Porcaro's credits are linked, Castro's is
    // a name alone, so his guess sorts after their facts.
    expect(
      query('artists', {
        view: 'credited',
        sort: { column: 'songs', dir: 'desc' },
      }),
    ).toEqual(['david-paich', 'jeff-porcaro', 'lenny-castro']);
    // Toto: three songs, one linked, beats Hall & Oates' none.
    expect(
      query('artists', { sort: { column: 'songs', dir: 'desc' } }),
    ).toEqual(['toto', 'hall-and-oates', 'sinead-oconnor']);
  });

  it('falls back to the table’s default for a column it does not have', () => {
    expect(query('genres', { sort: { column: 'nope', dir: 'asc' } })[0]).toBe(
      'rock',
    );
  });
});

describe('rows edited this session', () => {
  it('stay listed under a filter they no longer match', () => {
    const m = model('artists');
    const q = state({ filters: ['missing-born'] });
    const toto = m.rows[m.byKey.get('toto')!];
    expect(rowMatches(m, toto, q)).toBe(false);
    expect(
      query('artists', { filters: ['missing-born'] }, new Set(['toto'])),
    ).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
  });
});

describe('the open row', () => {
  const open = (table: TableId, key: string, over = {}) =>
    keys(model(table), queryRows(model(table), state(over), { open: key }));

  it('is listed whatever the query hides it behind', () => {
    // A credited person in the Acts view, an archived act under "all", a
    // subgenre while only genres show, a row the search misses.
    expect(open('artists', 'david-paich')).toContain('david-paich');
    expect(open('artists', 'old-act')).toContain('old-act');
    expect(open('genres', 'acid-rock')).toContain('acid-rock');
    expect(open('artists', 'toto', { q: 'oates' })).toEqual([
      'hall-and-oates',
      'toto',
    ]);
    // And only it.
    expect(
      open('genres', 'acid-rock').filter((k) => k !== 'acid-rock'),
    ).toEqual(query('genres'));
  });
});

describe('coverage', () => {
  it('counts the stored columns over the rows shown', () => {
    const m = model('artists');
    const all = queryRows(m, state({ view: 'acts' }));
    expect(coverageOf(m, all).born).toEqual({ filled: 1, total: 3 });
    expect(coverageOf(m, queryRows(m, state({ q: 'toto' }))).city).toEqual({
      filled: 1,
      total: 1,
    });
  });
});

describe('holding edited rows where they were', () => {
  /** Rows a…z; an order of indices; what it lists, by key. */
  const rows = Array.from({ length: 26 }, (_, i) => ({
    key: String.fromCharCode(97 + i),
  }));
  const listed = (order: Int32Array) =>
    [...order].map((index) => rows[index].key).join('');
  const orderOf = (keys: string) =>
    Int32Array.from([...keys].map((key) => key.charCodeAt(0) - 97));

  it('puts a held row back at its old place, the rest in the query’s order', () => {
    // "c" was edited at place 2; the rebuilt rows sort it last.
    expect(
      listed(holdPositions(orderOf('abdec'), rows, new Map([['c', 2]]))),
    ).toBe('abcde');
    // …or first.
    expect(
      listed(holdPositions(orderOf('cabde'), rows, new Map([['c', 2]]))),
    ).toBe('abcde');
    // Two held rows, each at its place.
    expect(
      listed(
        holdPositions(
          orderOf('eadcb'),
          rows,
          new Map([
            ['a', 0],
            ['e', 4],
          ]),
        ),
      ),
    ).toBe('adcbe');
  });

  it('keeps order where nothing is held, or nothing held is listed', () => {
    const order = orderOf('abc');
    expect(holdPositions(order, rows, new Map())).toBe(order);
    expect(holdPositions(order, rows, new Map([['z', 0]]))).toBe(order);
  });

  it('takes the next free place for a clash, and the last for one past the end', () => {
    expect(
      listed(
        holdPositions(
          orderOf('abcd'),
          rows,
          new Map([
            ['c', 1],
            ['d', 1],
          ]),
        ),
      ),
    ).toBe('acdb');
    // The list got shorter under a held row: the end is its place.
    expect(
      listed(holdPositions(orderOf('ab'), rows, new Map([['a', 7]]))),
    ).toBe('ba');
    expect(
      listed(
        holdPositions(
          orderOf('abc'),
          rows,
          new Map([
            ['a', 9],
            ['b', 9],
          ]),
        ),
      ),
    ).toBe('cba');
  });

  it('holds rows in 4,800 in a few milliseconds', () => {
    const many = Array.from({ length: 4800 }, (_, i) => ({ key: `r${i}` }));
    const order = Int32Array.from(many.keys()).reverse();
    const held = new Map(
      Array.from({ length: 40 }, (_, i) => [`r${i * 97}`, i * 100] as const),
    );
    const started = performance.now();
    let result: Int32Array = order;
    for (let run = 0; run < 10; run += 1)
      result = holdPositions(order, many, held);
    const each = (performance.now() - started) / 10;
    expect(result).toHaveLength(4800);
    expect(new Set(result).size).toBe(4800);
    for (const [key, at] of held) expect(many[result[at]].key).toBe(key);
    expect(each).toBeLessThan(5);
  });
});
