import { MUSIC_HISTORY } from '@/components/atlas/data';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { countryKey, normCountry, sameCountry } from './country';
import { eventSubdivision, matchCity } from './resolveEventRegion';

/**
 * All events for a selected region, sorted by year.
 *
 * City and state membership go through the SAME matchers that navigation uses
 * (resolveEventRegion.ts). They used to compare city names instead, so an event
 * placed in "Brooklyn" was sent to New York state by navigation but never
 * listed there — its influence pill opened a panel without it, and looked dead.
 * Sharing the matcher makes that impossible by construction.
 *
 * Matching stays country-aware: Birmingham UK and Birmingham, Alabama never
 * share a list.
 */
export function getEventsForLocation(
  selectedLocation: SelectedLocation | null,
): HistoricalEvent[] {
  if (!selectedLocation) return [];

  if (selectedLocation.type === 'country') {
    // Natural Earth's name, as the events spell it (utils/country.ts).
    const key = countryKey(selectedLocation.name);
    return MUSIC_HISTORY.filter(
      (e) => normCountry(e.location.country) === key,
    ).sort((a, b) => a.year - b.year);
  }

  if (selectedLocation.type === 'state') {
    const country = selectedLocation.country ?? 'United States';
    return MUSIC_HISTORY.filter((e) => {
      if (!sameCountry(e.location.country, country)) return false;
      return eventSubdivision(e)?.name === selectedLocation.name;
    }).sort((a, b) => a.year - b.year);
  }

  if (selectedLocation.type === 'city') {
    return MUSIC_HISTORY.filter(
      (e) => matchCity(e)?.id === selectedLocation.id,
    ).sort((a, b) => a.year - b.year);
  }

  return [];
}
