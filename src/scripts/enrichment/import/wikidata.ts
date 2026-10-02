import type {
  CachedGetter,
  CachedGetterOptions,
  CachedResponse,
} from './fileCache';
import { MB_USER_AGENT } from './musicbrainz';
import type { PoliteHttpOptions } from './politeHttp';

/**
 * Wikidata's `wbgetentities`, fifty items per request.
 *
 * Wikidata is where Born, City, Genres, Years Active and Instruments come
 * from when they are stored (its data is CC0; MusicBrainz genres are not).
 * Items are found through MusicBrainz's url-rels, so nothing here searches.
 *
 * Etiquette (https://www.mediawiki.org/wiki/Manual:Maxlag_parameter): every
 * request carries `maxlag=5`, so when the replicas fall behind the server
 * refuses instead of adding load, with a `Retry-After`; the client waits and
 * asks again. One request at a time, a second apart, with the same
 * descriptive User-Agent as MusicBrainz.
 */

export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
export const WIKIDATA_BATCH = 50;
export const WIKIDATA_MAXLAG = 5;

/**
 * The API's error code, when a body is an error rather than entities.
 * MediaWiki sends almost every error with status 200, so the status alone
 * never says whether an answer came back.
 */
export function wikidataErrorCode(body: unknown): string | null {
  const error = (body as { error?: { code?: unknown } } | null)?.error;
  if (!error) return null;
  return typeof error.code === 'string' ? error.code : 'unknown';
}

/**
 * The errors that mean "not now" rather than "not this": replicas lagging
 * (maxlag), the database in read-only maintenance, a rate limit, or a
 * server-side failure (`internal_api_error_DBQueryError` and the like).
 */
export const isTransientError = (code: string): boolean =>
  code === 'maxlag' ||
  code === 'readonly' ||
  code === 'ratelimited' ||
  code.startsWith('internal_api_error');

/** A transient refusal arrives as an ordinary response with an error body. */
export function isTransientRefusal(text: string): boolean {
  // Only parse what could be one; entity responses run to megabytes.
  if (!text.includes('"error"')) return false;
  try {
    const code = wikidataErrorCode(JSON.parse(text));
    return code !== null && isTransientError(code);
  } catch {
    return false;
  }
}

export const WIKIDATA_HTTP: PoliteHttpOptions = {
  userAgent: MB_USER_AGENT,
  minIntervalMs: 1000,
  // The manual's advice: wait at least five seconds before asking again.
  backoffMs: 5000,
  // Fifty full artist items can be several megabytes.
  timeoutMs: 60_000,
  isRetryableBody: isTransientRefusal,
};

/**
 * What the cache must know about Wikidata: an error body is never an answer.
 * The transient ones are retried by the client first; one that outlasts the
 * retries, or one that never clears, fails the request unkept, so a rerun
 * asks again instead of reading the error back from disk forever.
 */
export const WIKIDATA_CACHE: Pick<CachedGetterOptions, 'refusal'> = {
  refusal: wikidataErrorCode,
};

// ── Response shapes (only what the importer reads) ───────────────────────

export interface WdSnak {
  snaktype: string;
  property: string;
  datavalue?: { type: string; value: unknown };
}

export interface WdStatement {
  mainsnak: WdSnak;
  rank?: 'preferred' | 'normal' | 'deprecated';
  qualifiers?: Record<string, WdSnak[]>;
}

export interface WdEntity {
  id: string;
  type?: string;
  /** Present (as '') when the item doesn't exist. */
  missing?: string;
  labels?: Record<string, { language: string; value: string }>;
  descriptions?: Record<string, { language: string; value: string }>;
  claims?: Record<string, WdStatement[]>;
  /** Set when the requested id was merged into another item. */
  redirects?: { from: string; to: string };
}

interface WdGetEntities {
  entities?: Record<string, WdEntity>;
  error?: { code?: string; info?: string };
}

/**
 * The properties the artist fields read: on the artist's item, and — country
 * and coordinates — on the items of the places it points at.
 */
export const ARTIST_PROPERTIES = {
  instanceOf: 'P31',
  country: 'P17',
  coordinates: 'P625',
  birthDate: 'P569',
  birthPlace: 'P19',
  inception: 'P571',
  formationLocation: 'P740',
  residence: 'P551',
  genre: 'P136',
  instrument: 'P1303',
  workPeriodStart: 'P2031',
  workPeriodEnd: 'P2032',
  musicBrainzArtistId: 'P434',
} as const;

/**
 * The properties that point at places. Their targets are fetched with their
 * claims, not just a label: City needs to know a city from a country (P31),
 * mapping to our places needs the country (P17), and a place we don't have
 * yet is created `pin:false` at its coordinates (P625).
 */
export const PLACE_PROPERTIES: readonly string[] = [
  ARTIST_PROPERTIES.birthPlace,
  ARTIST_PROPERTIES.formationLocation,
  ARTIST_PROPERTIES.residence,
];

/**
 * The properties whose targets need only a name: the artist's own types,
 * genres and instruments, and a place's country and classes. Each is mapped
 * by its label (a type is compared by id, and labelled so a person can read
 * the report).
 */
