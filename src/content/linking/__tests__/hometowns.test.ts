import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import type { Song } from '@/curriculum/types/songLibrary';
import { SONG_PIN_REASON, whyNotBulk } from '../../suggestions/status';
import type { Suggestion } from '../../suggestions/types';
import { planHometowns } from '../hometowns';
import type { LinkingArtist } from '../types';

/**
 * Song pins as the act's City: always a guess a person accepts, and never
 * the birthplace unless someone else says it is.
 */

const pin = (id: string, city: string, lat: number, lng: number) => ({
  id,
  city,
  country: 'US',
  lat,
  lng,
});

const artists: LinkingArtist[] = [
  { slug: 'marvin-gaye', name: 'Marvin Gaye' },
  { slug: 'bob-seger', name: 'Bob Seger' },
  { slug: 'the-temptations', name: 'The Temptations', group: true },
  { slug: 'earth-wind-and-fire', name: 'Earth, Wind & Fire' },
  { slug: 'ani-difranco', name: 'Ani DiFranco' },
  { slug: 'ccr', name: 'CCR', aliases: ['Creedence Clearwater Revival'] },
];

const imported = (
  slug: string,
  path: string,
  value: string,
  requires?: Suggestion['requires'],
): Suggestion => ({
  id: `${slug}-${path}`,
  target: { kind: 'artist', slug },
  path,
  op: 'set',
  value,
  display: '',
  sources: [{ provider: 'wikidata' }],
  evidence: [],
  confidence: 0.9,
  tier: 'sure',
  batch: 'mb-test',
  ...(requires ? { requires } : {}),
});

describe('hometowns from the song pins', () => {
  const plan = planHometowns({
    places: CITIES,
    artists,
    songs: [
      {
        id: 'footloose',
        title: 'Footloose',
        artist: 'Kenny Loggins / Nathan East',
      },
    ] as Song[],
    artistLocations: [
      pin('marvin gaye', 'Washington', 38.91, -77.04),
      pin('bob seger', 'Detroit', 42.33, -83.05),
      pin('the temptations', 'Detroit', 42.33, -83.05),
      pin('earth, wind and fire', 'Chicago', 41.88, -87.63),
      pin('earth, wind, and fire', 'Chicago', 41.88, -87.63),
      pin('ani difranco', 'Buffalo', 42.89, -78.88),
      // Found by an alias, not by its slug.
      pin('creedence clearwater revival', 'San Francisco', 37.77, -122.42),
      pin('kenny loggins', 'Seattle', 47.61, -122.33),
      pin('chicago', 'Chicago', 41.88, -87.63),
      pin('blackstreet and dr. dre', 'New York', 40.71, -74.01),
      pin('traditional', 'New York', 40.71, -74.01),
      pin(
        'es una historia – i am singing – stevie wonder',
        'Detroit',
        42.33,
        -83.05,
      ),
    ],
  });
  const bySlug = Object.fromEntries(
    plan.planned.map((p) => [p.suggestion.target.slug, p.suggestion]),
  );

  it('offers every act its pins’ city as a City, and never in bulk', () => {
    expect(bySlug['marvin-gaye']).toMatchObject({
      target: { kind: 'artist', slug: 'marvin-gaye' },
      path: 'basedInPlaceId',
      op: 'set',
      value: 'washington-dc',
      display: 'City: Washington D.C. (song pins)',
      sources: [
        { provider: 'app', label: 'artist_location "marvin gaye" city' },
      ],
      tier: 'likely',
      confidence: 0.7,
    });
    // Likely, and never in bulk however sure it becomes: a person checks
    // every City read from song pins.
    for (const { suggestion } of plan.planned) {
      expect(suggestion.tier).toBe('likely');
      expect(whyNotBulk(suggestion, 'open')).toBe(SONG_PIN_REASON);
      expect(
        whyNotBulk({ ...suggestion, tier: 'sure', confidence: 1 }, 'open'),
      ).toBe(SONG_PIN_REASON);
    }
  });

  it('makes a city none of ours first', () => {
    expect(bySlug['ani-difranco']).toMatchObject({
      value: 'buffalo',
      confidence: 0.65,
      requires: [
        {
          kind: 'globe_city',
          slug: 'buffalo',
          body: expect.objectContaining({
            pin: false,
            region: 'north-america',
          }),
        },
      ],
    });
  });

  it('merges two pins of one act in one place into one suggestion', () => {
    expect(
      plan.planned.filter(
        (p) => p.suggestion.target.slug === 'earth-wind-and-fire',
      ),
    ).toHaveLength(1);
    expect(bySlug['earth-wind-and-fire'].sources.map((s) => s.label)).toEqual([
      'artist_location "earth, wind and fire" city',
      'artist_location "earth, wind, and fire" city',
    ]);
    expect(plan.report.repeated).toEqual([
      {
        slug: 'earth-wind-and-fire',
        keys: ['earth, wind and fire', 'earth, wind, and fire'],
      },
    ]);
  });

  it('lists the pins that are no act the Atlas has', () => {
    expect(plan.report.dropped.map((d) => d.key)).toEqual([
      'es una historia – i am singing – stevie wonder',
      'traditional',
    ]);
    expect(plan.report.jointBillings).toEqual([
      {
        key: 'blackstreet and dr. dre',
        parts: [
          { name: 'Blackstreet', slug: null },
          { name: 'Dr. Dre', slug: null },
        ],
      },
    ]);
    expect(plan.report.missingArtists).toEqual([
      {
        key: 'chicago',
        slug: 'chicago',
        name: 'Chicago',
        placeId: 'chicago',
        requires: [
          {
            kind: 'artist',
            slug: 'chicago',
            body: { slug: 'chicago', name: 'Chicago' },
          },
        ],
        // Tags would never find it: 'chicago' is the city.
        collision: 'place',
      },
      {
        key: 'kenny loggins',
        slug: 'kenny-loggins',
        // Spelled as the library bills him.
        name: 'Kenny Loggins',
        placeId: 'seattle',
        requires: [
          {
            kind: 'artist',
            slug: 'kenny-loggins',
            body: { slug: 'kenny-loggins', name: 'Kenny Loggins' },
          },
        ],
      },
    ]);
    expect(plan.report).toMatchObject({
      entries: 12,
      artists: { bySlug: 6, byName: 1 },
      basedIn: 6,
      born: 0,
      existingPlace: 6,
      newPlace: { entries: 1, places: 1 },
    });
  });
});

