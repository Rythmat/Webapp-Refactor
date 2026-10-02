import { CITIES } from '@/components/atlas/data/cities';
import type { City, RegionId } from '@/components/atlas/types';
import { normCountry } from '@/components/atlas/utils/country';
import {
  countryRegionOf,
  placeSlugFor,
  resolvePlaceName,
} from '@/content/graph/places';
import { normalizeArtistName, toSlug } from '@/content/graph/slugs';
import {
  closeEnough,
  distanceKm,
  SAME_PLACE_KM,
  SAME_SPOT_KM,
  sameName,
} from '@/content/linking/samePlace';
import type { PlaceRecord } from '@/content/records/types';

/**
 * A place a source names → one of our places, or a new one to create.
 *
 * Our places are the globe's 299 cities (`CITIES`). A birthplace or a
 * hometown the sources name is mapped to one of them by name and country
 * (`resolvePlaceName`, which refuses a "Portland" it cannot tell apart). When
 * none fits, the suggestion carries a `requires`: a `pin: false` place — a
 * place that is not a pin on the globe — at the coordinates Wikidata gives
 * (P625; MusicBrainz areas have none), so nothing is created without knowing
 * where it is.
 *
 * Two names are one place only when they are the same Wikidata item or
 * MusicBrainz area, the same name within 5 km (whatever country each source
 * spells), or the same name in the same country within 25 km (C33):
 * Tottenham asked for by two artists is created once, a second Springfield
 * across the state is a place of its own with a slug of its own. The same
 * test guards the match to our cities: a Washington 3,000 km from
 * Washington D.C. is not it. The rule is `content/linking/samePlace.ts`,
 * which the app's own planners and the mock's create-only check use too, so
 * a place the importer and a planner both ask for is one place.
 */

export { distanceKm, SAME_PLACE_KM, SAME_SPOT_KM };

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * Country names Wikidata uses, and the names an ISO code reads as in
 * English (`Intl.DisplayNames`), that the globe spells otherwise.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  "people's republic of china": 'China',
  'kingdom of the netherlands': 'Netherlands',
  'kingdom of denmark': 'Denmark',
  'republic of ireland': 'Ireland',
  'czech republic': 'Czechia',
  'state of palestine': 'Palestine',
  // ISO codes, as Intl names them.
  türkiye: 'Turkey',
  'congo - kinshasa': 'DR Congo',
  'congo - brazzaville': 'Republic of Congo',
  'palestinian territories': 'Palestine',
  'myanmar (burma)': 'Myanmar',
  'st. lucia': 'Saint Lucia',
  'st. vincent & grenadines': 'Saint Vincent and the Grenadines',
  'st. kitts & nevis': 'Saint Kitts and Nevis',
};

const aliased = (name: string): string =>
  COUNTRY_ALIASES[name.toLowerCase()] ?? name;

/**
 * A country as the sources give it — an ISO code ('NO') or a name ('United
 * States of America') — as a name the globe's country folding understands.
 */
export function countryName(country: string | null | undefined): string | null {
  const text = country?.trim();
  if (!text) return null;
  if (/^[A-Z]{2}$/.test(text)) {
    // The globe folds these codes itself; others become a name.
    const folded = normCountry(text);
    if (folded !== text.toLowerCase()) return text;
    try {
      return aliased(regionNames.of(text) ?? text);
    } catch {
      return text;
    }
  }
  return aliased(text);
}

const countryKey = (country: string): string =>
  normalizeArtistName(normCountry(country));

/** The country as `CITIES` spells it ('US', 'UK', 'Norway'), when a city there exists. */
const CITIES_SPELLING = new Map<string, string>();
for (const city of CITIES) {
  const k = countryKey(city.country);
  if (!CITIES_SPELLING.has(k)) CITIES_SPELLING.set(k, city.country);
}