export const NAMED_PROPERTIES: readonly string[] = [
  ARTIST_PROPERTIES.instanceOf,
  ARTIST_PROPERTIES.genre,
  ARTIST_PROPERTIES.instrument,
];
export const PLACE_NAMED_PROPERTIES: readonly string[] = [
  ARTIST_PROPERTIES.country,
  // A place's classes, by name: a birthplace that is a hospital or a house
  // is not a place to pin.
  ARTIST_PROPERTIES.instanceOf,
];

export type WdProp = 'labels' | 'descriptions' | 'claims' | 'aliases';

// ── URLs and batches ─────────────────────────────────────────────────────

const QID = /^Q\d+$/;
export const isQid = (value: string): boolean => QID.test(value);

const byNumber = (a: string, b: string) =>
  Number(a.slice(1)) - Number(b.slice(1));

/**
 * Ids → request-sized batches: deduplicated, ordered by number, fifty at a
 * time. Deterministic, so the same set of items always makes the same URLs
 * and a rerun finds them in the cache.
 */
export function batchIds(
  ids: Iterable<string>,
  size = WIKIDATA_BATCH,
): string[][] {
  const unique = [...new Set(ids)].filter(isQid).sort(byNumber);
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += size) {
    batches.push(unique.slice(i, i + size));
  }
  return batches;
}

export const entitiesUrl = (
  ids: readonly string[],
  props: readonly WdProp[],
): string =>
  `${WIKIDATA_API}?action=wbgetentities&ids=${ids.join('|')}` +
  `&props=${props.join('|')}&languages=en&format=json&maxlag=${WIKIDATA_MAXLAG}`;

const propsKey = (props: readonly WdProp[]) => props.join('|');

/**
 * Items already in the cache, by the props they were fetched with. Batches
 * are cached per URL, and a partial run (`--limit`) batches a different set
 * of ids than a full one — so without this, a full run would refetch items a
 * smoke test already has.
 */
export type KnownEntities = Map<string, Map<string, WdEntity>>;

export function knownEntitiesFrom(
  cached: readonly CachedResponse[],
): KnownEntities {
  const known: KnownEntities = new Map();
  for (const entry of cached) {
    if (entry.status !== 200) continue;
    const url = new URL(entry.url);
    if (url.searchParams.get('action') !== 'wbgetentities') continue;
    const key = url.searchParams.get('props') ?? '';
    const into = known.get(key) ?? new Map<string, WdEntity>();
    known.set(key, into);
    for (const [id, entity] of Object.entries(
      (entry.body as WdGetEntities).entities ?? {},
    )) {
      into.set(id, entity);
      if (entity.redirects?.from) into.set(entity.redirects.from, entity);
    }
  }
  return known;
}

// ── Client ───────────────────────────────────────────────────────────────

export interface WikidataClient {
  /**
   * Items by id. In a dry run, only the ones already cached. Items that
   * don't exist come back with `missing` set rather than being left out.
   */
  getEntities(
    ids: Iterable<string>,
    props: readonly WdProp[],
  ): Promise<Map<string, WdEntity>>;
  /** The same, from what is already in hand only: never a request. */
  inHand(
    ids: Iterable<string>,
    props: readonly WdProp[],
  ): Promise<Map<string, WdEntity>>;
}

export function createWikidataClient(
  get: CachedGetter,
  known: KnownEntities = new Map(),
): WikidataClient {
  const inHandFor = (props: readonly WdProp[]) => {
    const key = propsKey(props);
    const have = known.get(key) ?? new Map<string, WdEntity>();
    known.set(key, have);
    return have;
  };
  const pick = (have: Map<string, WdEntity>, wanted: readonly string[]) => {
    const out = new Map<string, WdEntity>();
    for (const id of wanted) {
      const entity = have.get(id);
      if (entity) out.set(id, entity);
    }
    return out;
  };
  return {
    async getEntities(ids, props) {
      const have = inHandFor(props);
      const wanted = [...new Set(ids)].filter(isQid);
      for (const batch of batchIds(wanted.filter((id) => !have.has(id)))) {
        const res = await get(entitiesUrl(batch, props));
        if (!res) continue; // a dry run: counted as a request it would make
        const body = (res.body ?? {}) as WdGetEntities;
        // The getter refuses these before they are cached (`WIKIDATA_CACHE`);
        // this is for a getter built without it.
        if (body.error) {
          throw new Error(
            `Wikidata refused ${batch.length} ids (${body.error.code}): ${body.error.info ?? ''}`,
          );
        }
        for (const [id, entity] of Object.entries(body.entities ?? {})) {
          have.set(id, entity);
          // A merged item answers under its new id; keep it findable by the
          // id MusicBrainz linked, which is the one we asked for.
          if (entity.redirects?.from) have.set(entity.redirects.from, entity);
        }
      }
      return pick(have, wanted);
    },
    async inHand(ids, props) {
      return pick(inHandFor(props), [...new Set(ids)].filter(isQid));
    },
  };
}

/** The items a set of entities points at through the given properties. */
export function linkedIds(
  entities: Iterable<WdEntity>,
  properties: readonly string[],
): string[] {
  const out = new Set<string>();
  for (const entity of entities) {
    for (const property of properties) {
      for (const statement of entity.claims?.[property] ?? []) {
        const value = statement.mainsnak.datavalue?.value as
          | { id?: string }
          | undefined;
        if (value?.id && isQid(value.id)) out.add(value.id);
      }
    }
  }
  return [...out].sort(byNumber);
}
