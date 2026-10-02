import { describe, expect, it } from 'vitest';
import { SUBGENRE_PARENT } from '@/content/graph/genreTags';
import { GENRES } from '@/content/graph/genres';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  API_ONLY_NOTE,
  buildTableModel,
  formatField,
  getTableModel,
  narrowChoices,
  valuesAt,
} from '../model/buildTableModel';
import { TABLES } from '../model/categories';
import type { CellValue, TableModel, TableRow } from '../model/types';
import type { TableId } from '../tableIds';
import { fixtureGraph, fixtureInput, SNAPSHOT, SONGS } from './tableFixtures';

/**
 * Building a table from a graph: which rows it lists, which body each row
 * reads, and what every kind of cell says — over the small Atlas in
 * tableFixtures.ts.
 */

const input = fixtureInput();
const model = (table: TableId) => getTableModel(input, table);

const row = (table: TableId, key: string): TableRow => {
  const m = model(table);
  const index = m.byKey.get(key);
  if (index === undefined) throw new Error(`no ${table} row ${key}`);
  return m.rows[index];
};

const cell = (table: TableId, key: string, column: string): CellValue =>
  row(table, key).cells[column];

/** A connections cell's chips as "label:style", the muted ones marked. */
const chips = (c: CellValue) =>
  c.type === 'connections' || c.type === 'credits'
    ? c.chips.map((x) => `${x.label}:${x.style}${x.muted ? ':muted' : ''}`)
    : [];

const keys = (m: TableModel) => m.rows.map((r) => r.key);

