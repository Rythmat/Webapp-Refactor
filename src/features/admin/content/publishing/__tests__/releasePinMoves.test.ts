import { describe, expect, it } from 'vitest';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type {
  ContentExport,
  ContentExports,
  ExportRow,
} from '@/hooks/data/admin/useContentExport';
import {
  pinReportFor,
  pinSourcesOf,
  type PinSourcesResult,
} from '../../../table/panel/PinMoves';
import {
  citiesCleared,
  cityChanges,
  publishOutlook,
  releasePinMoves,
} from '../releasePinMoves';

/**
 * Publishing's pin-move report: which acts the next artist release gives a
 * new City, and each song pin that moves with them — worked out as the row
 * panel's City card works it out, for every such act at once.
 */

type Body = Record<string, unknown>;

const row = (
  slug: string,
  body: Body | null,
  status: ExportRow['status'] = 'published',
): ExportRow => ({
  id: `db-${slug}`,
  slug,
  status,
  editState: null,
  updatedAt: null,
  body,
});

const artist = (slug: string, name: string, city?: string): Body => ({
  slug,
  name,
  ...(city ? { basedInPlaceId: city } : {}),
});

const song = (id: string, title: string, lead: string): Body => ({
  id,
  title,
  artist: lead,
  origin: { artistGlobeId: lead },
});

/** A song's globe event, pinned where the song is shown now. */
const pin = (id: string, city: string, lat: number, lng: number) =>
  row(`song-${id}`, { id: `song-${id}`, location: { city, lat, lng } });

const place = (id: string, name: string, at: [number, number]) =>
  row(id, { id, name, coordinates: at });

const DETROIT = place('detroit', 'Detroit', [42.3314, -83.0458]);
const WASHINGTON = place('washington-dc', 'Washington', [38.9072, -77.0369]);
const MEMPHIS = place('memphis', 'Memphis', [35.1495, -90.049]);

const exportsOf = (
  kinds: Partial<Record<ContentKind, readonly ExportRow[]>>,
): ContentExports => {
  const byKind = new Map<ContentKind, ContentExport>();
  for (const [kind, rows] of Object.entries(kinds) as [
    ContentKind,
    ExportRow[],
  ][])
    byKind.set(kind, { kind, source: 'export', rows, fingerprint: kind });
  return {
    byKind,
    ready: true,
    loading: false,
    fetching: false,
    error: null,
    fingerprint: 'fixture',
  };
};

const SONGS = [
  row(
    'whats-going-on',
    song('whats-going-on', 'What’s Going On', 'marvin-gaye'),
  ),
  row(
    'lets-get-it-on',
    song('lets-get-it-on', 'Let’s Get It On', 'marvin-gaye'),
  ),
  row(
    'sexual-healing',
    song('sexual-healing', 'Sexual Healing', 'marvin-gaye'),
  ),
  row('green-onions', song('green-onions', 'Green Onions', 'booker-t')),
];

const PINS = [
  pin('whats-going-on', 'Washington', 38.9072, -77.0369),
  pin('lets-get-it-on', 'Washington', 38.9072, -77.0369),
  // Already where his City is.
  pin('sexual-healing', 'Detroit', 42.3314, -83.0458),
  pin('green-onions', 'Memphis', 35.1495, -90.049),
];

const ready = (): PinSourcesResult =>
  pinSourcesOf(
    exportsOf({
      song: SONGS,
      globe_event: PINS,
      globe_city: [DETROIT, WASHINGTON, MEMPHIS],
    }),
  );

describe('the acts an artist release gives a new City', () => {
  it('are the published acts whose City differs from their live one', () => {
    const working = [
      row('marvin-gaye', artist('marvin-gaye', 'Marvin Gaye', 'detroit')),
      // Live with this City already.
      row('booker-t', artist('booker-t', 'Booker T. & the M.G.’s', 'memphis')),
      // A draft is not in the release.
      row('prince', artist('prince', 'Prince', 'minneapolis'), 'draft'),
      // No City: nothing to move to.
      row('toto', artist('toto', 'Toto')),
      // New to the release.
      row('al-green', artist('al-green', 'Al Green', 'memphis')),
    ];
    const live = [
      row('marvin-gaye', artist('marvin-gaye', 'Marvin Gaye')),
      row('booker-t', artist('booker-t', 'Booker T. & the M.G.’s', 'memphis')),
    ];
    expect(cityChanges(working, live)).toEqual([
      { artist: 'al-green', act: 'Al Green', placeId: 'memphis', was: null },
      {
        artist: 'marvin-gaye',
        act: 'Marvin Gaye',
        placeId: 'detroit',
        was: null,
      },
    ]);
  });
});

