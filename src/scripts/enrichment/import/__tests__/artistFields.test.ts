import { describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import type { Suggestion } from '@/content/suggestions/types';
import {
  artistSuggestions,
  displayDate,
  type WikidataView,
} from '../artistFields';
import { genreIdOf, mapGenre } from '../genreMap';
import { mapInstrument } from '../instrumentMap';
import { createPlaceBook } from '../placeMap';
import {
  type ArtistEvidence,
  type CandidateFacts,
  scoreIdentity,
} from '../scoreIdentity';
import type { WdEntity, WdStatement } from '../wikidata';
import {
  area,
  candidate,
  evidence,
  mbid,
  songCandidate,
} from './scoreFixtures';

// ── Wikidata fixtures ────────────────────────────────────────────────────

const item = (
  property: string,
  id: string,
  rank?: 'preferred',
): WdStatement => ({
  mainsnak: {
    snaktype: 'value',
    property,
    datavalue: { type: 'wikibase-entityid', value: { id } },
  },
  ...(rank ? { rank } : {}),
});
const time = (
  property: string,
  when: string,
  precision: number,
  more: Partial<WdStatement> = {},
): WdStatement => ({
  mainsnak: {
    snaktype: 'value',
    property,
    datavalue: {
      type: 'time',
      value: { time: `+${when}T00:00:00Z`, precision },
    },
  },
  ...more,
});
const coords = (latitude: number, longitude: number): WdStatement => ({
  mainsnak: {
    snaktype: 'value',
    property: 'P625',
    datavalue: { type: 'globecoordinate', value: { latitude, longitude } },
  },
});
const text = (property: string, value: string): WdStatement => ({
  mainsnak: {
    snaktype: 'value',
    property,
    datavalue: { type: 'string', value },
  },
});

const entity = (
  id: string,
  label: string,
  claims: Record<string, WdStatement[]> = {},
): WdEntity => ({
  id,
  labels: { en: { language: 'en', value: label } },
  claims,
});

function view(entities: WdEntity[]): WikidataView {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return {
    item: (id) => byId.get(id),
    place: (id) => byId.get(id),
    label: (id) => byId.get(id)?.labels?.en?.value ?? null,
  };
}

// Marvin Gaye: born 2 Apr 1939 in Washington, D.C.; plays piano; soul.
const MARVIN = entity('Q1', 'Marvin Gaye', {
  P31: [item('P31', 'Q5')],
  P434: [text('P434', mbid(1))],
  P569: [time('P569', '1939-04-02', 11)],
  P19: [item('P19', 'Q61')],
  P136: [
    item('P136', 'Q131272'),
    item('P136', 'Q45981'),
    item('P136', 'Q999'),
    item('P136', 'Q37073'),
    item('P136', 'Q11399'),
  ],
  P1303: [item('P1303', 'Q5994'), item('P1303', 'Q6607')],
});
const WASHINGTON = entity('Q61', 'Washington, D.C.', {
  P31: [item('P31', 'Q5119')],
  P17: [item('P17', 'Q30')],
  P625: [coords(38.895, -77.0366)],
});
const TOTTENHAM = entity('Q2', 'Tottenham', {
  P17: [item('P17', 'Q145')],
  P625: [coords(51.5975, -0.0681)],
});
const LABELS = [
  entity('Q30', 'United States of America'),
  entity('Q145', 'United Kingdom'),
  entity('Q131272', 'soul music'),
  entity('Q45981', 'rhythm and blues'),
  entity('Q999', 'quiet storm music'),
  entity('Q37073', 'pop music'),
  entity('Q11399', 'rock music'),
  entity('Q5994', 'piano'),
  entity('Q6607', 'guitar'),
];

const run = (
  artist: ArtistEvidence,
  wd: WdEntity[] = [MARVIN, WASHINGTON, TOTTENHAM, ...LABELS],
  places = createPlaceBook(),
) => {
  const identity = scoreIdentity(artist);
  const pick = identity.pick
    ? (artist.candidates.find((c) => c.mbid === identity.pick!.mbid) ?? null)
    : null;
  return artistSuggestions({
    artist,
    identity,
    pick,
    candidates: artist.candidates,
    wd: view(wd),
    places,
    batch: 'mb-2026-10-01',
  });
};

const at = (suggestions: Suggestion[], path: string) =>
  suggestions.filter((s) => s.path === path);

/** Marvin Gaye, sure: his song on his own record, and his life-span. */
const marvin = (
  more: Partial<CandidateFacts> = {},
  artist: Partial<ArtistEvidence> = {},
) =>
  evidence({
    songCandidates: [songCandidate(1, ['lets_get_it_on'])],
    years: [1971],
    candidates: [
      candidate(1, {
        lifeSpan: { begin: '1939-04-02', end: '1984-04-01', ended: true },
        wikidata: ['Q1'],
        ...more,
      }),
    ],
    ...artist,
  });

describe('identity', () => {
  it('suggests the MusicBrainz and Wikidata ids, and rests every field on the first', () => {
    const { suggestions } = run(marvin());
    const [id] = at(suggestions, 'externalIds.mbid');
    expect(id).toMatchObject({
      value: mbid(1),
      tier: 'sure',
      sources: [
        {
          provider: 'musicbrainz',
          url: `https://musicbrainz.org/artist/${mbid(1)}`,
          externalId: mbid(1),
        },
      ],
    });
    expect(id.dependsOn).toBeUndefined();
    const [qid] = at(suggestions, 'externalIds.wikidata');
    // MusicBrainz links it and the item names the MBID back: two sources, +0.1.
    expect(qid.value).toBe('Q1');
    expect(qid.sources.map((s) => s.provider)).toEqual([
      'musicbrainz',
      'wikidata',
    ]);
    expect(
      suggestions.filter((s) => s !== id).every((s) => s.dependsOn === id.id),
    ).toBe(true);
  });

  it("names the item found by P434 as Wikidata's own word", () => {
    const { suggestions } = run(marvin({ wikidataVia: 'P434' }));
    expect(at(suggestions, 'externalIds.wikidata')[0].sources).toEqual([
      expect.objectContaining({ provider: 'wikidata', label: 'P434' }),
    ]);
  });

  it('offers one "pick the artist" row for an ambiguous name, and nothing else', () => {
    const artist = evidence({
      name: 'Common',
      oneWord: true,
      candidates: [
        candidate(1, { name: 'Common', disambiguation: 'US rapper' }),
        candidate(2, { name: 'Common', disambiguation: 'Finnish band' }),
      ],
    });
    const { suggestions } = run(artist);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      path: 'externalIds.mbid',
      tier: 'ambiguous',
      confidence: 0.35,
    });
    expect(suggestions[0].sources.map((s) => s.externalId)).toEqual([
      mbid(1),
      mbid(2),
    ]);
    expect(suggestions[0].display).toContain('Common (Finnish band)');
  });

  it('offers nothing for a weak match', () => {
    expect(run(evidence({ candidates: [candidate(1)] })).suggestions).toEqual(
      [],
    );
  });
});

