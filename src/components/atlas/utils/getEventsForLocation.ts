import { CITIES, MUSIC_HISTORY } from '@/components/atlas/data';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { normCountry, sameCountry } from './country';

// Map GeoJSON country names (as they arrive from a country click) to the
// CITIES/event country codes used in the datasets.
const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'US',
  'United Kingdom': 'UK',
  'Republic of Korea': 'South Korea',
  Korea: 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast',
};

/**
 * All events for a selected region, sorted by year. Matching is country-aware:
 * a same-named city in another country (e.g. Birmingham UK vs Birmingham,
 * Alabama) never leaks across, because every branch also compares the country.
 */
export function getEventsForLocation(
  selectedLocation: SelectedLocation | null,
): HistoricalEvent[] {
  if (!selectedLocation) return [];

  if (selectedLocation.type === 'country') {
    const resolved =
      COUNTRY_ALIASES[selectedLocation.name] ?? selectedLocation.name;
    return MUSIC_HISTORY.filter((e) =>
      sameCountry(e.location.country, resolved),
    ).sort((a, b) => a.year - b.year);
  }

  if (selectedLocation.type === 'state') {
    // Key the state's cities by name + normalised country so an event only
    // matches when both the city name AND the country line up.
    const keys = new Set(
      CITIES.filter((c) => c.subdivision === selectedLocation.name).map(
        (c) => `${c.name.toLowerCase()}|${normCountry(c.country)}`,
      ),
    );
    return MUSIC_HISTORY.filter((e) =>
      keys.has(
        `${e.location.city.toLowerCase()}|${normCountry(e.location.country)}`,
      ),
    ).sort((a, b) => a.year - b.year);
  }

  if (selectedLocation.type === 'city') {
    const city = CITIES.find((c) => c.id === selectedLocation.id);
    if (!city) return [];
    return MUSIC_HISTORY.filter(
      (e) =>
        e.location.city.toLowerCase() === city.name.toLowerCase() &&
        sameCountry(e.location.country, city.country),
    ).sort((a, b) => a.year - b.year);
  }

  return [];
}
