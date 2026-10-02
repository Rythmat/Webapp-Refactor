import { describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
} from '@/content/suggestions/types';
import type { SuggestionRow } from '@/hooks/data/admin/useSuggestions';
import { tableSuggestionsOf } from '../data/tableSuggestions';
import { coverageEntries } from '../grid/coverage';
import { buildTableModel } from '../model/buildTableModel';
import { TABLES } from '../model/categories';
import { columnForPath, valueText } from '../model/ghosts';
import { filterCounts, queryRows } from '../model/query';
import type { TableModel, TableQueryState } from '../model/types';
import { fixtureGraph, fixtureInput } from './tableFixtures';

/**
 * Suggestions in the grid: each row's count, the ghost chips in the empty
 * fields they are for, the "Has suggestions" and "Accepted in bulk, not
 * reviewed" filters — and the coverage strip, which counts stated facts
 * only, a suggestion beside them as a stand-in.
 */

const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: 'https://musicbrainz.org/artist/x',
  label: 'life-span begin',
};
const APP: SuggestionSource = { provider: 'app', label: 'evt-live-aid tags' };

const suggest = (parts: {
  kind: string;
  slug: string;
  path: string;
  value: unknown;
  display: string;
  op?: 'set' | 'add';
  sources?: SuggestionSource[];
  requires?: RequiredRecord[];
}): Suggestion => {
  const target = { kind: parts.kind, slug: parts.slug };
  const op = parts.op ?? 'set';
  return {
    id: suggestionId({ target, path: parts.path, op, value: parts.value }),
    target,
    path: parts.path,
    op,
    value: parts.value,
    display: parts.display,
    sources: parts.sources ?? [MB],
    evidence: ['a test says so'],
    confidence: 0.9,
    tier: 'sure',
    ...(parts.requires ? { requires: parts.requires } : {}),
    batch: 'mb-test',
  };
};

const row = (
  suggestion: Suggestion,
  over: Partial<SuggestionRow> = {},
): SuggestionRow => ({
  suggestion,
  status: 'open',
  decision: null,
  unreviewed: false,
  ...over,
});

const DUBLIN: RequiredRecord = {
  kind: 'globe_city',
  slug: 'dublin',
  body: { id: 'dublin', name: 'Dublin', country: 'IE' },
};

const S = {
  paichBorn: suggest({
    kind: 'artist',
    slug: 'david-paich',
    path: 'born.date',
    value: '1954-06-25',
    display: 'Born 25 Jun 1954',
  }),
  paichCity: suggest({
    kind: 'artist',
    slug: 'david-paich',
    path: 'basedInPlaceId',
    value: 'los-angeles',
    display: 'City: Los Angeles',
  }),
  paichRock: suggest({
    kind: 'artist',
    slug: 'david-paich',
    path: 'genreIds[]',
    op: 'add',
    value: 'rock',
    display: 'Genre: rock',
  }),
  sineadCity: suggest({
    kind: 'artist',
    slug: 'sinead-oconnor',
    path: 'basedInPlaceId',
    value: 'dublin',
    display: 'City: Dublin (a new place)',
    requires: [DUBLIN],
  }),
  totoFrom: suggest({
    kind: 'artist',
    slug: 'toto',
    path: 'activeFrom',
    value: 1976,
    display: 'Active from 1976',
  }),
  liveAidArtists: suggest({
    kind: 'globe_event',
    slug: 'evt-live-aid',
    path: 'artistIds',
    value: ['toto'],
    display: 'About Toto',
    sources: [APP],
  }),
};

const OPEN_ROWS: SuggestionRow[] = [
  row(S.paichBorn),
  row(S.paichCity),
  row(S.paichRock),
  row(S.sineadCity),
  // Toto says 1977: a conflict, counted but not a ghost.
  row(S.totoFrom, { status: 'conflict' }),
  row(S.liveAidArtists),
];

const BULK_ROWS: SuggestionRow[] = [
  row(
    suggest({
      kind: 'artist',
      slug: 'hall-and-oates',
      path: 'activeFrom',
      value: 1970,
      display: 'Active from 1970',
    }),
    { status: 'applied', unreviewed: true },
  ),
];

