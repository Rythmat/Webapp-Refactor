import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import { createPlaceBook, distanceKm } from '../placeBook';
import type { LinkingPlace } from '../types';

/**
 * The place book decides where a city the app's data names is: one of our
 * places, or a new one to make first. A wrong answer here moves a fact to
 * the wrong city, so each rule is pinned on the real registry.
 */

const book = (places: readonly LinkingPlace[] = CITIES) =>
  createPlaceBook(places);

describe('placing a city the data names', () => {
  it('finds a registered city by its name, and says how far the data’s pin is', () => {
    const answer = book().place({
      name: 'Detroit',
      country: 'US',
      coordinates: [42.33, -83.05],
      by: 'evt-a',
    });
    expect(answer).toMatchObject({
      kind: 'existing',
      placeId: 'detroit',
      name: 'Detroit',
      how: 'name',
    });
    expect(answer.kind === 'existing' && answer.km).toBeLessThan(2);
  });

  it('settles a shared name by where the pin is', () => {
    // Two Portlands in the US: the name alone is refused.
    const places = book();
    expect(
      places.place({
        name: 'Portland',
        country: 'US',
        coordinates: [43.6591, -70.2568],
        by: 'evt-maine',
      }),
    ).toMatchObject({
      kind: 'existing',
      placeId: 'portland-me',
      how: 'coordinates',
    });
    expect(
      places.place({
        name: 'Portland',
        country: 'US',
        coordinates: [45.5152, -122.6784],
        by: 'evt-oregon',
      }),
    ).toMatchObject({ kind: 'existing', placeId: 'portland' });
  });

  it('knows a name the data only shortens, where the pin is on it', () => {
    // The song pins say 'Washington'; our city is 'Washington D.C.'.
    expect(
      book().place({
        name: 'Washington',
        country: 'US',
        coordinates: [38.91, -77.04],
        by: 'artist_location:marvin gaye',
      }),
    ).toMatchObject({ kind: 'existing', placeId: 'washington-dc' });
    // A Washington far from it is not it.
    expect(
      book().place({
        name: 'Washington',
        country: 'US',
        coordinates: [40.17, -80.25],
        by: 'evt-pa',
      }),
    ).toMatchObject({ kind: 'create', placeId: 'washington' });
  });

  it('makes a city that is none of ours as a place that is not a pin', () => {
    const answer = book().place({
      name: 'Bethel',
      country: 'United States',
      coordinates: [41.70123, -74.88049],
      by: 'evt-woodstock',
    });
    expect(answer).toEqual({
      kind: 'create',
      placeId: 'bethel',
      name: 'Bethel',
      record: {
        kind: 'globe_city',
        slug: 'bethel',
        body: {
          id: 'bethel',
          name: 'Bethel',
          // As our cities spell the country, rounded like the importer's.
          country: 'US',
          subdivision: '',
          region: 'north-america',
          coordinates: [41.7012, -74.8805],
          genres: [],
          description: '',
          activeDecades: [],
          pin: false,
        },
      },
    });
  });

  it('makes one place however many name it, spoken for by the lowest name', () => {
    const places = book();
    const late = places.place({
      name: 'Brooklyn',
      country: 'US',
      coordinates: [40.6782, -73.9442],
      by: 'evt-z',
    });
    const early = places.place({
      name: 'Brooklyn',
      country: 'United States',
      coordinates: [40.65, -73.95],
      by: 'artist_location:beastie boys',
    });
    expect(late.kind === 'create' && late.placeId).toBe('brooklyn');
    expect(early.kind === 'create' && early.placeId).toBe('brooklyn');
    const [made] = places.created();
    expect(places.created()).toHaveLength(1);
    expect(made.body.coordinates).toEqual([40.65, -73.95]);
  });

  it('gives two places of one name slugs that do not depend on the order asked', () => {
    const springfields = [
      {
        name: 'Springfield',
        country: 'US',
        coordinates: [39.8, -89.64] as [number, number],
        by: 'evt-il',
      },
      {
        name: 'Springfield',
        country: 'US',
        coordinates: [42.1, -72.59] as [number, number],
        by: 'evt-ma',
      },
    ];
    const slugsIn = (order: typeof springfields) => {
      const places = book();
      order.forEach((fact) => places.place(fact));
      return Object.fromEntries(
        order.map((fact) => {
          const answer = places.place(fact);
          return [fact.by, answer.kind === 'create' ? answer.placeId : null];
        }),
      );
    };
    const forward = slugsIn(springfields);
    expect(forward).toEqual(slugsIn([...springfields].reverse()));
    expect(forward).toEqual({
      'evt-il': 'springfield-us-39-80n-89-64w',
      'evt-ma': 'springfield-us-42-10n-72-59w',
    });
  });

  it('finds a place the console made since, which the registry does not know', () => {
    const made: LinkingPlace = {
      id: 'bethel',
      name: 'Bethel',
      country: 'US',
      region: 'north-america',
      coordinates: [41.7012, -74.8805],
      pin: false,
    };
    expect(
      book([...CITIES, made]).place({
        name: 'Bethel',
        country: 'US',
        coordinates: [41.69, -74.87],
        by: 'evt-woodstock',
      }),
    ).toMatchObject({ kind: 'existing', placeId: 'bethel' });
    // Another Bethel far away is another place, and 'bethel' is taken.
    expect(
      book([...CITIES, made]).place({
        name: 'Bethel',
        country: 'US',
        coordinates: [60.79, -161.76],
        by: 'evt-alaska',
      }),
    ).toMatchObject({ kind: 'create', placeId: 'bethel-us' });
  });

  it('reads the working places, not the registry: a renamed city by its new name, a deleted one not at all', () => {
    const renamed = CITIES.map((city) =>
      city.id === 'detroit' ? { ...city, name: 'Motor City' } : city,
    );
    expect(
      book(renamed).place({
        name: 'Motor City',
        country: 'US',
        coordinates: [42.33, -83.05],
        by: 'evt-a',
      }),
    ).toMatchObject({ kind: 'existing', placeId: 'detroit', how: 'name' });
    const deleted = CITIES.filter((city) => city.id !== 'detroit');
    expect(
      book(deleted).place({
        name: 'Detroit',
        country: 'US',
        coordinates: [42.33, -83.05],
        by: 'evt-a',
      }),
    ).toMatchObject({ kind: 'create', placeId: 'detroit' });
  });

  it('names a place the importer makes too its way, and never takes the importer’s slug for another', () => {
    const imported = (slug: string, name: string, at: [number, number]) => ({
      kind: 'globe_city',
      slug,
      body: {
        id: slug,
        name,
        country: 'US',
        subdivision: '',
        region: 'north-america',
        coordinates: at,
        genres: [],
        description: '',
        activeDecades: [],
        pin: false,
      },
    });
    const columbus = imported(
      'columbus-us-q16567',
      'Columbus',
      [39.9623, -83.0007],
    );
    const norwalk = imported('norwalk', 'Norwalk', [41.1177, -73.4082]);
    const places = createPlaceBook(CITIES, { imported: [columbus, norwalk] });
    // The same Columbus: the importer's record, slug and body.
    expect(
      places.place({
        name: 'Columbus',
        country: 'US',
        coordinates: [39.96, -83.0],
        by: 'evt-columbus',
      }),
    ).toEqual({
      kind: 'create',
      placeId: 'columbus-us-q16567',
      name: 'Columbus',
      record: columbus,
    });
    // Another Norwalk, 3,976 km away, is another place under another slug.
    const otherNorwalk = places.place({
      name: 'Norwalk',
      country: 'US',
      coordinates: [33.9022, -118.0817],
      by: 'evt-norwalk',
    });
    expect(otherNorwalk).toMatchObject({
      kind: 'create',
      placeId: 'norwalk-us',
    });
    // The importer's places are its to make: only the book's own are listed.
    expect(places.created().map((r) => r.slug)).toEqual(['norwalk-us']);
  });

  it('files a place in its country’s region, or the nearest city’s where there are two', () => {
    const answer = book().place({
      name: 'Irkutsk',
      country: 'Russia',
      coordinates: [52.2978, 104.2964],
      by: 'evt-irkutsk',
    });
    expect(answer).toMatchObject({
      kind: 'create',
      regionFrom: 'Kyzyl',
      record: { body: { region: 'north-asia' } },
    });
  });

  it('makes nothing without coordinates or a country', () => {
    expect(
      book().place({ name: 'Bethel', country: 'US', by: 'x' }),
    ).toMatchObject({ kind: 'none' });
    expect(
      book().place({ name: 'Bethel', coordinates: [41.7, -74.88], by: 'x' }),
    ).toMatchObject({ kind: 'none' });
    expect(book().place({ name: '  ', by: 'x' })).toMatchObject({
      kind: 'none',
    });
  });

  it('measures great-circle distance in km', () => {
    // Detroit to Chicago.
    expect(
      Math.round(distanceKm([42.3314, -83.0458], [41.8781, -87.6298])),
    ).toBe(381);
  });
});