describe('Born', () => {
  it("takes a person's birth date at its precision, one row when both sources agree", () => {
    const { suggestions } = run(marvin());
    const [born] = at(suggestions, 'born.date');
    expect(born).toMatchObject({
      value: '1939-04-02',
      display: 'Born 2 Apr 1939',
      tier: 'sure',
      // 0.85 for the identity, +0.1 for two sources saying the same.
      confidence: 0.95,
    });
    expect(born.sources.map((s) => s.label)).toEqual([
      'life-span begin',
      'P569',
    ]);
  });

  it('keeps the finer date when a coarser one agrees with it, without the bonus', () => {
    const { suggestions } = run(marvin({ lifeSpan: { begin: '1939' } }));
    const born = at(suggestions, 'born.date');
    expect(born).toHaveLength(1);
    expect(born[0]).toMatchObject({ value: '1939-04-02', confidence: 0.85 });
  });

  it('shows two different dates side by side, neither sure', () => {
    const { suggestions } = run(marvin({ lifeSpan: { begin: '1940-01-01' } }));
    const born = at(suggestions, 'born.date');
    expect(born.map((s) => [s.value, s.tier])).toEqual(
      expect.arrayContaining([
        ['1939-04-02', 'likely'],
        ['1940-01-01', 'likely'],
      ]),
    );
  });

  it('shows both birth dates Wikidata stands by, neither sure', () => {
    const machito = entity('Q1', 'Marvin Gaye', {
      P31: [item('P31', 'Q5')],
      P569: [
        time('P569', '1912-02-16', 11, { rank: 'preferred' }),
        time('P569', '1908-02-16', 11, { rank: 'preferred' }),
      ],
    });
    const born = at(
      run(marvin({ lifeSpan: { begin: '1908-02-16' } }), [machito]).suggestions,
      'born.date',
    );
    expect(born.map((s) => [s.value, s.tier])).toEqual(
      expect.arrayContaining([
        ['1908-02-16', 'likely'],
        ['1912-02-16', 'likely'],
      ]),
    );
  });

  it('never takes a hospital for a birthplace, and says so', () => {
    const paul = entity('Q1', 'Marvin Gaye', {
      P31: [item('P31', 'Q5')],
      P19: [item('P19', 'Q26643857')],
    });
    const walton = entity('Q26643857', 'Walton Hospital', {
      P31: [item('P31', 'Q811979')],
      P17: [item('P17', 'Q145')],
      P625: [coords(53.45, -2.96)],
    });
    const { suggestions, report } = run(marvin(), [paul, walton, ...LABELS]);
    expect(at(suggestions, 'born.placeId')).toEqual([]);
    expect(report.places).toEqual([
      'Walton Hospital: a building or a street, not a birthplace',
    ]);
  });

  it('offers a place of unknown kind, never sure unless the song pins name it too', () => {
    const person = entity('Q1', 'Marvin Gaye', {
      P31: [item('P31', 'Q5')],
      P19: [item('P19', 'Q2')],
    });
    // Tottenham has no class here: nothing says it is a town.
    const alone = at(
      run(marvin(), [person, TOTTENHAM, ...LABELS]).suggestions,
      'born.placeId',
    );
    expect(alone).toEqual([
      expect.objectContaining({ value: 'tottenham', tier: 'likely' }),
    ]);
    expect(alone[0].evidence).toContain(
      "Wikidata doesn't say what kind of place Tottenham is",
    );
    const pinned = at(
      run(
        marvin(
          {},
          {
            pin: {
              key: 'marvin gaye',
              city: 'Tottenham',
              country: 'UK',
              coordinates: [51.6, -0.07],
              placeId: null,
            },
          },
        ),
        [person, TOTTENHAM, ...LABELS],
      ).suggestions,
      'born.placeId',
    );
    expect(pinned[0]).toMatchObject({ value: 'tottenham', tier: 'sure' });
  });

  it('dates a group from when it formed, as a year, and never gives it a birthplace', () => {
    const group = entity('Q9', 'Toto', {
      P571: [time('P571', '1977-01-01', 11)],
      P19: [item('P19', 'Q61')],
    });
    const { suggestions } = run(
      evidence({
        slug: 'toto',
        name: 'Toto',
        songCandidates: [songCandidate(9, ['africa'])],
        years: [1982],
        candidates: [
          candidate(9, {
            name: 'Toto',
            type: 'Group',
            lifeSpan: { begin: '1977' },
            wikidata: ['Q9'],
          }),
        ],
      }),
      [group, WASHINGTON, ...LABELS],
    );
    expect(at(suggestions, 'born.date')).toEqual([
      expect.objectContaining({ value: '1977', display: 'Formed 1977' }),
    ]);
    expect(at(suggestions, 'born.placeId')).toEqual([]);
    expect(at(suggestions, 'group')[0]).toMatchObject({ value: true });
  });

  it('places a birthplace among our cities, and counts the song pin when it agrees', () => {
    const pinned = run(
      marvin(
        {},
        {
          pin: {
            key: 'marvin gaye',
            city: 'Washington',
            country: 'US',
            coordinates: [38.9, -77.04],
            placeId: null,
          },
        },
      ),
    );
    const [place] = at(pinned.suggestions, 'born.placeId');
    expect(place).toMatchObject({
      value: 'washington-dc',
      display: 'Born in Washington D.C.',
    });
    expect(place.requires).toBeUndefined();
    expect(place.sources.map((s) => s.provider)).toEqual(['wikidata', 'app']);
    expect(place.evidence).toContain('the song pins say Washington too');
  });

  it("creates a pin:false place for a birthplace that isn't one of ours", () => {
    const adele = entity('Q3', 'Adele', {
      P31: [item('P31', 'Q5')],
      P19: [item('P19', 'Q2')],
    });
    const { suggestions } = run(
      evidence({
        slug: 'adele',
        name: 'Adele',
        songCandidates: [songCandidate(3, ['hello'])],
        years: [2015],
        candidates: [
          candidate(3, {
            name: 'Adele',
            lifeSpan: { begin: '1988-05-05' },
            wikidata: ['Q3'],
            beginArea: area('Tottenham', {
              type: 'District',
              countryCode: 'GB',
              wikidata: 'Q2',
            }),
          }),
        ],
      }),
      [adele, TOTTENHAM, ...LABELS],
    );
    const [place] = at(suggestions, 'born.placeId');
    expect(place.value).toBe('tottenham');
    // MusicBrainz's begin-area and Wikidata's P19: one place, created once.
    expect(place.sources.map((s) => s.label)).toEqual(['begin-area', 'P19']);
    expect(place.requires).toEqual([
      {
        kind: 'globe_city',
        slug: 'tottenham',
        body: expect.objectContaining({
          name: 'Tottenham',
          country: 'UK',
          region: expect.any(String),
          coordinates: [51.5975, -0.0681],
          pin: false,
        }),
      },
    ]);
  });
});

