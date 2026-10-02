import type { ArtistRecord, PlaceRecord } from './types';

/**
 * One set of artists and one set of places, out of the two files each is
 * kept in, and back again.
 *
 * The repo store, the mock's seed and the read-only console's repo snapshot
 * all compose through here, so the three see the same records.
 *
 * **Artists.** The globe roster (`artistRegistry.ts`) holds a roster
 * artist's slug, name and aliases. Those are what students see, through the
 * globe's artist matcher and its chips. Everything else the console knows
 * about an artist (born, genres, members, ids in other catalogues), and
 * every artist who is not on the roster at all, lives in
 * `src/content/data/artists.json`, which no student module reads. So a
 * roster artist is its registry entry plus its artists.json row, and saving
 * it splits it again: the roster fields to the registry, the rest to the
 * row. An artist off the roster is its row, whole.
 *
 * **Places.** The `pin` field chooses the file. A place the globe draws a
 * pin for (`pin` absent or true) is one of the globe's cities, in
 * `cities.ts`. A place it draws none for (`pin: false`: a hometown, a
 * studio's town) lives in `src/content/data/places.json`. Flipping `pin`
 * therefore moves the record, and a pin appears on, or leaves, the
 * students' globe.
 *
 * Composing refuses what could not be split back the same way (one record
 * in two files, a field in the wrong file) and lists every problem it
 * found, rather than picking a winner and losing the other copy on the next
 * save.
 *
 * Pure: plain objects in, new plain objects out. Fields set to `undefined`
 * are dropped, as a JSON round trip would drop them; nested values are
 * shared with the inputs, not copied.
 */

/** What the globe roster holds of an artist: `artistRegistry.ts`'s entries. */
export type RosterArtist = Pick<ArtistRecord, 'slug' | 'name' | 'aliases'>;

/** The fields of an artist that live on the roster, for a roster artist. */
export const ROSTER_FIELDS = ['slug', 'name', 'aliases'] as const;

/**
 * An `artists.json` row. For an artist off the roster it is the whole
 * record. For a roster artist it is the slug and the fields the roster does
 * not hold, so never `name` or `aliases`.
 */
export type ArtistRow = Omit<ArtistRecord, 'name'> & { name?: string };

/** Where one artist's fields go when it is saved. */
export interface ArtistSplit {
  /** The registry entry, for an artist on the roster; null for one off it. */
  roster: RosterArtist | null;
  /**
   * The `artists.json` row: the whole record for an artist off the roster.
   * For one on it, the slug and the other fields, or null when there are
   * no other fields (so the file holds no rows that say nothing).
   */
  row: ArtistRow | null;
}

/** The file a place lives in. */
export type PlaceHome = 'cities' | 'places';

/** A composition that could not be split back the same way; lists every problem. */
export class RecordComposeError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `These records could not be saved back where they are kept:\n${problems
        .map((problem) => `  - ${problem}`)
        .join('\n')}`,
    );
    this.name = 'RecordComposeError';
  }
}

const isRosterField = (key: string) =>
  (ROSTER_FIELDS as readonly string[]).includes(key);

/** A shallow copy of `value` without its undefined fields. */
function defined<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value))
    if (field !== undefined) out[key] = field;
  return out as T;
}

/** Each id held more than once, once. */
function repeated(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) twice.add(id);
    seen.add(id);
  }
  return [...twice];
}

// ── Artists ─────────────────────────────────────────────────────────────────

/**
 * Every artist: each roster artist, in roster order, as its registry entry
 * with its `artists.json` row's other fields after it (so the keys come in
 * the record schema's order when the row's do), then every artist off the
 * roster, in the rows' order, as its row.
 *
 * Refused, all together: a slug the roster or the rows hold twice; a roster
 * entry holding a field the roster does not keep; a roster artist's row
 * holding `name` or `aliases`, which the roster owns; and a row off the
 * roster with no name, which is what is left when an artist is taken off
 * the roster by hand without its row.
 */
