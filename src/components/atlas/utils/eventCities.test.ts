/**
 * The towns events happen in that no music city claims become cities of
 * their own: Aspen ("Take Me Home, Country Roads"), Colorado Springs
 * ("Counting Stars").
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { getCityById, selectableCities } from '@/components/atlas/data/lookups';
import { searchGlobe } from '@/components/atlas/search/globeSearch';
import type { HistoricalEvent } from '@/components/atlas/types';
import { ensureAtlasContent, MUSIC_HISTORY } from '@/content/contentStore';
import { deriveEventCities, eventCities, slug } from './eventCities';
import { getEventsForLocation } from './getEventsForLocation';
import { matchCity } from './resolveEventRegion';

beforeAll(() => ensureAtlasContent());

const byTitle = (start: string) =>
  MUSIC_HISTORY.find((e) => e.title.startsWith(start))!;

describe('towns events make cities of', () => {
  it('makes Aspen and Colorado Springs selectable cities', () => {
    const aspen = getCityById('aspen-us');
    const springs = getCityById('colorado-springs-us');
    expect(aspen).toMatchObject({ name: 'Aspen', country: 'US' });
    expect(springs).toMatchObject({ name: 'Colorado Springs', country: 'US' });
    expect(selectableCities()).toContain(aspen);
  });

  it('lists each town’s own events on its card', () => {
    const roads = byTitle('Take Me Home, Country Roads');
    const stars = byTitle('Counting Stars');
    expect(matchCity(roads)?.id).toBe('aspen-us');
    expect(matchCity(stars)?.id).toBe('colorado-springs-us');
    expect(
      getEventsForLocation({ type: 'city', id: 'aspen-us' }).map((e) => e.id),
    ).toContain(roads.id);
  });

  it('leaves the music cities their events', () => {
    for (const town of eventCities()) {
      for (const e of getEventsForLocation({ type: 'city', id: town.id })) {
        expect(matchCity(e)?.id).toBe(town.id);
      }
    }
    // New Orleans is a music city; none of its events makes a town.
    expect(eventCities().some((c) => c.name === 'New Orleans')).toBe(false);
  });

  it('is found by search', () => {
    const titles = searchGlobe('Aspen')
      .flatMap((group) => group.results)
      .filter((r) => r.kind === 'place')
      .map((r) => r.title);
    expect(titles).toContain('Aspen');
  });

  it('gives every town a unique id', () => {
    const ids = selectableCities().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('deriveEventCities', () => {
  const event = (
    id: string,
    city: string,
    lat: number,
    lng: number,
    year = 1970,
    genre = ['Rock'],
  ): HistoricalEvent =>
    ({
      id,
      title: id,
      year,
      genre,
      location: { city, country: 'US', lat, lng },
    }) as unknown as HistoricalEvent;

  it('splits one name used in two places, the busier keeping the plain id', () => {
    const { cities } = deriveEventCities([
      event('a', 'Springfield', 39.8, -89.65),
      event('b', 'Springfield', 37.2, -93.29),
      event('c', 'Springfield', 37.21, -93.3),
    ]);
    const ids = cities.map((c) => c.id).sort();
    expect(ids).toEqual(['springfield-us', 'springfield-us-2']);
    expect(
      cities.find((c) => c.id === 'springfield-us')!.coordinates[0],
    ).toBeCloseTo(37.2, 1);
  });

  it('describes a town by its events: genres, decades, centre', () => {
    const [town] = deriveEventCities([
      event('a', 'Aspen', 39.19, -106.82, 1971, ['Folk', 'Country']),
      event('b', 'Aspen', 39.21, -106.84, 1975, ['Folk']),
    ]).cities;
    expect(town).toMatchObject({
      id: 'aspen-us',
      name: 'Aspen',
      genres: ['Folk', 'Country'],
      activeDecades: [1970],
      description: '',
    });
    expect(town.coordinates[0]).toBeCloseTo(39.2);
  });

  it('names a US town’s state when the outlines are at hand', () => {
    const [town] = deriveEventCities(
      [event('a', 'Aspen', 39.19, -106.82)],
      () => 'Colorado',
    ).cities;
    expect(town.subdivision).toBe('Colorado');
  });

  it('slugs names to ASCII', () => {
    expect(slug('Bogotá')).toBe('bogota');
    expect(slug('  Holly Springs ')).toBe('holly-springs');
  });
});