describe('City', () => {
  const detroit = area('Detroit', { type: 'City', countryCode: 'US' });

  it('is sure only where the song pin agrees', () => {
    const agreeing = run(
      marvin(
        { area: detroit },
        {
          pin: {
            key: 'marvin gaye',
            city: 'Detroit',
            country: 'US',
            coordinates: [42.33, -83.05],
            placeId: 'detroit',
          },
        },
      ),
    );
    // The area also lifts the identity (0.95); the pin agreeing adds 0.1.
    expect(at(agreeing.suggestions, 'basedInPlaceId')[0]).toMatchObject({
      value: 'detroit',
      tier: 'sure',
      confidence: 1,
    });

    const unpinned = run(marvin({ area: detroit }));
    expect(at(unpinned.suggestions, 'basedInPlaceId')[0]).toMatchObject({
      value: 'detroit',
      tier: 'likely',
    });

    const elsewhere = run(
      marvin(
        { area: detroit },
        {
          pin: {
            key: 'marvin gaye',
            city: 'Washington',
            country: 'US',
            coordinates: [38.9, -77.04],
            placeId: null,
          },
        },
      ),
    );
    const [city] = at(elsewhere.suggestions, 'basedInPlaceId');
    expect(city.tier).toBe('likely');
    expect(city.evidence).toContain('the song pins say Washington');
  });

  it('never offers a residence (P551) as the City on its own', () => {
    const BEL_AIR = entity('Q123705', 'Bel Air', {
      P31: [item('P31', 'Q123705')],
      P17: [item('P17', 'Q30')],
      P625: [coords(34.1, -118.46)],
    });
    const DETROIT = entity('Q12439', 'Detroit', {
      P31: [item('P31', 'Q515')],
      P17: [item('P17', 'Q30')],
      P625: [coords(42.33, -83.05)],
    });
    const person = entity('Q1', 'Marvin Gaye', {
      P31: [item('P31', 'Q5')],
      P551: [item('P551', 'Q123705'), item('P551', 'Q12439')],
    });
    const wd = [person, BEL_AIR, DETROIT, ...LABELS];
    const alone = run(marvin(), wd);
    expect(at(alone.suggestions, 'basedInPlaceId')).toEqual([]);
    expect(alone.report.residences.sort()).toEqual(['Bel Air', 'Detroit']);

    // The song pins say Detroit too: that residence is offered, and is sure.
    const pinned = run(
      marvin(
        {},
        {
          pin: {
            key: 'marvin gaye',
            city: 'Detroit',
            country: 'US',
            coordinates: [42.33, -83.05],
            placeId: 'detroit',
          },
        },
      ),
      wd,
    );
    const cities = at(pinned.suggestions, 'basedInPlaceId');
    expect(cities.map((s) => [s.value, s.tier])).toEqual([['detroit', 'sure']]);
    expect(cities[0].sources.map((s) => s.label)).toEqual([
      'P551',
      'artist_location "marvin gaye" city',
    ]);
    // A place only a residence names is never asked to be created.
    expect(cities.every((s) => !s.requires)).toBe(true);

    // MusicBrainz's area says Detroit: the residence is one more source.
    const agreeing = run(
      marvin({ area: area('Detroit', { type: 'City', countryCode: 'US' }) }),
      wd,
    );
    expect(
      at(agreeing.suggestions, 'basedInPlaceId').map((s) =>
        s.sources.map((x) => x.label),
      ),
    ).toEqual([['area', 'P551']]);
  });

  it("takes only a City or Municipality area, never a country's", () => {
    const { suggestions } = run(
      marvin({ area: area('Michigan', { type: 'Subdivision' }) }),
    );
    expect(at(suggestions, 'basedInPlaceId')).toEqual([]);
  });
});

