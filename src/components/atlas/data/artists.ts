import type { HistoricalEvent } from '@/components/atlas/types';
import { contentGeneration, MUSIC_HISTORY } from '@/content/contentStore';
import {
  createEventMatcher,
  type EventMatcher,
  eventsByArtist,
} from '@/content/graph/eventMatches';
import { artistSlug, normalizeArtistName } from '@/content/graph/slugs';
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

// The normaliser and slug live in the graph's import-free leaf module so pure
// graph code can mint artist ids without pulling in the content store. They are
// re-exported here because every globe caller already imports them from here.
export { artistSlug, normalizeArtistName };

/* ── Derived index, rebuilt on re-hydration ───────────────────────────────── */

const BY_SLUG = new Map<string, AtlasArtist>();
/** The registry's names, and the rules that find them in an event. */
let matcher: EventMatcher = createEventMatcher({ artists: [] });
let builtGeneration = -1;

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
 * The matching itself lives in `content/graph/eventMatches.ts`, which the
 * console's graph runs too, so the globe and the graph cannot disagree about
 * who an event is about. The globe passes it no place or genre names: the
 * registry holds none (a guard test), and the chips must not change
 * (artistIndex.characterization.test.ts pins them).
 *
 * An artist with no events is kept out of the index — they are a real entity
 * the graph can reference, but there is nothing for the globe to show.
 */
function ensureIndex(): void {
  if (builtGeneration === contentGeneration) return;
  builtGeneration = contentGeneration;
  BY_SLUG.clear();

  matcher = createEventMatcher({ artists: ARTIST_REGISTRY });
  // Chronological, so an artist panel reads as a career.
  const eventIds = eventsByArtist(MUSIC_HISTORY, matcher);
  for (const entry of ARTIST_REGISTRY) {
    const events = eventIds.get(entry.slug);
    if (!events?.length) continue;
    BY_SLUG.set(entry.slug, {
      name: entry.name,
      slug: entry.slug,
      eventIds: events,
    });
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
  const slug = matcher.artistNamed(nameOrSlug);
  return slug ? (BY_SLUG.get(slug) ?? null) : null;
}

/**
 * The artists an event names — the clickable chips on its card: those its tags
 * name, in tag order, then on a song event the artist its title credits (a
 * song event names its artist in the title rather than always tagging it).
 */
export function getArtistsForEvent(event: HistoricalEvent): AtlasArtist[] {
  ensureIndex();
  const found = new Map<string, AtlasArtist>();
  for (const { artistId } of matcher.match(event).artists) {
    const artist = BY_SLUG.get(artistId);
    if (artist) found.set(artist.slug, artist);
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
