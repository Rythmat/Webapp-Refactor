import { beforeAll, describe, expect, it } from 'vitest';
import { ensureAtlasContent, MUSIC_HISTORY } from '@/content/contentStore';
import { sameCountry } from './country';
import { getEventsForLocation } from './getEventsForLocation';
import {
  eventSubdivision,
  matchCity,
  resolveEventRegion,
} from './resolveEventRegion';

const HYDRATION_TIMEOUT = 60_000;
const byId = (id: string) => MUSIC_HISTORY.find((e) => e.id === id)!;

describe('resolveEventRegion', () => {
  beforeAll(async () => {
    await ensureAtlasContent();
  }, HYDRATION_TIMEOUT);

  /**
   * THE contract behind the influence pills. Navigating to an event selects the
   * region this resolves, and the details panel lists getEventsForLocation of
   * that region — so if the event is not in that list, the pill opens a panel
   * without it and the click looks like it did nothing.
   *
   * Before the two sides shared a matcher, 415 of 1,722 events failed this.
   */
  it('lands every event in a panel that lists it', () => {
    const unreachable = MUSIC_HISTORY.filter((event) => {
      const { region } = resolveEventRegion(event);
      return !getEventsForLocation(region).some((e) => e.id === event.id);
    }).map((e) => `${e.id} (${e.location.city}, ${e.location.country})`);

    expect(unreachable).toEqual([]);
  });

  it('puts a US event in a town with no CITIES entry in its state', () => {
    // Ann Arbor is ~57km from Detroit — too far to call it Detroit, but it is
    // unambiguously Michigan.
    const vulfpeck = byId('song-1612');
    expect(vulfpeck.location.city).toBe('Ann Arbor');
    expect(matchCity(vulfpeck)).toBeUndefined();
    expect(resolveEventRegion(vulfpeck).region).toEqual({
      type: 'state',
      name: 'Michigan',
      country: 'United States',
    });
  });

  it('places towns missing from CITIES in the state they are actually in', () => {
    // Nearest-named-city guessing put each of these across a border.
    const cases: [string, string][] = [
      ['Dayton', 'Ohio'],
      ['Buffalo', 'New York'],
      ['Cincinnati', 'Ohio'],
      ['Raleigh', 'North Carolina'],
      ['Lubbock', 'Texas'],
      ['Kalamazoo', 'Michigan'],
      ['Jacksonville', 'Florida'],
      ['Nantucket', 'Massachusetts'],
    ];
    for (const [city, state] of cases) {
      const event = MUSIC_HISTORY.find((e) => e.location.city === city);
      expect(event, city).toBeDefined();
      expect(eventSubdivision(event!)?.name, city).toBe(state);
    }
  });

  it('lists an event named for a borough under its state', () => {
    // "Brooklyn" has no CITIES entry; it matches New York City by coordinates.
    const region = resolveEventRegion(byId('song-100_days_100_nights')).region;
    expect(region).toMatchObject({ type: 'state', name: 'New York' });
  });

  it('never matches an event to a city across a border', () => {
    // Birmingham UK vs Birmingham, Alabama is the case that motivated the
    // country-aware matcher; this holds it for every event, not just that one.
    const crossBorder = MUSIC_HISTORY.filter((event) => {
      const city = matchCity(event);
      return city && !sameCountry(city.country, event.location.country);
    }).map((e) => `${e.id} → ${matchCity(e)!.id}`);

    expect(crossBorder).toEqual([]);
  });
});
