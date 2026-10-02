import {
  countryRegionOf,
  createPlaceResolver,
  placeSlugFor,
} from '../graph/places';
import { normalizeArtistName as normalize, toSlug } from '../graph/slugs';
import type { PlaceRecord } from '../records/types';
import type { RequiredRecord } from '../suggestions/types';
import {
  closeEnough,
  countryKey,
  distanceKm,
  SAME_PLACE_KM,
  SAME_SPOT_KM,
  sameName,
} from './samePlace';
import type { LinkingPlace } from './types';

/**
 * A city named in the app's own data → one of our places, or a new one to
 * create first.
 *
 * Our places are the globe's cities, plus any the console has created since
 * (a `pin: false` hometown, say), less any it deleted — the working data's
 * `places`. A name is placed by the names of those that are pins on the
 * globe first (as `resolvePlaceName` places one among the globe's cities),
 * which refuses a "Portland" it cannot tell apart; where the data also gives
 * coordinates, those settle it — an event pinned on Portland, Maine is in
 * Portland, Maine — and they alone find a place made without a pin.
 * A name no place has becomes a place to create: `pin: false` (the globe
 * draws no pin for it; the event or the song keeps its own), at the
 * coordinates the data gives, in the region its country's cities are filed
 * under.
 *
 * Two mentions are one place when they have the same name and are within
 * 5 km, or within 25 km in the same country (C33, `samePlace.ts`, the rule
 * the importer and the mock use too): Brooklyn named by eight events is made
 * once. A place the importer's artifacts already make (`imported`, its
 * `places.json`) is that place: a mention of it gets the importer's slug and
 * body, so the event, the song pin and MusicBrainz ask for one record, never
 * 'columbus' and 'columbus-us-q16567'. The importer's slugs are taken, too:
 * a different Norwalk of ours never takes the importer's 'norwalk'. Other
 * slugs follow the importer's rules — the plain name ('brooklyn') unless
 * another place has it.
 *
 * Slugs follow from the whole set of places asked for, never from the order
 * they were asked in, because a slug is part of a suggestion's id: a second
 * Springfield across the country takes 'springfield-us-…' from both. So ask
 * for every place once, then again, and keep the second answers (`index.ts`
 * does, over every planner that places things).
 */

export { distanceKm, SAME_PLACE_KM, SAME_SPOT_KM };

/** Where the data puts a city, and who says so. */
export interface PlaceFact {
  /** As written: 'Detroit', 'Bethel'. */
  name: string;
  country?: string;
  /** [lat, lng], when the data gives them. */
  coordinates?: readonly [number, number];
  /**
   * The item that names it ('evt-woodstock-1969', 'artist_location:toto').
   * Of several mentions of one new place, the lowest speaks for it — its
   * name and coordinates go in the body — whatever order they came in.
   */
  by: string;
}

export type PlaceAnswer =
  /** One of our places. */
  | {
      kind: 'existing';
      placeId: string;
      name: string;
      /**
       * How it was found: by the registry's name lookup, or by the name and
       * the coordinates together — a name the registry shares ("Portland"),
       * a name it only shortens ("Washington" at Washington D.C.), or a
       * place the console has created since, which the registry does not
       * know.
       */
      how: 'name' | 'coordinates';
      /** How far the data's coordinates are from the place's, when both are known. */
      km?: number;
    }
  /** A place to create first. */
  | {
      kind: 'create';
      placeId: string;
      name: string;
      record: RequiredRecord & { body: PlaceRecord };
      /** Where its region came from, when not from its country alone. */
      regionFrom?: string;
    }
  | { kind: 'none'; reason: string };

