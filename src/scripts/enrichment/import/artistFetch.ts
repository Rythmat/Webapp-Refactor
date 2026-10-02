import { areasToResolve, resolveArea } from './areas';
import {
  type ArtistCacheRow,
  isWeakBilling,
  nameKey,
  type RegistryArtist,
} from './cacheStage';
import {
  type MbArtist,
  type MbArtistSearch,
  type MusicBrainzClient,
  wikidataIdsOf,
} from './musicbrainz';
import { HttpError, ServerClosedError } from './politeHttp';
import type { SparqlClient } from './sparql';
import {
  linkedIds,
  NAMED_PROPERTIES,
  PLACE_NAMED_PROPERTIES,
  PLACE_PROPERTIES,
  type WikidataClient,
} from './wikidata';

/**
 * The fetch stage's artist queue: for each of the registry's artists, the
 * MusicBrainz candidates worth scoring, looked up in full, and the Wikidata
 * items they link to (design §5.2, F1).
 *
 * Per artist, in registry order:
 * 1. Candidates. Song-billed ids from the cache stage when there are any —
 *    the old cache already found them. A search as well when that evidence
 *    could be naming the wrong act: billing on compilations only, billing
 *    split between ids, or a one-word name. With no song-billed id, a search
 *    alone. A search keeps only results whose name, sort name or an alias
 *    equals ours: a near-miss name is a different artist, not a weak match.
 *    Two registry artists with one name ("Beatles", "The Beatles") share it.
 * 2. Lookups, with life-span, areas, aliases, genres, tags, url-rels and
 *    artist-rels: the best two song-billed ids, and the best two search
 *    results beside them (an ambiguous name needs its runner-up to be scored
 *    against, and a third rarely changes the answer) — five for a one-word
 *    name no song names, where same-named acts tie ("Chicago", "Yes").
 *    Candidates not looked up are still in the cached search, with their
 *    area, life-span and type, for scoring to read.
 * 3. For each candidate looked up: its albums, singles and EPs (one browse
 *    page — their titles in the artist's events are identity evidence), and
 *    its area and begin-area, each looked up and walked up to its country
 *    (`areas.ts`: City or not, and which Portland).
 * Then, for all of them at once: the Wikidata items of candidates that link
 * none, from the Query Service by MBID (P434); the Wikidata items the
 * candidates link to; the places those items point at, and the Wikidata
 * items of the candidates' areas, with their claims; and the names of the
 * genres, instruments, types and countries.
 *
 * Every answer lands in the per-URL cache, so the queue is resumable by
 * simply running it again: finished artists cost no requests the second
 * time. Scoring (F1 part 2) needs no report from here either: it walks the
 * same queue as a dry run, every answer from the cache, and so sees exactly
 * what a finished fetch holds. `stage-fetch.json` is the run's account for
 * people — what was found, what failed.
 */

export const MAX_LOOKUPS_PER_ARTIST = 2;
export const MAX_LOOKUPS_ONE_WORD = 5;

export const isOneWordName = (name: string): boolean =>
  !nameKey(name).includes(' ');

export interface ArtistToFetch {
  slug: string;
  name: string;
  aliases: readonly string[];
  /** Song-billed MusicBrainz ids from the cache stage, best evidence first. */
  songBilled: readonly string[];
  /** Search as well as trusting the song-billed ids (always, without them). */
  searchToo: boolean;
  /** How many search results beyond the song-billed ids to look up. */
  searchLookups: number;
}

export function planArtistFetch(
  registry: readonly RegistryArtist[],
  cacheArtists: readonly ArtistCacheRow[],
): ArtistToFetch[] {
  const bySlug = new Map(cacheArtists.map((a) => [a.slug, a]));
  return registry.map((artist) => {
    const cached = bySlug.get(artist.slug);
    const songBilled = cached?.candidates.map((c) => c.mbid) ?? [];
    const oneWord = isOneWordName(artist.name);
    return {
      slug: artist.slug,
      name: artist.name,
      aliases: artist.aliases ?? [],
      songBilled,
      searchToo:
        !cached || songBilled.length !== 1 || oneWord || isWeakBilling(cached),
      searchLookups:
        oneWord && !songBilled.length
          ? MAX_LOOKUPS_ONE_WORD
          : MAX_LOOKUPS_PER_ARTIST,
    };
  });
}

/** Votes on an artist's tags: how much attention it has had, roughly. */
const tagVotes = (artist: MbArtist) =>
  (artist.tags ?? []).reduce((sum, tag) => sum + tag.count, 0);

