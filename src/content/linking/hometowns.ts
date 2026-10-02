import { isGroupArtist, placeAndGenreNames } from '../graph/deriveGraph';
import { artistSlug, normalizeArtistName as normalize } from '../graph/slugs';
import type { RequiredRecord, Suggestion } from '../suggestions/types';
import {
  createPlaceBook,
  distanceKm,
  type PlaceAnswer,
  type PlaceBook,
  SAME_PLACE_KM,
} from './placeBook';
import { appSource, createCollector, makeSuggestion } from './plan';
import {
  CONFIDENCE,
  type LinkingArtist,
  type LinkingInput,
  type Plan,
  type PlanOptions,
} from './types';

/**
 * Hometowns: an act's City from where the globe pins its songs (the
 * `artist_location` items), offered as the artist's `basedInPlaceId`.
 *
 * Always `likely`, never in bulk (the owner's call, 29 Sep): a song pin is
 * where the songs are shown, which is often where someone was born or grew
 * up rather than their scene — Marvin Gaye's pins say Washington, where his
 * scene was Detroit (C23). So each is a guess a person accepts, one row at a
 * time, until MusicBrainz or Wikidata agree.
 *
 * Where the importer (MusicBrainz or Wikidata) offers the same place as the
 * act's City, the two offers are one suggestion with both sources — the
 * importer may call it sure. Where it offers the same place only as a
 * person's birthplace (`born.placeId`, P19), the pin is offered there
 * instead: it says where they were born, not their scene. A group's
 * birthplace is its City, so a group's pin never goes to `born`.
 *
 * A pin names its act in lowercase ('marvin gaye'), and not every key is an
 * act the Atlas has:
 *  - a key that is no act at all ('traditional'), or a song's title with its
 *    artist, is dropped;
 *  - a joint billing ('blackstreet and dr. dre') is listed, never written:
 *    two acts, one pin. So is a registry record that is itself one
 *    ('Stevie Wonder/Chaka Khan', 'Alicia Keys and Justin Timberlake'): a
 *    record whose name joins two of our acts, or joins names with a slash —
 *    a band's own name ('Hall And Oates', 'AC/DC') joins no two acts;
 *  - a record whose name is one letter from another act's with at least as
 *    many songs ('Marivn Gaye') is offered with a warning: it may be a
 *    misspelt copy of that act;
 *  - an act with no artist record is listed with the record that would be
 *    made for it, and a warning where its name is also a place or a genre
 *    (Chicago the band would become the subject of every event tagged with
 *    the city). Once the record exists, its pin is planned like any other.
 */

export interface HometownsReport {
  /** Song pins read. */
  entries: number;
  /** Pins whose act is an artist: by its slug, or by its name or an alias. */
  artists: { bySlug: number; byName: number };
  /** Suggestions: the act's City, and (a person's) birthplace. */
  basedIn: number;
  born: number;
  /** Of those, suggestions the importer offers too. */
  agreed: number;
  /** Pins in one of our places, and pins asking for a new one. */
  existingPlace: number;
  newPlace: { entries: number; places: number };
  jointBillings: {
    key: string;
    /** The registry record the pin names, when that record is the billing. */
    record?: string;
    parts: { name: string; slug: string | null }[];
  }[];
  /** Acts offered a City whose record's name is one letter from another's. */
  nearDuplicates: { slug: string; like: string }[];
  dropped: { key: string; reason: string }[];
  missingArtists: {
    key: string;
    slug: string;
    name: string;
    /** Where the pin is, or null when the place cannot be made. */
    placeId: string | null;
    /** What to make first, in order: the place (when new), then the act. */
    requires: RequiredRecord[];
    /** Its name is also a place's or a genre's, which tags will not match. */
    collision?: 'place' | 'genre';
  }[];
  /** Pins whose city is none of ours and cannot be made. */
  unplaceable: { key: string; reason: string }[];
  /** Acts with more than one pin. */
  repeated: { slug: string; keys: string[] }[];
  unreachable: { id: string; reason: string }[];
}

export interface HometownsOptions extends PlanOptions {
  /**
   * The importer's suggestions (the committed artifacts). An act's City or
   * birthplace there decides where a pin naming the same place goes.
   */
  imported?: readonly Suggestion[];
  /** See `EventPlacesOptions.book`. */
  book?: PlaceBook;
}

