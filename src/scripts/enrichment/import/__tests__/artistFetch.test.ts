import { describe, expect, it, vi } from 'vitest';
import {
  type ArtistFetchRow,
  type ArtistToFetch,
  exactCandidates,
  fetchArtists,
  mergeFetchRows,
  planArtistFetch,
  sharedCandidates,
  summarizeWikidata,
} from '../artistFetch';
import type { ArtistCandidate } from '../cacheStage';
import type { MbArtist, MusicBrainzClient } from '../musicbrainz';
import { HttpError, ServerClosedError } from '../politeHttp';
import type { WdEntity, WikidataClient } from '../wikidata';

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const wikidataRel = (qid: string) => ({
  type: 'wikidata',
  url: { id: 'u', resource: `https://www.wikidata.org/wiki/${qid}` },
});

function fakeMusicBrainz(
  searches: Record<string, MbArtist[] | null>,
  artists: Record<string, MbArtist>,
) {
  const mb: MusicBrainzClient = {
    searchArtists: vi.fn(async (name: string) =>
      name in searches
        ? searches[name] && { artists: searches[name] ?? [] }
        : { artists: [] },
    ),
    lookupArtist: vi.fn(async (mbid: string) => artists[mbid] ?? null),
    browseReleaseGroups: vi.fn(async () => ({ releaseGroups: [] })),
    lookupArea: vi.fn(async () => null),
  };
  return mb;
}

const points = (property: string, id: string) => ({
  mainsnak: {
    snaktype: 'value',
    property,
    datavalue: { type: 'wikibase-entityid', value: { id } },
  },
});

/**
 * Q1 was born in Q61 and plays Q11401; Q61 is in the country Q30. Every
 * other item states nothing.
 */
const CLAIMS: Record<string, WdEntity['claims']> = {
  Q1: { P19: [points('P19', 'Q61')], P136: [points('P136', 'Q11401')] },
  Q61: { P17: [points('P17', 'Q30')] },
};

function fakeWikidata(held: readonly string[] = []) {
  const calls: { ids: string[]; props: string[] }[] = [];
  const entity = (qid: string): [string, WdEntity] => [
    qid,
    { id: qid, claims: CLAIMS[qid] ?? {} },
  ];
  const wikidata: WikidataClient = {
    async getEntities(ids, props) {
      const list = [...ids];
      calls.push({ ids: list, props: [...props] });
      return new Map(list.map(entity));
    },
    async inHand(ids) {
      return new Map([...ids].filter((id) => held.includes(id)).map(entity));
    },
  };
  return { wikidata, calls };
}

const artist = (
  slug: string,
  name: string,
  songBilled: string[] = [],
  more: Partial<ArtistToFetch> = {},
): ArtistToFetch => ({
  slug,
  name,
  aliases: [],
  songBilled,
  searchToo: false,
  searchLookups: 2,
  ...more,
});

const candidate = (
  mbid: string,
  songIds: string[],
  releaseSongIds: string[] = songIds,
): ArtistCandidate => ({
  mbid,
  name: mbid,
  recordings: songIds.length,
  songIds,
  releaseSongIds,
});

describe('planArtistFetch', () => {
  it('queues every registry artist, with the song-billed ids the cache stage found', () => {
    const plan = planArtistFetch(
      [
        { slug: 'common', name: 'Common', aliases: ['Common Sense'] },
        { slug: 'marvin-gaye', name: 'Marvin Gaye' },
      ],
      [
        {
          slug: 'marvin-gaye',
          name: 'Marvin Gaye',
          songIds: ['lets_get_it_on'],
          candidates: [candidate(id(1), ['lets_get_it_on'])],
        },
      ],
    );

    expect(plan).toEqual([
      {
        slug: 'common',
        name: 'Common',
        aliases: ['Common Sense'],
        songBilled: [],
        searchToo: true,
        // A one-word name no song names: same-named acts tie.
        searchLookups: 5,
      },
      {
        slug: 'marvin-gaye',
        name: 'Marvin Gaye',
        aliases: [],
        songBilled: [id(1)],
        // One id, on the artist's own record: settled without a search.
        searchToo: false,
        searchLookups: 2,
      },
    ]);
  });

  it('searches as well when the song evidence could name the wrong act', () => {
    const plan = planArtistFetch(
      [
        { slug: 'toto', name: 'Toto' },
        { slug: 'taste-of-honey', name: 'Taste Of Honey' },
        { slug: 'the-commodores', name: 'The Commodores' },
      ],
      [
        {
          slug: 'toto',
          name: 'Toto',
          songIds: ['africa'],
          candidates: [candidate(id(1), ['africa'])],
        },
        {
          slug: 'taste-of-honey',
          name: 'Taste Of Honey',
          songIds: ['boogie'],
          // Billed on a compilation and a promo, never a record of its own.
          candidates: [candidate(id(2), ['boogie'], [])],
        },
        {
          slug: 'the-commodores',
          name: 'The Commodores',
          songIds: ['brick_house'],
          candidates: [
            candidate(id(3), ['brick_house']),
            candidate(id(4), ['brick_house'], []),
          ],
        },
      ],
    );

    expect(
      plan.map(({ slug, searchToo, searchLookups }) => ({
        slug,
        searchToo,
        searchLookups,
      })),
    ).toEqual([
      // One word ("Toto"), weak evidence, and billing split between ids.
      { slug: 'toto', searchToo: true, searchLookups: 2 },
      { slug: 'taste-of-honey', searchToo: true, searchLookups: 2 },
      { slug: 'the-commodores', searchToo: true, searchLookups: 2 },
    ]);
  });
});