describe('a pin someone else places too', () => {
  const pins = [
    pin('marvin gaye', 'Washington', 38.91, -77.04),
    pin('bob seger', 'Detroit', 42.33, -83.05),
    pin('the temptations', 'Detroit', 42.33, -83.05),
    pin('ani difranco', 'Buffalo', 42.89, -78.88),
  ];
  const buffalo = {
    kind: 'globe_city',
    slug: 'buffalo-ny',
    body: {
      id: 'buffalo-ny',
      name: 'Buffalo',
      coordinates: [42.8864, -78.8784],
    },
  };
  const plan = planHometowns(
    { places: CITIES, artists, artistLocations: pins },
    {
      imported: [
        // P19: Marvin Gaye was born in Washington.
        imported('marvin-gaye', 'born.placeId', 'washington-dc'),
        // Bob Seger's City, by MusicBrainz: the pin agrees.
        imported('bob-seger', 'basedInPlaceId', 'detroit'),
        imported('bob-seger', 'born.placeId', 'detroit'),
        // A group "born" in Detroit is its City.
        imported('the-temptations', 'born.placeId', 'detroit'),
        // The same new place, by another slug.
        imported('ani-difranco', 'born.placeId', 'buffalo-ny', [buffalo]),
      ],
    },
  );
  const bySlug = Object.fromEntries(
    plan.planned.map((p) => [p.suggestion.target.slug, p.suggestion]),
  );

  it('offers a person’s pin as their birthplace where the importer says so', () => {
    expect(bySlug['marvin-gaye']).toMatchObject({
      path: 'born.placeId',
      value: 'washington-dc',
      display: 'Born in Washington D.C. (song pins)',
      tier: 'likely',
    });
    // As the importer names it, so the two are one suggestion.
    expect(bySlug['ani-difranco']).toMatchObject({
      path: 'born.placeId',
      value: 'buffalo-ny',
      requires: [buffalo],
    });
  });

  it('keeps it the City where the importer agrees on the City, and for a group', () => {
    expect(bySlug['bob-seger']).toMatchObject({
      path: 'basedInPlaceId',
      value: 'detroit',
    });
    expect(bySlug['the-temptations']).toMatchObject({
      path: 'basedInPlaceId',
      value: 'detroit',
    });
    expect(plan.report).toMatchObject({ born: 2, basedIn: 2, agreed: 3 });
  });

  it('reads a birthplace the record already states as applied', () => {
    const stated = planHometowns({
      places: CITIES,
      artists: [
        {
          slug: 'marvin-gaye',
          name: 'Marvin Gaye',
          born: { placeId: 'washington-dc' },
        },
      ],
      artistLocations: [pins[0]],
    }).planned[0];
    expect(stated.suggestion.path).toBe('born.placeId');
    expect(stated.precondition).toEqual({ state: 'applied' });
  });

  it('carries a City already set as its precondition', () => {
    const [set] = planHometowns({
      places: CITIES,
      artists: [
        { slug: 'marvin-gaye', name: 'Marvin Gaye', basedInPlaceId: 'detroit' },
      ],
      artistLocations: [pins[0]],
    }).planned;
    expect(set.precondition).toEqual({
      state: 'conflict',
      seen: 'detroit',
      reason: 'it holds something else',
    });
  });
});

