import { createHash } from 'node:crypto';
import {
  closeSync,
  createReadStream,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { HttpError, type PoliteHttp } from './politeHttp';

/**
 * The importer's memory of what the servers said: one file per URL.
 *
 * The first importer (`enrichSongYears.mjs`) kept everything in one JSON file
 * and rewrote all 197 MB of it after every query. One file per URL means a
 * write costs what the response costs, a killed run loses at most the request
 * in flight (files land through a rename, so none is ever half-written), and a
 * rerun skips everything already on disk — which is what makes a two-hour
 * fetch resumable. Scoring reads only from here, so it is offline and
 * repeatable.
 *
 * Lives under `src/scripts/enrichment/_cache/`, which is gitignored: the raw
 * responses are large and anyone can refetch them. What IS kept is the
 * manifest's digest of them, so a committed suggestion artifact can say
 * exactly which responses it was scored from.
 */

export interface CachedResponse {
  url: string;
  /** 200, or 404 — "no such thing" is an answer worth remembering too. */
  status: number;
  fetchedAt: string;
  /** Of the response text as received, before parsing. */
  sha256: string;
  body: unknown;
}

export const sha256 = (text: string): string =>
  createHash('sha256').update(text).digest('hex');

/** Streamed, because the MusicBrainz warm-start cache is 197 MB. */
export function sha256File(
  path: string,
): Promise<{ sha256: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () =>
        resolve({ sha256: hash.digest('hex'), bytes: statSync(path).size }),
      );
  });
}

/**
 * Write through a temporary name, so a killed run never leaves half a file.
 * The data is flushed before the rename: without that, a power cut can
 * persist the rename ahead of the bytes and leave a short file under the
 * real name.
 */
export function writeFileAtomic(path: string, text: string): void {
  const temp = `${path}.${process.pid}.tmp`;
  const fd = openSync(temp, 'w');
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, path);
}

export interface FileCache {
  readonly dir: string;
  fileFor(url: string): string;
  get(url: string): CachedResponse | null;
  put(url: string, status: number, text: string): CachedResponse;
  /** Every cached response, optionally for one host, in file order. */
  entries(host?: string): CachedResponse[];
}

const isCachedResponse = (value: unknown): value is CachedResponse => {
  const entry = value as Partial<CachedResponse> | null;
  return (
    typeof entry?.url === 'string' &&
    typeof entry.status === 'number' &&
    typeof entry.sha256 === 'string' &&
    typeof entry.fetchedAt === 'string'
  );
};

export function createFileCache(
  dir: string,
  now: () => Date = () => new Date(),
  log: (line: string) => void = () => undefined,
): FileCache {
  // Grouped by host so a person can see at a glance what came from where.
  const fileFor = (url: string) =>
    join(dir, new URL(url).host, `${sha256(url)}.json`);

  /**
   * A file that doesn't parse, or isn't a cached response, is a miss: one
   * bad file (a crash mid-write on an old run, a hand edit) must not stop
   * every run after it. It is moved aside rather than deleted, so a person
   * can still see what was there, and it stops counting as a `.json` entry.
   */
  const read = (file: string): CachedResponse | null => {
    if (!existsSync(file)) return null;
    let entry: unknown;
    try {
      entry = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      entry = null;
    }
    if (isCachedResponse(entry)) return entry;
    const aside = `${file}.bad`;
    try {
      renameSync(file, aside);
      log(`  unreadable cache file moved aside, will refetch: ${aside}`);
    } catch {
      log(`  unreadable cache file, will refetch: ${file}`);
    }
    return null;
  };

  return {
    dir,
    fileFor,
    get(url) {
      const hit = read(fileFor(url));
      // Two URLs sharing a hash is not going to happen; a file edited by hand
      // to hold another URL's answer might. Either way it is not this URL's.
      return hit && hit.url === url ? hit : null;
    },
    put(url, status, text) {
      const entry: CachedResponse = {
        url,
        status,
        fetchedAt: now().toISOString(),
        sha256: sha256(text),
        body: text ? (JSON.parse(text) as unknown) : null,
      };
      const file = fileFor(url);
      mkdirSync(dirname(file), { recursive: true });
      writeFileAtomic(file, JSON.stringify(entry));
      return entry;
    },
    entries(host) {
      if (!existsSync(dir)) return [];
      const hosts = host
        ? [host]
        : readdirSync(dir).filter((name) =>
            statSync(join(dir, name)).isDirectory(),
          );
      const out: CachedResponse[] = [];
      for (const name of hosts) {
        const folder = join(dir, name);
        if (!existsSync(folder)) continue;
        for (const file of readdirSync(folder).sort()) {
          if (!file.endsWith('.json')) continue;
          const entry = read(join(folder, file));
          if (entry) out.push(entry);
        }
      }
      return out;
    },
  };
}

