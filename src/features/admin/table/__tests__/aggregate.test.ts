import { describe, expect, it } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import type {
  Edge,
  EdgeKind,
  EntityId,
  EntityKind,
  GraphNode,
} from '@/content/graph/types';
import {
  connectionsOf,
  firstInOrder,
  walkContext,
  type WalkContext,
  yearsOf,
} from '../model/aggregate';
import { PEOPLE, PEOPLE_TAGS } from '../model/edges';
import type { ConnectionPart, Hop } from '../model/types';

/**
 * Counting a cell over a small graph: which nodes a column's walk reaches,
 * how each chip is drawn and weighed, and what each part is credited with.
 * The graph is assembled by hand, so each rule is seen on its own.
 */

const node = (
  id: EntityId,
  label: string,
  status: GraphNode['status'] = 'code',
) =>
  ({
    id,
    kind: id.slice(0, id.indexOf(':')) as EntityKind,
    label,
    status,
    origin: 'code',
  }) satisfies GraphNode;

const edge = (
  from: EntityId,
  kind: EdgeKind,
  to: EntityId,
  path: string,
  extra: Partial<Edge> & { item?: EntityId } = {},
): Edge => {
  const { item, ...rest } = extra;
  return { from, kind, to, via: { item: item ?? from, path }, ...rest };
};

const GUESS = { inferred: true } as const;

const graph = assembleGraph(
  [
    node('artist:toto', 'Toto'),
    node('artist:jeff-porcaro', 'Jeff Porcaro'),
    node('artist:david-paich', 'David Paich'),
    node('song:africa', 'Africa'),
    node('song:rosanna', 'Rosanna'),
    node('song:hold_the_line', 'Hold the Line'),
    node('genre:rock', 'Rock'),
    node('genre:pop', 'Pop'),
    node('event:evt-live-aid', 'Live Aid'),
    node('event:evt-grammys', 'The 1983 Grammys'),
    node('place:los-angeles', 'Los Angeles'),
    node('place:hartford', 'Hartford'),
  ],
  [
    // Toto's songs: one linked, two guessed from the billing line.
    edge('song:rosanna', 'performed_by', 'artist:toto', 'origin.artistGlobeId'),
    edge('song:africa', 'performed_by', 'artist:toto', 'artist', GUESS),
    edge('song:hold_the_line', 'performed_by', 'artist:toto', 'artist', GUESS),
    // Paich wrote Africa (a linked credit) and is billed on nothing.
    edge(
      'song:africa',
      'written_by',
      'artist:david-paich',
      'credits[].artistGlobeId',
    ),
    edge(
      'song:rosanna',
      'written_by',
      'artist:david-paich',
      'credits[].artistGlobeId',
    ),
    // Toto wrote Hold the Line as well as performing it.
    edge(
      'song:hold_the_line',
      'written_by',
      'artist:toto',
      'credits[].artistGlobeId',
    ),
    // Genres: the songs', and Toto's own (stated, but unconfirmed).
    edge('song:africa', 'in_genre', 'genre:rock', 'genreTags[]'),
    edge('song:rosanna', 'in_genre', 'genre:rock', 'genreTags[]'),
    edge('song:hold_the_line', 'in_genre', 'genre:pop', 'genreTags[]'),
    edge('artist:toto', 'in_genre', 'genre:pop', 'genreIds[]', {
      unverified: true,
    }),
    // Events about Toto: one stored, one matched from its title — and the
    // Grammys both stored and matched, which the graph merges into one edge.
    edge('event:evt-live-aid', 'about', 'artist:toto', 'title', GUESS),
    edge('event:evt-grammys', 'about', 'artist:toto', 'artistIds[]'),
    edge('event:evt-grammys', 'about', 'artist:toto', 'title', GUESS),
    edge('event:evt-live-aid', 'in_genre', 'genre:rock', 'genre[]'),
    // A city stated by the artist, and one its songs are pinned to: filed
    // under the artist, stated by the Artist locations item (as deriveGraph
    // files a song pin).
    edge('artist:toto', 'based_in', 'place:los-angeles', 'basedInPlaceId'),
    {
      from: 'artist:jeff-porcaro',
      kind: 'based_in',
      to: 'place:hartford',
      via: {
        item: 'artist:jeff-porcaro',
        path: 'city',
        statedBy: { kind: 'artist_location', id: 'jeff porcaro' },
      },
      ...GUESS,
    },
    // Porcaro played drums on Africa, and a gong nobody has confirmed.
    edge(
      'artist:jeff-porcaro',
      'plays_instrument',
      'instrument:drum-kit',
      'credits[].instrument',
      {
        on: 'song:africa',
        item: 'song:africa',
      },
    ),
    edge(
      'artist:jeff-porcaro',
      'plays_instrument',
      'instrument:gong',
      'credits[].instrument',
      {
        on: 'song:africa',
        item: 'song:africa',
        unverified: true,
      },
    ),
    // A featured player nobody has a record for: a missing node.
    edge(
      'song:rosanna',
      'features',
      'artist:lenny-castro',
      'credits[].name',
      GUESS,
    ),
    // Years, and the decade each walks up to (the calendar's own edges).
    edge('song:africa', 'from_year', 'year:1982', 'year'),
    edge('song:rosanna', 'from_year', 'year:1982', 'year'),
    edge('song:hold_the_line', 'from_year', 'year:1978', 'year'),
    edge('event:evt-live-aid', 'from_year', 'year:1985', 'year'),
    // Keys and modes, for the narrowing.
    edge('song:africa', 'in_mode', 'mode:major', 'mode'),
    edge('song:rosanna', 'in_mode', 'mode:minor', 'mode'),
    edge('song:hold_the_line', 'in_mode', 'mode:major', 'mode'),
  ],
);

