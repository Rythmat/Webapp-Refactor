import { describe, expect, it, vi } from 'vitest';
import { type ArtistToFetch, fetchArtists, linkByP434 } from '../artistFetch';
import type { CachedGetter, JsonResult } from '../fileCache';
import {
  areaLookupUrl,
  type MbArtist,
  type MbAreaFull,
  type MusicBrainzClient,
  releaseGroupBrowseUrl,
} from '../musicbrainz';
import { HttpError } from '../politeHttp';
import {
  askedIn,
  createSparqlClient,
  knownP434From,
  p434Url,
  SPARQL_BATCH,
  type SparqlClient,
} from '../sparql';
import type { WdEntity, WikidataClient } from '../wikidata';

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('the three new requests', () => {
  it('browse release groups: albums, singles and EPs, one page', () => {
    expect(releaseGroupBrowseUrl(id(1))).toBe(
      `https://musicbrainz.org/ws/2/release-group?artist=${id(1)}&type=album|single|ep&limit=100&fmt=json`,
    );
  });

  it('look an area up with the areas around it and its links', () => {
    expect(areaLookupUrl(id(2))).toBe(
      `https://musicbrainz.org/ws/2/area/${id(2)}?inc=area-rels+url-rels&fmt=json`,
    );
    expect(() => areaLookupUrl('detroit')).toThrow(/not a MusicBrainz id/);
  });

  it('ask the Query Service which items carry an MBID (P434), and read the question back', () => {
    const url = p434Url([id(1), id(2)]);
    expect(url.startsWith('https://query.wikidata.org/sparql?query=')).toBe(
      true,
    );
    expect(url.endsWith('&format=json')).toBe(true);
    expect(decodeURIComponent(url)).toContain('wdt:P434');
    expect(url).not.toMatch(/@/);
    expect(askedIn(url)).toEqual([id(1), id(2)]);
  });
});

/** A getter answering from a map of URL → body; null (a dry-run miss) otherwise. */
function fakeGetter(answers: Map<string, unknown>) {
  const calls: string[] = [];
  const get = async (url: string): Promise<JsonResult | null> => {
    calls.push(url);
    return answers.has(url)
      ? { status: 200, body: answers.get(url), fromCache: true }
      : null;
  };
  const getter = Object.assign(get, {
    stats: { hits: 0, fetched: 0, wouldFetch: 0 },
  }) as CachedGetter;
  return { getter, calls };
}

const bindings = (rows: [string, string][]) => ({
  results: {
    bindings: rows.map(([mbid, qid]) => ({
      mbid: { value: mbid },
      item: { value: `http://www.wikidata.org/entity/${qid}` },
    })),
  },
});

describe('the P434 fallback', () => {
  it('asks fifty at a time, never twice, and remembers "none"', async () => {
    const ids = Array.from({ length: SPARQL_BATCH + 5 }, (_, i) => id(i + 1));
    const first = p434Url(ids.slice(0, SPARQL_BATCH));
    const second = p434Url(ids.slice(SPARQL_BATCH));
    const { getter, calls } = fakeGetter(
      new Map<string, unknown>([
        [first, bindings([[id(1), 'Q10']])],
        [second, bindings([])],
      ]),
    );
    const sparql = createSparqlClient(getter);
    const found = await sparql.itemsFor(ids);
    expect(calls).toEqual([first, second]);
    expect(found.get(id(1))).toEqual(['Q10']);
    expect(found.get(id(SPARQL_BATCH + 1))).toEqual([]);

    await sparql.itemsFor(ids);
    expect(calls).toHaveLength(2);
  });

  it('knows what earlier runs asked, however they batched it', async () => {
    const known = knownP434From([
      {
        url: p434Url([id(1), id(2)]),
        status: 200,
        fetchedAt: '2026-10-01T00:00:00Z',
        sha256: 'x',
        body: bindings([[id(2), 'Q20']]),
      },
    ]);
    const { getter, calls } = fakeGetter(new Map());
    const found = await createSparqlClient(getter, known).itemsFor([
      id(2),
      id(1),
    ]);
    expect(calls).toEqual([]);
    expect(found).toEqual(
      new Map([
        [id(1), []],
        [id(2), ['Q20']],
      ]),
    );
  });

  it('links only the candidates MusicBrainz left unlinked', async () => {
    const sparql: SparqlClient = {
      itemsFor: vi.fn(async () => new Map([[id(2), ['Q2']]])),
    };
    const rows = [
      {
        slug: 'a',
        source: 'search' as const,
        moreCandidates: 0,
        candidates: [
          { mbid: id(1), name: 'A', wikidata: ['Q1'] },
          { mbid: id(2), name: 'B', wikidata: [] },
        ],
      },
    ];
    expect(await linkByP434(rows, sparql)).toBe(1);
    expect(sparql.itemsFor).toHaveBeenCalledWith([id(2)]);
    expect(rows[0].candidates[1]).toMatchObject({
      wikidata: ['Q2'],
      wikidataVia: 'P434',
    });
  });
});

