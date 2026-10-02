import { describe, expect, it, vi } from 'vitest';
import { parentAreaOf, resolveArea } from '../areas';
import type { MbAreaFull } from '../musicbrainz';
import {
  countryName,
  createPlaceBook,
  distanceKm,
  SAME_PLACE_KM,
} from '../placeMap';
import type { WdEntity, WdStatement } from '../wikidata';
import {
  currentCountryOf,
  datesOf,
  earliestDate,
  latestDate,
  placeKindOf,
  wdDate,
} from '../wikidataClaims';

describe('mapping a place to ours', () => {
  it('finds one of our cities by name and country', () => {
    const book = createPlaceBook();
    expect(
      book.place({ name: 'Detroit', country: 'US', coordinates: null }),
    ).toMatchObject({ kind: 'existing', placeId: 'detroit' });
    // The country as Wikidata names it, or as an ISO code.
    expect(
      book.place({
        name: 'Oslo',
        country: 'Norway',
        coordinates: [59.91, 10.75],
      }),
    ).toMatchObject({ kind: 'existing' });
    expect(book.created()).toEqual([]);
  });

  it('tells two Portlands apart by where they are when the country cannot', () => {
    const book = createPlaceBook();
    const oregon = book.place({
      name: 'Portland',
      country: 'US',
      coordinates: [45.52, -122.68],
    });
    const maine = book.place({
      name: 'Portland',
      country: 'US',
      coordinates: [43.66, -70.26],
    });
    expect(oregon.kind).toBe('existing');
    expect(maine.kind).toBe('existing');
    expect(oregon).not.toEqual(maine);
  });

  it("creates a pin:false place at Wikidata's coordinates, once for everyone within 25 km", () => {
    const book = createPlaceBook();
    const first = book.place({
      name: 'Tottenham',
      country: 'GB',
      coordinates: [51.5975, -0.0681],
      wikidata: 'Q2',
    });
    const second = book.place({
      name: 'Tottenham',
      country: 'United Kingdom',
      coordinates: [51.6, -0.07],
    });
    expect(first).toMatchObject({ kind: 'create', placeId: 'tottenham' });
    expect(second).toMatchObject({ kind: 'create', placeId: 'tottenham' });
    expect(book.created()).toHaveLength(1);
    expect(book.created()[0]).toMatchObject({
      slug: 'tottenham',
      wikidata: 'Q2',
      body: {
        id: 'tottenham',
        name: 'Tottenham',
        country: 'UK',
        coordinates: [51.5975, -0.0681],
        pin: false,
        genres: [],
        activeDecades: [],
      },
    });
  });

  it('makes a second place of the same name farther than 25 km away its own', () => {
    const book = createPlaceBook();
    const east = book.place({
      name: 'Springfield',
      country: 'US',
      coordinates: [42.1, -72.59],
      wikidata: 'Q49158',
    });
    expect(east).toMatchObject({ kind: 'create', placeId: 'springfield' });
    const west = book.place({
      name: 'Springfield',
      country: 'US',
      coordinates: [39.8, -89.64],
      wikidata: 'Q28515',
    });
    // Neither keeps the plain slug once there are two: each says which.
    expect(west).toMatchObject({
      kind: 'create',
      placeId: 'springfield-us-q28515',
    });
    expect(book.created().map((p) => p.slug)).toEqual([
      'springfield-us-q49158',
      'springfield-us-q28515',
    ]);
    // Another country's Springfield is told apart by its country alone.
    book.place({
      name: 'Springfield',
      country: 'Canada',
      coordinates: [45.75, -64.8],
      wikidata: 'Q3491640',
    });
    expect(book.created().map((p) => p.slug)).toEqual([
      'springfield-us-q49158',
      'springfield-us-q28515',
      'springfield-canada',
    ]);
  });

  it('gives every place the same slug whatever order the artists ask in', () => {
    const facts = [
      {
        name: 'Henderson',
        country: 'US',
        coordinates: [36.33, -78.42] as [number, number],
        wikidata: 'Q12891494',
      },
      {
        name: 'Henderson',
        country: 'US',
        coordinates: [36.03, -114.98] as [number, number],
        wikidata: 'Q49267',
      },
      {
        name: 'Tottenham',
        country: 'GB',
        coordinates: [51.5975, -0.0681] as [number, number],
        wikidata: 'Q2',
      },
    ];
    const slugsAfter = (order: typeof facts) => {
      const book = createPlaceBook();
      for (const fact of order) book.place(fact);
      // The second round is the one used (buildSuggestions asks twice).
      return Object.fromEntries(
        order.map((fact) => {
          const match = book.place(fact);
          return [fact.wikidata, match.kind === 'create' ? match.placeId : ''];
        }),
      );
    };
    const forward = slugsAfter(facts);
    expect(slugsAfter([...facts].reverse())).toEqual(forward);
    expect(forward).toEqual({
      Q12891494: 'henderson-us-q12891494',
      Q49267: 'henderson-us-q49267',
      Q2: 'tottenham',
    });
  });

  it('is one place when two sources spell its country differently', () => {
    const book = createPlaceBook();
    // Wikidata: Bayamón is in the United States (P17); MusicBrainz walks it
    // up to Puerto Rico. The globe spells Puerto Rico as a country.
    const wikidata = book.place({
      name: 'Bayamón',
      country: 'United States of America',
      coordinates: [18.3833, -66.15],
      wikidata: 'Q739675',
    });
    const musicbrainz = book.place({
      name: 'Bayamón',
      country: 'PR',
      coordinates: [18.39, -66.16],
      mbArea: 'area-bayamon',
    });
    expect(wikidata).toMatchObject({ kind: 'create', placeId: 'bayamon' });
    expect(musicbrainz).toMatchObject({ kind: 'create', placeId: 'bayamon' });
    expect(book.created()).toHaveLength(1);
    expect(book.created()[0]).toMatchObject({
      wikidata: 'Q739675',
      mbArea: 'area-bayamon',
      body: { country: 'Puerto Rico' },
    });
    // The same Wikidata item is the same place, whatever it is called.
    expect(
      book.place({
        name: 'Bayamon',
        country: 'US',
        coordinates: [18.4, -66.2],
        wikidata: 'Q739675',
      }),
    ).toMatchObject({ placeId: 'bayamon' });
    expect(book.created()).toHaveLength(1);
  });

  it('finds a place without asking for one: ours, or one another source asked for', () => {
    const book = createPlaceBook();
    expect(
      book.find({ name: 'Detroit', country: 'US', coordinates: null }),
    ).toMatchObject({ kind: 'existing', placeId: 'detroit' });
    const bel = {
      name: 'Bel Air',
      country: 'US',
      coordinates: [34.1, -118.46] as [number, number],
      wikidata: 'Q123',
    };
    expect(book.find(bel).kind).toBe('none');
    expect(book.created()).toEqual([]);
    book.place(bel);
    expect(book.find(bel)).toMatchObject({
      kind: 'create',
      placeId: 'bel-air',
    });
  });

  it('never takes one of our cities that is far from where the source says', () => {
    const book = createPlaceBook();
    // A "Washington D.C." 900 km away is not ours.
    const far = book.place({
      name: 'Washington D.C.',
      country: 'US',
      coordinates: [42.33, -83.05],
    });
    expect(far.kind).toBe('create');
  });

  it('creates nothing it cannot place: no coordinates, no country, no region', () => {
    const book = createPlaceBook();
    expect(
      book.place({ name: 'Nowhere Town', country: 'US', coordinates: null }),
    ).toMatchObject({
      kind: 'none',
      reason: expect.stringMatching(/coordinates/),
    });
    expect(
      book.place({ name: 'Nowhere Town', country: null, coordinates: [1, 1] }),
    ).toMatchObject({ kind: 'none', reason: expect.stringMatching(/country/) });
    expect(
      book.place({
        name: 'Nowhere Town',
        country: 'Atlantis',
        coordinates: [1, 1],
      }),
    ).toMatchObject({ kind: 'none', reason: expect.stringMatching(/region/) });
  });

  it('measures distance on the globe', () => {
    // New York to Newark is about 15 km: close, but a different name.
    expect(distanceKm([40.71, -74.01], [40.74, -74.17])).toBeLessThan(
      SAME_PLACE_KM,
    );
    expect(distanceKm([51.5, -0.12], [48.86, 2.35])).toBeGreaterThan(300);
  });

  it('spells a country the way the globe folds it', () => {
    expect(countryName('US')).toBe('US');
    expect(countryName('DE')).toBe('Germany');
    expect(countryName("People's Republic of China")).toBe('China');
    // Intl's names for some codes are not the globe's.
    expect(countryName('CD')).toBe('DR Congo');
    expect(countryName('TR')).toBe('Turkey');
    expect(countryName(null)).toBeNull();
  });
});