const ctx = (narrow?: WalkContext['narrow']) => walkContext(graph, narrow);
const out = (
  edges: readonly EdgeKind[],
  to: readonly EntityKind[],
  extra: Partial<Hop> = {},
): Hop => ({ edges, dir: 'out', to, ...extra });
const into = (
  edges: readonly EdgeKind[],
  to: readonly EntityKind[],
  extra: Partial<Hop> = {},
): Hop => ({ edges, dir: 'in', to, ...extra });

const part = (
  id: string,
  role: ConnectionPart['role'],
  hops: readonly [Hop] | readonly [Hop, Hop],
  extra: Partial<ConnectionPart> = {},
): ConnectionPart => ({ id, label: id, role, hops, ...extra });

const OPTIONS = { stored: false, empty: 'Nothing yet.' };

const cellOf = (
  starts: readonly EntityId[],
  parts: readonly ConnectionPart[],
  options = OPTIONS,
  context = ctx(),
) => connectionsOf(context, starts, parts, options);

const chip = (result: ReturnType<typeof cellOf>, id: EntityId) =>
  result.cell.chips.find((c) => c.node === id);

describe('a one-step cell', () => {
  const songs = cellOf(
    ['artist:toto'],
    [part('songs', 'fact', [into(PEOPLE, ['song'])], { tags: PEOPLE_TAGS })],
  );

  it('counts each node once, whatever the number of edges to it', () => {
    // Hold the Line is reached twice (performed and written): one chip.
    expect(songs.cell.total).toBe(3);
    expect(songs.cell.parts).toEqual([
      { part: 'songs', label: 'songs', count: 3 },
    ]);
    // Linked first, then by label.
    expect(songs.cell.chips.map((c) => c.label)).toEqual([
      'Hold the Line',
      'Rosanna',
      'Africa',
    ]);
  });

  it('draws a linked edge solid and a guess dotted, strongest first', () => {
    expect(chip(songs, 'song:rosanna')?.style).toBe('solid');
    expect(chip(songs, 'song:africa')?.style).toBe('dotted');
    // Hold the Line: guessed as the performer, linked as the writer.
    expect(chip(songs, 'song:hold_the_line')?.style).toBe('solid');
    expect(songs.cell.styles).toMatchObject({ solid: 2, dotted: 1, dashed: 0 });
  });

  it('tags a role other than performing, unless they performed it too', () => {
    const paich = cellOf(
      ['artist:david-paich'],
      [part('songs', 'fact', [into(PEOPLE, ['song'])], { tags: PEOPLE_TAGS })],
    );
    expect(paich.cell.chips.map((c) => c.tag)).toEqual(['wrote', 'wrote']);
    expect(chip(songs, 'song:hold_the_line')?.tag).toBeUndefined();
    expect(chip(songs, 'song:rosanna')?.tag).toBeUndefined();
  });

  it('says in its tooltip which field states the edge', () => {
    expect(chip(songs, 'song:rosanna')?.title).toBe('origin.artistGlobeId');
  });

  it('flags the guesses it shows, and sorts by the firm ones first', () => {
    expect(songs.guessed).toBe(true);
    // Two firm (Rosanna, Hold the Line), three shown.
    expect(songs.cell.sort).toBeCloseTo(2 + 3 / 4);
  });

  it('draws a node found nowhere hollow', () => {
    const rosanna = cellOf(
      ['song:rosanna'],
      [part('people', 'fact', [out(PEOPLE, ['artist'])])],
    );
    expect(chip(rosanna, 'artist:lenny-castro')?.style).toBe('hollow');
    expect(rosanna.cell.styles.hollow).toBe(1);
  });

  it('says where the data will come from when it reaches nothing', () => {
    const none = cellOf(
      ['artist:jeff-porcaro'],
      [part('songs', 'fact', [into(PEOPLE, ['song'])])],
    );
    expect(none.cell).toMatchObject({
      total: 0,
      chips: [],
      parts: [],
      sort: 0,
      note: 'Nothing yet.',
    });
  });
});