describe('the rows', () => {
  it('are the graph’s nodes of the table’s kind, archived items after', () => {
    expect(keys(model('artists'))).toEqual([
      'toto',
      'jeff-porcaro',
      'david-paich',
      'sinead-oconnor',
      'hall-and-oates',
      // Credited by name on Africa, found nowhere.
      'lenny-castro',
      // Archived in the API, so the graph leaves it out.
      'old-act',
    ]);
    expect(keys(model('songs'))).toEqual([
      'africa',
      'rosanna',
      'hold_the_line',
    ]);
    expect(keys(model('events'))).toEqual(['evt-live-aid', 'evt-grammys-1983']);
    expect(keys(model('progressions'))).toEqual(['1', '2']);
  });

  it('list a code vocabulary in full, linked or not', () => {
    expect(model('instruments').rows).toHaveLength(SESSION_INSTRUMENTS.length);
    expect(keys(model('instruments')).slice(0, 2)).toEqual([
      'lead-vocals',
      'backing-vocals',
    ]);
    // The genres, a genre nobody defined, then the subgenres.
    const genres = model('genres');
    const subgenres = Object.keys(SUBGENRE_PARENT).length;
    expect(genres.rows).toHaveLength(GENRES.length + 1 + subgenres);
    expect(genres.rows[GENRES.length]).toMatchObject({
      key: 'made-up',
      status: 'missing',
    });
    expect(row('genres', 'acid-rock').kind).toBe('subgenre');
  });

  it('carry their node, state and body', () => {
    // The API holds Toto with a proposal waiting: its body is the item's.
    expect(row('artists', 'toto')).toMatchObject({
      node: 'artist:toto',
      kind: 'artist',
      label: 'Toto',
      status: 'pending',
      editState: 'pending',
      itemId: 'db-toto',
      unverified: false,
    });
    expect(row('artists', 'toto').body?.bio).toBe(
      'Session players from Los Angeles.',
    );
    // A new proposal has no body yet: its proposal is its body.
    expect(row('artists', 'david-paich')).toMatchObject({
      status: 'draft',
      editState: 'rejected',
      itemId: 'db-paich',
    });
    expect(row('artists', 'david-paich').body?.name).toBe('David Paich');
    // The repo's copy, when the API has none.
    expect(row('artists', 'sinead-oconnor')).toMatchObject({
      status: 'code',
      editState: null,
    });
    expect(row('artists', 'sinead-oconnor').body?.name).toBe('Sinéad O’Connor');
    expect(row('artists', 'sinead-oconnor').itemId).toBeUndefined();
    // Found nowhere: no body, and named as the credit prints him.
    expect(row('artists', 'lenny-castro')).toMatchObject({
      status: 'missing',
      label: 'Lenny Castro',
    });
    expect(row('artists', 'lenny-castro').body).toBeUndefined();
    expect(row('artists', 'old-act')).toMatchObject({
      status: 'archived',
      label: 'An Old Act',
    });
    // A vocabulary row reads its entry.
    expect(row('instruments', 'drum-kit').body?.section).toBe('drums');
  });

  it('take the API’s state over the repo graph’s, in repo mode', () => {
    // The repo graph states no statuses: every record is code. The `/items`
    // list still says what the API holds, bodies or not.
    const listed = getTableModel(
      fixtureInput({
        items: new Map([
          [
            'artist:sinead-oconnor',
            { id: 'db-s', status: 'draft', editState: null, body: null },
          ],
          [
            'artist:hall-and-oates',
            {
              id: 'db-h',
              status: 'published',
              editState: 'pending',
              body: null,
            },
          ],
        ]),
      }),
      'artists',
    );
    const of = (key: string) => listed.rows[listed.byKey.get(key)!];
    expect(of('sinead-oconnor')).toMatchObject({
      status: 'draft',
      itemId: 'db-s',
    });
    expect(of('hall-and-oates')).toMatchObject({
      status: 'pending',
      editState: 'pending',
    });
    // No item: the repo's own status; a node the graph states keeps its own.
    expect(of('jeff-porcaro').status).toBe('code');
    expect(of('toto').status).toBe('pending');
  });

  it('list what the API holds and the repo does not, in repo mode', () => {
    // The per-kind lists redirect here, so a song made in the console, which
    // only the `/items` list knows of, must still be a row: its name and
    // state are all there is to show.
    const listed = getTableModel(
      fixtureInput({
        items: new Map([
          [
            'song:brand-new',
            {
              id: 'db-new',
              status: 'draft',
              editState: null,
              body: null,
              title: 'Brand New',
            },
          ],
          [
            'song:proposed',
            {
              id: 'db-proposed',
              status: 'draft',
              editState: 'pending',
              body: null,
              title: 'Proposed',
            },
          ],
        ]),
      }),
      'songs',
    );
    expect(keys(listed)).toEqual([
      'africa',
      'rosanna',
      'hold_the_line',
      'brand-new',
      'proposed',
    ]);
    const of = (key: string) => listed.rows[listed.byKey.get(key)!];
    expect(of('brand-new')).toMatchObject({
      label: 'Brand New',
      status: 'draft',
      itemId: 'db-new',
    });
    expect(of('proposed').status).toBe('pending');
    // Every empty cell says why for the row, not where the column's data
    // will come from; and the graph has not seen it, so it is no orphan.
    expect(of('brand-new').cells.year.note).toBe(API_ONLY_NOTE);
    expect(of('brand-new').cells.composers.note).toBe(API_ONLY_NOTE);
    expect(of('brand-new').flags.has('orphan')).toBe(false);
  });

  it('count their edges, solid and guessed', () => {
    expect(row('artists', 'sinead-oconnor').degree).toEqual({
      solid: 0,
      guessed: 0,
    });
    expect(row('artists', 'toto').degree.guessed).toBeGreaterThan(0);
  });
});