describe('exactCandidates', () => {
  it('keeps exact names and aliases, best-scored first, and drops near misses', () => {
    const results: MbArtist[] = [
      { id: 'a', name: 'Commonwealth', score: 100 },
      { id: 'b', name: 'Common', disambiguation: 'Finnish band', score: 90 },
      {
        id: 'c',
        name: 'Lonnie Rashid Lynn',
        aliases: [{ name: 'Common' }],
        score: 95,
      },
      { id: 'd', name: 'The Common', score: 80 },
    ];

    expect(exactCandidates(results, ['Common']).map((a) => a.id)).toEqual([
      'c',
      'b',
      'd',
    ]);
  });

  it('breaks a tie on score by how much the act has been tagged', () => {
    const chicago = (id: string, votes: number[]): MbArtist => ({
      id,
      name: 'Chicago',
      score: 100,
      tags: votes.map((count, i) => ({ name: `tag ${i}`, count })),
    });
    const results = [
      chicago('one-single', [1]),
      chicago('the-band', [12, 9, 4]),
      chicago('untagged', []),
    ];

    expect(exactCandidates(results, ['Chicago']).map((a) => a.id)).toEqual([
      'the-band',
      'one-single',
      'untagged',
    ]);
  });

  it('finds "A Taste of Honey" for our "Taste Of Honey"', () => {
    const results: MbArtist[] = [
      { id: 'real', name: 'A Taste of Honey', score: 100 },
      { id: 'other', name: 'Taste', score: 60 },
    ];
    expect(
      exactCandidates(results, ['Taste Of Honey']).map((a) => a.id),
    ).toEqual(['real']);
  });
});

