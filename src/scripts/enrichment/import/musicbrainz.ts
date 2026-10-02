import type { CachedGetter } from './fileCache';
import type { PoliteHttpOptions } from './politeHttp';

/**
 * MusicBrainz's JSON web service, as the importer uses it.
 *
 * The rules are the server's (https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting):
 * a meaningful User-Agent on every request, and no more than one request a
 * second. The UA names the app and its site and nothing else — no email
 * address goes in a header. 1.1 s rather than 1.0 s is the margin
 * `enrichSongYears.mjs` ran with for 1,300 requests without a block.
 */

export const MB_USER_AGENT = 'MusicAtlas/1.0 ( https://musicatlas.io )';
export const MB_MIN_INTERVAL_MS = 1100;
export const MB_API = 'https://musicbrainz.org/ws/2';

export const MUSICBRAINZ_HTTP: PoliteHttpOptions = {
  userAgent: MB_USER_AGENT,
  minIntervalMs: MB_MIN_INTERVAL_MS,
};

/**
 * What an artist lookup includes. Life-span, type, area and begin-area come
 * with every lookup; the rest are asked for: aliases (identity), genres and
 * tags (a matching signal only — MusicBrainz tags are CC BY-NC-SA, so they are
 * never stored as ours), url-rels (the Wikidata item) and artist-rels (band
 * membership, with the instruments played).
 */
export const ARTIST_LOOKUP_INC = [
  'aliases',
  'genres',
  'tags',
  'url-rels',
  'artist-rels',
] as const;

// ── Response shapes (only the fields the importer reads) ─────────────────

export interface MbAlias {
  name: string;
  'sort-name'?: string;
  type?: string | null;
  locale?: string | null;
  primary?: boolean | null;
}

export interface MbArtistRef {
  id: string;
  name: string;
  'sort-name'?: string;
  disambiguation?: string;
  aliases?: MbAlias[];
}

export interface MbArtistCredit {
  name: string;
  joinphrase?: string;
  artist: MbArtistRef;
}

export interface MbReleaseGroupRef {
  id: string;
  title: string;
  'primary-type'?: string | null;
  'secondary-types'?: string[];
  'first-release-date'?: string;
}

export interface MbReleaseRef {
  id: string;
  title: string;
  status?: string | null;
  date?: string;
  country?: string | null;
  'artist-credit'?: MbArtistCredit[];
  'release-group'?: MbReleaseGroupRef;
}

export interface MbRecording {
  id: string;
  title: string;
  score?: number;
  disambiguation?: string;
  'artist-credit'?: MbArtistCredit[];
  'first-release-date'?: string;
  releases?: MbReleaseRef[];
}

export interface MbReleaseGroup extends MbReleaseGroupRef {
  score?: number;
  'artist-credit'?: MbArtistCredit[];
}

export interface MbArea {
  id: string;
  name: string;
  /**
   * City, Country, Subdivision, County, Municipality, District, Island. Null
   * on the area an artist lookup embeds; only the area's own lookup says.
   */
  type?: string | null;
  /** A country's code: an area that has one is a country. */
  'iso-3166-1-codes'?: string[];
  /** A subdivision's code ('US-MI', 'FR-75'); its first two letters are the country. */
  'iso-3166-2-codes'?: string[];
}

/** An area's own lookup: its type, the areas around it, and its links. */
export interface MbAreaFull extends MbArea {
  relations?: MbRelation[];
}

export interface MbLifeSpan {
  begin?: string | null;
  end?: string | null;
  ended?: boolean | null;
}

export interface MbRelation {
  type: string;
  'target-type'?: string;
  direction?: string;
  attributes?: string[];
  begin?: string | null;
  end?: string | null;
  url?: { id: string; resource: string };
  artist?: MbArtistRef;
  area?: MbArea;
}

export interface MbArtist extends MbArtistRef {
  /** Person, Group, Orchestra, Choir, Character, Other. */
  type?: string | null;
  country?: string | null;
  area?: MbArea | null;
  'begin-area'?: MbArea | null;
  'life-span'?: MbLifeSpan;
  genres?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
  relations?: MbRelation[];
  /** Search results only: MusicBrainz's own 0–100 relevance. */
  score?: number;
}

export interface MbArtistSearch {
  count?: number;
  artists: MbArtist[];
}

/** One page of an artist's release groups (a browse, not a search). */
export interface MbReleaseGroupBrowse {
  count?: number;
  releaseGroups: MbReleaseGroupRef[];
}

// ── URLs ─────────────────────────────────────────────────────────────────
// Built the same way every time, parameters in a fixed order: the URL is the
// cache key, so two spellings of one request would fetch it twice.

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isMbid = (value: string): boolean => MBID.test(value);