describe('the flags', () => {
  const flags = (table: TableId, key: string) =>
    [...row(table, key).flags].sort();

  it('say what kind of artist a row is', () => {
    expect(flags('artists', 'toto')).toContain('group');
    // Paich only wrote a song: a credited person, not an act.
    expect(flags('artists', 'david-paich')).toEqual(
      expect.arrayContaining(['person', 'credited']),
    );
    // Toto is billed on songs and an event is about it.
    expect(flags('artists', 'toto')).not.toContain('credited');
    // A registry artist nothing links to yet is an act, not credited.
    expect(flags('artists', 'sinead-oconnor')).toEqual(['orphan', 'person']);
    expect(flags('artists', 'lenny-castro')).toEqual(
      expect.arrayContaining(['missing']),
    );
  });

  it('count a song’s billed act and its ensembles as acts', () => {
    // The graph draws a song's billing text only when no credit is billed,
    // and an ensemble's credit as the role it played; neither may make an
    // act a credited person.
    const billed = getTableModel(
      fixtureInput({
        snapshot: {
          ...SNAPSHOT,
          songs: [
            ...SONGS,
            { id: 'solo', title: 'Solo', artist: 'David Paich' } as Song,
            {
              id: 'session',
              title: 'Session',
              artist: 'Someone',
              credits: [
                { name: 'Lenny Castro', role: 'performer', ensemble: true },
              ],
            } as Song,
          ],
        },
      }),
      'artists',
    );
    const of = (key: string) => billed.rows[billed.byKey.get(key)!].flags;
    expect(of('david-paich').has('credited')).toBe(false);
    expect(of('lenny-castro').has('credited')).toBe(false);
    // Without them, both are credited people (above).
    expect(row('artists', 'lenny-castro').flags.has('credited')).toBe(true);
  });

  it('carry what is unconfirmed and what is guessed', () => {
    // Porcaro's record itself is unconfirmed.
    expect(flags('artists', 'jeff-porcaro')).toEqual(
      expect.arrayContaining(['unverified', 'unconfirmed']),
    );
    // Toto's songs include guesses from the billing line.
    expect(flags('artists', 'toto')).toContain('guesses');
    expect(flags('artists', 'toto')).not.toContain('unverified');
  });

  it('say what kind of place and genre a row is', () => {
    expect(flags('locations', 'los-angeles')).toContain('city');
    expect(flags('locations', 'hartford')).toContain('hometown');
    expect(flags('locations', 'region-north-america')).toContain('region');
    expect(flags('genres', 'rock')).toContain('taught');
    expect(flags('genres', 'west-african')).not.toContain('taught');
    expect(flags('genres', 'acid-rock')).toContain('subgenre');
  });

  it('count open suggestions and bulk accepts', () => {
    const withSuggestions = fixtureInput({
      suggestions: {
        version: '1',
        count: (node) => (node === 'artist:toto' ? 3 : 0),
        bulkUnreviewed: (node) => node === 'artist:jeff-porcaro',
      },
    });
    const built = buildTableModel(withSuggestions, TABLES.artists);
    const toto = built.rows[built.byKey.get('toto')!];
    expect(toto.suggestions).toBe(3);
    expect(toto.flags.has('suggestions')).toBe(true);
    const jeff = built.rows[built.byKey.get('jeff-porcaro')!];
    expect(jeff.flags.has('bulk-unreviewed')).toBe(true);
    expect(jeff.flags.has('suggestions')).toBe(false);
  });
});

describe('the title', () => {
  it.each([
    ['artists', 'toto', 'Group · TOTO'],
    ['songs', 'africa', 'Toto'],
    ['genres', 'rock', 'Taught'],
    ['genres', 'acid-rock', 'Rock'],
    ['locations', 'los-angeles', 'California, US · North America'],
    ['locations', 'hartford', 'Connecticut, US · North America · No pin'],
    ['locations', 'region-north-america', 'Region'],
    ['instruments', 'drum-kit', 'Drums'],
    ['events', 'evt-live-aid', '1985 · Gary, US'],
    ['decades', '1980s', '1980–1989'],
    ['progressions', '1', 'Simple · 4 chords'],
  ] as const)('of %s %s reads “%s” beneath', (table, key, sublabel) => {
    expect(row(table, key).sublabel).toBe(sublabel);
    expect(cell(table, key, 'title')).toMatchObject({
      type: 'title',
      sublabel,
      filled: true,
    });
  });

  it('dates a year by its decade and era', () => {
    expect(row('years', '1982').sublabel).toMatch(/^1980s · \S/);
  });

  it('sorts by the label', () => {
    expect(cell('artists', 'toto', 'title').sort).toBe('Toto');
  });
});