describe('fetchArtists', () => {
  it('spends no search on an artist the old cache already identified', async () => {
    const mb = fakeMusicBrainz(
      {},
      {
        [id(1)]: {
          id: id(1),
          name: 'Toto',
          type: 'Group',
          relations: [wikidataRel('Q1')],
        },
      },
    );
    const { wikidata } = fakeWikidata();

    const report = await fetchArtists([artist('toto', 'Toto', [id(1)])], {
      mb,
      wikidata,
    });

    expect(mb.searchArtists).not.toHaveBeenCalled();
    expect(mb.lookupArtist).toHaveBeenCalledWith(id(1));
    expect(report.rows).toEqual([
      {
        slug: 'toto',
        source: 'songs',
        candidates: [
          { mbid: id(1), name: 'Toto', type: 'Group', wikidata: ['Q1'] },
        ],
        moreCandidates: 0,
      },
    ]);
  });

  it('searches otherwise, and looks up the best two exact matches only', async () => {
    const found = (n: number, score: number): MbArtist => ({
      id: id(n),
      name: 'Common',
      disambiguation: `common ${n}`,
      score,
    });
    const mb = fakeMusicBrainz(
      {
        Common: [
          found(1, 70),
          found(2, 100),
          found(3, 90),
          { id: id(4), name: 'Commonwealth', score: 100 },
        ],
      },
      {
        [id(2)]: { ...found(2, 0), relations: [wikidataRel('Q2')] },
        [id(3)]: { ...found(3, 0), relations: [] },
      },
    );
    const { wikidata } = fakeWikidata();

    const report = await fetchArtists([artist('common', 'Common')], {
      mb,
      wikidata,
    });

    expect(mb.searchArtists).toHaveBeenCalledWith('Common');
    expect(vi.mocked(mb.lookupArtist).mock.calls.map(([mbid]) => mbid)).toEqual(
      [id(2), id(3)],
    );
    expect(report.rows[0]).toMatchObject({
      source: 'search',
      moreCandidates: 1,
      candidates: [
        { mbid: id(2), disambiguation: 'common 2', wikidata: ['Q2'] },
        { mbid: id(3), disambiguation: 'common 3', wikidata: [] },
      ],
    });
  });

  it('reports an artist with no exact-name result, and one a dry run cannot reach', async () => {
    const mb = fakeMusicBrainz(
      { Grease: [{ id: id(9), name: 'Grease Band' }], Asa: null },
      {},
    );
    const { wikidata } = fakeWikidata();

    const report = await fetchArtists(
      [artist('grease', 'Grease'), artist('asa', 'Asa')],
      { mb, wikidata },
    );

    expect(report.rows).toEqual([
      { slug: 'grease', source: 'search', candidates: [], moreCandidates: 0 },
      {
        slug: 'asa',
        source: 'search',
        candidates: [],
        moreCandidates: 0,
        pending: true,
      },
    ]);
    expect(mb.lookupArtist).not.toHaveBeenCalled();
  });

  it('searches a song-billed artist as well when asked, looking up what the billing missed', async () => {
    const mb = fakeMusicBrainz(
      {
        'Taste Of Honey': [
          // The billed id comes back too; it isn't looked up twice.
          { id: id(2), name: 'Taste of Honey', score: 100 },
          { id: id(1), name: 'A Taste of Honey', score: 100 },
        ],
      },
      {
        [id(1)]: { id: id(1), name: 'A Taste of Honey' },
        [id(2)]: { id: id(2), name: 'Taste of Honey' },
      },
    );

    const report = await fetchArtists(
      [
        artist('taste-of-honey', 'Taste Of Honey', [id(2)], {
          searchToo: true,
        }),
      ],
      { mb, wikidata: fakeWikidata().wikidata },
    );

    expect(vi.mocked(mb.lookupArtist).mock.calls.map(([mbid]) => mbid)).toEqual(
      [id(2), id(1)],
    );
    expect(report.rows[0]).toMatchObject({
      source: 'songs+search',
      candidates: [{ mbid: id(2) }, { mbid: id(1) }],
      moreCandidates: 0,
    });
  });

  it('looks up five exact matches for a one-word name no song names', async () => {
    const yes = Array.from(
      { length: 7 },
      (_, i): MbArtist => ({ id: id(i + 1), name: 'Yes', score: 100 }),
    );
    const mb = fakeMusicBrainz(
      { Yes: yes },
      Object.fromEntries(yes.map((a) => [a.id, a])),
    );

    const report = await fetchArtists(
      [artist('yes', 'Yes', [], { searchToo: true, searchLookups: 5 })],
      { mb, wikidata: fakeWikidata().wikidata },
    );

    expect(mb.lookupArtist).toHaveBeenCalledTimes(5);
    expect(report.rows[0]).toMatchObject({ moreCandidates: 2 });
  });

  it('searches once for two registry artists with one name', async () => {
    const beatles: MbArtist = { id: id(1), name: 'The Beatles', score: 100 };
    const mb = fakeMusicBrainz({ Beatles: [beatles] }, { [id(1)]: beatles });

    const report = await fetchArtists(
      [artist('beatles', 'Beatles'), artist('the-beatles', 'The Beatles')],
      { mb, wikidata: fakeWikidata().wikidata },
    );

    expect(mb.searchArtists).toHaveBeenCalledTimes(1);
    expect(report.rows.map((r) => r.candidates[0]?.mbid)).toEqual([
      id(1),
      id(1),
    ]);
    expect(report.rows[1].searchedAs).toBe('Beatles');
    expect(report.rows[0]).not.toHaveProperty('searchedAs');
  });

  it('fetches the linked Wikidata items together, then their places, then names the rest', async () => {
    const mb = fakeMusicBrainz(
      {},
      {
        [id(1)]: { id: id(1), name: 'A', relations: [wikidataRel('Q1')] },
        [id(2)]: {
          id: id(2),
          name: 'B',
          relations: [wikidataRel('Q2'), wikidataRel('Q1')],
        },
      },
    );
    const { wikidata, calls } = fakeWikidata();

    const report = await fetchArtists(
      [artist('a', 'A', [id(1)]), artist('b', 'B', [id(2)])],
      { mb, wikidata },
    );

    expect(calls).toEqual([
      { ids: ['Q1', 'Q2', 'Q1'], props: ['labels', 'descriptions', 'claims'] },
      // A birthplace comes with its claims: city or country, and where.
      { ids: ['Q61'], props: ['labels', 'claims'] },
      // The genre, and the birthplace's country, by name.
      { ids: ['Q11401', 'Q30'], props: ['labels'] },
    ]);
    expect(report.wikidata).toEqual({
      linkedFromMusicBrainz: 2,
      artistItems: 2,
      placeItems: 1,
      namedItems: 2,
    });
  });

  it('stops at once when a server says to come back much later', async () => {
    const mb: MusicBrainzClient = {
      searchArtists: vi.fn(async () => {
        throw new ServerClosedError(
          'HTTP 503; the server asked to wait 3600 s',
          'https://musicbrainz.org/…',
          503,
          3_600_000,
        );
      }),
      lookupArtist: vi.fn(),
      browseReleaseGroups: vi.fn(),
      lookupArea: vi.fn(),
    };

    await expect(
      fetchArtists([artist('x', 'X'), artist('y', 'Y'), artist('z', 'Z')], {
        mb,
        wikidata: fakeWikidata().wikidata,
      }),
    ).rejects.toBeInstanceOf(ServerClosedError);
    expect(mb.searchArtists).toHaveBeenCalledTimes(1);
  });

  it('carries on past a failed artist, and stops when failures run together', async () => {
    const refuse = async () => {
      throw new HttpError(
        'HTTP 503 after 6 tries',
        'https://musicbrainz.org/…',
        503,
      );
    };
    const mb: MusicBrainzClient = {
      searchArtists: vi.fn(refuse),
      lookupArtist: vi.fn(async (mbid: string) => ({ id: mbid, name: 'Fine' })),
      browseReleaseGroups: vi.fn(async () => ({ releaseGroups: [] })),
      lookupArea: vi.fn(async () => null),
    };
    const { wikidata } = fakeWikidata();

    const oneBad = await fetchArtists(
      [artist('x', 'X'), artist('ok', 'Ok', [id(1)])],
      { mb, wikidata },
      { maxFailuresInARow: 2 },
    );
    expect(oneBad.rows.map((r) => r.error ?? 'ok')).toEqual([
      'HTTP 503 after 6 tries',
      'ok',
    ]);

    await expect(
      fetchArtists(
        [artist('x', 'X'), artist('y', 'Y'), artist('z', 'Z')],
        { mb, wikidata },
        { maxFailuresInARow: 2 },
      ),
    ).rejects.toThrow(/stopped after 2 failed artists in a row/);
    expect(mb.searchArtists).toHaveBeenCalledTimes(3); // x, then x and y — never z
  });

  it('lets anything but an HTTP failure through: that is a bug, not a bad answer', async () => {
    const mb: MusicBrainzClient = {
      searchArtists: vi.fn(async () => {
        throw new TypeError('boom');
      }),
      lookupArtist: vi.fn(),
      browseReleaseGroups: vi.fn(),
      lookupArea: vi.fn(),
    };

    await expect(
      fetchArtists([artist('x', 'X')], {
        mb,
        wikidata: fakeWikidata().wikidata,
      }),
    ).rejects.toThrow('boom');
  });
});