const suggested = tableSuggestionsOf(OPEN_ROWS, BULK_ROWS);

const model = (table: 'artists' | 'events', rows = suggested): TableModel =>
  buildTableModel(fixtureInput({ suggestions: rows }), TABLES[table]);

const rowOf = (m: TableModel, key: string) => m.rows[m.byKey.get(key)!];

const QUERY: TableQueryState = {
  q: '',
  sort: { column: 'title', dir: 'asc' },
  filters: [],
  status: 'all',
};

describe('the column a suggestion belongs in', () => {
  const artists = TABLES.artists;
  it('is the one whose row edit writes its path, or the field around it', () => {
    expect(columnForPath(artists, 'born.date')?.id).toBe('born');
    expect(columnForPath(artists, 'born.placeId')?.id).toBe('born');
    expect(columnForPath(artists, 'basedInPlaceId')?.id).toBe('city');
    expect(columnForPath(artists, 'genreIds[]')?.id).toBe('genres');
    // Written with Years Active's start.
    expect(columnForPath(artists, 'activeTo')?.id).toBe('years');
    expect(columnForPath(TABLES.events, 'artistIds')?.id).toBe('artists');
  });

  it('splits a list several columns share by its element’s role', () => {
    const songs = TABLES.songs;
    const credit = (role: string) => ({ name: 'Someone', role });
    expect(columnForPath(songs, 'credits[]', credit('songwriter'))?.id).toBe(
      'composers',
    );
    expect(columnForPath(songs, 'credits[]', credit('producer'))?.id).toBe(
      'producer',
    );
    // Every other role has a column of its own too.
    expect(columnForPath(songs, 'credits[]', credit('performer'))?.id).toBe(
      'performers',
    );
    expect(columnForPath(songs, 'credits[]', credit('engineer'))?.id).toBe(
      'engineer',
    );
    // A role no column takes goes to the column that takes them all.
    expect(columnForPath(songs, 'credits[]', credit('whistler'))?.id).toBe(
      'credits',
    );
    // With no value — a field of the bulk accept — the column that takes them all.
    expect(columnForPath(songs, 'credits[]')?.label).toBe('Credits');
  });

  it('is never the title, and none for a path no column edits', () => {
    // `group` is edited with the name in the title column, and is a
    // column of its own as well: the one a suggestion for it belongs in.
    expect(columnForPath(artists, 'group')?.id).toBe('group');
    expect(columnForPath(artists, 'name')).toBeUndefined();
    expect(columnForPath(artists, 'nothing.here')).toBeUndefined();
  });

  it('names what a value holds as the graph names it', () => {
    const graph = fixtureGraph();
    expect(valueText(graph, artists, 'basedInPlaceId', 'los-angeles')).toBe(
      'Los Angeles',
    );
    expect(valueText(graph, TABLES.events, 'artistIds', ['toto'])).toBe('Toto');
    expect(valueText(graph, artists, 'activeFrom', 1977)).toBe('1977');
    expect(valueText(graph, TABLES.events, 'artistIds', [])).toBe('none');
  });
});

