import { normalizeArtistName as normalize } from './slugs';

/**
 * Who and what a globe event is about, read from its title and tags.
 *
 * No globe event carries an artist or a song field. Artists live as lowercase
 * entries in `tags`, mixed in with genres, places, labels and themes, and the
 * title says the rest ('Etta James records "At Last"'). This is the one
 * matcher that reads them: the globe's artist index (`atlas/data/artists.ts`)
 * runs it for the chips on an event card, and the console's graph runs it for
 * an event's guessed `about` edges, so the two cannot disagree about who an
 * event is about. It is pure because the graph must not load the globe index
 * (which reads the content store): the artists, songs and events are passed in.
 *
 * The caller says which artists exist (the registry, plus any artist records
 * the console has created); this only works out where each one appears, by the
 * three rules the globe index has always applied:
 *  1. a song event names its artist after the em dash ('Africa — Toto');
 *  2. a hand-authored title opens on its subject, confirmed by the event's own
 *     tags — a registered name the title only mentions is not its subject;
 *  3. any tag that is an artist's name or alias.
 *
 * A song matches when a tag, or a phrase the title quotes, is its title (four
 * characters or more) and one of its artists is among the event's: the ones
 * it stores once a reviewer has confirmed them, or else the ones found here.
 * The artist rule is what keeps 'havana' on a Cuban hip hop event the city
 * rather than a pop song, and 'africa' a continent.
 *
 * A tag cannot say whether 'chicago' is the city or the band. The registry
 * keeps such names out (a guard test in artistRegistry.test.ts), but the
 * console can create an artist called Chicago, and then every event tagged
 * with the city would be about the band. So the caller may pass the place and
 * genre names, and a name that is also one of those never matches on a tag
 * alone. A title that opens on it and a tag that confirms it still match, and
 * so does an id stored on the event, which is the event deriver's business.
 * The globe passes neither set: its registry has no such names, and its chips
 * must stay exactly as they were (artistIndex.characterization.test.ts).
 */

/** An artist the matcher can find: a registry entry or an artist record. */
export interface MatchableArtist {
  /** Its id: `artist:<slug>` in the graph, an `artistIds[]` entry on an event. */
  slug: string;
  name: string;
  /** Other spellings that name the same artist (tags, alternate billings). */
  aliases?: readonly string[];
}

/** The parts of a globe event the matcher reads. */
export interface MatchableEvent {
  id: string;
  title?: string;
  tags?: readonly string[];
  /**
   * The artists a reviewer has confirmed the event is about (event body v2),
   * when it stores them. The song rule reads these instead of the artists
   * found in the text, so rejecting a wrong artist (an empty list included)
   * also drops the songs only that artist admitted, and a confirmed artist
   * admits their own. The artist matches themselves are still read from the
   * text: which to use is the event deriver's business.
   */
  artistIds?: readonly string[];
}

/** A song the matcher can find, with the artists the caller says it is by. */
export interface MatchableSong {
  id: string;
  title: string;
  /**
   * The slugs of the artists who performed it, as the caller's graph says:
   * the linked lead act, billed credits, or the guess from the artist name.
   */
  artistIds: readonly string[];
}

export interface EventMatchOptions {
  artists: readonly MatchableArtist[];
  /** Leave out to match artists only (the globe). */
  songs?: readonly MatchableSong[];
  /** Place names, as written or already normalised. See the module note. */
  placeNames?: Iterable<string>;
  /** Genre names, as written or already normalised. See the module note. */
  genreNames?: Iterable<string>;
}

/** The part of the event that named a match: the `via.path` of its edge. */
export type EventMatchPath = 'title' | 'tags[]';

/**
 * What one event is about. An artist the title and a tag both name is listed
 * once for each, so its edge can cite both. Tags come first, in tag order, then
 * the title: the order of the globe's chips.
 */
export interface EventMatch {
  artists: { artistId: string; path: EventMatchPath }[];
  songs: { songId: string; path: EventMatchPath }[];
}

export interface EventMatcher {
  /** The slug of the artist a name, alias, slug or tag names. */
  artistNamed(name: string): string | undefined;
  match(event: MatchableEvent): EventMatch;
}

/** A song event is the song on the globe; its title is 'Title — Artist'. */
const isSongEvent = (event: MatchableEvent) => event.id.startsWith('song-');

/** Shorter titles ('Air', 'Me') are ordinary words far more often than songs. */
const MIN_SONG_TITLE = 4;

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

/**
 * The phrases a title quotes: "At Last", “Le Freak”, 'Nevermind'. A single
 * quote only opens where a word starts and only closes where one ends, so the
 * apostrophes in "Joan Jett's" and "Bustin' Loose" quote nothing.
 *
 * The "where a word starts" half is checked by hand, not with a lookbehind:
 * this module ships in the student globe's chunk, and Safari before 16.4
 * refuses to parse a lookbehind at all, which would stop the globe loading.
 * A quote that turns out to sit inside a word is skipped by one character
 * and the search goes on, which finds what the lookbehind found.
 */
