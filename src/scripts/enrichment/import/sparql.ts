import type { CachedGetter, CachedResponse } from './fileCache';
import { isMbid, MB_USER_AGENT } from './musicbrainz';
import type { PoliteHttpOptions } from './politeHttp';

/**
 * The Wikidata item for a MusicBrainz artist that doesn't link one.
 *
 * Most artists name their Wikidata item in their url-rels; some don't, while
 * the item names them (property P434, "MusicBrainz artist ID"). The Query
 * Service answers that the other way round: `VALUES` holds fifty MBIDs, and
 * the answer lists the items that carry each. Only this — nothing here
 * searches, and nothing but P434 is asked.
 *
 * Batches are deterministic (sorted, fifty at a time), and an MBID already
 * asked in a cached batch is never asked again, however a later run batches
 * — the same rule as `wbgetentities` (`wikidata.ts` `knownEntitiesFrom`).
 */

export const SPARQL_API = 'https://query.wikidata.org/sparql';
export const SPARQL_HOST = 'query.wikidata.org';
export const SPARQL_BATCH = 50;

export const SPARQL_HTTP: PoliteHttpOptions = {
  userAgent: MB_USER_AGENT,
  minIntervalMs: 1000,
  backoffMs: 5000,
  timeoutMs: 60_000,
};

export const p434Query = (mbids: readonly string[]): string =>
  `SELECT ?mbid ?item WHERE { VALUES ?mbid { ${mbids
    .map((mbid) => `"${mbid}"`)
    .join(' ')} } ?item wdt:P434 ?mbid . }`;

export const p434Url = (mbids: readonly string[]): string =>
  `${SPARQL_API}?query=${encodeURIComponent(p434Query(mbids))}&format=json`;

const MBID_IN_QUERY =
  /"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g;

/** The MBIDs a P434 URL asked about. */
export function askedIn(url: string): string[] {
  const query = new URL(url).searchParams.get('query') ?? '';
  if (!query.includes('wdt:P434')) return [];
  return [...query.matchAll(MBID_IN_QUERY)].map((m) => m[1]);
}

interface SparqlBinding {
  mbid?: { value: string };
  item?: { value: string };
}

interface SparqlResults {
  results?: { bindings?: SparqlBinding[] };
}

/** 'http://www.wikidata.org/entity/Q123' → 'Q123'. */
const qidOf = (uri: string): string | null =>
  /\/entity\/(Q\d+)$/.exec(uri)?.[1] ?? null;

/** MBID → the items that carry it (an empty list: asked, and none do). */
export type KnownP434 = Map<string, string[]>;

function learn(known: KnownP434, asked: readonly string[], body: unknown) {
  for (const mbid of asked) if (!known.has(mbid)) known.set(mbid, []);
  for (const row of (body as SparqlResults).results?.bindings ?? []) {
    const mbid = row.mbid?.value;
    const qid = row.item?.value ? qidOf(row.item.value) : null;
    if (!mbid || !qid) continue;
    const list = known.get(mbid) ?? [];
    if (!list.includes(qid)) list.push(qid);
    known.set(mbid, list);
  }
}

export function knownP434From(cached: readonly CachedResponse[]): KnownP434 {
  const known: KnownP434 = new Map();
  for (const entry of cached) {
    if (entry.status !== 200) continue;
    learn(known, askedIn(entry.url), entry.body);
  }
  return known;
}

export interface SparqlClient {
  /**
   * The items carrying each MBID. In a dry run only what is cached; an MBID
   * never asked is absent, one asked with no item maps to [].
   */
  itemsFor(mbids: Iterable<string>): Promise<Map<string, string[]>>;
}

export function createSparqlClient(
  get: CachedGetter,
  known: KnownP434 = new Map(),
): SparqlClient {
  return {
    async itemsFor(mbids) {
      const wanted = [...new Set(mbids)].filter(isMbid).sort();
      const missing = wanted.filter((mbid) => !known.has(mbid));
      for (let i = 0; i < missing.length; i += SPARQL_BATCH) {
        const batch = missing.slice(i, i + SPARQL_BATCH);
        const res = await get(p434Url(batch));
        if (!res || res.status !== 200) continue;
        learn(known, batch, res.body);
      }
      const out = new Map<string, string[]>();
      for (const mbid of wanted) {
        const items = known.get(mbid);
        if (items) out.set(mbid, [...items].sort());
      }
      return out;
    },
  };
}