describe('a stated part', () => {
  const events = cellOf(
    ['artist:toto'],
    [
      part('stated', 'stated', [into(['about'], ['event'])]),
      part('matched', 'fact', [into(['about'], ['event'])]),
    ],
  );

  it('takes only what the row itself states', () => {
    // Both events name Toto, but neither is Toto's own field.
    expect(events.cell.parts).toEqual([
      { part: 'matched', label: 'matched', count: 2 },
    ]);
  });

  it('is what fills a stored column', () => {
    const city = cellOf(
      ['artist:toto'],
      [
        part('stated', 'stated', [
          out(['based_in'], ['place'], { via: ['basedInPlaceId'] }),
        ]),
      ],
      { stored: true, empty: '' },
    );
    expect(city.cell.filled).toBe(true);
    const none = cellOf(
      ['artist:jeff-porcaro'],
      [
        part('stated', 'stated', [
          out(['based_in'], ['place'], { via: ['basedInPlaceId'] }),
        ]),
        part('pins', 'fact', [out(['based_in'], ['place'], { via: ['city'] })]),
      ],
      { stored: true, empty: '' },
    );
    // A song-pin city shows, as a guess, but fills nothing.
    expect(none.cell.filled).toBe(false);
    expect(none.cell.total).toBe(1);
    expect(none.cell.chips[0]).toMatchObject({
      label: 'Hartford',
      style: 'dotted',
      part: 'pins',
    });
  });

  it('never takes what another item states under the row', () => {
    // No `via` to tell the two cities apart: the pin is filed under Porcaro,
    // but the Artist locations item states it, so it is not his City.
    const city = cellOf(
      ['artist:jeff-porcaro'],
      [
        part('stated', 'stated', [out(['based_in'], ['place'])]),
        part('pins', 'fact', [out(['based_in'], ['place'])]),
      ],
      { stored: true, empty: '' },
    );
    expect(city.cell.filled).toBe(false);
    expect(city.cell.parts).toEqual([
      { part: 'pins', label: 'pins', count: 1 },
    ]);
  });

  it('keeps the facts it takes out of the column’s other one-step parts', () => {
    const own = cellOf(
      ['event:evt-grammys'],
      [
        part('stated', 'stated', [
          out(['about'], ['artist'], { via: ['artistIds[]'] }),
        ]),
        part('matched', 'fact', [
          out(['about'], ['artist'], { via: ['title'] }),
        ]),
      ],
    );
    // The stored id and the title agree: counted once, as stated, solid.
    expect(own.cell.parts).toEqual([
      { part: 'stated', label: 'stated', count: 1 },
    ]);
    expect(own.cell.chips[0]).toMatchObject({ part: 'stated', style: 'solid' });
    const guessed = cellOf(
      ['event:evt-live-aid'],
      [
        part('stated', 'stated', [
          out(['about'], ['artist'], { via: ['artistIds[]'] }),
        ]),
        part('matched', 'fact', [
          out(['about'], ['artist'], { via: ['title'] }),
        ]),
      ],
    );
    expect(guessed.cell.parts).toEqual([
      { part: 'matched', label: 'matched', count: 1 },
    ]);
    expect(guessed.cell.chips[0].style).toBe('dotted');
  });
});

