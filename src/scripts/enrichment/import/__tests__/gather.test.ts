import { describe, expect, it, vi } from 'vitest';
import { planArtistFetch } from '../artistFetch';
import { buildSuggestions, scoreArtists } from '../buildSuggestions';
import type { ArtistCacheRow } from '../cacheStage';
import { batchOf } from '../emit';
import { gatherEvidence } from '../gather';
import type { MusicBrainzClient } from '../musicbrainz';
import { scoreIdentity } from '../scoreIdentity';
import type { WdEntity, WdStatement, WikidataClient } from '../wikidata';
import { candidate, evidence, mbid, songCandidate } from './scoreFixtures';

const noWikidata: WikidataClient = {
  getEntities: async () => new Map(),
  inHand: async () => new Map(),
};

describe('a MusicBrainz id merged into another', () => {
  // War's songs are billed to two ids; MusicBrainz has since merged the
  // older one (1) into the band (2), so both lookups answer as the band.
  const registry = [{ slug: 'war', name: 'War' }];
  const cacheArtists: ArtistCacheRow[] = [
    {
      slug: 'war',
      name: 'War',
      songIds: ['low_rider', 'why_cant_we'],
      candidates: [
        { ...songCandidate(2, ['low_rider'], []), name: 'War' },
        { ...songCandidate(1, ['why_cant_we']), name: 'War' },
      ],
    },
  ];
  const band = { id: mbid(2), name: 'War', type: 'Group' };
  const mb: MusicBrainzClient = {
    searchArtists: vi.fn(async () => ({ artists: [] })),
    lookupArtist: vi.fn(async () => band),
    browseReleaseGroups: vi.fn(async () => ({ releaseGroups: [] })),
    lookupArea: vi.fn(async () => null),
  };

  it('is one candidate, carrying the billing of every id that led to it', async () => {
    const {
      evidence: [war],
      rows,
    } = await gatherEvidence(
      {
        registry,
        queue: planArtistFetch(registry, cacheArtists),
        cacheArtists,
        cacheSongs: [],
        songs: [],
        events: [],
        artistLocations: {},
      },
      { mb, wikidata: noWikidata, known: new Map() },
    );
    expect(rows[0].candidates).toEqual([
      expect.objectContaining({ mbid: mbid(2), askedAs: [mbid(1)] }),
    ]);
    expect(war.candidates.map((c) => [c.mbid, c.askedAs])).toEqual([
      [mbid(2), [mbid(1)]],
    ]);
    // Not its own runner-up, and the old id's own-record credit counts.
    const identity = scoreIdentity(war);
    expect(identity.tier).not.toBe('ambiguous');
    expect(identity.ranked).toHaveLength(1);
    expect(identity.pick?.songEvidence).toBe('strong');
  });
});

describe('place slugs across artists', () => {
  const item = (property: string, id: string): WdStatement => ({
    mainsnak: {
      snaktype: 'value',
      property,
      datavalue: { type: 'wikibase-entityid', value: { id } },
    },
  });
  const coords = (latitude: number, longitude: number): WdStatement => ({
    mainsnak: {
      snaktype: 'value',
      property: 'P625',
      datavalue: { type: 'globecoordinate', value: { latitude, longitude } },
    },
  });
  const entity = (
    id: string,
    label: string,
    claims: Record<string, WdStatement[]>,
  ): WdEntity => ({
    id,
    labels: { en: { language: 'en', value: label } },
    claims,
  });
  const entities = new Map(
    [
      entity('Q10', 'Ben', {
        P31: [item('P31', 'Q5')],
        P19: [item('P19', 'Q1')],
      }),
      entity('Q20', 'Celine', {
        P31: [item('P31', 'Q5')],
        P19: [item('P19', 'Q2')],
      }),
      entity('Q1', 'Henderson', {
        P31: [item('P31', 'Q1093829')],
        P17: [item('P17', 'Q30')],
        P625: [coords(36.33, -78.42)],
      }),
      entity('Q2', 'Henderson', {
        P31: [item('P31', 'Q1093829')],
        P17: [item('P17', 'Q30')],
        P625: [coords(36.03, -114.98)],
      }),
      entity('Q30', 'United States of America', {}),
    ].map((e) => [e.id, e]),
  );
  const wd = {
    item: (id: string) => entities.get(id),
    place: (id: string) => entities.get(id),
    label: (id: string) => entities.get(id)?.labels?.en?.value ?? null,
  };
  const artist = (slug: string, n: number, qid: string) =>
    evidence({
      slug,
      name: `${slug} name`,
      songCandidates: [songCandidate(n, [`${slug}-song`])],
      years: [1960],
      candidates: [
        candidate(n, {
          name: `${slug} name`,
          lifeSpan: { begin: '1940' },
          wikidata: [qid],
        }),
      ],
    });

  it('are the same whichever artist comes first', () => {
    const ben = artist('ben', 1, 'Q10');
    const celine = artist('celine', 2, 'Q20');
    const born = (order: (typeof ben)[]) =>
      buildSuggestions(scoreArtists(order).scored, [], wd, 'mb-x')
        .suggestions.filter((s) => s.path === 'born.placeId')
        .map((s) => [s.target.slug, s.value, s.id])
        .sort();
    const forward = born([ben, celine]);
    expect(born([celine, ben])).toEqual(forward);
    expect(forward.map(([slug, value]) => [slug, value])).toEqual([
      ['ben', 'henderson-us-q1'],
      ['celine', 'henderson-us-q2'],
    ]);
  });
});

describe('the batch a run names', () => {
  it('is the day of the newest answer scoring read, not of anything else in the cache', () => {
    const manifest = {
      responses: {
        count: 3,
        byHost: {},
        digest: 'd',
        entries: [
          {
            url: 'a',
            status: 200,
            sha256: '',
            fetchedAt: '2026-09-29T20:00:00Z',
          },
          {
            url: 'b',
            status: 200,
            sha256: '',
            fetchedAt: '2026-09-30T08:00:00Z',
          },
          // F2's song lookups, a week later.
          {
            url: 'song',
            status: 200,
            sha256: '',
            fetchedAt: '2026-10-07T10:00:00Z',
          },
        ],
      },
    };
    expect(batchOf(manifest, new Set(['a', 'b']))).toBe('mb-2026-09-30');
    expect(batchOf(manifest, new Set())).toBe('mb-unfetched');
  });
});