/** What a source says about a place. */
export interface PlaceFact {
  /** 'Tottenham', 'Washington, D.C.'. */
  name: string;
  /** An ISO code or a name; null when the source doesn't say. */
  country: string | null;
  /** [lat, lng] from Wikidata P625, when known. */
  coordinates: [number, number] | null;
  /** The Wikidata item, for the created place's source. */
  wikidata?: string | null;
  /** The MusicBrainz area, for the same. */
  mbArea?: string | null;
}

/** A place a suggestion needs created first. */
export interface PlaceToCreate {
  slug: string;
  body: PlaceRecord;
  wikidata?: string;
  mbArea?: string;
}

export type PlaceMatch =
  /** One of our places. */
  | { kind: 'existing'; placeId: string; name: string }
  /** A place to create first (or already asked for by another suggestion). */
  | { kind: 'create'; placeId: string; name: string; place: PlaceToCreate }
  | { kind: 'none'; reason: string };

const cityById = new Map(CITIES.map((c) => [c.id, c]));

/** Our cities called this name, whatever their country. */
const citiesNamed = (name: string): City[] => {
  const k = normalizeArtistName(name);
  return CITIES.filter((c) => normalizeArtistName(c.name) === k);
};

/**
 * US territories the globe names as countries of their own. Wikidata's P17
 * for Bayamón is the United States, while MusicBrainz walks Bayamón up to
 * Puerto Rico; the same town must not become two places for that. By
 * bounding box, since the territories are islands far from the states.
 */
const US_TERRITORIES: readonly {
  name: string;
  lat: [number, number];
  lng: [number, number];
}[] = [
  { name: 'Puerto Rico', lat: [17.8, 18.6], lng: [-67.99, -65.2] },
  {
    name: 'United States Virgin Islands',
    lat: [17.6, 18.45],
    lng: [-65.1, -64.5],
  },
  { name: 'Guam', lat: [13.2, 13.7], lng: [144.6, 145.0] },
];

/** The territory a US place is in, when the globe spells it as a country. */
function territoryOf(
  country: string,
  coordinates: readonly [number, number] | null,
): string | null {
  if (!coordinates || countryKey(country) !== countryKey('US')) return null;
  const [lat, lng] = coordinates;
  const territory = US_TERRITORIES.find(
    (t) =>
      lat >= t.lat[0] && lat <= t.lat[1] && lng >= t.lng[0] && lng <= t.lng[1],
  );
  return territory
    ? (CITIES_SPELLING.get(countryKey(territory.name)) ?? null)
    : null;
}

/** A place asked for, and the facts that asked for it. */
interface Entry {
  name: string;
  /** The country as the globe spells it. */
  country: string;
  region: RegionId;
  coordinates: [number, number];
  wikidata?: string;
  mbArea?: string;
  /** The slug it would have with no other place of its name. */
  base: string;
}

/**
 * Which of two facts about one place speaks for it (its name, coordinates
 * and ids in the body): the one with a Wikidata item, then the lower item
 * id — so the body does not depend on which artist asked first.
 */
const speaksFirst = (a: Entry, b: Entry): number =>
  Number(!a.wikidata) - Number(!b.wikidata) ||
  (a.wikidata ?? '').localeCompare(b.wikidata ?? '') ||
  (a.mbArea ?? '').localeCompare(b.mbArea ?? '') ||
  a.name.localeCompare(b.name);

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** A suffix that tells this place from every other: its Wikidata item, else where it is. */
const ownSuffix = (entry: Entry): string =>
  entry.wikidata?.toLowerCase() ??
  toSlug(
    `${Math.abs(entry.coordinates[0]).toFixed(2)}${entry.coordinates[0] < 0 ? 's' : 'n'} ` +
      `${Math.abs(entry.coordinates[1]).toFixed(2)}${entry.coordinates[1] < 0 ? 'w' : 'e'}`,
  );

/**
 * Every place's slug, from the set of places alone — never from the order
 * they were asked for, since the slug is part of the suggestion's id and a
 * stored decision must keep meaning the same place:
 *  - its plain slug ('tottenham') when no other place, ours or asked for,
 *    has it;
 *  - else its name and country ('london-canada'), when no other place of
 *    that name is in that country;
 *  - else its name, country and Wikidata item ('henderson-us-q49267').
 * A slug is never handed from one place to another: when a second
 * Henderson arrives, the first gives up 'henderson' rather than lending it.
 */