describe('suggestions on the rows', () => {
  it("counts each row's open suggestions, conflicts included", () => {
    const m = model('artists');
    expect(rowOf(m, 'david-paich').suggestions).toBe(3);
    expect(rowOf(m, 'toto').suggestions).toBe(1);
    expect(rowOf(m, 'jeff-porcaro').suggestions).toBe(0);
    expect(rowOf(m, 'david-paich').flags.has('suggestions')).toBe(true);
    expect(rowOf(m, 'jeff-porcaro').flags.has('suggestions')).toBe(false);
  });

  it('shows each open one as a ghost in the empty field it is for', () => {
    const paich = rowOf(model('artists'), 'david-paich');
    expect(paich.cells.born.ghosts).toEqual([
      { label: 'Born 25 Jun 1954', title: expect.stringContaining('Born') },
    ]);
    expect(paich.cells.city.ghosts).toEqual([
      expect.objectContaining({
        node: 'place:los-angeles',
        label: 'Los Angeles',
      }),
    ]);
    expect(paich.cells.genres.ghosts).toEqual([
      expect.objectContaining({ node: 'genre:rock', label: 'Rock' }),
    ]);
    // Still empty: a ghost is not a value.
    expect(paich.cells.city.filled).toBe(false);
    expect(paich.cells.born.filled).toBe(false);
  });

  it('names a place the suggestion would make by the name it would have', () => {
    const sinead = rowOf(model('artists'), 'sinead-oconnor');
    expect(sinead.cells.city.ghosts).toEqual([
      expect.objectContaining({ node: 'place:dublin', label: 'Dublin' }),
    ]);
  });

  it('shows no ghost for a conflict: the field says something else', () => {
    const toto = rowOf(model('artists'), 'toto');
    expect(toto.cells.years.ghosts).toBeUndefined();
  });

  it('marks a guess a suggestion would store: the chip is there, and so is its ghost', () => {
    const liveAid = rowOf(model('events'), 'evt-live-aid');
    const artists = liveAid.cells.artists;
    expect(artists.type).toBe('connections');
    if (artists.type !== 'connections') return;
    expect(artists.chips.map((c) => c.node)).toContain('artist:toto');
    expect(artists.ghosts).toEqual([
      expect.objectContaining({ node: 'artist:toto', label: 'Toto' }),
    ]);
  });

  it('flags the bulk accepts nobody has reviewed, for their filter', () => {
    const m = model('artists');
    expect(rowOf(m, 'hall-and-oates').flags.has('bulk-unreviewed')).toBe(true);
    expect(rowOf(m, 'david-paich').flags.has('bulk-unreviewed')).toBe(false);
    // The Acts view: Toto and Sinéad; David Paich, a songwriter, is
    // among the credited people.
    const counts = filterCounts(m, QUERY);
    expect(counts['has-suggestions']).toBe(2);
    expect(counts['bulk-unreviewed']).toBe(1);
    expect(
      filterCounts(m, { ...QUERY, view: 'credited' })['has-suggestions'],
    ).toBe(1);
    const listed = queryRows(m, { ...QUERY, filters: ['bulk-unreviewed'] });
    expect([...listed].map((i) => m.rows[i].key)).toEqual(['hall-and-oates']);
  });

  it('rebuilds a cached table when the suggestions change, not otherwise', () => {
    const again = tableSuggestionsOf([...OPEN_ROWS], [...BULK_ROWS]);
    expect(again.version).toBe(suggested.version);
    const fewer = tableSuggestionsOf(OPEN_ROWS.slice(1), BULK_ROWS);
    expect(fewer.version).not.toBe(suggested.version);
    const decided = tableSuggestionsOf(
      [row(S.paichBorn, { status: 'conflict' }), ...OPEN_ROWS.slice(1)],
      BULK_ROWS,
    );
    expect(decided.version).not.toBe(suggested.version);
  });
});

describe('the coverage strip with suggestions', () => {
  const shown = new Set(['born', 'city', 'genres', 'years', 'instruments']);

  it('counts stated facts only, and the rows with a suggestion as a stand-in', () => {
    const before = buildTableModel(fixtureInput(), TABLES.artists);
    const withThem = model('artists');
    // Every row, the credited people too.
    const order = (m: TableModel) => Int32Array.from(m.rows.keys());
    const plain = coverageEntries(before, order(before), shown);
    const suggestedStrip = coverageEntries(withThem, order(withThem), shown);
    // The filled counts do not move for a suggestion.
    expect(suggestedStrip.map((e) => [e.column, e.filled, e.total])).toEqual(
      plain.map((e) => [e.column, e.filled, e.total]),
    );
    const city = suggestedStrip.find((e) => e.column === 'city')!;
    expect(city.standIns[city.standIns.length - 1]).toEqual({
      label: 'suggested',
      count: 2,
    });
    const born = suggestedStrip.find((e) => e.column === 'born')!;
    expect(born.standIns).toContainEqual({ label: 'suggested', count: 1 });
    expect(
      plain.every((e) => e.standIns.every((s) => s.label !== 'suggested')),
    ).toBe(true);
  });
});