describe('Years Active', () => {
  it("never reads a person's life-span as years active", () => {
    const { suggestions } = run(marvin());
    expect(at(suggestions, 'activeFrom')).toEqual([]);
    expect(at(suggestions, 'activeTo')).toEqual([]);
  });

  it("takes a group's life-span, and P2031/P2032 for anyone", () => {
    const person = entity('Q1', 'Marvin Gaye', {
      P31: [item('P31', 'Q5')],
      P2031: [time('P2031', '1957-00-00', 9)],
    });
    expect(at(run(marvin(), [person]).suggestions, 'activeFrom')[0].value).toBe(
      1957,
    );
    const { suggestions } = run(
      evidence({
        slug: 'abba',
        name: 'ABBA',
        songCandidates: [songCandidate(4, ['dancing_queen'])],
        years: [1976],
        candidates: [
          candidate(4, {
            name: 'ABBA',
            type: 'Group',
            lifeSpan: { begin: '1972-09', end: '2022', ended: true },
          }),
        ],
      }),
    );
    expect(at(suggestions, 'activeFrom')[0].value).toBe(1972);
    expect(at(suggestions, 'activeTo')[0].value).toBe(2022);
  });

  it('never makes an end sure while MusicBrainz says the act goes on, and takes the last one', () => {
    const toto = entity('Q9', 'Toto', {
      P2031: [time('P2031', '1977-00-00', 9), time('P2031', '2019-00-00', 9)],
      P2032: [time('P2032', '2008-00-00', 9), time('P2032', '2019-00-00', 9)],
    });
    const band = (ended: boolean) =>
      evidence({
        slug: 'toto',
        name: 'Toto',
        songCandidates: [songCandidate(9, ['africa'])],
        years: [1982],
        candidates: [
          candidate(9, {
            name: 'Toto',
            type: 'Group',
            lifeSpan: { begin: '1977', ended, end: ended ? '2019' : null },
            wikidata: ['Q9'],
          }),
        ],
      });
    const going = run(band(false), [toto, ...LABELS]).suggestions;
    const [end] = at(going, 'activeTo');
    expect(end).toMatchObject({ value: 2019, tier: 'likely' });
    expect(end.evidence).toContain('MusicBrainz says the group has not ended');
    // The first start, not the reunion.
    expect(at(going, 'activeFrom').map((s) => s.value)).toEqual([1977]);

    // Ended in MusicBrainz too, the same year: one sure end, two sources.
    const [ended] = at(
      run(band(true), [toto, ...LABELS]).suggestions,
      'activeTo',
    );
    expect(ended).toMatchObject({ value: 2019, tier: 'sure' });
    expect(ended.sources.map((s) => s.label)).toEqual([
      'life-span end',
      'P2032',
    ]);
  });
});