describe('the fetch report across runs', () => {
  const row = (slug: string, more: Partial<ArtistFetchRow> = {}) =>
    ({
      slug,
      source: 'search',
      candidates: [],
      moreCandidates: 0,
      ...more,
    }) satisfies ArtistFetchRow;
  const found = (mbid: string, wikidata: string[] = []) => ({
    mbid,
    name: mbid,
    type: null,
    wikidata,
  });
  const registry = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];

  it('adds a later run to an earlier one, in registry order', () => {
    const merged = mergeFetchRows(
      registry,
      [row('c', { candidates: [found('c1')] })],
      [row('a', { candidates: [found('a1')] })],
    );
    expect(merged.map((r) => r.slug)).toEqual(['a', 'c']);
  });

  it('never lets a failure replace an answer, but records one where there was none', () => {
    const merged = mergeFetchRows(
      registry,
      [row('a', { candidates: [found('a1')] }), row('b', { error: 'old' })],
      [
        row('a', { error: 'HTTP 503 after 6 tries' }),
        row('b', { error: 'HTTP 503 after 6 tries' }),
        row('c', { error: 'HTTP 503 after 6 tries' }),
      ],
    );
    expect(merged.map((r) => r.error ?? r.candidates[0]?.mbid)).toEqual([
      'a1',
      'HTTP 503 after 6 tries',
      'HTTP 503 after 6 tries',
    ]);
  });

  it('counts Wikidata over every row from what is in hand, asking for nothing', async () => {
    const { wikidata, calls } = fakeWikidata(['Q1', 'Q61', 'Q30']);
    const summary = await summarizeWikidata(
      [
        row('a', { candidates: [found('a1', ['Q1'])] }),
        row('c', { candidates: [found('c1', ['Q2'])] }),
      ],
      wikidata,
    );

    expect(calls).toEqual([]);
    // Q2 and the genre Q11401 were never fetched.
    expect(summary).toEqual({
      linkedFromMusicBrainz: 2,
      artistItems: 1,
      placeItems: 1,
      namedItems: 1,
    });
  });

  it('names the ids more than one registry artist has as a candidate', () => {
    expect(
      sharedCandidates([
        row('beatles', { candidates: [found('b1')] }),
        row('the-beatles', { candidates: [found('b1')] }),
        row('toto', { candidates: [found('t1')] }),
      ]),
    ).toEqual([{ mbid: 'b1', name: 'b1', slugs: ['beatles', 'the-beatles'] }]);
  });
});