/** Keys that are no act at all (the Links page's billing words). */
const NOT_AN_ACT = new Set([
  'traditional',
  'unknown artist',
  'various artists',
]);

/** A key that is a song with its artist: 'es una historia – … – stevie wonder'. */
const SONG_KEY = /\s[–—]\s/;

/** Joint billings: "A & B", "A and B", "A feat. B", "A with B", "A / B", "A, B". */
const JOINT = /\s(?:&|and|feat\.?|featuring|ft\.|with|x)\s|\s*\/\s*|,\s/i;

/** A slash between two words, as billings join acts ('Drake/Scary Pockets'); not 'AC/DC'. */
const SLASHED = /[^\s/]{3}\s*\/\s*[^\s/]{3}/;

/**
 * Whether two folded names are one edit apart: a letter changed, added,
 * dropped, or two neighbours swapped ('marivn' for 'marvin').
 */
function oneEditApart(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return (
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2)
    );
  }
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

/** Shorter than this, one letter apart is two names ('Eve', 'Eva'). */
const NEAR_NAME_MIN = 6;

/** 'kenny loggins' → 'Kenny Loggins', for a key nothing else spells. */
const titleCase = (key: string) =>
  key.replace(
    /(^|[\s-])(\p{L})/gu,
    (_, gap: string, letter: string) => gap + letter.toUpperCase(),
  );

