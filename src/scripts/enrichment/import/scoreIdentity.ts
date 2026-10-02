import { CITIES } from '@/components/atlas/data/cities';
import { normCountry } from '@/components/atlas/utils/country';
import { normalizeArtistName } from '@/content/graph/slugs';
import type { ResolvedArea } from './areas';
import { type ArtistCandidate, nameKey, titleKey } from './cacheStage';
import { mapGenre } from './genreMap';
import { countryName, distanceKm, SAME_PLACE_KM } from './placeMap';

/**
 * Which MusicBrainz artist is ours: every candidate scored on the evidence,
 * and the best one tiered (design §5.2, "Matching").
 *
 * | Signal                                                        | Score |
 * |---------------------------------------------------------------|-------|
 * | Its name is ours (+0.25 when only an alias or sort name is)   | +0.35 |
 * | One of our songs is credited to it on its own album or single | +0.40 |
 * |   … on compilations or promos only (weak billing)             | +0.20 |
 * | One of its release titles is named in one of our events       | +0.25 |
 * |   (not our song's own title when a song already counted)      |       |
 * | Its area or begin-area is our song-pin city or an event city  | +0.10 |
 * |   (the same name, in the same country, within 25 km if known) |       |
 * | Its life-span covers most of our event and song years         | +0.10 |
 * | Its MusicBrainz genres share a genre with ours (signal only)  | +0.05 |
 *
 * Then:
 *  - sure at 0.85 and above, likely from 0.6, below that nothing is offered;
 *  - ambiguous when the runner-up is within 0.15: one "pick the artist"
 *    suggestion, confidence at most 0.5, and no field suggestions;
 *  - a one-word name is never sure without a song credited on the act's own
 *    release — "Common", "Eve", "Chicago" name too many acts;
 *  - one MusicBrainz artist picked for two of our artists (the registry's
 *    "beatles" and "the-beatles") is never sure for either.
 *
 * Pure: everything is a parameter, so each rule has a test.
 */

export const WEIGHTS = {
  name: 0.35,
  alias: 0.25,
  song: 0.4,
  weakSong: 0.2,
  releaseTitle: 0.25,
  area: 0.1,
  lifeSpan: 0.1,
  genre: 0.05,
} as const;

export const SURE = 0.85;
export const LIKELY = 0.6;
export const AMBIGUOUS_WITHIN = 0.15;
export const AMBIGUOUS_CAP = 0.5;
/**
 * The most confidence a suggestion held back from sure can carry (a one-word
 * name with no song evidence, a pick two of ours share): just under sure.
 */
export const NOT_SURE_CAP = 0.84;

/** A MusicBrainz artist that might be ours, with what the cache knows of it. */
export interface CandidateFacts {
  mbid: string;
  name: string;
  sortName?: string;
  aliases: readonly string[];
  disambiguation?: string;
  /** Person, Group, Orchestra, Choir, Character, Other. */
  type: string | null;
  /** Looked up in full; a candidate only seen in a search has less to show. */
  lookedUp: boolean;
  area: ResolvedArea | null;
  beginArea: ResolvedArea | null;
  lifeSpan: {
    begin?: string | null;
    end?: string | null;
    ended?: boolean | null;
  } | null;
  /** MusicBrainz genres (or tags, from a search): a matching signal only. */
  genres: readonly string[];
  /** Album, single and EP titles; null when the browse isn't in hand. */
  releaseTitles: readonly string[] | null;
  /** Wikidata items: linked from MusicBrainz, or found by P434. */
  wikidata: readonly string[];
  wikidataVia?: 'P434';
  /** "member of band" relations from this artist (a person's bands). */
  memberOf: readonly { name: string; attributes: readonly string[] }[];
  /**
   * Other ids asked for that MusicBrainz answered with this artist: ids
   * merged into it since. Their song billing is this artist's.
   */
  askedAs?: readonly string[];
}