describe('a field cell', () => {
  it('writes a birth, and a group’s forming', () => {
    expect(cell('artists', 'toto', 'born')).toMatchObject({
      text: 'Formed 1977 · Los Angeles',
      sort: '1977',
      filled: true,
    });
    // An unconfirmed birth is shown muted.
    expect(cell('artists', 'jeff-porcaro', 'born')).toMatchObject({
      text: '1954-04-01 · Hartford',
      unverified: true,
    });
    expect(cell('artists', 'sinead-oconnor', 'born')).toMatchObject({
      sort: null,
      filled: false,
      note: TABLES.artists.columns.find((c) => c.id === 'born')!.empty,
    });
    expect(cell('artists', 'sinead-oconnor', 'born')).not.toHaveProperty(
      'text',
    );
  });

  it('writes a range, open while it lasts, with its hint', () => {
    // Toto is still active; the events about it span 1983–1985.
    expect(cell('artists', 'toto', 'years')).toMatchObject({
      text: '1977–',
      hint: 'events 1983–1985',
      sort: 1977,
    });
    expect(cell('artists', 'jeff-porcaro', 'years')).toMatchObject({
      text: '1972–1992',
    });
  });

  it('writes a key with its mode once', () => {
    expect(cell('songs', 'africa', 'key')).toMatchObject({ text: 'B major' });
    // A bare tonic takes the mode from `mode`.
    expect(cell('songs', 'rosanna', 'key')).toMatchObject({ text: 'G minor' });
  });

  it('is filled only by a value the row itself holds', () => {
    expect(cell('songs', 'africa', 'year')).toMatchObject({
      text: '1982',
      sort: 1982,
      filled: true,
    });
    expect(cell('songs', 'hold_the_line', 'year')).toMatchObject({
      sort: null,
      filled: false,
    });
    expect(cell('locations', 'los-angeles', 'coordinates')).toMatchObject({
      text: '34.05, -118.24',
    });
  });
});

describe('a connections cell', () => {
  it('shows the row’s own value first, hints muted after', () => {
    // Toto states rock and a genre nobody defined; its songs and events add
    // pop and acid rock, as hints — acid rock only through a song whose
    // artist is a guess.
    expect(chips(cell('artists', 'toto', 'genres'))).toEqual([
      'Rock:solid',
      'made-up:hollow',
      'Pop:solid:muted',
      'Acid Rock:dotted:muted',
    ]);
    expect(cell('artists', 'toto', 'genres')).toMatchObject({
      filled: true,
      parts: [
        { part: 'stated', count: 2 },
        { part: 'songs', count: 3 },
        { part: 'events', count: 2 },
      ],
    });
  });

  it('shows a group what its members play, muted', () => {
    // Toto states no instruments; Porcaro plays drums in it, and says so on
    // his own record too.
    expect(chips(cell('artists', 'toto', 'instruments'))).toEqual([
      'Drum Kit:solid:muted',
    ]);
    expect(cell('artists', 'toto', 'instruments')).toMatchObject({
      filled: false,
      parts: [{ part: 'group', count: 1 }],
    });
  });

  it('fills a stored column only with what the row states', () => {
    expect(cell('artists', 'toto', 'city')).toMatchObject({
      filled: true,
      total: 1,
    });
    expect(chips(cell('artists', 'toto', 'city'))).toEqual([
      'Los Angeles:solid',
    ]);
    // Porcaro played drums in the group and on a record: hints, not his own.
    expect(chips(cell('artists', 'jeff-porcaro', 'instruments'))).toEqual([
      'Drum Kit:solid',
      'Gong:dashed:muted',
    ]);
    expect(chips(cell('artists', 'hall-and-oates', 'city'))).toEqual([]);
    expect(cell('artists', 'hall-and-oates', 'city').filled).toBe(false);
  });

  it('keeps an event’s stored artists apart from its matched ones', () => {
    expect(cell('events', 'evt-grammys-1983', 'artists')).toMatchObject({
      filled: true,
      parts: [{ part: 'stated', count: 1 }],
    });
    expect(cell('events', 'evt-live-aid', 'artists')).toMatchObject({
      filled: false,
      parts: [{ part: 'matched', count: 1 }],
    });
    expect(chips(cell('events', 'evt-live-aid', 'artists'))).toEqual([
      'Toto:dotted',
    ]);
  });

  it('shows the text no chip came from, muted', () => {
    // 'Rock' is the rock chip; 'Zzyzx Beat' is in no genre table.
    expect(cell('events', 'evt-live-aid', 'genre')).toMatchObject({
      total: 1,
      unlinked: ['Zzyzx Beat'],
    });
    // Gary is not a registered city, so the event has no place yet.
    expect(cell('events', 'evt-live-aid', 'place')).toMatchObject({
      total: 0,
      unlinked: ['Gary'],
    });
    expect(cell('events', 'evt-live-aid', 'place')).not.toHaveProperty(
      'note',
      expect.any(String),
    );
    expect(cell('events', 'evt-grammys-1983', 'place')).not.toHaveProperty(
      'unlinked',
    );
    // A progression's legacy song shows until a song is linked.
    expect(cell('progressions', '1', 'songs')).toMatchObject({
      total: 0,
      unlinked: ['Rosanna- Toto'],
      filled: false,
    });
    expect(cell('progressions', '2', 'songs')).toMatchObject({
      total: 1,
      filled: true,
    });
    expect(cell('progressions', '2', 'songs')).not.toHaveProperty('unlinked');
  });

  it('counts a genre through its subgenres', () => {
    // Africa is rock; Hold the Line is filed under acid rock.
    expect(chips(cell('genres', 'rock', 'songs'))).toEqual([
      'Africa:solid',
      'Hold the Line:solid',
    ]);
    // …but its Subgenres column stands on the genre alone.
    expect(chips(cell('genres', 'rock', 'subgenres'))).toEqual([
      'Acid Rock:solid',
    ]);
    expect(chips(cell('genres', 'acid-rock', 'parent'))).toEqual([
      'Rock:solid',
    ]);
  });

  it('counts a decade through its years', () => {
    expect(cell('decades', '1980s', 'songs')).toMatchObject({ total: 2 });
    expect(cell('decades', '1980s', 'events')).toMatchObject({ total: 2 });
    // Its Years column is the decade's own.
    expect(chips(cell('decades', '1980s', 'years'))).toEqual([
      '1982:solid',
      '1983:solid',
      '1985:solid',
    ]);
  });

  it('walks to the songs an instrument was played on', () => {
    expect(chips(cell('instruments', 'drum-kit', 'songs'))).toEqual([
      'Africa:solid',
    ]);
    expect(chips(cell('instruments', 'drum-kit', 'artists'))).toEqual([
      'Jeff Porcaro:solid',
    ]);
  });
});

