import type { HistoricalEvent } from '@/components/atlas/types';
import { matchCity } from './resolveEventRegion';

/**
 * The name to show for where an event happened. An event names its place
 * as its source wrote it, sometimes in short: Marvin Gaye's songs say
 * "Washington", which reads as the state, for the city of Washington D.C.;
 * others say "New York" for New York City. When an event's own name starts
 * the name of the city it belongs to (matchCity), the city's full name is
 * shown. A different place filed under a nearby city keeps its own name:
 * a College Park event, listed with Washington D.C., still says College Park.
 */
export function eventPlaceName(event: HistoricalEvent): string {
  const own = event.location.city.trim();
  const city = matchCity(event);
  if (
    city &&
    city.name !== own &&
    city.name.toLowerCase().startsWith(own.toLowerCase())
  ) {
    return city.name;
  }
  return own;
}