describe('a pin whose record is itself in doubt', () => {
  const registry: LinkingArtist[] = [
    { slug: 'stevie-wonder', name: 'Stevie Wonder' },
    { slug: 'chaka-khan', name: 'Chaka Khan' },
    { slug: 'drake', name: 'Drake' },
    { slug: 'marvin-gaye', name: 'Marvin Gaye' },
    // Records for a billing: two of our acts, or names joined by a slash.
    { slug: 'stevie-wonder-chaka-khan', name: 'Stevie Wonder/Chaka Khan' },
    { slug: 'drake-scary-pockets', name: 'Drake/Scary Pockets' },
    // One act, whatever its name joins.
    { slug: 'hall-and-oates', name: 'Hall And Oates' },
    { slug: 'ac-dc', name: 'AC/DC' },
    // A slip of the pen, beside the act it copies.
    { slug: 'marivn-gaye', name: 'Marivn Gaye' },
  ];
  const plan = planHometowns({
    places: CITIES,
    artists: registry,
    songs: [
      { id: 'whats_going_on', title: "What's Going On", artist: 'Marvin Gaye' },
    ] as Song[],
    artistLocations: [
      pin('stevie wonder/chaka khan', 'Detroit', 42.33, -83.05),
      pin('drake/scary pockets', 'Los Angeles', 34.05, -118.24),
      pin('hall and oates', 'Philadelphia', 39.95, -75.17),
      pin('ac/dc', 'Sydney', -33.87, 151.21),
      pin('marivn gaye', 'Washington', 38.91, -77.04),
      pin('marvin gaye', 'Washington', 38.91, -77.04),
    ],
  });
  const offered = plan.planned.map((p) => p.suggestion.target.slug);

  it('lists a record that is a billing of two acts, rather than giving it a City', () => {
    expect(offered).not.toContain('stevie-wonder-chaka-khan');
    expect(offered).not.toContain('drake-scary-pockets');
    expect(plan.report.jointBillings).toEqual([
      {
        key: 'drake/scary pockets',
        record: 'drake-scary-pockets',
        parts: [
          { name: 'Drake', slug: 'drake' },
          { name: 'Scary Pockets', slug: null },
        ],
      },
      {
        key: 'stevie wonder/chaka khan',
        record: 'stevie-wonder-chaka-khan',
        parts: [
          { name: 'Stevie Wonder', slug: 'stevie-wonder' },
          { name: 'Chaka Khan', slug: 'chaka-khan' },
        ],
      },
    ]);
    // A band's own name joins no two acts.
    expect(offered).toEqual(
      expect.arrayContaining(['hall-and-oates', 'ac-dc']),
    );
  });

  it('warns where a record may be a misspelt copy of another act', () => {
    const slip = plan.planned.find(
      (p) => p.suggestion.target.slug === 'marivn-gaye',
    )!.suggestion;
    expect(slip.evidence).toContain(
      'the record\'s name "Marivn Gaye" is one letter from Marvin Gaye\'s: check it is not a misspelt copy of that act',
    );
    // The act with the songs is not the slip.
    const real = plan.planned.find(
      (p) => p.suggestion.target.slug === 'marvin-gaye',
    )!.suggestion;
    expect(real.evidence.some((e) => e.includes('one letter'))).toBe(false);
    expect(plan.report.nearDuplicates).toEqual([
      { slug: 'marivn-gaye', like: 'marvin-gaye' },
    ]);
  });
});