describe('a years cell', () => {
  it('bins what a row reaches by decade', () => {
    expect(cell('genres', 'rock', 'year')).toMatchObject({
      type: 'years',
      decades: [{ decade: '1980s', count: 2 }],
      first: 1982,
      last: 1985,
      parts: [
        { part: 'songs', count: 1 },
        { part: 'events', count: 1 },
      ],
    });
  });
});

describe('a credits cell', () => {
  it('summarises the roles and draws a chip per person', () => {
    const credits = cell('songs', 'africa', 'credits');
    expect(credits).toMatchObject({
      type: 'credits',
      summary: '4 · 3 performers, 1 songwriter',
      sort: 4,
      filled: true,
    });
    // In the credits' own order, as the label printed them.
    expect(chips(credits)).toEqual([
      'David Paich:solid',
      'Jeff Porcaro:solid',
      // A name alone, and nobody has a record for him.
      'Lenny Castro:hollow',
    ]);
    if (credits.type !== 'credits') throw new Error('not credits');
    expect(credits.chips[1]).toMatchObject({
      weight: 2,
      tag: 'Drum Kit · Gong',
    });
    expect(cell('songs', 'rosanna', 'credits')).toMatchObject({
      sort: 0,
      filled: false,
    });
  });

  it('shows one role’s credits in that role’s column, with no summary', () => {
    const performers = cell('songs', 'africa', 'performers');
    expect(performers).toMatchObject({ type: 'credits', sort: 3 });
    expect(performers).not.toHaveProperty('summary');
    // The songwriter is the Composers column's, not here.
    expect(chips(performers)).toEqual([
      'Jeff Porcaro:solid',
      'Lenny Castro:hollow',
    ]);
    // A role nobody is credited in is empty, and says where it comes from.
    expect(cell('songs', 'africa', 'engineer')).toMatchObject({
      type: 'credits',
      chips: [],
      sort: 0,
      filled: false,
      note: 'No engineer credited yet. Add one in the row.',
    });
  });
});