/**
 * The search results that are this artist by name — its name, sort name or
 * an alias equal to one of ours — MusicBrainz's best-scored first. Exact
 * names all score 100, so ties go to the act more people have tagged: the
 * rock band Chicago before a one-single Chicago, which is the likelier
 * answer for a song library and the one worth a lookup first.
 */
export function exactCandidates(
  results: readonly MbArtist[],
  names: readonly string[],
): MbArtist[] {
  const ours = new Set(names.map(nameKey));
  const isOurs = (artist: MbArtist) =>
    [
      artist.name,
      artist['sort-name'] ?? '',
      ...(artist.aliases ?? []).map((a) => a.name),
    ]
      .filter(Boolean)
      .some((name) => ours.has(nameKey(name)));
  return results
    .filter(isOurs)
    .sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0) || tagVotes(b) - tagVotes(a),
    );
}

export interface FetchedCandidate {
  mbid: string;
  name: string;
  disambiguation?: string;
  type?: string | null;
  wikidata: string[];
  /** Set when the item was found by its P434 rather than linked from MusicBrainz. */
  wikidataVia?: 'P434';
  /** Ids asked for that MusicBrainz answered with this artist (merged since). */
  askedAs?: string[];
}

export interface ArtistFetchRow {
  slug: string;
  /** Where the candidates came from. */
  source: 'songs' | 'search' | 'songs+search';
  /** The name searched, when it was another registry artist's spelling. */
  searchedAs?: string;
  /** The candidates looked up, best first. */
  candidates: FetchedCandidate[];
  /** Exact-name candidates beyond the ones looked up. */
  moreCandidates: number;
  /**
   * Dry run: the search isn't cached yet, so its candidates are unknown
   * (song-billed ones are still looked up).
   */
  pending?: boolean;
  /**
   * Candidates whose lookup had no answer: not cached yet in a dry run, or
   * an id MusicBrainz no longer has (merged ids redirect, so that is rare).
   */
  unanswered?: string[];
  /** The Wikidata items of the candidates' areas: where their coordinates are. */
  areaItems?: string[];
  error?: string;
}

export interface WikidataSummary {
  /** Distinct items the looked-up artists link to. */
  linkedFromMusicBrainz: number;
  artistItems: number;
  /** Birthplaces, formation places and residences, with their claims. */
  placeItems: number;
  /** Genres, instruments, types and countries, by name. */
  namedItems: number;
}

export interface ArtistFetchReport {
  rows: ArtistFetchRow[];
  wikidata: WikidataSummary;
}

type Search = (name: string) => Promise<MbArtistSearch | null>;

const sourceOf = (artist: ArtistToFetch): ArtistFetchRow['source'] =>
  !artist.songBilled.length
    ? 'search'
    : artist.searchToo
      ? 'songs+search'
      : 'songs';

async function fetchOne(
  artist: ArtistToFetch,
  mb: MusicBrainzClient,
  search: Search,
): Promise<ArtistFetchRow> {
  const row: ArtistFetchRow = {
    slug: artist.slug,
    source: sourceOf(artist),
    candidates: [],
    moreCandidates: 0,
  };
  const billed = artist.songBilled.slice(0, MAX_LOOKUPS_PER_ARTIST);
  let searched: string[] = [];
  if (row.source !== 'songs') {
    const result = await search(artist.name);
    if (!result) {
      if (!billed.length) return { ...row, pending: true };
      row.pending = true;
    } else {
      searched = exactCandidates(result.artists, [
        artist.name,
        ...artist.aliases,
      ])
        .map((a) => a.id)
        .filter((id) => !artist.songBilled.includes(id));
    }
  }
  const fromSearch = searched.slice(0, artist.searchLookups);
  row.moreCandidates =
    artist.songBilled.length -
    billed.length +
    searched.length -
    fromSearch.length;
  const areaItems = new Set<string>();
  for (const id of [...billed, ...fromSearch]) {
    const found = await mb.lookupArtist(id);
    if (!found) {
      row.unanswered = [...(row.unanswered ?? []), id];
      continue;
    }
    // A merged id answers as the artist it was merged into: one candidate,
    // which remembers the ids that led to it (their song billing is its).
    const askedAs = found.id === id ? [] : [id];
    const same = row.candidates.find((c) => c.mbid === found.id);
    if (same) {
      if (askedAs.length)
        same.askedAs = [...new Set([...(same.askedAs ?? []), ...askedAs])];
      continue;
    }
    row.candidates.push({
      ...(askedAs.length ? { askedAs } : {}),
      mbid: found.id,
      name: found.name,
      ...(found.disambiguation ? { disambiguation: found.disambiguation } : {}),
      type: found.type ?? null,
      wikidata: wikidataIdsOf(found),
    });
    await mb.browseReleaseGroups(found.id);
    for (const area of areasToResolve(found)) {
      const resolved = await resolveArea(mb, area);
      if (resolved.wikidata) areaItems.add(resolved.wikidata);
    }
  }
  if (areaItems.size) row.areaItems = [...areaItems].sort();
  return row;
}

