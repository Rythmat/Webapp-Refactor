import type { HistoricalEvent } from '@/components/atlas/types';
import { contentGeneration, MUSIC_HISTORY } from '@/content/contentStore';
import { ARTIST_REGISTRY } from './artistRegistry';

/**
 * The globe's artist index.
 *
 * No event carries an `artist` field — artists live as lowercase entries in
 * `tags`, mixed in with genres, places, labels and themes. This module used to
 * infer the artist SET from that: take the phrase after the em dash on a song
 * event, take the leading capitalised run of a hand-authored title when its own
 * tags confirmed it, then subtract every name that collided with a place, a
 * genre or the hand-maintained stop list.
 *
 * It no longer guesses who exists. {@link ARTIST_REGISTRY} says, and this
 * module only works out WHERE each registered artist appears — which still has
 * to be derived, because it changes whenever an event does. The switch was
 * verified to produce a byte-identical index: 881 artists, same event counts.
 *
 * What that bought: an artist is now a record with a stable slug that a song
 * credit or a graph edge can point at, a wrong one is fixed by editing a line
 * instead of growing a stop list, and `artistStopList.ts` has nothing left to
 * stop. A registry name that collides with a place or genre would reintroduce
 * the old ambiguity, so a guard test asserts none does.
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
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’ʼ`]/g, '')
      // '&' and 'and' are the same word and the dataset uses both: the song
      // library writes 'Hall & Oates' and 'Earth, Wind & Fire' where the globe's
      // event titles write 'Hall and Oates' and 'Earth, Wind and Fire'. Folding
      // one into the other is what stops those becoming two different artists.
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
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

function attach(map: Map<string, AtlasArtist>, slug: string, eventId: string) {
  const artist = map.get(slug);
  if (artist && !artist.eventIds.includes(eventId))
    artist.eventIds.push(eventId);
}

/**
 * Fill the index.
 *
 * The REGISTRY decides who exists; events only decide where they appear. That
 * is the whole change from the old three-pass discovery: a name is no longer
 * promoted to an artist because it opened a title and survived three exclusion
 * vocabularies, so "Chicago" needs no special case and the stop list has
 * nothing left to stop. What is still derived is the event list, because that
 * changes whenever an event does.
 *
 * An artist with no events is kept out of the index — they are a real entity
 * the graph can reference, but there is nothing for the globe to show.
 */
function ensureIndex(): void {
  if (builtGeneration === contentGeneration) return;
  builtGeneration = contentGeneration;
  BY_SLUG.clear();
  NAME_TO_SLUG.clear();

  const candidates = new Map<string, AtlasArtist>();
  for (const entry of ARTIST_REGISTRY) {
    candidates.set(entry.slug, {
      name: entry.name,
      slug: entry.slug,
      eventIds: [],
    });
    NAME_TO_SLUG.set(normalizeArtistName(entry.name), entry.slug);
    for (const alias of entry.aliases ?? []) {
      NAME_TO_SLUG.set(normalizeArtistName(alias), entry.slug);
    }
  }
  const lookup = (name: string) => NAME_TO_SLUG.get(normalizeArtistName(name));

  // Pass 1 — song events state the artist after an em dash.
  for (const event of MUSIC_HISTORY) {
    if (!event.id.startsWith('song-')) continue;
    const parts = event.title.split(' — ');
    if (parts.length < 2) continue;
    const slug = lookup(parts[parts.length - 1].trim());
    if (slug) attach(candidates, slug, event.id);
  }

  // Pass 2 — the subject of a hand-authored title, confirmed by its own tags.
  // The tag check stays: a registered name appearing in a title it is only
  // mentioned in should not become that event's subject.
  for (const event of MUSIC_HISTORY) {
    if (event.id.startsWith('song-')) continue;
    const tagKeys = new Set(event.tags.map(normalizeArtistName));
    for (const name of leadingNames(event.title)) {
      const key = normalizeArtistName(name);
      const slug = NAME_TO_SLUG.get(key);
      if (slug && tagKeys.has(key)) attach(candidates, slug, event.id);
    }
  }

  // Pass 3 — any event that tags a known artist, so Wes Montgomery's chip
  // appears on the Indianapolis event that mentions him without opening on him.
  for (const event of MUSIC_HISTORY) {
    for (const tag of event.tags) {
      const slug = lookup(tag);
      if (slug) attach(candidates, slug, event.id);
    }
  }

  for (const artist of candidates.values()) {
    if (artist.eventIds.length > 0) BY_SLUG.set(artist.slug, artist);
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