function plan(
  input: LinkingInput,
  options: HometownsOptions,
  book: PlaceBook,
): Plan<HometownsReport> {
  const out = createCollector();
  const report: HometownsReport = {
    entries: 0,
    artists: { bySlug: 0, byName: 0 },
    basedIn: 0,
    born: 0,
    agreed: 0,
    existingPlace: 0,
    newPlace: { entries: 0, places: 0 },
    jointBillings: [],
    nearDuplicates: [],
    dropped: [],
    missingArtists: [],
    unplaceable: [],
    repeated: [],
    unreachable: out.unreachable,
  };

  const artists = input.artists ?? [];
  const bySlug = new Map(artists.map((a) => [a.slug, a]));
  const byName = new Map<string, LinkingArtist>();
  for (const artist of artists)
    for (const name of [artist.name, ...(artist.aliases ?? [])])
      if (typeof name === 'string') byName.set(normalize(name), artist);
  const places = new Map((input.places ?? []).map((p) => [p.id, p]));
  const findArtist = (name: string) =>
    bySlug.get(artistSlug(name)) ?? byName.get(normalize(name));
  /** A registry record that is a billing of two or more acts: its parts. */
  const billingParts = (artist: LinkingArtist) => {
    const parts = artist.name
      .split(JOINT)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) return null;
    const found = parts.map((part) => {
      const other = findArtist(part);
      return other && other.slug !== artist.slug ? other : undefined;
    });
    const acts = found.filter(Boolean).length;
    if (acts < 2 && !SLASHED.test(artist.name)) return null;
    return parts.map((part, index) => ({
      name: found[index]?.name ?? part,
      slug: found[index]?.slug ?? null,
    }));
  };
  // Folded once, by length, for the near-duplicate check.
  const byLength = new Map<number, { slug: string; name: string }[]>();
  for (const artist of artists) {
    const folded = normalize(artist.name);
    if (folded.length < NEAR_NAME_MIN) continue;
    const list = byLength.get(folded.length) ?? [];
    list.push({ slug: artist.slug, name: folded });
    byLength.set(folded.length, list);
  }
  // Songs billed to each name: of two names a letter apart, the one with
  // fewer songs is the likelier slip ('Marivn Gaye' beside Marvin Gaye).
  const songsBilled = new Map<string, number>();
  for (const song of input.songs ?? [])
    if (typeof song?.artist === 'string') {
      const folded = normalize(song.artist);
      songsBilled.set(folded, (songsBilled.get(folded) ?? 0) + 1);
    }
  const nearTo = (artist: LinkingArtist) => {
    const folded = normalize(artist.name);
    if (folded.length < NEAR_NAME_MIN) return undefined;
    const mine = songsBilled.get(folded) ?? 0;
    for (const length of [folded.length - 1, folded.length, folded.length + 1])
      for (const other of byLength.get(length) ?? [])
        if (
          other.slug !== artist.slug &&
          oneEditApart(folded, other.name) &&
          (songsBilled.get(other.name) ?? 0) >= mine
        )
          return bySlug.get(other.slug);
    return undefined;
  };
  const collisions = placeAndGenreNames(input);
  const placeNames = new Set([...collisions.placeNames].map(normalize));
  const genreNames = new Set([...collisions.genreNames].map(normalize));

  // What the importer says of each act's places: its City and birthplace.
  const offers = new Map<string, Suggestion[]>();
  for (const s of options.imported ?? [])
    if (
      s.target.kind === 'artist' &&
      (s.path === 'basedInPlaceId' || s.path === 'born.placeId')
    )
      offers.set(s.target.slug, [...(offers.get(s.target.slug) ?? []), s]);

  const newPlaces = new Set<string>();
  const keysByArtist = new Map<string, string[]>();
  const agreedIds = new Set<string>();

  /** Where an existing place or a place to make is, for comparing places. */
  const spotOf = (answer: PlaceAnswer): readonly [number, number] | null =>
    answer.kind === 'create'
      ? answer.record.body.coordinates
      : answer.kind === 'existing'
        ? (places.get(answer.placeId)?.coordinates ?? null)
        : null;

  /** The importer's suggestion at `path` that names this same place. */
  const sameOffer = (slug: string, path: string, answer: PlaceAnswer) => {
    if (answer.kind === 'none') return undefined;
    const spot = spotOf(answer);
    return (offers.get(slug) ?? []).find((s) => {
      if (s.path !== path) return false;
      if (s.value === answer.placeId) return true;
      // The importer may call the same new place by another slug.
      const made = s.requires?.find(
        (r) => r.kind === 'globe_city' && r.slug === s.value,
      )?.body as { name?: unknown; coordinates?: unknown } | undefined;
      return (
        !!made &&
        !!spot &&
        typeof made.name === 'string' &&
        normalize(made.name) === normalize(answer.name) &&
        Array.isArray(made.coordinates) &&
        distanceKm(made.coordinates as [number, number], spot) <= SAME_PLACE_KM
      );
    });
  };

  const entries = [...(input.artistLocations ?? [])].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  for (const entry of entries) {
    if (typeof entry?.id !== 'string' || !entry.id.trim()) continue;
    report.entries++;
    const key = entry.id;
    const city = typeof entry.city === 'string' ? entry.city.trim() : '';
    const at =
      Number.isFinite(entry.lat) && Number.isFinite(entry.lng)
        ? ([entry.lat, entry.lng] as [number, number])
        : undefined;
    const where = () =>
      city
        ? book.place({
            name: city,
            ...(entry.country ? { country: entry.country } : {}),
            ...(at ? { coordinates: at } : {}),
            by: `artist_location:${key}`,
          })
        : ({ kind: 'none', reason: 'no city named' } as const);

    let artist = bySlug.get(artistSlug(key));
    if (artist) report.artists.bySlug++;
    else {
      artist = byName.get(normalize(key));
      if (artist) report.artists.byName++;
    }

    if (!artist) {
      if (NOT_AN_ACT.has(key.trim().toLowerCase())) {
        report.dropped.push({ key, reason: 'it names no act' });
      } else if (SONG_KEY.test(key)) {
        report.dropped.push({
          key,
          reason: 'it names a song with its artist, not an act',
        });
      } else if (JOINT.test(key)) {
        report.jointBillings.push({
          key,
          parts: key
            .split(JOINT)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
              const found = findArtist(part);
              return {
                name: found?.name ?? titleCase(part),
                slug: found?.slug ?? null,
              };
            }),
        });
      } else {
        const answer = where();
        const name = spelledIn(input, key) ?? titleCase(key);
        const slug = artistSlug(name);
        const folded = normalize(name);
        report.missingArtists.push({
          key,
          slug,
          name,
          placeId: answer.kind === 'none' ? null : answer.placeId,
          requires: [
            ...(answer.kind === 'create' ? [answer.record] : []),
            { kind: 'artist', slug, body: { slug, name } },
          ],
          ...(placeNames.has(folded)
            ? { collision: 'place' as const }
            : genreNames.has(folded)
              ? { collision: 'genre' as const }
              : {}),
        });
      }
      continue;
    }

    // The record the key names is itself a billing, or a song: as above.
    const billing = billingParts(artist);
    if (billing) {
      report.jointBillings.push({ key, record: artist.slug, parts: billing });
      continue;
    }
    if (SONG_KEY.test(artist.name)) {
      report.dropped.push({
        key,
        reason: `its record "${artist.name}" names a song with its artist, not an act`,
      });
      continue;
    }

    keysByArtist.set(artist.slug, [
      ...(keysByArtist.get(artist.slug) ?? []),
      key,
    ]);
    const answer = where();
    if (answer.kind === 'none') {
      report.unplaceable.push({ key, reason: answer.reason });
      continue;
    }
    if (answer.kind === 'create') {
      report.newPlace.entries++;
      newPlaces.add(answer.placeId);
    } else report.existingPlace++;

    // The City, when the importer says so too; else a person's
    // birthplace, when the importer (or the record) says that; else the City.
    const cityOffer = sameOffer(artist.slug, 'basedInPlaceId', answer);
    const birthplace =
      cityOffer || isGroupArtist(artist)
        ? undefined
        : artist.born?.placeId === answer.placeId
          ? null
          : sameOffer(artist.slug, 'born.placeId', answer);
    const born = birthplace !== undefined;
    // Agreeing with the importer, the pin names its place the importer's
    // way, so the two offers are one suggestion.
    const agreed = cityOffer ?? birthplace ?? undefined;
    const placeId =
      typeof agreed?.value === 'string' ? agreed.value : answer.placeId;
    const requires =
      agreed?.requires ?? (answer.kind === 'create' ? [answer.record] : []);
    const placeName = answer.name;
    const country = entry.country ? `, ${entry.country}` : '';

    const evidence = [
      `the song pins for "${key}" are in ${placeName}${country}`,
      cityOffer
        ? 'an outside source gives the same place as their City'
        : born
          ? birthplace
            ? 'an outside source gives the same place as where they were born, so it is offered as the birthplace'
            : 'it is the birthplace their record already states'
          : 'song pins mark where the songs are shown, often where the act was born or grew up rather than their scene: a person checks',
    ];
    if (answer.kind === 'create' && !agreed)
      evidence.push(
        `${placeName} is none of our places: accepting makes it, not as a pin on the globe, at the pins' coordinates`,
      );
    const near = nearTo(artist);
    if (near) {
      evidence.push(
        `the record's name "${artist.name}" is one letter from ${near.name}'s: check it is not a misspelt copy of that act`,
      );
      if (!report.nearDuplicates.some((n) => n.slug === artist.slug))
        report.nearDuplicates.push({ slug: artist.slug, like: near.slug });
    }

    const suggestion = makeSuggestion(
      {
        target: { kind: 'artist', slug: artist.slug },
        path: born ? 'born.placeId' : 'basedInPlaceId',
        op: 'set',
        value: placeId,
        display: born
          ? `Born in ${placeName} (song pins)`
          : `City: ${placeName} (song pins)`,
        sources: [appSource(`artist_location "${key}" city`)],
        evidence,
        confidence:
          answer.kind === 'create' ? CONFIDENCE.create : CONFIDENCE.likely,
        tier: 'likely',
        requires,
      },
      options,
    );
    out.add(suggestion, artist);
    if (agreed) agreedIds.add(suggestion.id);
  }

  // Counted once each: two pins of one act in one place are one suggestion.
  for (const { suggestion } of out.planned) {
    report[suggestion.path === 'born.placeId' ? 'born' : 'basedIn']++;
    if (agreedIds.has(suggestion.id)) report.agreed++;
  }
  report.newPlace.places = newPlaces.size;
  report.repeated = [...keysByArtist]
    .filter(([, keys]) => keys.length > 1)
    .map(([slug, keys]) => ({ slug, keys }));
  return { planned: out.planned, report };
}

/**
 * How the library spells an act a pin names in lowercase: a song's billing
 * line, or one name in a joint billing ('Kenny Loggins / Nathan East').
 */
function spelledIn(input: LinkingInput, key: string): string | undefined {
  const folded = normalize(key);
  for (const song of input.songs ?? []) {
    if (typeof song?.artist !== 'string') continue;
    for (const part of [song.artist, ...song.artist.split(JOINT)]) {
      if (normalize(part) === folded) return part.trim();
    }
  }
  return undefined;
}

export function planHometowns(
  input: LinkingInput,
  options: HometownsOptions = {},
): Plan<HometownsReport> {
  if (options.book) return plan(input, options, options.book);
  const book = createPlaceBook(input.places, {
    imported: (options.imported ?? []).flatMap((s) => s.requires ?? []),
  });
  plan(input, options, book);
  return plan(input, options, book);
}