export function composeArtists(
  registry: readonly RosterArtist[],
  rows: readonly ArtistRow[],
): ArtistRecord[] {
  const problems: string[] = [];
  for (const slug of repeated(registry.map((entry) => entry.slug)))
    problems.push(`the roster lists '${slug}' more than once`);
  for (const slug of repeated(rows.map((row) => row.slug)))
    problems.push(`artists.json has more than one row for '${slug}'`);

  const onRoster = new Set(registry.map((entry) => entry.slug));
  const rowOf = new Map(rows.map((row) => [row.slug, row]));
  const artists: ArtistRecord[] = [];

  for (const entry of registry) {
    const extra = Object.keys(defined(entry)).filter(
      (key) => !isRosterField(key),
    );
    if (extra.length)
      problems.push(
        `the roster entry '${entry.slug}' holds fields that belong in artists.json: ${extra.join(', ')}`,
      );
    const row: Record<string, unknown> = defined(
      rowOf.get(entry.slug) ?? { slug: entry.slug },
    );
    const rest = Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== 'slug'),
    );
    const owned = Object.keys(rest).filter(isRosterField);
    if (owned.length)
      problems.push(
        `artists.json's row for '${entry.slug}' holds ${owned.join(' and ')}, which the roster (artistRegistry.ts) owns for a roster artist`,
      );
    const { slug, name, aliases } = entry;
    artists.push({
      slug,
      name,
      ...(aliases !== undefined ? { aliases } : {}),
      ...rest,
    });
  }

  for (const row of rows) {
    if (onRoster.has(row.slug)) continue;
    if (typeof row.name !== 'string') {
      problems.push(
        `artists.json's row for '${row.slug}' has no name, and '${row.slug}' is not on the roster: add its name to the row, or put the artist back on the roster`,
      );
      continue;
    }
    artists.push(defined(row) as ArtistRecord);
  }

  if (problems.length) throw new RecordComposeError(problems);
  return artists;
}

/**
 * Where one artist's fields are saved. On the roster: slug, name and aliases
 * to the registry, everything else to its row. Off it: the whole record to
 * its row. Moving an artist on to or off the roster is this with the other
 * `onRoster`.
 */
export function splitArtist(
  body: ArtistRecord,
  onRoster: boolean,
): ArtistSplit {
  const all = defined(body);
  if (!onRoster) return { roster: null, row: all };
  const { slug, name, aliases, ...rest } = all;
  const roster: RosterArtist = {
    slug,
    name,
    ...(aliases !== undefined ? { aliases } : {}),
  };
  return {
    roster,
    row: Object.keys(rest).length ? { slug, ...rest } : null,
  };
}

/**
 * `splitArtist` over every artist: the registry entries of the ones whose
 * slug `roster` holds, in the bodies' order, and every row. The inverse of
 * `composeArtists` for the same roster. Refuses a slug given twice.
 */
export function splitArtists(
  bodies: readonly ArtistRecord[],
  roster: ReadonlySet<string>,
): { registry: RosterArtist[]; rows: ArtistRow[] } {
  const twice = repeated(bodies.map((body) => body.slug));
  if (twice.length)
    throw new RecordComposeError(
      twice.map((slug) => `more than one artist has the slug '${slug}'`),
    );
  const registry: RosterArtist[] = [];
  const rows: ArtistRow[] = [];
  for (const body of bodies) {
    const split = splitArtist(body, roster.has(body.slug));
    if (split.roster) registry.push(split.roster);
    if (split.row) rows.push(split.row);
  }
  return { registry, rows };
}

// ── Places ──────────────────────────────────────────────────────────────────

/**
 * The file a place is saved in: the globe's cities when it has a pin
 * (`pin` absent or true), `places.json` when it has none (`pin: false`).
 */
export const placeHome = (place: Pick<PlaceRecord, 'pin'>): PlaceHome =>
  place.pin === false ? 'places' : 'cities';

/**
 * Every place: the globe's cities in their order, then the unpinned places
 * in theirs.
 *
 * Refused, all together: an id held twice, in one file or across both; a
 * city with `pin: false`; and a place in `places.json` without it. Either
 * of the last two would move on its next save, which is a pin appearing or
 * vanishing that nobody asked for.
 */
export function composePlaces(
  cities: readonly PlaceRecord[],
  places: readonly PlaceRecord[],
): PlaceRecord[] {
  const problems: string[] = [];
  for (const id of repeated([...cities, ...places].map((place) => place.id)))
    problems.push(`more than one place has the id '${id}'`);
  for (const city of cities)
    if (placeHome(city) !== 'cities')
      problems.push(
        `cities.ts holds '${city.id}' with pin: false; a place without a pin belongs in places.json`,
      );
  for (const place of places)
    if (placeHome(place) !== 'places')
      problems.push(
        `places.json holds '${place.id}' without pin: false; a place with a pin belongs in cities.ts`,
      );
  if (problems.length) throw new RecordComposeError(problems);
  return [...cities, ...places].map((place) => defined(place));
}

/**
 * Every place, sorted into the file it is saved in by `placeHome`, each
 * file's in the bodies' order. The inverse of `composePlaces`; a place
 * whose `pin` changed lands in the other file.
 */
export function splitPlaces(bodies: readonly PlaceRecord[]): {
  cities: PlaceRecord[];
  places: PlaceRecord[];
} {
  const twice = repeated(bodies.map((body) => body.id));
  if (twice.length)
    throw new RecordComposeError(
      twice.map((id) => `more than one place has the id '${id}'`),
    );
  const cities: PlaceRecord[] = [];
  const places: PlaceRecord[] = [];
  for (const body of bodies) {
    if (placeHome(body) === 'cities') cities.push(defined(body));
    else places.push(defined(body));
  }
  return { cities, places };
}
