import { MUSICAL_ERAS, type EraId } from '@/components/atlas/data/musicalEras';
import {
  getTimelineIndex,
  lowerBound,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';
import { normCountry } from '@/components/atlas/utils/country';

/**
 * How much music each country and each place holds in the years shown: the
 * one count the map lights its land and sizes its halos by, and the cards
 * report. A country's key is normCountry of its events' country, which is
 * what countryKey gives for its Natural Earth name, so a lit country always
 * opens the events it was lit for.
 */
export interface MusicWeights {
  /** Events per country, by normCountry of the event's country. */
  countries: ReadonlyMap<string, number>;
  maxCountry: number;
  /** Per place (a music city or town, TimelineEvent.cityId). */
  places: ReadonlyMap<string, PlaceWeight>;
  maxPlace: number;
}

export interface PlaceWeight {
  events: number;
  /** The era it holds the most events from, in the years shown. */
  era: EraId | null;
}

/** An era's place in MUSICAL_ERAS, by year. */
function eraIndexOf(year: number): number {
  for (let i = MUSICAL_ERAS.length - 1; i >= 0; i--) {
    if (year >= MUSICAL_ERAS[i].yearStart) return i;
  }
  return 0;
}

/** The events of `index` inside `w` (all of time for null), in year order. */
export function eventsIn(
  index: readonly TimelineEvent[],
  w: TimeWindow | null,
): readonly TimelineEvent[] {
  if (!w) return index;
  return index.slice(lowerBound(index, w.from), lowerBound(index, w.to + 1));
}

export function weighMusic(
  index: readonly TimelineEvent[],
  w: TimeWindow | null,
): MusicWeights {
  const countries = new Map<string, number>();
  const placeEras = new Map<string, number[]>();
  for (const t of eventsIn(index, w)) {
    const country = normCountry(t.event.location.country);
    countries.set(country, (countries.get(country) ?? 0) + 1);
    if (t.cityId) {
      let eras = placeEras.get(t.cityId);
      if (!eras) {
        eras = new Array<number>(MUSICAL_ERAS.length).fill(0);
        placeEras.set(t.cityId, eras);
      }
      eras[eraIndexOf(t.year)] += 1;
    }
  }
  const places = new Map<string, PlaceWeight>();
  let maxPlace = 0;
  for (const [id, eras] of placeEras) {
    let events = 0;
    let busiest = -1;
    for (let i = 0; i < eras.length; i++) {
      events += eras[i];
      // Ties go to the later era: the place's music as it stands.
      if (eras[i] > 0 && (busiest === -1 || eras[i] >= eras[busiest])) {
        busiest = i;
      }
    }
    places.set(id, {
      events,
      era: busiest === -1 ? null : MUSICAL_ERAS[busiest].id,
    });
    maxPlace = Math.max(maxPlace, events);
  }
  let maxCountry = 0;
  for (const n of countries.values()) maxCountry = Math.max(maxCountry, n);
  return { countries, maxCountry, places, maxPlace };
}

/**
 * The weights for the years shown, over the loaded content. Kept for the
 * last few windows asked for, since the map asks once a frame while the
 * era rail is dragged and the cards ask again for the same years.
 */
const CACHE_SIZE = 8;
const cache = new Map<string, MusicWeights>();
let cachedFor: readonly TimelineEvent[] | null = null;

export function musicWeights(w: TimeWindow | null): MusicWeights {
  const index = getTimelineIndex();
  if (index !== cachedFor) {
    cache.clear();
    cachedFor = index;
  }
  const key = w ? `${Math.floor(w.from)}:${Math.floor(w.to)}` : 'all';
  const hit = cache.get(key);
  if (hit) {
    // Most recent last.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const weights = weighMusic(
    index,
    w && { from: Math.floor(w.from), to: Math.floor(w.to) },
  );
  cache.set(key, weights);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return weights;
}

/**
 * How lit a country is, 0 (no music) to 1 (the most): by the log of its
 * count over the most's, from a floor for any music at all, so a country
 * with a few events still shows beside one with hundreds.
 */
export const landLevel = (events: number, max: number): number =>
  events > 0 && max > 0
    ? 0.12 + 0.88 * (Math.log1p(events) / Math.log1p(max))
    : 0;

/** A place's halo, 0 to 1: √ of its count over the most's, so area tracks count. */
export const haloLevel = (events: number, max: number): number =>
  events > 0 && max > 0 ? Math.sqrt(events / max) : 0;
