import type { HistoricalEvent } from '@/components/atlas/types';
import { CITIES } from './cities';
import { getCountryColor } from './continentColors';
import { CITY_COUNTRY_TO_ISO } from './flagColors';

/**
 * An event's colour on the globe: its city's country colour, grey when the
 * city isn't known.
 *
 * Lives apart from eventConnections.ts, which used to own it, so the cards
 * and slides that colour an event don't download the whole influence graph.
 * CITIES is bundled and never changes, so the map is built once.
 */
let byCity: Map<string, string> | null = null;

export function getEventCountryColor(event: HistoricalEvent): string {
  if (!byCity) {
    byCity = new Map();
    for (const city of CITIES) {
      const iso = CITY_COUNTRY_TO_ISO[city.country];
      if (iso) byCity.set(city.name.toLowerCase(), getCountryColor(iso));
    }
  }
  return byCity.get(event.location.city.toLowerCase()) ?? '#a1a1aa';
}