const describe = (row: ArtistFetchRow): string => {
  if (row.error) return `ERROR ${row.error}`;
  if (row.pending && !row.candidates.length) return 'search: not cached yet';
  const unanswered = row.unanswered?.length
    ? `${row.unanswered.length} id(s) unanswered (not cached, or gone)`
    : '';
  if (!row.candidates.length) {
    return `${row.source}: ${unanswered || 'no exact-name candidate'}`;
  }
  const names = row.candidates.map(
    (c) =>
      `${c.name}${c.disambiguation ? ` (${c.disambiguation})` : ''}` +
      (c.wikidata.length ? ` ${c.wikidata.join(',')}` : ''),
  );
  const more = row.moreCandidates ? `; +${row.moreCandidates} more` : '';
  const pending = row.pending ? '; search not cached yet' : '';
  return `${row.source}: ${names.join(' | ')}${more}${pending}${unanswered ? `; ${unanswered}` : ''}`;
};

/**
 * One search per name: two registry artists whose names differ only by "The"
 * search once. A failed search is forgotten, so the second one tries again.
 */
function sharedSearch(mb: MusicBrainzClient) {
  const searches = new Map<
    string,
    { name: string; result: Promise<MbArtistSearch | null> }
  >();
  return {
    search: (name: string) => {
      const key = nameKey(name);
      const seen = searches.get(key);
      if (seen) return seen.result;
      const result = mb.searchArtists(name);
      searches.set(key, { name, result });
      result.catch(() => searches.delete(key));
      return result;
    },
    /** The spelling that was searched for this name. */
    searchedAs: (name: string) => searches.get(nameKey(name))?.name,
  };
}

/**
 * The Wikidata walk over a set of rows: the artists' items; the places they
 * point at, with claims (city or country, country, coordinates); and the
 * names of everything else they point at, and of the places' countries and
 * classes.
 */
async function walkWikidata(
  rows: readonly ArtistFetchRow[],
  get: WikidataClient['getEntities'],
): Promise<WikidataSummary> {
  const linked = rows.flatMap((r) => r.candidates.flatMap((c) => c.wikidata));
  const items = await get(linked, ['labels', 'descriptions', 'claims']);
  const placeIds = [
    ...new Set([
      ...linkedIds(items.values(), PLACE_PROPERTIES),
      ...rows.flatMap((r) => r.areaItems ?? []),
    ]),
  ];
  const places = await get(placeIds, ['labels', 'claims']);
  // A birthplace or a genre is only a Q-number until it has a name, and the
  // name is what gets mapped to our places, genres and instruments. Places
  // already came with theirs.
  const isPlace = new Set(placeIds);
  const named = await get(
    [
      ...linkedIds(items.values(), NAMED_PROPERTIES),
      ...linkedIds(places.values(), PLACE_NAMED_PROPERTIES),
    ].filter((id) => !isPlace.has(id)),
    ['labels'],
  );
  return {
    linkedFromMusicBrainz: new Set(linked).size,
    artistItems: items.size,
    placeItems: places.size,
    namedItems: named.size,
  };
}

/**
 * Candidates that link no Wikidata item get the items that name them (P434),
 * asked of the Query Service fifty at a time. Changes the rows in place.
 */
export async function linkByP434(
  rows: readonly ArtistFetchRow[],
  sparql: SparqlClient,
): Promise<number> {
  const unlinked = rows.flatMap((r) =>
    r.candidates.filter((c) => c.wikidata.length === 0),
  );
  if (!unlinked.length) return 0;
  const found = await sparql.itemsFor(unlinked.map((c) => c.mbid));
  let linked = 0;
  for (const candidate of unlinked) {
    const items = found.get(candidate.mbid);
    if (!items?.length) continue;
    candidate.wikidata = items;
    candidate.wikidataVia = 'P434';
    linked++;
  }
  return linked;
}

