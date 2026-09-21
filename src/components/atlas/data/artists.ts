import type { HistoricalEvent } from '@/components/atlas/types';
import { contentGeneration, MUSIC_HISTORY } from '@/content/contentStore';
import { ARTIST_STOP_LIST } from './artistStopList';
import { CITIES } from './cities';

/**
 * The globe's artist index.
 *
 * No event carries an `artist` field — artists live as lowercase entries in
 * `tags`, mixed in with genres, places, labels, and themes. So the index is
 * derived, from the two places the dataset states an artist unambiguously:
 *
 *  1. Song-derived events title themselves `Work — Artist`, which gives ~360
 *     canonical names with their real casing, for free.
 *  2. Hand-authored events open their title with the subject — "Wes Montgomery
 *     records The Incredible Jazz Guitar" — so the leading capitalized phrase
 *     is the artist, and requiring the curator to ALSO have tagged that phrase
 *     is what separates an artist from a movement or a city.
 *
 * Everything the second rule still gets wrong (record labels, festivals,
 * platforms) is listed in {@link ARTIST_STOP_LIST}.
 *
 * Rebuilt whenever the CDN content re-hydrates, for the reason spelled out in
 * contentStore.ts: a module-scope snapshot would capture an empty dataset and
 * the artist list would be permanently blank.
 */
export interface AtlasArtist {
  /** Display casing, e.g. `Wes Montgomery`. */
  name: string;
  /** URL-safe, accent-folded identity, e.g. `wes-montgomery`. */
  slug: string;
  /** Events this artist appears in, earliest first. */
  eventIds: string[];
}

/**
 * Accent-, case-, and punctuation-insensitive comparison key.
 *
 * Tags are ASCII-folded (`cesaria evora`) while titles keep their diacritics
 * (`Cesária Évora`), so matching on the raw strings silently drops a large and
 * mostly non-Anglophone part of the catalogue.
 *
 * Apostrophes are deleted rather than turned into a separator, because the two
 * sides disagree about them: the title writes `N'Dour` and the tag writes
 * `ndour`. Collapsing them to a space would make those `n dour` and `ndour` —
 * still unequal, and the bug this normalization exists to prevent.
 */
export function normalizeArtistName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function artistSlug(name: string): string {
  return normalizeArtistName(name).replace(/ /g, '-');
}

/** Words that may appear lowercase inside a name without ending it. */
const PARTICLES = new Set([
  'of',
  'the',
  'and',
  'de',
  'du',
  'da',
  'di',
  'la',
  'le',
  'el',
  'von',
  'van',
  'al',
  'y',
  '&',
]);

/**
 * The capitalized phrase that opens a title, split on "and"/"&" so
 * "BTS and BLACKPINK make K-pop a global force" yields both names.
 */