// ── MusicBrainz areas ────────────────────────────────────────────────────

const AREA = {
  detroit: '00000000-0000-4000-8000-000000000001',
  wayne: '00000000-0000-4000-8000-000000000002',
  michigan: '00000000-0000-4000-8000-000000000003',
  corktown: '00000000-0000-4000-8000-000000000004',
  tottenham: '00000000-0000-4000-8000-000000000005',
  us: '00000000-0000-4000-8000-000000000006',
};
const areaRef = (id: string, name: string, more = {}) => ({
  id,
  name,
  ...more,
});
const partOf = (parent: ReturnType<typeof areaRef>) => ({
  type: 'part of',
  direction: 'backward',
  area: parent,
});

describe('MusicBrainz areas', () => {
  const areas: Record<string, MbAreaFull> = {
    [AREA.detroit]: {
      ...areaRef(AREA.detroit, 'Detroit'),
      type: 'City',
      relations: [
        {
          type: 'part of',
          direction: 'forward',
          area: areaRef(AREA.corktown, 'Corktown'),
        },
        partOf(areaRef(AREA.wayne, 'Wayne County')),
        {
          type: 'wikidata',
          url: { id: 'u', resource: 'https://www.wikidata.org/wiki/Q12439' },
        },
      ],
    },
    [AREA.wayne]: {
      ...areaRef(AREA.wayne, 'Wayne County'),
      type: 'County',
      relations: [
        partOf(
          areaRef(AREA.michigan, 'Michigan', { 'iso-3166-2-codes': ['US-MI'] }),
        ),
      ],
    },
  };
  const mb = {
    lookupArea: vi.fn(async (id: string) => areas[id] ?? null),
  };

  it('looks an area up for its type, and walks up to its country', async () => {
    const detroit = await resolveArea(mb, areaRef(AREA.detroit, 'Detroit'));
    expect(detroit).toMatchObject({
      type: 'City',
      isCountry: false,
      countryCode: 'US',
      wikidata: 'Q12439',
      chain: ['Detroit', 'Wayne County', 'Michigan'],
      complete: true,
    });
    // Detroit, then Wayne County; Michigan's code named the country.
    expect(mb.lookupArea.mock.calls.map(([id]) => id)).toEqual([
      AREA.detroit,
      AREA.wayne,
    ]);
  });

  it('takes a country as it is, and a subdivision code as its country', async () => {
    mb.lookupArea.mockClear();
    expect(
      await resolveArea(mb, {
        id: AREA.us,
        name: 'United States',
        'iso-3166-1-codes': ['US'],
      }),
    ).toMatchObject({ isCountry: true, countryCode: 'US', type: 'Country' });
    expect(mb.lookupArea).not.toHaveBeenCalled();
  });

  it('stops where the cache stops, and says so', async () => {
    const miss = await resolveArea(
      { lookupArea: async () => null },
      areaRef(AREA.tottenham, 'Tottenham'),
    );
    expect(miss).toMatchObject({ type: null, complete: false });
  });

  it('reads the parent from the backward "part of" relation', () => {
    expect(parentAreaOf(areas[AREA.detroit])?.name).toBe('Wayne County');
    expect(parentAreaOf({ id: 'x', name: 'X', relations: [] })).toBeNull();
  });
});

