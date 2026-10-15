import type { Feature } from 'geojson';
import { CITY_OUTLINE_FILES } from './cityOutlineFiles';

/**
 * A music city's outline (© OpenStreetMap contributors; built by
 * scripts/buildCityOutlines.mjs), fetched the first time the city is
 * selected or flown to, and kept for the session. Each is one small file, so
 * selecting a city costs only its own outline.
 */

const loaded = new Map<string, Feature>();
const loading = new Map<string, Promise<Feature | null>>();

/** Whether the city has an outline to draw at all. */
export const hasCityOutline = (cityId: string): boolean =>
  Object.prototype.hasOwnProperty.call(CITY_OUTLINE_FILES, cityId);

/**
 * The outline if it has arrived; null when the city has none; undefined
 * while it is still to come (loadCityOutline fetches it).
 */
export function cityOutline(cityId: string): Feature | null | undefined {
  if (!hasCityOutline(cityId)) return null;
  return loaded.get(cityId);
}

/**
 * Fetch a city's outline, once, however many ask. A failed fetch is not
 * remembered, so the next selection tries again; until then the city shows
 * only its dot.
 */
export function loadCityOutline(cityId: string): Promise<Feature | null> {
  const url = CITY_OUTLINE_FILES[cityId];
  if (!url) return Promise.resolve(null);
  const done = loaded.get(cityId);
  if (done) return Promise.resolve(done);
  let request = loading.get(cityId);
  if (!request) {
    request = fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .then((feature: Feature | null) => {
        if (feature) loaded.set(cityId, feature);
        return feature;
      })
      .catch(() => null)
      .finally(() => loading.delete(cityId));
    loading.set(cityId, request);
  }
  return request;
}