/** A Lucene phrase: inside quotes only `\` and `"` are special. */
const phrase = (text: string) => `"${text.replace(/(["\\])/g, '\\$1')}"`;

/**
 * An unfielded phrase search, which MusicBrainz runs over the artist's name,
 * sort name and aliases — so "Beatles" still finds The Beatles.
 */
export const artistSearchUrl = (name: string, limit = 10): string =>
  `${MB_API}/artist/?query=${encodeURIComponent(phrase(name.trim()))}&limit=${limit}&fmt=json`;

export function artistLookupUrl(mbid: string): string {
  if (!isMbid(mbid)) throw new Error(`not a MusicBrainz id: ${mbid}`);
  return `${MB_API}/artist/${mbid}?inc=${ARTIST_LOOKUP_INC.join('+')}&fmt=json`;
}

/** The release types whose titles count as an artist's own work. */
export const RELEASE_GROUP_TYPES = ['album', 'single', 'ep'] as const;
/** MusicBrainz's largest page. One page is enough: the titles are evidence, not a discography. */
export const RELEASE_GROUP_PAGE = 100;

/**
 * An artist's albums, singles and EPs: the titles scoring looks for in the
 * artist's events (+0.25), which tells a real act from a namesake that never
 * made the records the globe talks about.
 */
export function releaseGroupBrowseUrl(mbid: string): string {
  if (!isMbid(mbid)) throw new Error(`not a MusicBrainz id: ${mbid}`);
  return (
    `${MB_API}/release-group?artist=${mbid}` +
    `&type=${RELEASE_GROUP_TYPES.join('|')}&limit=${RELEASE_GROUP_PAGE}&fmt=json`
  );
}

/**
 * An area's own lookup. The area an artist lookup embeds has no type, so
 * only this says whether "Detroit" is a City (a candidate for City) or
 * "Michigan" a Subdivision (not one); its area-rels name the area it is part
 * of (the way to its country), and its url-rels its Wikidata item (the
 * coordinates a place we don't have yet is created at).
 */
export function areaLookupUrl(id: string): string {
  if (!isMbid(id)) throw new Error(`not a MusicBrainz id: ${id}`);
  return `${MB_API}/area/${id}?inc=area-rels+url-rels&fmt=json`;
}

// ── Client ───────────────────────────────────────────────────────────────

export interface MusicBrainzClient {
  /** Null in a dry run when the answer isn't cached yet. */
  searchArtists(name: string): Promise<MbArtistSearch | null>;
  /** Null for a dry-run miss, or an MBID MusicBrainz doesn't know (404). */
  lookupArtist(mbid: string): Promise<MbArtist | null>;
  /** Null for a dry-run miss; an artist with none has an empty list. */
  browseReleaseGroups(mbid: string): Promise<MbReleaseGroupBrowse | null>;
  /** Null for a dry-run miss, or an area MusicBrainz doesn't know. */
  lookupArea(id: string): Promise<MbAreaFull | null>;
}

export function createMusicBrainzClient(get: CachedGetter): MusicBrainzClient {
  return {
    async searchArtists(name) {
      const res = await get(artistSearchUrl(name));
      if (!res || res.status !== 200) return res ? { artists: [] } : null;
      const body = res.body as Partial<MbArtistSearch>;
      return { count: body.count, artists: body.artists ?? [] };
    },
    async lookupArtist(mbid) {
      const res = await get(artistLookupUrl(mbid));
      return res && res.status === 200 ? (res.body as MbArtist) : null;
    },
    async browseReleaseGroups(mbid) {
      const res = await get(releaseGroupBrowseUrl(mbid));
      if (!res) return null;
      if (res.status !== 200) return { releaseGroups: [] };
      const body = res.body as {
        'release-group-count'?: number;
        'release-groups'?: MbReleaseGroupRef[];
      };
      return {
        count: body['release-group-count'],
        releaseGroups: body['release-groups'] ?? [],
      };
    },
    async lookupArea(id) {
      const res = await get(areaLookupUrl(id));
      return res && res.status === 200 ? (res.body as MbAreaFull) : null;
    },
  };
}

/** `https://www.wikidata.org/wiki/Q1234` → `Q1234`. */
export function wikidataIdOf(resource: string): string | null {
  const match = /wikidata\.org\/(?:wiki|entity)\/(Q\d+)$/.exec(resource);
  return match ? match[1] : null;
}

/** The Wikidata items an artist's (or an area's) url-rels point at (usually one). */
export const wikidataIdsOf = (entity: MbArtist | MbAreaFull): string[] => [
  ...new Set(
    (entity.relations ?? [])
      .filter((r) => r.type === 'wikidata' && r.url)
      .map((r) => wikidataIdOf(r.url?.resource ?? ''))
      .filter((id): id is string => id !== null),
  ),
];