describe('a yes-or-no field', () => {
  const GROUP = { type: 'field', path: 'group', format: 'flag' } as const;
  it('says yes, no, or nothing while unset', () => {
    expect(formatField(undefined, GROUP, { group: true })).toEqual({
      text: 'Yes',
      sort: 1,
    });
    expect(formatField(undefined, GROUP, { group: false })).toEqual({
      text: 'No',
      sort: 0,
    });
    expect(formatField(undefined, GROUP, {})).toEqual({ sort: null });
  });
});

describe('coverage', () => {
  it('counts the stored columns over rows with a record', () => {
    const { coverage } = model('artists');
    // Five artists with a record; the missing and the archived one aside.
    expect(coverage.born).toEqual({ filled: 2, total: 5 });
    expect(coverage.city).toEqual({ filled: 1, total: 5 });
    expect(coverage.genres).toEqual({ filled: 1, total: 5 });
    expect(Object.keys(coverage)).not.toContain('songs');
    expect(model('genres').coverage).toEqual({});
  });
});

describe('search', () => {
  it('folds the way artist names are folded', () => {
    expect(row('artists', 'sinead-oconnor').haystack).toContain(
      'sinead oconnor',
    );
    expect(row('artists', 'hall-and-oates').haystack).toContain(
      'hall and oates',
    );
    // Aliases and the key are searched too.
    expect(row('artists', 'toto').haystack).toBe('toto toto toto');
    expect(row('events', 'evt-live-aid').haystack).toContain('gary');
  });
});

describe('caching', () => {
  it('builds a table once per graph', () => {
    const graph = fixtureGraph();
    const a = fixtureInput({ graph });
    expect(getTableModel(a, 'artists')).toBe(getTableModel(a, 'artists'));
    // The same graph and bodies, handed in again.
    expect(getTableModel({ ...a }, 'artists')).toBe(
      getTableModel(a, 'artists'),
    );
    // A rebuilt graph, new items or new suggestions build afresh.
    expect(getTableModel(fixtureInput(), 'artists')).not.toBe(
      getTableModel(a, 'artists'),
    );
    expect(getTableModel({ ...a, items: new Map() }, 'artists')).not.toBe(
      getTableModel(a, 'artists'),
    );
    const suggestions = (version: string) => ({
      ...a,
      suggestions: { version, count: () => 0 },
    });
    expect(getTableModel(suggestions('1'), 'artists')).toBe(
      getTableModel(suggestions('1'), 'artists'),
    );
    expect(getTableModel(suggestions('2'), 'artists')).not.toBe(
      getTableModel(suggestions('1'), 'artists'),
    );
  });

  it('builds without bodies, from the graph alone', () => {
    const bare = buildTableModel({ graph: fixtureGraph() }, TABLES.artists);
    expect(bare.rows.map((r) => r.key)).toContain('toto');
    expect(bare.rows.find((r) => r.key === 'toto')?.body).toBeUndefined();
  });
});

describe('narrowing', () => {
  it('lists what a table can be narrowed to, with counts', () => {
    expect(narrowChoices(input, 'keys')).toEqual([
      { node: 'mode:minor', label: 'Minor', count: 2 },
      { node: 'mode:major', label: 'Major', count: 1 },
    ]);
    expect(narrowChoices(input, 'artists')).toEqual([]);
  });

  it('narrows every count to the chosen node', () => {
    const minor = getTableModel(input, 'keys', { narrow: 'mode:minor' });
    const songs = (m: TableModel, key: string) =>
      m.rows[m.byKey.get(key)!].cells.songs;
    expect(songs(minor, 'g')).toMatchObject({ total: 1 });
    expect(songs(minor, 'b')).toMatchObject({ total: 0 });
    expect(songs(model('keys'), 'b')).toMatchObject({ total: 1 });
    expect(getTableModel(input, 'keys', { narrow: 'mode:minor' })).toBe(minor);
  });
});

describe('body paths', () => {
  it('flatten arrays along the way', () => {
    const body = SNAPSHOT.songs![0] as unknown as Record<string, unknown>;
    expect(valuesAt(body, 'credits[].name')).toEqual([
      'David Paich',
      'Jeff Porcaro',
      'Jeff Porcaro',
      'Lenny Castro',
    ]);
    expect(valuesAt(body, 'genreTags[]')).toEqual(['rock']);
    expect(valuesAt(body, 'session.city')).toEqual([]);
    expect(valuesAt(undefined, 'title')).toEqual([]);
  });
});