/** A new place, and every mention of it. */
interface Entry {
  /** Its name, folded: every mention of it has this name. */
  name: string;
  facts: PlaceFact[];
  /** The country as our places spell it. */
  country: string;
  region: PlaceRecord['region'];
  regionFrom?: string;
  /** The slug it has when no other place wants it. */
  base: string;
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** The mention that speaks for a place: the lowest `by`. */
const speaker = (entry: Entry): PlaceFact =>
  entry.facts.reduce((a, b) => (b.by < a.by ? b : a));

/** 'bethel-us-41.70n-74.88w': where it is, for a name its country shares. */
const spotSuffix = (entry: Entry): string => {
  const [lat, lng] = speaker(entry).coordinates!;
  return toSlug(
    `${Math.abs(lat).toFixed(2)}${lat < 0 ? 's' : 'n'} ` +
      `${Math.abs(lng).toFixed(2)}${lng < 0 ? 'w' : 'e'}`,
  );
};

/** A place the importer's artifacts make, as a required record. */
type ImportedPlace = RequiredRecord & {
  body: PlaceRecord;
};

const isImportedPlace = (record: RequiredRecord): record is ImportedPlace => {
  if (record.kind !== 'globe_city') return false;
  const body = record.body as Partial<PlaceRecord> | null;
  return (
    !!body &&
    typeof body.name === 'string' &&
    Array.isArray(body.coordinates) &&
    typeof body.coordinates[0] === 'number' &&
    typeof body.coordinates[1] === 'number'
  );
};

export function createPlaceBook(
  places: readonly LinkingPlace[] = [],
  options: {
    /**
     * The places the importer's suggestions make (their `requires`): named
     * the importer's way when a mention is one of them, and never another
     * place's slug.
     */
    imported?: readonly RequiredRecord[];
  } = {},
) {
  const byId = new Map(places.map((p) => [p.id, p]));
  // By name, the globe's pins: a city the store renamed resolves by its new
  // name, one it deleted not at all. A place made for a hometown or an event
  // (`pin: false`) is found by its name and where it is instead — a second
  // Bethel across the country is not the one made for Woodstock.
  const resolvePlaceName = createPlaceResolver(
    places.filter((place) => place.pin !== false),
  );
  const importedPlaces = new Map<string, ImportedPlace>();
  for (const record of options.imported ?? [])
    if (
      isImportedPlace(record) &&
      !byId.has(record.slug) &&
      !importedPlaces.has(record.slug)
    )
      importedPlaces.set(record.slug, record);
  const importedList = [...importedPlaces.values()].sort((a, b) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
  );
  const spellings = new Map<string, string>();
  for (const place of places) {
    const key = countryKey(place.country);
    if (!spellings.has(key)) spellings.set(key, place.country);
  }
  // Folded once: every city the data names is compared with all of them.
  const folded = new Map(
    places.map((place) => [
      place,
      [place.name, ...(place.aliases ?? [])].map(normalize),
    ]),
  );
  const namesOf = (place: LinkingPlace) => folded.get(place) ?? [];

  const entries: Entry[] = [];
  let slugs: Map<Entry, string> | null = null;

  /** One of ours, if the name (and where it is) says which. */
  function existing(fact: PlaceFact): PlaceAnswer | null {
    const at = fact.coordinates;
    const kmTo = (id: string) => {
      const place = byId.get(id);
      return place && at ? distanceKm(place.coordinates, at) : undefined;
    };
    const resolution = resolvePlaceName(fact.name, fact.country || undefined);
    if (resolution.status === 'resolved') {
      const km = kmTo(resolution.id);
      return {
        kind: 'existing',
        placeId: resolution.id,
        name: byId.get(resolution.id)?.name ?? fact.name,
        how: 'name',
        ...(km === undefined ? {} : { km }),
      };
    }
    if (!at) return null;
    const name = normalize(fact.name);
    // An event whose country the data left out is taken to be in the
    // place's, as a pin on it would be.
    const close = (p: LinkingPlace) =>
      closeEnough(
        { country: fact.country, coordinates: at },
        { country: p.country, coordinates: p.coordinates },
        { sameCountry: 'unless-unsaid' },
      );
    // The same name; else, right there, a place whose name the data only
    // shortens ('Washington' for our 'Washington D.C.').
    const named = places.filter((p) => namesOf(p).includes(name) && close(p));
    const near = named.length
      ? named
      : places.filter(
          (p) => namesOf(p).some((n) => n.startsWith(`${name} `)) && close(p),
        );
    if (near.length !== 1) return null;
    return {
      kind: 'existing',
      placeId: near[0].id,
      name: near[0].name,
      how: 'coordinates',
      km: distanceKm(near[0].coordinates, at),
    };
  }

  /** The globe region for a new place in `country`, and where it came from. */
  function regionFor(
    country: string,
    at: readonly [number, number],
  ): { region: PlaceRecord['region']; from?: string } | null {
    const region = countryRegionOf(country);
    if (region) return { region };
    // A country whose cities span two regions (Russia): the nearest of them.
    const key = countryKey(country);
    let best: LinkingPlace | null = null;
    for (const place of places) {
      if (countryKey(place.country) !== key) continue;
      if (
        !best ||
        distanceKm(place.coordinates, at) < distanceKm(best.coordinates, at)
      )
        best = place;
    }
    return best ? { region: best.region, from: best.name } : null;
  }

  function sameAs(fact: PlaceFact, country: string): Entry | undefined {
    const name = normalize(fact.name);
    return entries.find(
      (entry) =>
        entry.name === name &&
        entry.facts.some((other) =>
          closeEnough(
            { country: entry.country, coordinates: other.coordinates! },
            { country, coordinates: fact.coordinates! },
          ),
        ),
    );
  }

  /** The importer's new place this mention is, if it is one (C33). */
  function importedAs(
    fact: PlaceFact,
    country: string,
  ): ImportedPlace | undefined {
    if (!fact.coordinates) return undefined;
    return importedList.find(
      (record) =>
        sameName(record.body.name, fact.name) &&
        closeEnough(
          {
            country: record.body.country,
            coordinates: record.body.coordinates,
          },
          { country, coordinates: fact.coordinates! },
        ),
    );
  }

  /**
   * Every new place's slug, from the set of them (see the file note): its
   * plain slug when nothing else has it; else with its country, when no
   * other place of that name is in that country; else with where it is.
   */
  function assignSlugs(): Map<Entry, string> {
    const taken = (slug: string) => byId.has(slug) || importedPlaces.has(slug);
    const byBase = new Map<string, Entry[]>();
    for (const entry of entries)
      byBase.set(entry.base, [...(byBase.get(entry.base) ?? []), entry]);
    const out = new Map<Entry, string>();
    for (const [base, group] of byBase) {
      for (const entry of group) {
        if (group.length === 1 && !taken(base)) {
          out.set(entry, base);
          continue;
        }
        const country = toSlug(entry.country);
        const qualified = base.endsWith(`-${country}`)
          ? base
          : `${base}-${country}`;
        const inCountry = group.filter(
          (e) => countryKey(e.country) === countryKey(entry.country),
        );
        out.set(
          entry,
          inCountry.length === 1 && qualified !== base && !taken(qualified)
            ? qualified
            : `${qualified}-${spotSuffix(entry)}`,
        );
      }
    }
    // Two names that slug alike: both say where they are.
    const count = new Map<string, number>();
    for (const slug of out.values())
      count.set(slug, (count.get(slug) ?? 0) + 1);
    for (const [entry, slug] of out)
      if ((count.get(slug) ?? 0) > 1)
        out.set(entry, `${slug}-${spotSuffix(entry)}`);
    return out;
  }

  function bodyOf(entry: Entry, slug: string): PlaceRecord {
    const fact = speaker(entry);
    const [lat, lng] = fact.coordinates!;
    return {
      id: slug,
      name: fact.name.trim(),
      country: entry.country,
      subdivision: '',
      region: entry.region,
      coordinates: [round4(lat), round4(lng)],
      genres: [],
      description: '',
      activeDecades: [],
      pin: false,
    };
  }

  /** Where a fact is: one of ours, a place to create, or why neither. */
  function place(fact: PlaceFact): PlaceAnswer {
    const name = fact.name?.trim();
    if (!name) return { kind: 'none', reason: 'no city named' };
    const found = existing({ ...fact, name });
    if (found) return found;
    if (!fact.coordinates)
      return {
        kind: 'none',
        reason: `"${name}" is not one of our places, and there are no coordinates to make it at`,
      };
    const written = fact.country?.trim();
    if (!written)
      return {
        kind: 'none',
        reason: `"${name}" is not one of our places, and no country is given`,
      };
    const country = spellings.get(countryKey(written)) ?? written;

    const theirs = importedAs({ ...fact, name }, country);
    if (theirs)
      return {
        kind: 'create',
        placeId: theirs.slug,
        name: theirs.body.name,
        record: theirs,
      };

    let entry = sameAs({ ...fact, name }, country);
    if (!entry) {
      const region = regionFor(country, fact.coordinates);
      if (!region)
        return {
          kind: 'none',
          reason: `"${name}" is not one of our places, and no globe region is known for ${written}`,
        };
      entry = {
        name: normalize(name),
        facts: [],
        country,
        region: region.region,
        ...(region.from ? { regionFrom: region.from } : {}),
        base: placeSlugFor(name, country),
      };
      entries.push(entry);
      slugs = null;
    }
    if (!entry.facts.some((f) => f.by === fact.by)) {
      entry.facts.push({ ...fact, name });
      slugs = null;
    }
    slugs ??= assignSlugs();
    const slug = slugs.get(entry)!;
    const body = bodyOf(entry, slug);
    return {
      kind: 'create',
      placeId: slug,
      name: body.name,
      record: { kind: 'globe_city', slug, body },
      ...(entry.regionFrom ? { regionFrom: entry.regionFrom } : {}),
    };
  }

  return {
    place,
    /** Every place to create, as the whole set of mentions makes them. */
    created(): (RequiredRecord & { body: PlaceRecord })[] {
      slugs ??= assignSlugs();
      return entries
        .map((entry) => {
          const slug = slugs!.get(entry)!;
          return { kind: 'globe_city', slug, body: bodyOf(entry, slug) };
        })
        .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    },
  };
}

export type PlaceBook = ReturnType<typeof createPlaceBook>;
