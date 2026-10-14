import { CITIES } from '@/components/atlas/data/cities';
import type { City, HistoricalEvent, RegionId } from '@/components/atlas/types';
import { normCountry } from './country';
import { matchMusicCity } from './musicCityMatch';

/**
 * Working out the towns events happened in that no music city (cities.ts)
 * claims, as a pure function of the events: what eventCities.ts does with
 * the published content, and scripts/buildCityOutlines.mjs with the bundled
 * events. It imports nothing that needs the app running.
 *
 * The towns:
 * Aspen ("Take Me Home, Country Roads"), Colorado Springs ("Counting
 * Stars"), Macon, Belfast. Each becomes a city of its own, worked out from
 * its events, so it can be selected and opened like a music city: its name on
 * the map, a card listing its events, a stop in the URL (`place=city:aspen-us`).
 *
 * Nothing here is authored. A town appears when published content first
 * places an event there, and its card says what its events say: their
 * genres, their decades. Its id is its name and country, so a link to it
 * holds for as long as an event is placed there.
 */

/** Events with one town name further apart than this (°) are two towns. */
const SAME_TOWN_DEG = 1;
/** A town shows its most common genres, at most this many. */
const MAX_GENRES = 4;

/** Lowercase ASCII words joined by hyphens: 'Bogotá' → 'bogota'. */
export const slug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** A town's events, gathered before it is made a City. */
interface Gathered {
  events: HistoricalEvent[];
  lat: number;
  lng: number;
}

const centre = (events: HistoricalEvent[]) => ({
  lat: events.reduce((s, e) => s + e.location.lat, 0) / events.length,
  lng: events.reduce((s, e) => s + e.location.lng, 0) / events.length,
});

/** The most common of some values, most common first. */
function mostCommon(values: string[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([v]) => v);
}

/** The region (regions.ts) of the music city nearest a point. */
export function nearestRegion(lat: number, lng: number): RegionId {
  let best = CITIES[0];
  let bestDist = Infinity;
  for (const c of CITIES) {
    const d = (c.coordinates[0] - lat) ** 2 + (c.coordinates[1] - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.region;
}

export interface DerivedCities {
  cities: City[];
  /** Each town's city, by the id of every event placed in it. */
  byEventId: Map<string, City>;
}

/**
 * The towns in `events` that no music city claims. Pure: the outline build
 * (scripts/buildCityOutlines.mjs) runs it on the bundled events.
 * `subdivisionAt` names a US state or Canadian province from a point, when
 * the state outlines are at hand.
 */
export function deriveEventCities(
  events: readonly HistoricalEvent[],
  subdivisionAt?: (lat: number, lng: number) => string | undefined,
): DerivedCities {
  // Gather by name and country, then split a name used in two places.
  const byName = new Map<string, Gathered[]>();
  for (const event of events) {
    const name = event.location.city?.trim();
    if (!name || matchMusicCity(event)) continue;
    const key = `${slug(name)}|${slug(normCountry(event.location.country))}`;
    const towns = byName.get(key) ?? [];
    const { lat, lng } = event.location;
    const home = towns.find(
      (t) => Math.hypot(t.lat - lat, t.lng - lng) <= SAME_TOWN_DEG,
    );
    if (home) {
      home.events.push(event);
      Object.assign(home, centre(home.events));
    } else {
      towns.push({ events: [event], lat, lng });
    }
    byName.set(key, towns);
  }

  const musicIds = new Set(CITIES.map((c) => c.id));
  const cities: City[] = [];
  const byEventId = new Map<string, City>();
  for (const [key, towns] of byName) {
    const [nameSlug, countrySlug] = key.split('|');
    // The town with most events keeps the plain id; the others are numbered.
    towns.sort((a, b) => b.events.length - a.events.length || b.lat - a.lat);
    towns.forEach((town, i) => {
      let id = `${nameSlug}-${countrySlug}${i ? `-${i + 1}` : ''}`;
      if (musicIds.has(id)) id = `${id}-town`;
      const first = town.events[0];
      const country = normCountry(first.location.country);
      const city: City = {
        id,
        name: mostCommon(
          town.events.map((e) => e.location.city.trim()),
          1,
        )[0],
        // The UK, US and Canada as cities.ts spells them; others as given.
        country: ['US', 'UK', 'CA'].includes(country)
          ? country === 'CA'
            ? 'Canada'
            : country
          : first.location.country,
        subdivision:
          country === 'US' || country === 'CA'
            ? (subdivisionAt?.(town.lat, town.lng) ?? '')
            : '',
        region: nearestRegion(town.lat, town.lng),
        coordinates: [town.lat, town.lng],
        genres: mostCommon(
          town.events.flatMap((e) => e.genre ?? []),
          MAX_GENRES,
        ),
        description: '',
        activeDecades: [
          ...new Set(town.events.map((e) => Math.floor(e.year / 10) * 10)),
        ].sort((a, b) => a - b),
      };
      cities.push(city);
      for (const e of town.events) byEventId.set(e.id, city);
    });
  }
  cities.sort((a, b) => a.name.localeCompare(b.name));
  return { cities, byEventId };
}