export interface ArtistEvent {
  id: string;
  title: string;
  /** Title and description: where release titles are looked for. */
  text: string;
  year?: number;
  city?: string;
  country?: string;
  coordinates?: [number, number];
}

/** Everything known about one of our artists before MusicBrainz is asked. */
export interface ArtistEvidence {
  slug: string;
  name: string;
  aliases: readonly string[];
  oneWord: boolean;
  /** Per MusicBrainz id: our songs credited to it (the cache stage). */
  songCandidates: readonly ArtistCandidate[];
  /** Song titles, by song id, for evidence lines. */
  songTitles: Readonly<Record<string, string>>;
  events: readonly ArtistEvent[];
  /** Event and song years. */
  years: readonly number[];
  /** Our genre ids for the artist's events and songs (parents only). */
  genres: ReadonlySet<string>;
  /** The song-pin city (`artistLocations.json`), when there is one. */
  pin: {
    key: string;
    city: string;
    country: string;
    coordinates: [number, number];
    placeId: string | null;
  } | null;
  candidates: readonly CandidateFacts[];
  /** The search isn't in the cache yet: the candidates may be incomplete. */
  pending: boolean;
}

export type SongEvidence = 'strong' | 'weak' | 'none';

export interface CandidateScore {
  mbid: string;
  name: string;
  disambiguation?: string;
  type: string | null;
  lookedUp: boolean;
  score: number;
  songEvidence: SongEvidence;
  /** Why, in words the owner reads: 'name exact', 'song "Africa" credited …'. */
  reasons: string[];
}

export type IdentityTier = 'sure' | 'likely' | 'ambiguous' | 'weak' | 'none';