/** What the rows' Wikidata walk holds already, with no request made. */
export const summarizeWikidata = (
  rows: readonly ArtistFetchRow[],
  wikidata: WikidataClient,
): Promise<WikidataSummary> =>
  walkWikidata(rows, (ids, props) => wikidata.inHand(ids, props));

export async function fetchArtists(
  artists: readonly ArtistToFetch[],
  {
    mb,
    wikidata,
    sparql,
  }: {
    mb: MusicBrainzClient;
    wikidata: WikidataClient;
    /** The P434 fallback; without it, unlinked candidates stay unlinked. */
    sparql?: SparqlClient;
  },
  {
    log = () => undefined,
    maxFailuresInARow = 3,
  }: { log?: (line: string) => void; maxFailuresInARow?: number } = {},
): Promise<ArtistFetchReport> {
  const rows: ArtistFetchRow[] = [];
  const { search, searchedAs } = sharedSearch(mb);
  let failures = 0;
  for (const [index, artist] of artists.entries()) {
    let row: ArtistFetchRow;
    try {
      row = await fetchOne(artist, mb, search);
      const spelled = searchedAs(artist.name);
      if (row.source !== 'songs' && spelled && spelled !== artist.name) {
        row.searchedAs = spelled;
      }
    } catch (error) {
      // A request that failed every retry. Keep going — one artist's odd
      // answer shouldn't cost the run — unless it keeps happening, which
      // means the server is refusing us and pressing on would make it worse.
      // A server that has said "come back in an hour" is refusing already:
      // stop now, not three artists later.
      if (!(error instanceof HttpError) || error instanceof ServerClosedError) {
        throw error;
      }
      row = {
        slug: artist.slug,
        source: sourceOf(artist),
        candidates: [],
        moreCandidates: 0,
        error: error.message,
      };
    }
    rows.push(row);
    log(`[${index + 1}/${artists.length}] ${artist.slug} — ${describe(row)}`);
    failures = row.error ? failures + 1 : 0;
    if (failures >= maxFailuresInARow) {
      throw new Error(
        `stopped after ${failures} failed artists in a row; rerun later and the cache resumes where this stopped`,
      );
    }
  }

  if (sparql) {
    try {
      const linked = await linkByP434(rows, sparql);
      if (linked) log(`${linked} candidates linked to Wikidata by their P434`);
    } catch (error) {
      // A fallback: the Query Service failing costs these candidates their
      // Wikidata facts this run, not the run. A rerun asks again.
      if (!(error instanceof HttpError)) throw error;
      log(`The P434 fallback failed and was skipped: ${error.message}`);
    }
  }
  return {
    rows,
    wikidata: await walkWikidata(rows, (ids, props) =>
      wikidata.getEntities(ids, props),
    ),
  };
}

/**
 * This run's rows over the last run's, by slug, in registry order — so a
 * `--limit` run adds to a full one instead of replacing it, and a failure
 * never overwrites an answer: an artist that failed this time keeps the row
 * it had.
 */
export function mergeFetchRows(
  registry: readonly Pick<RegistryArtist, 'slug'>[],
  previous: readonly ArtistFetchRow[],
  fresh: readonly ArtistFetchRow[],
): ArtistFetchRow[] {
  const bySlug = new Map(previous.map((row) => [row.slug, row]));
  for (const row of fresh) {
    const before = bySlug.get(row.slug);
    if (row.error && before && !before.error) continue;
    bySlug.set(row.slug, row);
  }
  return registry.flatMap((artist) => bySlug.get(artist.slug) ?? []);
}

/**
 * MusicBrainz ids that more than one registry artist has as a candidate: the
 * registry's duplicates ("beatles" and "the-beatles"), and acts billed
 * together. Scoring must not hand one id to two slugs without saying so.
 */
export function sharedCandidates(
  rows: readonly ArtistFetchRow[],
): { mbid: string; name: string; slugs: string[] }[] {
  const byId = new Map<
    string,
    { mbid: string; name: string; slugs: string[] }
  >();
  for (const row of rows) {
    for (const { mbid, name } of row.candidates) {
      const seen = byId.get(mbid) ?? { mbid, name, slugs: [] };
      if (!seen.slugs.includes(row.slug)) seen.slugs.push(row.slug);
      byId.set(mbid, seen);
    }
  }
  return [...byId.values()].filter((shared) => shared.slugs.length > 1);
}