function assignSlugs(
  entries: readonly Entry[],
  reserved: ReadonlySet<string> = new Set(),
): Map<Entry, string> {
  const taken = (slug: string) => cityById.has(slug) || reserved.has(slug);
  const byBase = new Map<string, Entry[]>();
  for (const entry of entries)
    byBase.set(entry.base, [...(byBase.get(entry.base) ?? []), entry]);
  const slugs = new Map<Entry, string>();
  const qualified = (entry: Entry) => {
    const country = toSlug(entry.country);
    return entry.base.endsWith(`-${country}`)
      ? entry.base
      : `${entry.base}-${country}`;
  };
  const full = (entry: Entry) => `${qualified(entry)}-${ownSuffix(entry)}`;
  for (const [base, group] of byBase) {
    for (const entry of group) {
      if (group.length === 1 && !taken(base)) {
        slugs.set(entry, base);
        continue;
      }
      const inCountry = group.filter(
        (e) => countryKey(e.country) === countryKey(entry.country),
      );
      const slug = qualified(entry);
      slugs.set(
        entry,
        inCountry.length === 1 && slug !== base && !taken(slug)
          ? slug
          : full(entry),
      );
    }
  }
  // Two names that slug alike across groups: both take their full slug.
  const count = new Map<string, number>();
  for (const slug of slugs.values())
    count.set(slug, (count.get(slug) ?? 0) + 1);
  for (const [entry, slug] of slugs)
    if ((count.get(slug) ?? 0) > 1) slugs.set(entry, full(entry));
  return slugs;
}

/**
 * The places of one run: matches to our cities, and the places to create,
 * each created once however many suggestions need it.
 *
 * One place, however many sources name it: the same Wikidata item, the same
 * MusicBrainz area, the same name within 5 km whatever country each source
 * gives, or the same name in the same country within 25 km (C33).
 *
 * Slugs follow from the whole set of places (`assignSlugs`), so a slug handed
 * out before the last place was asked for may change: ask for every place
 * once, then again, and use the second answers (`buildSuggestions` does).
 */