// ── Wikidata claims ──────────────────────────────────────────────────────

const pointsAt = (
  property: string,
  id: string,
  more: Partial<WdStatement> = {},
): WdStatement => ({
  mainsnak: {
    snaktype: 'value',
    property,
    datavalue: { type: 'wikibase-entityid', value: { id } },
  },
  ...more,
});

describe('Wikidata claims', () => {
  it("takes a place's country from its preferred or current statement", () => {
    const oslo: WdEntity = {
      id: 'Q585',
      claims: {
        P17: [
          pointsAt('P17', 'Q1', {
            qualifiers: { P582: [{ snaktype: 'value', property: 'P582' }] },
          }),
          pointsAt('P17', 'Q20'),
        ],
      },
    };
    expect(currentCountryOf(oslo)).toBe('Q20');
    const preferred: WdEntity = {
      id: 'Q1',
      claims: {
        P17: [
          pointsAt('P17', 'Q5'),
          pointsAt('P17', 'Q6', { rank: 'preferred' }),
        ],
      },
    };
    expect(currentCountryOf(preferred)).toBe('Q6');
    const deprecated: WdEntity = {
      id: 'Q1',
      claims: { P17: [pointsAt('P17', 'Q7', { rank: 'deprecated' })] },
    };
    expect(currentCountryOf(deprecated)).toBeNull();
  });

  it('keeps a date at the precision Wikidata states it', () => {
    expect(wdDate({ time: '+1939-04-02T00:00:00Z', precision: 11 })).toEqual({
      date: '1939-04-02',
      precision: 11,
    });
    expect(wdDate({ time: '+1939-04-00T00:00:00Z', precision: 10 })?.date).toBe(
      '1939-04',
    );
    expect(wdDate({ time: '+1939-00-00T00:00:00Z', precision: 9 })?.date).toBe(
      '1939',
    );
    expect(wdDate({ time: '+1221-11-23T00:00:00Z', precision: 11 })?.date).toBe(
      '1221-11-23',
    );
    expect(wdDate({ time: '+1900-00-00T00:00:00Z', precision: 8 })).toBeNull();
    expect(wdDate({ time: '-0500-00-00T00:00:00Z', precision: 9 })).toBeNull();
  });

  it('tells a city from a country or a subdivision', () => {
    const city: WdEntity = {
      id: 'Q64',
      claims: { P31: [pointsAt('P31', 'Q515')], P300: [pointsAt('P300', 'x')] },
    };
    expect(placeKindOf(city)).toBe('settlement');
    expect(
      placeKindOf({ id: 'Q30', claims: { P31: [pointsAt('P31', 'Q6256')] } }),
    ).toBe('country');
    expect(
      placeKindOf({ id: 'Q1166', claims: { P300: [pointsAt('P300', 'x')] } }),
    ).toBe('subdivision');
    // Nothing read says what it is: offered, never sure (artistFields).
    expect(placeKindOf({ id: 'Q2', claims: {} })).toBe('unclassified');
  });

  it('never takes a building or a street for a place', () => {
    const hospital: WdEntity = {
      id: 'Q5',
      claims: { P31: [pointsAt('P31', 'Q16917')] },
    };
    expect(placeKindOf(hospital)).toBe('building');
    // A class the table doesn't list, known by its name once it is fetched.
    const ranch: WdEntity = {
      id: 'Q6',
      claims: { P31: [pointsAt('P31', 'Q999')] },
    };
    expect(placeKindOf(ranch)).toBe('unclassified');
    expect(placeKindOf(ranch, () => 'cattle ranch')).toBe('building');
    expect(
      placeKindOf({ id: 'Q7', claims: { P31: [pointsAt('P31', 'Q47168')] } }),
    ).toBe('subdivision');
    // Walton Hospital is an "architectural structure": the class, or else
    // the name, says so.
    const walton = (classes: string[]): WdEntity => ({
      id: 'Q26643857',
      labels: { en: { language: 'en', value: 'Walton Hospital' } },
      claims: { P31: classes.map((c) => pointsAt('P31', c)) },
    });
    expect(placeKindOf(walton(['Q811979']))).toBe('building');
    expect(placeKindOf(walton(['Q999']))).toBe('building');
    const street: WdEntity = {
      id: 'Q8',
      labels: { en: { language: 'en', value: 'Rivington Street' } },
      claims: { P31: [pointsAt('P31', 'Q928830')] },
    };
    expect(placeKindOf(street)).toBe('building');
  });

  it('reads counties, regions and metropolitan areas as too big', () => {
    const named = (label: string, cls = 'Q999'): WdEntity => ({
      id: 'Q9',
      labels: { en: { language: 'en', value: label } },
      claims: { P31: [pointsAt('P31', cls)] },
    });
    expect(placeKindOf(named('Williamson County'))).toBe('subdivision');
    expect(placeKindOf(named('San Francisco Bay Area'))).toBe('subdivision');
    expect(placeKindOf(named('Kent'), () => 'county of Tennessee')).toBe(
      'subdivision',
    );
    // "Human settlement" beside a county class is the county (Somerset).
    const somerset: WdEntity = {
      id: 'Q23157',
      labels: { en: { language: 'en', value: 'Somerset' } },
      claims: {
        P31: [pointsAt('P31', 'Q180673'), pointsAt('P31', 'Q486972')],
      },
    };
    expect(placeKindOf(somerset)).toBe('subdivision');
    expect(
      placeKindOf({ id: 'Q10', claims: { P31: [pointsAt('P31', 'Q486972')] } }),
    ).toBe('settlement');
  });

  it('lets a class that names a town win: a city that is also a county, a village called Hospital', () => {
    const label = (id: string) =>
      ({
        Q1: 'consolidated city-county',
        Q2: 'county of California',
        Q3: 'village in Ireland',
        Q4: 'city of Ohio',
        Q5: 'neighborhood of Manhattan',
        Q6: 'town hall',
      })[id] ?? null;
    const item = (name: string, classes: string[]): WdEntity => ({
      id: 'Q0',
      labels: { en: { language: 'en', value: name } },
      claims: { P31: classes.map((c) => pointsAt('P31', c)) },
    });
    expect(placeKindOf(item('San Francisco', ['Q1', 'Q2']), label)).toBe(
      'settlement',
    );
    expect(placeKindOf(item('Hospital', ['Q3']), label)).toBe('settlement');
    expect(placeKindOf(item('Kent', ['Q4']), label)).toBe('settlement');
    expect(placeKindOf(item("Hell's Kitchen", ['Q5']), label)).toBe(
      'settlement',
    );
    expect(placeKindOf(item('Old Town Hall', ['Q6']), label)).toBe('building');
  });
});