describe('Genres and Instruments', () => {
  it('maps P136 through the genre table, top three that map, MusicBrainz genres a signal', () => {
    const { suggestions, report } = run(marvin({ genres: ['soul'] }));
    const genres = at(suggestions, 'genreIds[]');
    // In the item's own order: its first three that map.
    expect(genres.map((s) => s.value)).toEqual(['soul', 'rnb', 'pop']);
    expect(report.genres).toEqual(['quiet storm music']);
    // Soul's parent agrees with MusicBrainz's "soul": +0.05, never a source.
    const soul = genres.find((s) => s.value === 'soul')!;
    expect(soul.confidence).toBe(0.9);
    expect(soul.sources.map((s) => s.provider)).toEqual(['wikidata']);
    expect(genres.every((s) => s.op === 'add')).toBe(true);
  });

  it('maps P1303 and band instruments, and reports what does not map', () => {
    const { suggestions, report } = run(
      marvin({
        memberOf: [
          {
            name: 'The Moonglows',
            attributes: ['original', 'piano', 'lead vocals'],
          },
        ],
      }),
    );
    const instruments = at(suggestions, 'instrumentIds[]');
    expect(instruments.map((s) => s.value).sort()).toEqual([
      'lead-vocals',
      'piano',
    ]);
    // Wikidata and MusicBrainz both say piano: one row, two sources.
    const piano = instruments.find((s) => s.value === 'piano')!;
    expect(piano.sources.map((s) => s.provider)).toEqual([
      'wikidata',
      'musicbrainz',
    ]);
    // Plain "guitar" names no one instrument of ours; "original" is not one.
    expect(report.instruments).toEqual(['guitar']);
  });

  it("reads the sources' names for genres and instruments", () => {
    expect(mapGenre('hip hop music')).toEqual({ genre: 'hip-hop' });
    expect(mapGenre('Rhythm and Blues')).toEqual({ genre: 'rnb' });
    expect(genreIdOf(mapGenre('soul music')!)).toBe('soul');
    expect(mapGenre('quiet storm')).toBeNull();
    expect(mapInstrument('drums (drum set)')).toBe('drum-kit');
    expect(mapInstrument('Bass Guitar')).toBe('electric-bass');
    expect(mapInstrument('tenor saxophone')).toBe('tenor-sax');
    expect(mapInstrument('saxophone')).toBeNull();
  });
});

describe('stable ids', () => {
  it('are the same on every import, and follow the value, never the source', () => {
    const once = run(marvin()).suggestions;
    const again = run(marvin()).suggestions;
    expect(again.map((s) => s.id)).toEqual(once.map((s) => s.id));
    const [born] = at(once, 'born.date');
    expect(born.id).toBe(
      suggestionId({
        target: { kind: 'artist', slug: 'marvin-gaye' },
        path: 'born.date',
        op: 'set',
        value: '1939-04-02',
      }),
    );
    // Only MusicBrainz now: the same value, the same id.
    const mbOnly = run(marvin(), []).suggestions;
    expect(at(mbOnly, 'born.date')[0].id).toBe(born.id);
    // A corrected date is a new suggestion.
    const corrected = run(
      marvin({ lifeSpan: { begin: '1939-04-03' } }),
      [],
    ).suggestions;
    expect(at(corrected, 'born.date')[0].id).not.toBe(born.id);
  });

  it('formats dates for the owner', () => {
    expect(displayDate('1939-04-02')).toBe('2 Apr 1939');
    expect(displayDate('1939-04')).toBe('Apr 1939');
    expect(displayDate('1939')).toBe('1939');
  });
});
