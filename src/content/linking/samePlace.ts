import { normCountry } from '@/components/atlas/utils/country';
import { normalizeArtistName as normalize } from '../graph/slugs';

/**
 * When two mentions of a place are one place (C33): the one rule the
 * planners' place book, the importer's (`enrichment/import/placeMap.ts`)
 * and the mock's create-only check (`mock/decisions.ts`) all use, so a city
 * named by an event, by a song pin and by MusicBrainz is made once, under
 * one slug, and a second Springfield across the country is a place of its
 * own.
 *
 * The same name, folded (accents, case and punctuation aside), and:
 *  - within 5 km, whatever country each source says (a border town, a
 *    territory one source files under its country and one under its own);
 *  - or within 25 km, in the same country.
 *
 * Pure; the importer (a Node script) reads it too.
 */

/** Closer than this, one name in one country is one place. */
export const SAME_PLACE_KM = 25;
/** Closer than this, one name is one place whatever country each source says. */
export const SAME_SPOT_KM = 5;

/** Great-circle distance, in km. */
export function distanceKm(
  [lat1, lng1]: readonly [number, number],
  [lat2, lng2]: readonly [number, number],
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** One key per country, however it is written ('US', 'USA', 'United States'). */
export const countryKey = (country: string): string =>
  normalize(normCountry(country));

/** Where a mention puts a place. */
export interface PlaceSpot {
  name: string;
  /** Absent or blank: the source does not say. */
  country?: string | null;
  coordinates: readonly [number, number];
}

/**
 * Close enough to be one place, the names aside: within 5 km, or within
 * 25 km in the same country. A mention that names no country is taken to
 * be in the other's (`sameCountry: 'unless-unsaid'`) only where the caller
 * says so — the place book, placing an event whose country the data left
 * out; everywhere else, unsaid is unknown.
 */
export function closeEnough(
  a: Omit<PlaceSpot, 'name'>,
  b: Omit<PlaceSpot, 'name'>,
  options: { sameCountry?: 'said' | 'unless-unsaid' } = {},
): boolean {
  const km = distanceKm(a.coordinates, b.coordinates);
  if (km <= SAME_SPOT_KM) return true;
  if (km > SAME_PLACE_KM) return false;
  const [x, y] = [a.country?.trim(), b.country?.trim()];
  if (!x || !y) return options.sameCountry === 'unless-unsaid';
  return countryKey(x) === countryKey(y);
}

/** The same name, folded: 'São Paulo' and 'Sao Paulo'. */
export const sameName = (a: string, b: string): boolean =>
  normalize(a) === normalize(b);

/** Two mentions of one place (C33). */
export const samePlace = (a: PlaceSpot, b: PlaceSpot): boolean =>
  sameName(a.name, b.name) && closeEnough(a, b);