describe('a rolled-up cell', () => {
  const artists = cellOf(
    ['genre:rock'],
    [
      part('stated', 'fact', [into(['in_genre'], ['artist'])]),
      part('songs', 'rollup', [
        into(['in_genre'], ['song']),
        out(PEOPLE, ['artist']),
      ]),
      part('events', 'rollup', [
        into(['in_genre'], ['event']),
        out(['about'], ['artist']),
      ]),
    ],
  );

  it('splits its count by provenance', () => {
    expect(artists.cell.parts).toEqual([
      { part: 'songs', label: 'songs', count: 3 },
      { part: 'events', label: 'events', count: 1 },
    ]);
    expect(artists.cell.total).toBe(3);
  });

  it('takes its weakest step’s style, and its strongest path’s', () => {
    // Toto: through Rosanna (linked, solid) and Africa (guessed, dotted).
    expect(chip(artists, 'artist:toto')?.style).toBe('solid');
    // Castro: a guess, at a missing node.
    expect(chip(artists, 'artist:lenny-castro')?.style).toBe('hollow');
  });

  it('weighs a chip by what it came through, across parts', () => {
    // Two rock songs and one rock event.
    expect(chip(artists, 'artist:toto')?.weight).toBe(3);
    expect(chip(artists, 'artist:toto')?.part).toBe('songs');
    expect(chip(artists, 'artist:toto')?.title).toBe('songs · 2');
    expect(chip(artists, 'artist:david-paich')?.weight).toBe(2);
  });

  it('never outranks a stated fact in the sort', () => {
    // Nothing one step out: the sort is the tie-break alone.
    expect(artists.cell.sort).toBeLessThan(1);
    // Rollups are two rows away from a guess of this row's own.
    expect(artists.guessed).toBe(false);
  });

  it('counts through an expansion, never listing the row’s own nodes', () => {
    // A genre standing on itself and a subgenre it sits over.
    const expanded = cellOf(
      ['genre:rock', 'genre:pop'],
      [part('songs', 'fact', [into(['in_genre'], ['song', 'artist'])])],
    );
    expect(expanded.cell.total).toBe(4);
    const stated = cellOf(
      ['genre:rock', 'artist:toto'],
      [part('genres', 'fact', [out(['in_genre'], ['genre'])])],
    );
    // Toto's genre (pop) is reached; rock, a start, is not.
    expect(stated.cell.chips.map((c) => c.node)).toEqual(['genre:pop']);
  });
});

describe('a hint', () => {
  const genres = cellOf(
    ['artist:toto'],
    [
      part('stated', 'stated', [out(['in_genre'], ['genre'])]),
      part('songs', 'hint', [
        into(PEOPLE, ['song']),
        out(['in_genre'], ['genre']),
      ]),
    ],
    { stored: true, empty: '' },
  );

  it('is muted, and listed after the row’s own values', () => {
    expect(genres.cell.chips.map((c) => [c.label, c.style, c.muted])).toEqual([
      ['Pop', 'dashed', undefined],
      ['Rock', 'solid', true],
    ]);
  });

  it('never makes a chip the row states a hint', () => {
    // Pop is stated (unconfirmed) and also reached through Hold the Line,
    // solid: it stays the row's own value, drawn as stated.
    expect(chip(genres, 'genre:pop')).toMatchObject({
      part: 'stated',
      style: 'dashed',
      weight: 2,
    });
    expect(genres.unconfirmed).toBe(true);
    expect(genres.cell.parts).toEqual([
      { part: 'stated', label: 'stated', count: 1 },
      { part: 'songs', label: 'songs', count: 2 },
    ]);
  });
});