describe('the pin-move report before an artist release', () => {
  const working = [
    row('marvin-gaye', artist('marvin-gaye', 'Marvin Gaye', 'detroit')),
  ];
  const live = [row('marvin-gaye', artist('marvin-gaye', 'Marvin Gaye'))];

  it('lists every pin that moves, from where, and how far', () => {
    const result = releasePinMoves({
      working,
      live,
      cities: [DETROIT],
      liveCities: [DETROIT],
      sources: ready(),
    });
    if (result.state !== 'ready') throw new Error(result.state);
    expect(publishOutlook(result.acts, { citiesFirst: false }).moves).toBe(2);
    const [act] = result.acts;
    expect(act).toMatchObject({ artist: 'marvin-gaye', place: 'live' });
    if (act.result.state !== 'ready') throw new Error(act.result.state);
    expect(act.result.report.moves).toEqual([
      {
        song: 'lets-get-it-on',
        title: 'Let’s Get It On',
        from: 'Washington',
        km: 634,
      },
      {
        song: 'whats-going-on',
        title: 'What’s Going On',
        from: 'Washington',
        km: 634,
      },
    ]);
    expect(act.result.report.staying).toBe(1);
  });

  it('is what the row panel’s City card says for the same act', () => {
    const sources = ready();
    if (sources.state !== 'ready') throw new Error(sources.state);
    const result = releasePinMoves({
      working,
      live,
      cities: [DETROIT],
      liveCities: [DETROIT],
      sources,
    });
    if (result.state !== 'ready') throw new Error(result.state);
    expect(result.acts[0].result).toEqual(
      pinReportFor(sources.sources, 'marvin-gaye', 'detroit'),
    );
  });

  it('says where a City is not live, since only a live one takes pins', () => {
    const next = releasePinMoves({
      working,
      live,
      cities: [DETROIT],
      liveCities: [],
      sources: ready(),
    });
    if (next.state !== 'ready') throw new Error(next.state);
    expect(next.acts[0].place).toBe('next');
    const draft = releasePinMoves({
      working,
      live,
      cities: [{ ...DETROIT, status: 'draft' }],
      liveCities: [],
      sources: ready(),
    });
    if (draft.state !== 'ready') throw new Error(draft.state);
    expect(draft.acts[0].place).toBe('draft');
  });

  it('counts no move where the City is not live when Artists publish: that publish is refused', () => {
    const next = releasePinMoves({
      working,
      live,
      cities: [DETROIT],
      liveCities: [],
      sources: ready(),
    });
    if (next.state !== 'ready') throw new Error(next.state);
    // Published and waiting: refused, unless Globe cities publish first.
    const alone = publishOutlook(next.acts, { citiesFirst: false });
    expect(alone.moves).toBe(0);
    expect(alone.refused.map(({ why }) => why)).toEqual([
      'Detroit is not live yet: the Artists publish is refused until Globe cities publish it.',
    ]);
    expect(publishOutlook(next.acts, { citiesFirst: true })).toMatchObject({
      moves: 2,
      refused: [],
    });
    // A draft is in no cities release: refused either way.
    const draft = releasePinMoves({
      working,
      live,
      cities: [{ ...DETROIT, status: 'draft' }],
      liveCities: [],
      sources: ready(),
    });
    if (draft.state !== 'ready') throw new Error(draft.state);
    expect(publishOutlook(draft.acts, { citiesFirst: true })).toMatchObject({
      moves: 0,
      refused: [
        {
          why: 'Detroit is not published: the Artists publish is refused until it is, and Globe cities publish it.',
        },
      ],
    });
  });

  it('lists the acts it leaves with no City apart', () => {
    const cleared = [row('booker-t', artist('booker-t', 'Booker T.'))];
    const had = [row('booker-t', artist('booker-t', 'Booker T.', 'memphis'))];
    expect(citiesCleared(cleared, had)).toEqual([
      { artist: 'booker-t', act: 'Booker T.', was: 'memphis' },
    ]);
    // It needs no songs to say so.
    expect(
      releasePinMoves({
        working: cleared,
        live: had,
        cities: [],
        liveCities: [],
        sources: { state: 'loading' },
      }),
    ).toEqual({
      state: 'ready',
      acts: [],
      cleared: [{ artist: 'booker-t', act: 'Booker T.', was: 'memphis' }],
    });
  });

  it('needs no songs when no act’s City changes', () => {
    expect(
      releasePinMoves({
        working: live,
        live,
        cities: [],
        liveCities: [],
        sources: { state: 'loading' },
      }),
    ).toEqual({ state: 'ready', acts: [], cleared: [] });
  });

  it('waits for the songs, and says when they cannot be read', () => {
    const args = { working, live, cities: [], liveCities: [] };
    expect(
      releasePinMoves({ ...args, sources: { state: 'loading' } }).state,
    ).toBe('loading');
    const unknown = pinSourcesOf({
      ...exportsOf({ globe_city: [DETROIT] }),
      byKind: new Map([
        [
          'song',
          { kind: 'song', source: 'list', rows: SONGS, fingerprint: 'l' },
        ],
      ]),
    });
    expect(releasePinMoves({ ...args, sources: unknown })).toEqual({
      state: 'unknown',
      why: 'the server does not export songs and their pins here',
    });
  });
});
