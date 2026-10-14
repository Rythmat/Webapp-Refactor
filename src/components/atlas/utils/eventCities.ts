import { stateBoundariesData } from '@/components/atlas/data/loaders';
import type { City, HistoricalEvent } from '@/components/atlas/types';
import { contentGeneration, MUSIC_HISTORY } from '@/content/contentStore';
import { deriveEventCities, type DerivedCities } from './deriveEventCities';
import { stateAt } from './stateAt';

export { deriveEventCities, slug } from './deriveEventCities';

/**
 * The towns the published content's events make cities of (Aspen, Colorado
 * Springs; deriveEventCities.ts says how), for the page: each selectable and
 * opened like a music city.
 */

let current: (DerivedCities & { key: string; byId: Map<string, City> }) | null =
  null;

/**
 * Rebuilt when the content changes, and once the state outlines arrive, when
 * a US or Canadian town can be given its state.
 */
function towns() {
  const boundaries = stateBoundariesData.peek();
  const key = `${contentGeneration}:${MUSIC_HISTORY.length}:${boundaries ? 1 : 0}`;
  if (current?.key !== key) {
    const derived = deriveEventCities(
      MUSIC_HISTORY,
      boundaries
        ? (lat, lng) => stateAt(boundaries, lat, lng)?.name
        : undefined,
    );
    current = {
      key,
      ...derived,
      byId: new Map(derived.cities.map((c) => [c.id, c])),
    };
  }
  return current;
}

/** Every town events make a city of, by name. */
export const eventCities = (): City[] => towns().cities;

/** The town an event happened in, if no music city claims it. */
export const eventCityOf = (event: HistoricalEvent): City | undefined =>
  towns().byEventId.get(event.id);

/** A town by its id. */
export const getEventCityById = (id: string): City | undefined =>
  towns().byId.get(id);