describe('credits on a song', () => {
  it('walk from an instrument to the songs it was played on, and back', () => {
    const drums = cellOf(
      ['instrument:drum-kit'],
      [
        part('songs', 'fact', [
          into(['plays_instrument'], ['song'], { through: 'on' }),
        ]),
      ],
    );
    expect(drums.cell.chips.map((c) => c.node)).toEqual(['song:africa']);
    const africa = cellOf(
      ['song:africa'],
      [
        part('instruments', 'fact', [
          out(['plays_instrument'], ['instrument'], { through: 'on' }),
        ]),
      ],
    );
    expect(africa.cell.chips.map((c) => [c.node, c.style])).toEqual([
      ['instrument:drum-kit', 'solid'],
      ['instrument:gong', 'dashed'],
    ]);
  });
});

describe('narrowing', () => {
  it('keeps only the paths whose first step connects to the chosen node', () => {
    const genres = (narrow?: EntityId) =>
      cellOf(
        ['artist:toto'],
        [
          part('songs', 'rollup', [
            into(PEOPLE, ['song']),
            out(['in_genre'], ['genre']),
          ]),
        ],
        OPTIONS,
        ctx(
          narrow
            ? { hop: out(['in_mode'], ['mode']), node: narrow }
            : undefined,
        ),
      );
    expect(genres().cell.total).toBe(2);
    // The minor songs: Rosanna, which is rock.
    expect(genres('mode:minor').cell.chips.map((c) => c.label)).toEqual([
      'Rock',
    ]);
    // The major ones: Africa (rock) and Hold the Line (pop).
    expect(genres('mode:major').cell.total).toBe(2);
    expect(chip(genres('mode:major'), 'genre:rock')?.weight).toBe(1);
  });
});

describe('a years cell', () => {
  const years = yearsOf(
    ctx(),
    ['genre:rock', 'genre:pop'],
    [
      part('songs', 'rollup', [
        into(['in_genre'], ['song']),
        out(['from_year'], ['year']),
      ]),
      part('events', 'rollup', [
        into(['in_genre'], ['event']),
        out(['from_year'], ['year']),
      ]),
    ],
    OPTIONS,
  );

  it('counts what was dated by decade, oldest first', () => {
    expect(years.cell.decades).toEqual([
      { decade: '1970s', count: 1 },
      { decade: '1980s', count: 3 },
    ]);
    expect(years.cell).toMatchObject({ first: 1978, last: 1985, sort: 1978 });
    expect(years.cell.parts).toEqual([
      { part: 'songs', label: 'songs', count: 3 },
      { part: 'events', label: 'events', count: 1 },
    ]);
  });

  it('says where the data will come from when nothing is dated', () => {
    const none = yearsOf(
      ctx(),
      ['artist:jeff-porcaro'],
      [
        part('songs', 'rollup', [
          into(PEOPLE, ['song']),
          out(['from_year'], ['year']),
        ]),
      ],
      OPTIONS,
    );
    expect(none.cell).toMatchObject({
      decades: [],
      sort: null,
      note: 'Nothing yet.',
    });
  });
});

describe('the chips a cell shows', () => {
  it('are the head of the whole list in order, without sorting it all', () => {
    // A strict order, as chipOrder is: no two items compare equal.
    const order = (a: number, b: number) => (a % 7) - (b % 7) || a - b;
    let seed = 7;
    const random = () => (seed = (seed * 48271) % 2147483647);
    for (const length of [0, 3, 12, 13, 40, 400]) {
      const items = Array.from(
        { length },
        (_, i) => (random() % 1000) + i * 1000,
      );
      const sorted = [...items].sort(order).slice(0, 12);
      expect(firstInOrder([...items], 12, order), String(length)).toEqual(
        sorted,
      );
    }
  });
});