function leadingNames(title: string): string[] {
  const run: string[] = [];
  for (const word of title.split(/\s+/)) {
    const bare = word.replace(/[^\p{L}\p{N}&'’.-]/gu, '');
    if (!bare) break;
    if (/^\p{Lu}/u.test(bare) || PARTICLES.has(bare.toLowerCase())) {
      run.push(word);
    } else break;
  }
  while (
    run.length > 0 &&
    PARTICLES.has(run[run.length - 1].replace(/[^\p{L}&]/gu, '').toLowerCase())
  ) {
    run.pop();
  }
  const phrase = run
    .join(' ')
    .replace(/['’]s$/, '')
    .replace(/["“”,.]+$/, '')
    .trim();
  if (!phrase) return [];
  return phrase
    .split(/\s+(?:and|&)\s+/i)
    .map((s) => s.replace(/['’]s$/, '').trim())
    .filter((s) => s.length >= 3);
}

/* ── Derived index, rebuilt on re-hydration ───────────────────────────────── */

const BY_SLUG = new Map<string, AtlasArtist>();
/** normalized name → slug, for resolving an event's tags to artists. */
const NAME_TO_SLUG = new Map<string, string>();
let builtGeneration = -1;

/** Place names must never become artists ("Chicago" the city, not the band). */
function buildPlaceVocabulary(): Set<string> {
  const places = new Set<string>();
  for (const city of CITIES) {
    places.add(normalizeArtistName(city.name));
    places.add(normalizeArtistName(city.country));
    if (city.subdivision) places.add(normalizeArtistName(city.subdivision));
  }
  for (const event of MUSIC_HISTORY) {
    places.add(normalizeArtistName(event.location.city));
    places.add(normalizeArtistName(event.location.country));
  }
  return places;
}

function buildGenreVocabulary(): Set<string> {
  const genres = new Set<string>();
  for (const event of MUSIC_HISTORY) {
    for (const genre of event.genre) genres.add(normalizeArtistName(genre));
  }
  return genres;
}

function record(name: string, eventId: string): void {
  const slug = artistSlug(name);
  if (!slug) return;
  const existing = BY_SLUG.get(slug);
  if (existing) {
    if (!existing.eventIds.includes(eventId)) existing.eventIds.push(eventId);
    return;
  }
  BY_SLUG.set(slug, { name, slug, eventIds: [eventId] });
  NAME_TO_SLUG.set(normalizeArtistName(name), slug);
}

function ensureIndex(): void {
  if (builtGeneration === contentGeneration) return;
  builtGeneration = contentGeneration;
  BY_SLUG.clear();
  NAME_TO_SLUG.clear();

  const places = buildPlaceVocabulary();
  const genres = buildGenreVocabulary();
  const stopped = new Set(ARTIST_STOP_LIST.map(normalizeArtistName));
  const excluded = (key: string) =>
    !key || stopped.has(key) || places.has(key) || genres.has(key);

  // Pass 1 — song-derived events state the artist after an em dash.
  for (const event of MUSIC_HISTORY) {
    if (!event.id.startsWith('song-')) continue;
    const parts = event.title.split(' — ');
    if (parts.length < 2) continue;
    const name = parts[parts.length - 1].trim();
    if (!name || excluded(normalizeArtistName(name))) continue;
    record(name, event.id);
  }

  // Pass 2 — the subject of a hand-authored title, confirmed by its tags.
  for (const event of MUSIC_HISTORY) {
    if (event.id.startsWith('song-')) continue;
    const tagKeys = new Set(event.tags.map(normalizeArtistName));
    for (const name of leadingNames(event.title)) {
      const key = normalizeArtistName(name);
      if (excluded(key) || !tagKeys.has(key)) continue;
      record(name, event.id);
    }
  }

  // Pass 3 — attribute every other event that tags a now-known artist, so
  // Wes Montgomery's chip appears on the Indianapolis event that mentions him
  // even though his name does not open its title.
  for (const event of MUSIC_HISTORY) {
    for (const tag of event.tags) {
      const slug = NAME_TO_SLUG.get(normalizeArtistName(tag));
      if (!slug) continue;
      const artist = BY_SLUG.get(slug);
      if (artist && !artist.eventIds.includes(event.id)) {
        artist.eventIds.push(event.id);
      }
    }
  }

  // Chronological, so an artist panel reads as a career.
  const year = new Map(MUSIC_HISTORY.map((e) => [e.id, e.year]));
  for (const artist of BY_SLUG.values()) {
    artist.eventIds.sort((a, b) => (year.get(a) ?? 0) - (year.get(b) ?? 0));
  }
}

/* ── Public accessors ─────────────────────────────────────────────────────── */

/** Every indexed artist, alphabetical. */
export function getAtlasArtists(): AtlasArtist[] {
  ensureIndex();
  return [...BY_SLUG.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve a slug, a display name, or a raw tag to an artist. */
export function getArtist(nameOrSlug: string): AtlasArtist | null {
  ensureIndex();
  const direct = BY_SLUG.get(nameOrSlug);
  if (direct) return direct;
  const slug = NAME_TO_SLUG.get(normalizeArtistName(nameOrSlug));
  return slug ? (BY_SLUG.get(slug) ?? null) : null;
}

/** The artists an event's tags name — the clickable chips on its card. */
export function getArtistsForEvent(event: HistoricalEvent): AtlasArtist[] {
  ensureIndex();
  const found = new Map<string, AtlasArtist>();
  for (const tag of event.tags) {
    const slug = NAME_TO_SLUG.get(normalizeArtistName(tag));
    const artist = slug ? BY_SLUG.get(slug) : undefined;
    if (artist) found.set(artist.slug, artist);
  }
  // A song event names its artist in the title rather than always tagging it.
  if (event.id.startsWith('song-')) {
    const parts = event.title.split(' — ');
    if (parts.length >= 2) {
      const artist = getArtist(parts[parts.length - 1].trim());
      if (artist) found.set(artist.slug, artist);
    }
  }
  return [...found.values()];
}

/** Every globe event for an artist, earliest first. */
export function getEventsForArtist(nameOrSlug: string): HistoricalEvent[] {
  const artist = getArtist(nameOrSlug);
  if (!artist) return [];
  const byId = new Map(MUSIC_HISTORY.map((e) => [e.id, e]));
  return artist.eventIds
    .map((id) => byId.get(id))
    .filter((e): e is HistoricalEvent => !!e);
}