describe('Wikidata dates', () => {
  const at = (
    property: string,
    time: string,
    more: Partial<WdStatement> = {},
  ): WdStatement => ({
    mainsnak: {
      snaktype: 'value',
      property,
      datavalue: {
        type: 'time',
        value: {
          time: `+${time.length === 4 ? `${time}-00-00` : time}T00:00:00Z`,
          precision: time.length === 4 ? 9 : 11,
        },
      },
    },
    ...more,
  });
  const ended = {
    qualifiers: { P582: [{ snaktype: 'value', property: 'P582' }] },
  };

  it('takes the first formation and the last stop, end times or not', () => {
    // ABBA: formed 1970 (ended 1982), 2016 (ended 2016), and 2018.
    const abba: WdEntity = {
      id: 'Q18233',
      claims: {
        P571: [
          at('P571', '1970', ended),
          at('P571', '2016', ended),
          at('P571', '2018'),
        ],
        P2031: [at('P2031', '1995'), at('P2031', '2023')],
        P2032: [at('P2032', '2004'), at('P2032', '2024')],
      },
    };
    expect(earliestDate(abba, 'P571')?.date).toBe('1970');
    expect(earliestDate(abba, 'P2031')?.date).toBe('1995');
    expect(latestDate(abba, 'P2032')?.date).toBe('2024');
  });

  it('prefers the preferred statements, and keeps two dates both preferred', () => {
    // Grant Green: 1935 is preferred over 1931.
    const green: WdEntity = {
      id: 'Q601427',
      claims: {
        P569: [
          at('P569', '1931-06-06'),
          at('P569', '1935-06-06', { rank: 'preferred' }),
        ],
      },
    };
    expect(datesOf(green, 'P569').map((d) => d.date)).toEqual(['1935-06-06']);
    // Machito: two preferred birth dates, and a year that agrees with one.
    const machito: WdEntity = {
      id: 'Q462983',
      claims: {
        P569: [
          at('P569', '1912-02-16', { rank: 'preferred' }),
          at('P569', '1908-02-16', { rank: 'preferred' }),
          at('P569', '1912'),
        ],
      },
    };
    expect(datesOf(machito, 'P569').map((d) => d.date)).toEqual([
      '1912-02-16',
      '1908-02-16',
    ]);
    const deprecated: WdEntity = {
      id: 'Q1',
      claims: { P569: [at('P569', '1900', { rank: 'deprecated' })] },
    };
    expect(datesOf(deprecated, 'P569')).toEqual([]);
  });
});