export function createPlaceBook({
  reserved,
}: {
  /**
   * Slugs another book hands out already, to be treated like our cities':
   * the song half's places (studios' and labels' towns) never take a slug
   * the artist half's places have.
   */
  reserved?: ReadonlySet<string>;
} = {}) {
  const entries: Entry[] = [];
  let slugs: Map<Entry, string> | null = null;

  function existing(fact: PlaceFact, country: string | null): City | null {
    const resolution = resolvePlaceName(fact.name, country ?? undefined);
    if (resolution.status === 'resolved') {
      const city = cityById.get(resolution.id)!;
      // The same name in the same country, but far away: another place.
      if (
        fact.coordinates &&
        distanceKm(city.coordinates, fact.coordinates) > SAME_PLACE_KM
      )
        return null;
      return city;
    }
    // A shared name ("Portland") the country can't settle: the coordinates can.
    if (resolution.status === 'refused' && fact.coordinates) {
      const near = citiesNamed(fact.name).filter(
        (c) => distanceKm(c.coordinates, fact.coordinates!) <= SAME_PLACE_KM,
      );
      if (near.length === 1) return near[0];
    }
    return null;
  }

  function sameAs(candidate: Entry): Entry | undefined {
    return (
      (candidate.wikidata &&
        entries.find((e) => e.wikidata === candidate.wikidata)) ||
      (candidate.mbArea &&
        entries.find((e) => e.mbArea === candidate.mbArea)) ||
      entries.find(
        (e) =>
          sameName(e.name, candidate.name) &&
          closeEnough(
            { country: e.country, coordinates: e.coordinates },
            { country: candidate.country, coordinates: candidate.coordinates },
          ),
      )
    );
  }

  function toCreate(entry: Entry): PlaceToCreate {
    slugs ??= assignSlugs(entries, reserved);
    const slug = slugs.get(entry)!;
    const body: PlaceRecord = {
      id: slug,
      name: entry.name,
      country: entry.country,
      subdivision: '',
      region: entry.region,
      coordinates: [round4(entry.coordinates[0]), round4(entry.coordinates[1])],
      genres: [],
      description: '',
      activeDecades: [],
      pin: false,
    };
    return {
      slug,
      body,
      ...(entry.wikidata ? { wikidata: entry.wikidata } : {}),
      ...(entry.mbArea ? { mbArea: entry.mbArea } : {}),
    };
  }

  /** The place a fact names, as an entry to create; or why there is none. */
  function candidateFor(fact: PlaceFact): Entry | string {
    const name = fact.name.trim();
    const named = countryName(fact.country);
    if (!named) return `${name}: no country to place it in`;
    if (!fact.coordinates)
      return `${name}: not one of our places, and no coordinates to create it at`;
    const country =
      territoryOf(named, fact.coordinates) ??
      CITIES_SPELLING.get(countryKey(named));
    const region: RegionId | null = country ? countryRegionOf(country) : null;
    if (!country || !region) return `${name}: no globe region for ${named}`;
    return {
      name,
      country,
      region,
      coordinates: [fact.coordinates[0], fact.coordinates[1]],
      ...(fact.wikidata ? { wikidata: fact.wikidata } : {}),
      ...(fact.mbArea ? { mbArea: fact.mbArea } : {}),
      base: placeSlugFor(name, country),
    };
  }

  function lookup(fact: PlaceFact, register: boolean): PlaceMatch {
    const name = fact.name.trim();
    if (!name) return { kind: 'none', reason: 'no name' };
    const country = countryName(fact.country);
    const city = existing(
      { ...fact, name },
      (fact.coordinates && country
        ? territoryOf(country, fact.coordinates)
        : null) ?? country,
    );
    if (city) return { kind: 'existing', placeId: city.id, name: city.name };

    const candidate = candidateFor({ ...fact, name });
    if (typeof candidate === 'string')
      return { kind: 'none', reason: candidate };
    let entry = sameAs(candidate);
    if (!entry) {
      if (!register)
        return {
          kind: 'none',
          reason: `${name}: not asked for by another source`,
        };
      entry = candidate;
      entries.push(entry);
      slugs = null;
    } else if (register && speaksFirst(candidate, entry) < 0) {
      // A better-sourced fact about the same place speaks for it now; the
      // ids it had are kept.
      Object.assign(entry, {
        ...candidate,
        wikidata: candidate.wikidata ?? entry.wikidata,
        mbArea: candidate.mbArea ?? entry.mbArea,
      });
      entry.base = placeSlugFor(entry.name, entry.country);
      slugs = null;
    } else if (register) {
      // Its ids join the place's (a MusicBrainz area for a Wikidata item).
      if (!entry.wikidata && candidate.wikidata) {
        entry.wikidata = candidate.wikidata;
        slugs = null;
      }
      entry.mbArea ??= candidate.mbArea;
    }
    const place = toCreate(entry);
    return { kind: 'create', placeId: place.slug, name, place };
  }

  return {
    place: (fact: PlaceFact): PlaceMatch => lookup(fact, true),
    /**
     * Like `place`, but never asks for a new place: one of ours, or one
     * another source has asked for already. For a source that only agrees.
     */
    find: (fact: PlaceFact): PlaceMatch => lookup(fact, false),
    /** Every place to create, with the slugs the whole set gives them. */
    created: (): readonly PlaceToCreate[] => entries.map(toCreate),
  };
}

export type PlaceBook = ReturnType<typeof createPlaceBook>;

/** Where one of our places is, for comparing it with a source's. */
export const cityCoordinates = (placeId: string): [number, number] | null =>
  cityById.get(placeId)?.coordinates ?? null;