export interface IdentityResult {
  slug: string;
  tier: IdentityTier;
  /** 0–1, as the suggestion carries it. */
  confidence: number;
  /** The best candidate (also for ambiguous and weak, for calibration). */
  pick: CandidateScore | null;
  /** Every candidate, best first. */
  ranked: CandidateScore[];
  /** Why the tier is lower than the score alone would make it. */
  notes: string[];
  pending: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Normalised, space-padded: whole words and phrases only. */
const padded = (text: string) => ` ${titleKey(text)} `;

/** Titles too generic to say anything when they turn up in an event. */
const GENERIC_TITLES = new Set([
  'greatest hits',
  'the best of',
  'best of',
  'live',
  'hits',
  'gold',
  'anthology',
  'the collection',
  'collection',
  'singles',
  'the singles',
  'untitled',
  'demo',
  'ep',
  'love',
  'christmas',
]);

/** A song event's own title: the part before " — " ("Africa — Toto"). */
const songEventTitle = (event: ArtistEvent): string | null =>
  event.id.startsWith('song-') ? event.title.split(' — ')[0] : null;

/**
 * Phrases the event text sets apart as a title: quoted ("At Last", “Le
 * Freak”, 'Nevermind'), or a song event's own title before its " — ".
 */
function quotedIn(event: ArtistEvent): string[] {
  const text = event.text;
  const double = [...text.matchAll(/["“]([^"“”]+)["”]/g)].map((m) => m[1]);
  const single = [
    ...text.matchAll(/(?<![\p{L}\p{N}])['‘]([^'‘’"“”]+)['’](?![\p{L}\p{N}])/gu),
  ].map((m) => m[1]);
  const songTitle = songEventTitle(event);
  return [...double, ...single, ...(songTitle ? [songTitle] : [])].map((t) =>
    titleKey(t),
  );
}

/** Genre and place names: "rock and roll" and "new york" in an event are rarely an album. */
const PLACE_NAMES = new Set(
  CITIES.flatMap((c) => [c.name, c.country, c.subdivision ?? '']).map((n) =>
    titleKey(n),
  ),
);
const isGenreOrPlace = (key: string): boolean =>
  PLACE_NAMES.has(key) || mapGenre(key) !== null;

/** Unquoted, a title must be this long to count: "Toto IV" may be, "New York" is not. */
const UNQUOTED_WORDS = 3;

/**
 * A release title named in one of the artist's events. Where the text sets
 * it apart as a title ("Thriller", quoted), any title counts; unquoted, only
 * one of three words or more ("Chicago Transit Authority"), since "Heart",
 * "Faith" or "Purple Haze" is otherwise just words. Never: the artist's own
 * name (a self-titled album), a generic title, a genre or place name, or a
 * title in `exclude` — our songs' own titles, once a song has counted: the
 * single named after the song is the same evidence twice.
 */
export function releaseTitleIn(
  titles: readonly string[],
  events: readonly ArtistEvent[],
  artistNames: readonly string[],
  exclude: Iterable<string> = [],
): { title: string; eventId: string } | null {
  const ours = new Set(artistNames.map((n) => titleKey(n)));
  const excluded = new Set([...exclude].map((t) => titleKey(t)));
  const texts = events.map((e) => ({
    event: e,
    text: padded(e.text),
    quoted: new Set(quotedIn(e)),
  }));
  const sorted = [...new Set(titles)].sort();
  for (const title of sorted) {
    const k = titleKey(title);
    if (
      k.length < 4 ||
      ours.has(k) ||
      GENERIC_TITLES.has(k) ||
      excluded.has(k) ||
      isGenreOrPlace(k)
    )
      continue;
    const words = k.split(' ').length;
    for (const { event, text, quoted } of texts) {
      const found =
        quoted.has(k) || (words >= UNQUOTED_WORDS && text.includes(` ${k} `));
      if (found) return { title, eventId: event.id };
    }
  }
  return null;
}

const yearOf = (date: string | null | undefined): number | null => {
  const match = /^(\d{4})/.exec(date ?? '');
  return match ? Number(match[1]) : null;
};

/**
 * Normalised city name: what comes before a comma ("Washington, D.C."), with
 * "City" dropped ("New York City").
 */
const cityName = (name: string) =>
  nameKey(name.split(',')[0]).replace(/ city$/, '');

/**
 * Two place names that name one city: "Washington" and "Washington, D.C."
 * or "Washington D.C." (an abbreviation after the name), "New York" and
 * "New York City" — but not "Washington Heights". `near`: the two are known
 * to lie within 25 km, and then a name that begins the other is enough
 * ("Abingdon", "Abingdon-on-Thames").
 */
export const sameCityName = (
  a: string,
  b: string,
  { near = false }: { near?: boolean } = {},
): boolean => {
  const x = cityName(a);
  const y = cityName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return (
    long.startsWith(`${short} `) &&
    (near ||
      long
        .slice(short.length + 1)
        .split(' ')
        .every((word) => word.length <= 2))
  );
};

/** Both countries known and different ('US' and 'Puerto Rico' are different). */
const otherCountry = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean => {
  const x = countryName(a);
  const y = countryName(b);
  return (
    !!x &&
    !!y &&
    normalizeArtistName(normCountry(x)) !== normalizeArtistName(normCountry(y))
  );
};

/**
 * An area that is a city we know of: the same name, and — as far as either
 * side knows — the same country and within 25 km, so a Portland in Maine is
 * not the Portland of an Oregon pin.
 */
export function areaIsCity(
  area: ResolvedArea,
  city: {
    name: string;
    country?: string | null;
    coordinates?: readonly [number, number] | null;
  },
): boolean {
  if (otherCountry(area.countryCode ?? area.countryName, city.country))
    return false;
  if (area.coordinates && city.coordinates)
    return (
      distanceKm(area.coordinates, city.coordinates) <= SAME_PLACE_KM &&
      sameCityName(area.name, city.name, { near: true })
    );
  return sameCityName(area.name, city.name);
}

/** Our genre ids for a list of source genre names (parents only). */
export const parentGenres = (names: readonly string[]): Set<string> =>
  new Set(names.map((n) => mapGenre(n)?.genre).filter((g): g is string => !!g));

export function scoreCandidate(
  artist: ArtistEvidence,
  candidate: CandidateFacts,
): CandidateScore {
  const reasons: string[] = [];
  let score = 0;

  // Name. Every candidate matched ours by name or alias to get here, but a
  // song-billed id can be billed under a spelling of ours that is only its alias.
  const ours = new Set([artist.name, ...artist.aliases].map(nameKey));
  if (ours.has(nameKey(candidate.name))) {
    score += WEIGHTS.name;
    reasons.push('name exact');
  } else {
    const alias = [candidate.sortName ?? '', ...candidate.aliases].find(
      (n) => n && ours.has(nameKey(n)),
    );
    if (alias) {
      score += WEIGHTS.alias;
      reasons.push(`alias "${alias}"`);
    }
  }

  // Songs: billed to this id, or to one MusicBrainz has merged into it.
  let songEvidence: SongEvidence = 'none';
  const ids = new Set([candidate.mbid, ...(candidate.askedAs ?? [])]);
  const billed = artist.songCandidates.filter((c) => ids.has(c.mbid));
  const songs = billed.length
    ? {
        songIds: [...new Set(billed.flatMap((c) => c.songIds))],
        releaseSongIds: [...new Set(billed.flatMap((c) => c.releaseSongIds))],
      }
    : null;
  const titled = (ids: readonly string[]) =>
    ids.map((id) => `"${artist.songTitles[id] ?? id}"`).join(', ');
  if (songs?.releaseSongIds.length) {
    score += WEIGHTS.song;
    songEvidence = 'strong';
    reasons.push(
      `song ${titled(songs.releaseSongIds.slice(0, 3))} credited to it on its own album or single`,
    );
  } else if (songs?.songIds.length) {
    score += WEIGHTS.weakSong;
    songEvidence = 'weak';
    reasons.push(
      `song ${titled(songs.songIds.slice(0, 3))} credited to it on compilations or promos only`,
    );
  }

  // Release titles in our events — not our songs' own titles once a song
  // has counted: their single is the same evidence again.
  if (candidate.releaseTitles?.length) {
    const songTitles =
      songEvidence === 'none'
        ? []
        : [
            ...Object.values(artist.songTitles),
            ...artist.events.flatMap((e) => songEventTitle(e) ?? []),
          ];
    const hit = releaseTitleIn(
      candidate.releaseTitles,
      artist.events,
      [artist.name, ...artist.aliases, candidate.name],
      songTitles,
    );
    if (hit) {
      score += WEIGHTS.releaseTitle;
      reasons.push(`release "${hit.title}" named in event ${hit.eventId}`);
    }
  }

  // Area.
  const cities = [
    ...(artist.pin
      ? [
          {
            name: artist.pin.city,
            country: artist.pin.country,
            coordinates: artist.pin.coordinates,
            what: 'the song-pin city',
          },
        ]
      : []),
    ...artist.events
      .filter((e) => e.city)
      .map((e) => ({
        name: e.city!,
        country: e.country,
        coordinates: e.coordinates,
        what: `the city of event ${e.id}`,
      })),
  ];
  const areaHit = [candidate.area, candidate.beginArea]
    .filter((a): a is ResolvedArea => !!a && !a.isCountry)
    .flatMap((a) =>
      cities
        .filter((c) => areaIsCity(a, c))
        .map((c) => `area ${a.name} is ${c.what}`),
    )[0];
  if (areaHit) {
    score += WEIGHTS.area;
    reasons.push(areaHit);
  }

  // Life-span.
  const begin = yearOf(candidate.lifeSpan?.begin);
  if (begin !== null && artist.years.length) {
    const end = yearOf(candidate.lifeSpan?.end) ?? Number.POSITIVE_INFINITY;
    const covered = artist.years.filter((y) => y >= begin && y <= end).length;
    if (covered * 2 >= artist.years.length) {
      score += WEIGHTS.lifeSpan;
      reasons.push(
        `life-span ${begin}–${Number.isFinite(end) ? end : ''} covers ${covered} of ${artist.years.length} event and song years`,
      );
    }
  }

  // Genres: a signal only (MusicBrainz genres are CC BY-NC-SA).
  const shared = [...parentGenres(candidate.genres)].filter((g) =>
    artist.genres.has(g),
  );
  if (shared.length) {
    score += WEIGHTS.genre;
    reasons.push(`MusicBrainz genres share ${shared.sort().join(', ')}`);
  }

  return {
    mbid: candidate.mbid,
    name: candidate.name,
    ...(candidate.disambiguation
      ? { disambiguation: candidate.disambiguation }
      : {}),
    type: candidate.type,
    lookedUp: candidate.lookedUp,
    score: round2(score),
    songEvidence,
    reasons,
  };
}

export function scoreIdentity(artist: ArtistEvidence): IdentityResult {
  const ranked = artist.candidates
    .map((c) => scoreCandidate(artist, c))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.lookedUp) - Number(a.lookedUp) ||
        a.mbid.localeCompare(b.mbid),
    );
  const base = {
    slug: artist.slug,
    ranked,
    notes: [] as string[],
    pending: artist.pending,
  };
  const [pick, runnerUp] = ranked;
  if (!pick) return { ...base, tier: 'none', confidence: 0, pick: null };

  if (runnerUp && pick.score - runnerUp.score < AMBIGUOUS_WITHIN) {
    return {
      ...base,
      tier: 'ambiguous',
      confidence: round2(Math.min(pick.score, AMBIGUOUS_CAP)),
      pick,
      notes: [
        `runner-up ${runnerUp.name}${runnerUp.disambiguation ? ` (${runnerUp.disambiguation})` : ''} scores ${runnerUp.score}, within ${AMBIGUOUS_WITHIN} of ${pick.score}`,
      ],
    };
  }
  let confidence = round2(Math.min(1, pick.score));
  const notes: string[] = [];
  let tier: IdentityTier =
    confidence >= SURE ? 'sure' : confidence >= LIKELY ? 'likely' : 'weak';
  if (!pick.lookedUp && tier !== 'weak') {
    tier = 'weak';
    notes.push('the best candidate was never looked up');
  }
  if (tier === 'sure' && artist.oneWord && pick.songEvidence !== 'strong') {
    tier = 'likely';
    confidence = Math.min(confidence, NOT_SURE_CAP);
    notes.push(
      'a one-word name is never sure without a song credited on its own record',
    );
  }
  return { ...base, tier, confidence, pick, notes };
}

/**
 * One MusicBrainz artist picked for two of ours: the registry holding one act
 * twice ("beatles", "the-beatles"), or a joint billing picking one of its
 * halves. Neither is sure until a person has looked; each says who else
 * picked it. Changes the results in place; returns the ids shared.
 */
export function flagSharedPicks(results: readonly IdentityResult[]): string[] {
  const bySlug = new Map<string, IdentityResult[]>();
  for (const result of results) {
    if (!result.pick || (result.tier !== 'sure' && result.tier !== 'likely'))
      continue;
    const list = bySlug.get(result.pick.mbid) ?? [];
    list.push(result);
    bySlug.set(result.pick.mbid, list);
  }
  const shared: string[] = [];
  for (const [mbid, list] of bySlug) {
    if (list.length < 2) continue;
    shared.push(mbid);
    for (const result of list) {
      const others = list
        .filter((r) => r !== result)
        .map((r) => r.slug)
        .join(', ');
      result.notes.push(
        `the same MusicBrainz artist is the best match for ${others}: the registry may hold this act twice`,
      );
      if (result.tier === 'sure') {
        result.tier = 'likely';
        result.confidence = Math.min(result.confidence, NOT_SURE_CAP);
      }
    }
  }
  return shared.sort();
}