describe('the fetch walks the new requests', () => {
  const artist = (slug: string, songBilled: string[]): ArtistToFetch => ({
    slug,
    name: slug,
    aliases: [],
    songBilled,
    searchToo: false,
    searchLookups: 2,
  });

  function fakeWikidata() {
    const calls: { ids: string[]; props: string[] }[] = [];
    const wikidata: WikidataClient = {
      async getEntities(ids, props) {
        const list = [...ids];
        calls.push({ ids: list, props: [...props] });
        return new Map(
          list.map((q): [string, WdEntity] => [q, { id: q, claims: {} }]),
        );
      },
      async inHand() {
        return new Map();
      },
    };
    return { wikidata, calls };
  }

  it('browses each candidate, resolves its areas, and fetches their Wikidata items as places', async () => {
    const found: MbArtist = {
      id: id(1),
      name: 'Marvin Gaye',
      area: { id: id(8), name: 'United States', 'iso-3166-1-codes': ['US'] },
      'begin-area': { id: id(9), name: 'Washington, D.C.' },
    };
    const washington: MbAreaFull = {
      id: id(9),
      name: 'Washington, D.C.',
      type: 'City',
      'iso-3166-2-codes': ['US-DC'],
      relations: [
        {
          type: 'wikidata',
          url: { id: 'u', resource: 'https://www.wikidata.org/wiki/Q61' },
        },
      ],
    };
    const mb: MusicBrainzClient = {
      searchArtists: vi.fn(async () => ({ artists: [] })),
      lookupArtist: vi.fn(async () => found),
      browseReleaseGroups: vi.fn(async () => ({ releaseGroups: [] })),
      lookupArea: vi.fn(async (area: string) =>
        area === id(9) ? washington : null,
      ),
    };
    const { wikidata, calls } = fakeWikidata();
    const report = await fetchArtists([artist('marvin-gaye', [id(1)])], {
      mb,
      wikidata,
    });

    expect(mb.browseReleaseGroups).toHaveBeenCalledWith(id(1));
    // The country needs no lookup; the city does, and its code ends the walk.
    expect(vi.mocked(mb.lookupArea).mock.calls).toEqual([[id(9)]]);
    expect(report.rows[0].areaItems).toEqual(['Q61']);
    expect(calls[1]).toEqual({ ids: ['Q61'], props: ['labels', 'claims'] });
  });

  it('asks the Query Service for unlinked candidates, and carries on if it fails', async () => {
    const mb: MusicBrainzClient = {
      searchArtists: vi.fn(async () => ({ artists: [] })),
      lookupArtist: vi.fn(async (mbid: string) => ({ id: mbid, name: 'X' })),
      browseReleaseGroups: vi.fn(async () => ({ releaseGroups: [] })),
      lookupArea: vi.fn(async () => null),
    };
    const linked = await fetchArtists([artist('x', [id(1)])], {
      mb,
      wikidata: fakeWikidata().wikidata,
      sparql: {
        itemsFor: async () => new Map([[id(1), ['Q5']]]),
      },
    });
    expect(linked.rows[0].candidates[0]).toMatchObject({
      wikidata: ['Q5'],
      wikidataVia: 'P434',
    });

    const log = vi.fn();
    const failed = await fetchArtists(
      [artist('x', [id(1)])],
      {
        mb,
        wikidata: fakeWikidata().wikidata,
        sparql: {
          itemsFor: async () => {
            throw new HttpError('HTTP 500 after 6 tries', 'u', 500);
          },
        },
      },
      { log },
    );
    expect(failed.rows[0].candidates[0].wikidata).toEqual([]);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/P434 fallback failed/),
    );
  });
});
