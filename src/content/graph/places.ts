import { CITIES } from '@/components/atlas/data/cities';
import type { RegionId } from '@/components/atlas/types';
import { normCountry } from '@/components/atlas/utils/country';
import { normalizeArtistName as normalize, toSlug } from './slugs';

/**
 * A city named in free text → the globe's `City.id`.
 *
 * Song sessions write the city the way a liner note does ('Detroit',
 * 'Birmingham', 'London'); the globe's cities have ids ('detroit',
 * 'birmingham-uk', 'london'). Minting `place:<toSlug(city)>` matched those only
 * by coincidence — 'Birmingham' slugs to `birmingham`, which is neither
 * registered Birmingham (`birmingham-al`, `birmingham-uk`) — so resolving
 * against the registry is what makes a session city and a globe pin the same
 * node.
 *
 * Six names occur more than once in the registry (Portland, Birmingham,
 * Manchester, Charleston, Bristol, St. John's), two of them twice within one
 * country (Portland OR/ME, Charleston SC/WV). A name is only trusted when it
 * picks out exactly one city — alone, or together with the country. Better
 * unresolved than wrong.
 */

/** City names the registry spells differently from how people write them. */
const NAME_ALIASES: Record<string, string> = {
  'new york': 'new york city',
  nyc: 'new york city',
};

/**
 * One key per country, however it is written: 'USA', 'United States' and 'US'
 * are the same country, and so are 'NO' and 'Norway'. The globe's own folding
 * (`normCountry`) knows the spellings the event data uses, ISO-2 codes
 * included — the song events inherited `NO` for a-ha's Oslo and `JM` for Bob
 * Marley's Kingston — and the normaliser after it still folds accents and
 * punctuation, so 'São Tomé and Príncipe' matches however it is typed.
 */
const countryKey = (country: string): string => normalize(normCountry(country));

const cityKey = (name: string): string => {
  const key = normalize(name);
  return NAME_ALIASES[key] ?? key;
};

type Candidate = { id: string; country: string };

type Index = {
  byName: Map<string, Candidate[]>;
  registryIds: Set<string>;
  /** Country key → the regions its registered cities are filed under. */
  regionsByCountry: Map<string, Set<RegionId>>;
};

let built: Index | null = null;

/** The places a resolver knows: the globe's cities, or a working set of them. */
type Registered = Pick<(typeof CITIES)[number], 'id' | 'name' | 'country'> & {
  region?: RegionId;
};

const indexOf = (cities: readonly Registered[]): Index => {
  const byName = new Map<string, Candidate[]>();
  const registryIds = new Set<string>();
  const regionsByCountry = new Map<string, Set<RegionId>>();
  for (const city of cities) {
    const key = cityKey(city.name);
    const country = countryKey(city.country);
    const list = byName.get(key) ?? [];
    list.push({ id: city.id, country });
    byName.set(key, list);
    registryIds.add(city.id);
    if (!city.region) continue;
    const regions = regionsByCountry.get(country) ?? new Set<RegionId>();
    regions.add(city.region);
    regionsByCountry.set(country, regions);
  }
  return { byName, registryIds, regionsByCountry };
};

const index = (): Index => (built ??= indexOf(CITIES));

/**
 * What the registry makes of a city name:
 *  - `resolved` — exactly one city fits;
 *  - `unknown` — no city of that name is registered at all;
 *  - `refused` — cities of that name exist, but none or several fit (a
 *    country that agrees with none, or a shared name and no country).
 */
export type PlaceResolution =
  | { status: 'resolved'; id: string }
  | { status: 'unknown' }
  | { status: 'refused' };

const resolveIn = (
  at: Index,
  city: string,
  country?: string,
): PlaceResolution => {
  const candidates = at.byName.get(cityKey(city));
  if (!candidates?.length) return { status: 'unknown' };
  const fits = country
    ? candidates.filter((c) => c.country === countryKey(country))
    : candidates;
  return fits.length === 1
    ? { status: 'resolved', id: fits[0].id }
    : { status: 'refused' };
};

export function resolvePlaceName(
  city: string,
  country?: string,
): PlaceResolution {
  return resolveIn(index(), city, country);
}

/**
 * `resolvePlaceName` over another set of places than the globe's cities:
 * the working data's, where a city the console created resolves and one it
 * deleted does not. Built once per set.
 */
export function createPlaceResolver(
  places: readonly Registered[],
): (city: string, country?: string) => PlaceResolution {
  const at = indexOf(places);
  return (city, country) => resolveIn(at, city, country);
}

/** The registered city id, or null when the name does not pick out one city. */
export function resolvePlace(city: string, country?: string): string | null {
  const result = resolvePlaceName(city, country);
  return result.status === 'resolved' ? result.id : null;
}

/**
 * The globe region a country's cities are filed under: 'Norway' and 'NO' →
 * 'north-europe'.
 *
 * For a place the console creates beyond the registered cities (a birthplace,
 * a label's town), which needs a region for the globe to file it under. Null
 * when no registered city is in that country, or when its cities are filed
 * under more than one region (Russia's span Eastern Europe and North Asia):
 * the caller asks rather than guesses.
 */
export function countryRegionOf(country: string): RegionId | null {
  const regions = index().regionsByCountry.get(countryKey(country));
  return regions?.size === 1 ? [...regions][0] : null;
}

/**
 * The place slug for a city as written: the registry id when it resolves, and
 * otherwise a slug that can never be mistaken for a registered city.
 *
 * The fallback matters as much as the match. A refused 'London, Canada' slugged
 * plainly is `london` — the UK city's id — which would pin a London, Ontario
 * recording to England. So an unplaceable name carries its country, or says it
 * is unplaced, and an unknown name that happens to slug to a registered id is
 * kept apart the same way. The legacy linker surfaces all of these to be
 * linked by hand.
 */
export function placeSlugFor(city: string, country?: string): string {
  const result = resolvePlaceName(city, country);
  if (result.status === 'resolved') return result.id;
  const plain = toSlug(city);
  if (result.status === 'unknown' && !index().registryIds.has(plain)) {
    return plain;
  }
  const qualified = toSlug(`${city} ${country ?? 'unplaced'}`);
  return index().registryIds.has(qualified)
    ? toSlug(`${city} ${country ?? ''} unplaced`)
    : qualified;
}