export interface JsonResult {
  status: number;
  body: unknown;
  fromCache: boolean;
}

export interface CachedGetStats {
  hits: number;
  fetched: number;
  /** Misses a dry run counted instead of requesting. */
  wouldFetch: number;
}

export interface CachedGetter {
  /** Null only in a dry run, for a URL the cache doesn't have. */
  (url: string): Promise<JsonResult | null>;
  readonly stats: CachedGetStats;
}

export interface CachedGetterOptions {
  /** Count misses instead of fetching them. */
  dryRun?: boolean;
  /**
   * Why a 200 body is not an answer, or null when it is one. MediaWiki sends
   * its errors (read-only, rate-limited, internal) with status 200, and one
   * of those kept on disk would come back from the cache on every rerun.
   */
  refusal?: (body: unknown) => string | null;
}

/**
 * The cache in front of a polite client: a hit never touches the network or
 * the rate limit, a miss is fetched once and kept.
 *
 * Only answers are kept — 200 and 404. A 400 means the URL is wrong, which is
 * a bug to fix, not a fact to remember; throttling never reaches here (the
 * client retries it); a 200 that is really an error (`refusal`), or isn't
 * JSON, fails the request without being kept; and anything else is left
 * uncached so a rerun tries again.
 */
export function cachedGetter(
  http: PoliteHttp,
  cache: FileCache,
  { dryRun = false, refusal }: CachedGetterOptions = {},
): CachedGetter {
  const stats: CachedGetStats = { hits: 0, fetched: 0, wouldFetch: 0 };
  const get = async (url: string): Promise<JsonResult | null> => {
    const hit = cache.get(url);
    // A refusal kept by a run from before `refusal` existed is not an answer
    // either: asked again, and overwritten.
    if (hit && !(hit.status === 200 && refusal?.(hit.body))) {
      stats.hits++;
      return { status: hit.status, body: hit.body, fromCache: true };
    }
    if (dryRun) {
      stats.wouldFetch++;
      return null;
    }
    const res = await http.get(url);
    if (res.status !== 200 && res.status !== 404) {
      throw new HttpError(`HTTP ${res.status}: ${url}`, url, res.status);
    }
    if (res.status === 200) {
      let body: unknown;
      try {
        body = JSON.parse(res.text);
      } catch {
        throw new HttpError(`HTTP 200 but not JSON: ${url}`, url, 200);
      }
      const reason = refusal?.(body);
      if (reason) {
        throw new HttpError(`refused (${reason}): ${url}`, url, 200);
      }
    }
    stats.fetched++;
    // A 404's body is an error page, sometimes not JSON; the status is the answer.
    const entry = cache.put(
      url,
      res.status,
      res.status === 200 ? res.text : '',
    );
    return { status: entry.status, body: entry.body, fromCache: false };
  };
  return Object.assign(get, { stats });
}

export interface CacheManifest {
  generatedAt: string;
  /**
   * The local-only inputs this run read (gitignored `_*.json` files), by
   * content, so a later run — or a reviewer — can tell it read the same thing.
   */
  inputs: Record<string, { sha256: string; bytes: number }>;
  responses: {
    count: number;
    byHost: Record<string, number>;
    /** One hash over every cached URL and its response hash, sorted by URL. */
    digest: string;
    entries: {
      url: string;
      status: number;
      sha256: string;
      fetchedAt: string;
    }[];
  };
}

/**
 * What the cache holds, rebuilt from the files themselves — never kept up to
 * date by hand, so a killed run cannot leave it disagreeing with the cache.
 */
export function buildCacheManifest(
  cache: FileCache,
  inputs: CacheManifest['inputs'],
  now: () => Date = () => new Date(),
): CacheManifest {
  const entries = cache
    .entries()
    .map(({ url, status, sha256: hash, fetchedAt }) => ({
      url,
      status,
      sha256: hash,
      fetchedAt,
    }))
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  const byHost: Record<string, number> = {};
  for (const entry of entries) {
    const host = new URL(entry.url).host;
    byHost[host] = (byHost[host] ?? 0) + 1;
  }
  return {
    generatedAt: now().toISOString(),
    inputs,
    responses: {
      count: entries.length,
      byHost,
      digest: sha256(entries.map((e) => `${e.url} ${e.sha256}\n`).join('')),
      entries,
    },
  };
}
