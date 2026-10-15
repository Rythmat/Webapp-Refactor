import { CITIES } from '@/components/atlas/data/cities';
import type { City, HistoricalEvent } from '@/components/atlas/types';
import { sameCountry } from './country';

/**
 * Which of the music cities (cities.ts) an event happened in. The towns that
 * no music city claims (Aspen, Colorado Springs) are worked out from these
 * leftovers in eventCities.ts; matchCity (resolveEventRegion.ts) asks this
 * first, then them.
 */

// Max squared-degree distance for the coordinate fallback (~0.6°, ≈ 66km).
const MAX_MATCH_DIST_SQ = 0.6 * 0.6;

/* ── City matching (memoized per event object) ─────────────────────────────
 *
 * Every panel list and every navigation resolves events through these two
 * functions, so each runs ~1,700 times per selection. Keyed on the event object
 * in a WeakMap: a CDN re-hydration replaces the event objects, which drops the
 * stale entries without any generation bookkeeping.
 */

const preciseCache = new WeakMap<HistoricalEvent, City | null>();

function nearest(
  event: HistoricalEvent,
  candidates: City[],
): { city: City; distSq: number } | undefined {
  let best: City | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dLat = c.coordinates[0] - event.location.lat;
    const dLng = c.coordinates[1] - event.location.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best ? { city: best, distSq: bestDist } : undefined;
}

/**
 * Every CITIES entry with this name in this country.
 *
 * Usually one. The US has two Portlands and two Charlestons, and taking the
 * first (Oregon, South Carolina) filed the Maine and West Virginia events under
 * the wrong state — their panels never listed them and the camera flew to the
 * wrong coast. Callers disambiguate with {@link nearestOf}.
 */
export function sameNameCities(event: HistoricalEvent): City[] {
  const cityLower = event.location.city.toLowerCase();
  return CITIES.filter(
    (c) =>
      c.name.toLowerCase() === cityLower &&
      sameCountry(c.country, event.location.country),
  );
}

/** Of several identically named cities, the one the event's coordinates sit in. */
export function nearestOf(
  event: HistoricalEvent,
  candidates: City[],
): City | undefined {
  if (candidates.length <= 1) return candidates[0];
  return nearest(event, candidates)?.city;
}

/**
 * The CITIES entry an event happened IN: a name match in the SAME country first
 * (so a Birmingham-UK event resolves to Birmingham, England — not Alabama),
 * resolved by coordinates when that country has more than one city of that
 * name, then the nearest city within ~0.6° — which covers name mismatches like
 * "New York" (event) vs "New York City" (CITIES), and "Brooklyn", which has no
 * entry.
 *
 * Undefined when nothing is close enough to honestly call it that city.
 */
export function matchMusicCity(event: HistoricalEvent): City | undefined {
  const cached = preciseCache.get(event);
  if (cached !== undefined) return cached ?? undefined;

  const byName = nearestOf(event, sameNameCities(event));
  let match = byName;
  if (!match) {
    const hit = nearest(event, CITIES);
    if (hit && hit.distSq <= MAX_MATCH_DIST_SQ) match = hit.city;
  }

  preciseCache.set(event, match ?? null);
  return match;
}