function quotedPhrases(title: string): string[] {
  const double = [...title.matchAll(/["“]([^"“”]+)["”]/g)].map((m) => m[1]);
  const single: string[] = [];
  const quote = /['‘]([^'‘’"“”]+)['’](?![\p{L}\p{N}])/gu;
  for (let m = quote.exec(title); m; m = quote.exec(title)) {
    if (/[\p{L}\p{N}]$/u.test(title.slice(0, m.index))) {
      quote.lastIndex = m.index + 1;
      continue;
    }
    single.push(m[1]);
  }
  return [...double, ...single].map((phrase) => phrase.trim());
}

export function createEventMatcher(options: EventMatchOptions): EventMatcher {
  // A later entry wins a shared name, as it always has in the globe index.
  const byName = new Map<string, string>();
  for (const artist of options.artists) {
    byName.set(normalize(artist.name), artist.slug);
    for (const alias of artist.aliases ?? []) {
      byName.set(normalize(alias), artist.slug);
    }
  }
  const artistNamed = (name: string) => byName.get(normalize(name));

  const collides = new Set<string>();
  for (const name of options.placeNames ?? []) collides.add(normalize(name));
  for (const name of options.genreNames ?? []) collides.add(normalize(name));

  const songsByTitle = new Map<string, MatchableSong[]>();
  for (const song of options.songs ?? []) {
    const key = normalize(song.title);
    if (key.length < MIN_SONG_TITLE) continue;
    const list = songsByTitle.get(key);
    if (list) list.push(song);
    else songsByTitle.set(key, [song]);
  }

  function match(event: MatchableEvent): EventMatch {
    const title = event.title ?? '';
    const tags = event.tags ?? [];
    const found: EventMatch = { artists: [], songs: [] };
    const listed = new Set<string>();
    const add = (artistId: string, path: EventMatchPath) => {
      if (listed.has(`${path} ${artistId}`)) return;
      listed.add(`${path} ${artistId}`);
      found.artists.push({ artistId, path });
    };

    // Rule 3, listed first because the globe lists tag chips first.
    for (const tag of tags) {
      const key = normalize(tag);
      const slug = byName.get(key);
      if (slug && !collides.has(key)) add(slug, 'tags[]');
    }

    if (isSongEvent(event)) {
      // Rule 1.
      const parts = title.split(' — ');
      if (parts.length >= 2) {
        const slug = artistNamed(parts[parts.length - 1].trim());
        if (slug) add(slug, 'title');
      }
    } else {
      // Rule 2. The tag check stays: a registered name appearing in a title
      // it is only mentioned in should not become that event's subject.
      const tagKeys = new Set(tags.map(normalize));
      for (const name of leadingNames(title)) {
        const key = normalize(name);
        const slug = byName.get(key);
        if (slug && tagKeys.has(key)) add(slug, 'title');
      }
    }

    // A song event IS its song (the graph folds the two into one node), so
    // it has no other song to be about.
    if (songsByTitle.size === 0 || isSongEvent(event)) return found;
    const artists = new Set(
      Array.isArray(event.artistIds)
        ? event.artistIds
        : found.artists.map((a) => a.artistId),
    );
    const songsListed = new Set<string>();
    const addSongs = (phrase: string, path: EventMatchPath) => {
      for (const song of songsByTitle.get(normalize(phrase)) ?? []) {
        if (songsListed.has(`${path} ${song.id}`)) continue;
        if (!song.artistIds.some((id) => artists.has(id))) continue;
        songsListed.add(`${path} ${song.id}`);
        found.songs.push({ songId: song.id, path });
      }
    };
    for (const tag of tags) addSongs(tag, 'tags[]');
    for (const phrase of quotedPhrases(title)) addSongs(phrase, 'title');
    return found;
  }

  return { artistNamed, match };
}

/**
 * Every event's match, by event id. For the graph, which folds a repeated id
 * into one node anyway (the last event of an id wins here).
 */
export function matchEventSubjects(
  events: readonly MatchableEvent[],
  options: EventMatchOptions,
): Map<string, EventMatch> {
  const matcher = createEventMatcher(options);
  return new Map(events.map((event) => [event.id, matcher.match(event)]));
}

/**
 * Artist slug → the events they appear in, earliest first: the globe's artist
 * index, and the order an artist panel reads as a career.
 *
 * Events of the same year keep the order the globe index has always given
 * them, which is the order its three passes found them in: song events that
 * name the artist in their title, then hand-authored events whose title opens
 * on them, then events that only tag them. An artist the events never name is
 * left out.
 */
export function eventsByArtist(
  events: readonly (MatchableEvent & { year?: number })[],
  matcher: EventMatcher,
): Map<string, string[]> {
  const matches = events.map((event) => matcher.match(event));
  const found = new Map<string, string[]>();
  const pass = (
    applies: (event: MatchableEvent) => boolean,
    path: EventMatchPath,
  ) => {
    events.forEach((event, i) => {
      if (!applies(event)) return;
      for (const m of matches[i].artists) {
        if (m.path !== path) continue;
        const list = found.get(m.artistId);
        if (!list) found.set(m.artistId, [event.id]);
        else if (!list.includes(event.id)) list.push(event.id);
      }
    });
  };
  pass(isSongEvent, 'title');
  pass((event) => !isSongEvent(event), 'title');
  pass(() => true, 'tags[]');

  const year = new Map(events.map((e) => [e.id, e.year]));
  for (const list of found.values()) {
    list.sort((a, b) => (year.get(a) ?? 0) - (year.get(b) ?? 0));
  }
  return found;
}
