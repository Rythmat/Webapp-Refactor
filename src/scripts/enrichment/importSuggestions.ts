/**
 * Import suggestions from MusicBrainz and Wikidata (design §5.2; F1, F2).
 *
 * ── For the owner: labelling the calibration sample ─────────────────────────
 *
 * Bulk accept trusts the "sure" tier, so before it does, you check the
 * importer by hand on 100 artists (about 2–3 hours):
 *
 *   1. `npx tsx src/scripts/enrichment/importSuggestions.ts calibrate`
 *      writes `src/scripts/enrichment/calibration/artists-100.json`: 100 of
 *      our artists, every one with a song in the library (mostly sure
 *      picks, 20 of them one-word names, and a few the importer could not
 *      place, to show what it misses), always the same 100 for the same
 *      scoring, each with the MusicBrainz artist the importer picked, its
 *      tier, why, and the runners-up — every one with its musicbrainz.org
 *      link. It is drawn only once the fetch has finished, and drawn again
 *      on every run until you fill in a label; from then on it is kept.
 *   2. For each artist, open `importer.pick.musicbrainz` next to the name and
 *      the events listed, and fill in `label`:
 *        "correct" — the pick is this artist;
 *        "wrong"   — it is another act (if you know the right one, paste its
 *                    MBID — the id in its musicbrainz.org URL — into
 *                    `correctMbid`);
 *        "none"    — MusicBrainz has no artist that is this one.
 *      Leave a label empty to skip it; every sure-tier pick needs one.
 *   3. Run `calibrate` again. It reports sure-tier precision, per kind of
 *      evidence and weighted; with every sure pick judged (at least 50 of
 *      them) and 98% or more, it marks `suggestions/manifest.json`
 *      calibrated, which is what lets the Table bulk-accept sure rows. Below
 *      that, send the "wrong" list to whoever tunes the scoring. Labels are
 *      never overwritten: a re-score that changes a pick asks for that one
 *      artist to be labelled again.
 *   Commit the labelled file: the labels are your work.
 *
 * ── What this is ────────────────────────────────────────────────────────────
 *
 * Suggestions, never edits. `enrichSongYears.mjs` wrote years straight into
 * the song files; this writes no song and no record. It keeps what the two
 * services said in a per-URL cache (`_cache/`, gitignored), scores it
 * offline, and emits artifacts under `suggestions/` that the console's Table
 * offers for review — accepted one at a time, or in bulk above a threshold.
 *
 * Stages, each safe to rerun:
 *   cache      offline: `_mb_cache.json` (read-only) → song-billed artist ids
 *              and album candidates, before a single request is spent
 *   fetch      the registry's artists: searches, lookups, their release
 *              groups and areas, the P434 fallback, then Wikidata — one
 *              MusicBrainz request per 1.1 s, resumable from the cache, one
 *              run at a time (`_cache/fetch.lock`). `--only songs` (F2): each
 *              library song's recordings by its lead act, the one matched
 *              looked up with its work, album release, labels and studios
 *              (`import/songFetch.ts`); run after the artists, whose
 *              identities the songs rest on
 *   score      offline: walks the fetch queue again with cache-only getters,
 *              scores every artist's identity and fields, and every song's
 *              recording, album, label, studio, credits and year, prints the
 *              counts (and writes `_cache/stage-score.json` and
 *              `stage-score-songs.json`, reports for people)
 *   emit       offline: score, then write `suggestions/{artists,places,
 *              manifest}.json` and the song half's `{songs,matches,releases,
 *              labels,studios,artists-created,record-places,record-slugs}
 *              .json` (`import/songEmit.ts`) — committed; the mock loads them
 *              in dev. The artist half's bytes never depend on the song half;
 *              `record-slugs.json` is read back on every emit and only added
 *              to, so a record keeps its slug (and its rows their ids).
 *              Refused while the artist fetch is missing answers; an
 *              unfinished song half is left out, keeping its files — refused
 *              too when a new artists.json would strand their rows
 *              (`--partial` to look anyway, into `--out`; `--only` to write
 *              one half)
 *   calibrate  offline: the owner's sample and its precision (above)
 *
 * Scoring never writes under `_cache/` but its own report: a stale
 * `stage-cache.json` is recomputed in memory, and the fetch's next run
 * rewrites it.
 *
 * Run from the repo root with `npx tsx` (the registry and the song library
 * come in through the `@/` alias). `--help` prints the flags.
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { HistoricalEvent } from '@/components/atlas/types';
import { artistSlug } from '@/content/graph/slugs';
import { type ImportArgs, parseArgs, USAGE } from './import/args';
import {
  type ArtistFetchRow,
  type ArtistToFetch,
  fetchArtists,
  MAX_LOOKUPS_PER_ARTIST,
  mergeFetchRows,
  planArtistFetch,
  sharedCandidates,
  summarizeWikidata,
  type WikidataSummary,
} from './import/artistFetch';
import {
  buildSuggestions,
  type BuiltSuggestions,
  type ScoredArtist,
  scoreArtists,
} from './import/buildSuggestions';
import {
  type CacheStageCounts,
  type CacheStageResult,
  extractCacheStage,
  type LibrarySong,
  type MbCache,
  type RegistryArtist,
  type SongCacheRow,
  type YearAuditRow,
} from './import/cacheStage';
import {
  type CalibrationFile,
  calibrationFile,
  calibrationStep,
  currentPickOf,
  measurePrecision,
  SAMPLE_RULE,
  sampleRuleOf,
  STRATA,
} from './import/calibrate';
import {
  ARTIFACT_FILES,
  batchOf,
  emitArtifacts,
  PRECISION_BAR,
  type SuggestionsManifest,
} from './import/emit';
import {
  buildCacheManifest,
  type CacheManifest,
  type CachedGetter,
  type CachedGetterOptions,
  cachedGetter,
  createFileCache,
  type JsonResult,
  sha256File,
  writeFileAtomic,
} from './import/fileCache';
import {
  type Gathered,
  type GatherInputs,
  gatherEvidence,
  type LibrarySongFacts,
} from './import/gather';
import {
  artistLookupUrl,
  createMusicBrainzClient,
  type MbArtist,
  MUSICBRAINZ_HTTP,
} from './import/musicbrainz';
import {
  ARTIST_LOCATIONS,
  CACHE_MANIFEST,
  CACHE_STAGE_CODE,
  CACHE_STAGE_OUT,
  CALIBRATION_FILE,
  ENRICHMENT_DIR,
  FETCH_LOCK,
  FETCH_STAGE_OUT,
  HTTP_CACHE_DIR,
  LOCAL_INPUTS,
  MB_CACHE,
  SCORE_STAGE_OUT,
  SONG_FETCH_OUT,
  SONG_SCORE_OUT,
  SUGGESTIONS_DIR,
  YEAR_AUDIT,
  YEAR_MISSES,
} from './import/paths';
import { createPoliteHttp, type PoliteHttp } from './import/politeHttp';
import {
  emptyLedger,
  parseLedger,
  type SlugLedger,
} from './import/recordSlugs';
import { acquireRunLock } from './import/runLock';
import { LIKELY } from './import/scoreIdentity';
import type { RegistrySlot } from './import/songCredits';
import {
  emitSongArtifacts,
  type EmittedSongArtifacts,
  manifestJson,
  SONG_ARTIFACT_FILES,
  strandedSongRows,
  withSongs,
} from './import/songEmit';
import {
  planSongFetch,
  requerySet,
  type SongClients,
  type SongToFetch,
  type SongWalk,
  walkSongs,
} from './import/songFetch';
import {
  actBands,
  type ArtistPick,
  registryIndex,
  type SongFacts,
} from './import/songMatch';
import {
  createSongMusicBrainz,
  type MbSearchRecording,
} from './import/songSources';
import {
  buildSongSuggestions,
  type BuiltSongSuggestions,
} from './import/songSuggestions';
import {
  createSparqlClient,
  knownP434From,
  SPARQL_HOST,
  SPARQL_HTTP,
} from './import/sparql';
import {
  fingerprintCacheStage,
  type StageFingerprint,
  whyStale,
} from './import/stageFingerprint';
import {
  createWikidataClient,
  knownEntitiesFrom,
  WIKIDATA_CACHE,
  WIKIDATA_HTTP,
} from './import/wikidata';

const log = (line: string) => console.log(line);
const here = (path: string) => relative(process.cwd(), path);

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadRegistry(): Promise<readonly RegistryArtist[]> {
  const { ARTIST_REGISTRY } = await import(
    '@/components/atlas/data/artistRegistry'
  );
  return ARTIST_REGISTRY;
}

/**
 * Only what the cache stage reads: 3 MB of chord charts, five fields each.
 * The linked lead act comes along so a billing that is no registry name
 * ("Rufus and Chaka Khan") still reaches its artist, as it does in the graph.
 */
async function loadSongs(): Promise<LibrarySong[]> {
  const { BUNDLED_SONGS } = await import('@/curriculum/data/songs/bundled');
  return Object.values(BUNDLED_SONGS).map(
    ({ id, title, artist, year, origin }) => ({
      id,
      title,
      artist,
      year,
      artistGlobeId: origin?.artistGlobeId,
    }),
  );
}

/**
 * The local-only inputs, by content: the manifest's reproducibility half,
 * and part of the cache stage's fingerprint. Hashed once per run — 197 MB of
 * it — since nothing changes them while the importer runs.
 */
let hashedInputs: Promise<CacheManifest['inputs']> | null = null;
function localInputs(): Promise<CacheManifest['inputs']> {
  hashedInputs ??= (async () => {
    const inputs: CacheManifest['inputs'] = {};
    for (const path of LOCAL_INPUTS) {
      if (existsSync(path))
        inputs[relative(ENRICHMENT_DIR, path)] = await sha256File(path);
    }
    return inputs;
  })();
  return hashedInputs;
}

async function writeManifest(): Promise<CacheManifest> {
  const manifest = buildCacheManifest(
    createFileCache(HTTP_CACHE_DIR, undefined, log),
    await localInputs(),
  );
  writeJson(CACHE_MANIFEST, manifest);
  log(
    `Manifest: ${here(CACHE_MANIFEST)} — ${manifest.responses.count} cached responses ` +
      `(digest ${manifest.responses.digest.slice(0, 12)}…), ` +
      `inputs ${Object.keys(manifest.inputs).join(', ') || 'none'}`,
  );
  return manifest;
}

// ── cache ────────────────────────────────────────────────────────────────

/** `stage-cache.json`: the stage's result, and what it was computed from. */
interface StoredCacheStage extends CacheStageResult {
  generatedAt: string;
  fingerprint?: StageFingerprint;
}

interface StageInputs {
  registry: readonly RegistryArtist[];
  songs: LibrarySong[];
  fingerprint: StageFingerprint;
}

async function loadStageInputs(): Promise<StageInputs> {
  const [registry, songs, inputs] = await Promise.all([
    loadRegistry(),
    loadSongs(),
    localInputs(),
  ]);
  const code = CACHE_STAGE_CODE.map((path) => readFileSync(path, 'utf8'));
  return {
    registry,
    songs,
    fingerprint: fingerprintCacheStage({ registry, songs, code, inputs }),
  };
}

function printCacheCounts(c: CacheStageCounts) {
  log(
    [
      `Songs: ${c.songs} — ${c.cached} answered in the old cache (${c.errors} refused by MusicBrainz), ` +
        `${c.exactMatch} with a recording of that title credited to that artist`,
      `  ${c.byTitle} read by title alone (their artist spelled differently in May); ` +
        `where no credit there is ours, the song counts as never asked`,
      `Song-billed artist ids: ${c.withBilledArtist} songs; ${c.songArtistNamesWithId} of ${c.songArtistNames} ` +
        `song-artist names (${c.songArtistNamesWithSeveralIds} with more than one id); ` +
        `${c.jointCredits} songs billed jointly (no single id)`,
      `Registry: ${c.registryArtistsWithId} of ${c.registryArtists} artists have a song-billed id ` +
        `(${c.registryArtistsWithSongs} have library songs, ${c.registryArtistsWithSeveralIds} more than one id, ` +
        `${c.registryArtistsWeak} billed on compilations or promos only); ` +
        `${c.songsOutsideRegistry} songs are billed to a name outside the registry`,
      `Album candidates: ${c.withAlbum} songs; single candidates: ${c.withSingle}. Partial by nature — ` +
        `the old search kept 25 recordings, often compilations and live takes; the song fetch's searches by id fill the rest`,
      `Years copied from MusicBrainz by enrichSongYears.mjs and still in the song: ${c.yearsFromMusicBrainz} ` +
        `(MusicBrainz agreeing with these is not evidence)`,
    ].join('\n'),
  );
}

/** Billed songs whose title someone unbilled carries more often. */
function printTopCreditWarnings(songs: readonly SongCacheRow[]) {
  const flagged = songs.filter((s) => s.billed.length > 0 && s.topCredit);
  if (!flagged.length) return;
  const who = (a: { name: string; disambiguation?: string; mbid: string }) =>
    `${a.name}${a.disambiguation ? ` (${a.disambiguation})` : ''} ${a.mbid.slice(0, 8)}`;
  log(
    `Warning: ${flagged.length} songs are billed to an artist other than the one credited most on their title — ` +
      'a same-named act, or ours under another name; scoring must not take the billing as settled:',
  );
  for (const song of flagged) {
    const [billed] = song.billed;
    const top = song.topCredit;
    if (!top) continue;
    log(
      `  ${song.songId}: billed ${who(billed)} on ${billed.recordings} recording(s); ` +
        `${who(top)} on ${top.recordings}`,
    );
  }
}

async function runCache(
  args: ImportArgs,
  inputs?: StageInputs,
): Promise<CacheStageResult> {
  if (!existsSync(MB_CACHE)) {
    throw new Error(
      `${here(MB_CACHE)} is missing. It is local-only (gitignored), written by enrichSongYears.mjs; the cache stage has nothing to read without it.`,
    );
  }
  const { registry, songs, fingerprint } = inputs ?? (await loadStageInputs());
  log(`Reading ${here(MB_CACHE)} …`);
  const result = extractCacheStage({
    songs,
    registry,
    mbCache: readJson<MbCache>(MB_CACHE),
    yearAudit: existsSync(YEAR_AUDIT)
      ? readJson<YearAuditRow[]>(YEAR_AUDIT)
      : [],
  });
  printCacheCounts(result.counts);
  printTopCreditWarnings(result.songs);
  if (args.dryRun) {
    log('(--dry-run: nothing written)');
    return result;
  }
  writeJson(CACHE_STAGE_OUT, {
    generatedAt: new Date().toISOString(),
    fingerprint,
    ...result,
  } satisfies StoredCacheStage);
  log(`Wrote ${here(CACHE_STAGE_OUT)}`);
  await writeManifest();
  return result;
}

// ── fetch ────────────────────────────────────────────────────────────────

/**
 * The cache stage's output, current with its inputs: read back when its
 * fingerprint still matches, computed again (offline, a second or two) when
 * anything it was built from has changed since.
 */
async function currentCacheStage(
  args: ImportArgs,
  inputs: StageInputs,
  { write = true }: { write?: boolean } = {},
): Promise<Pick<CacheStageResult, 'artists' | 'songs'>> {
  if (existsSync(CACHE_STAGE_OUT)) {
    const stored = readJson<StoredCacheStage>(CACHE_STAGE_OUT);
    const stale = whyStale(stored.fingerprint, inputs.fingerprint);
    if (!stale) return stored;
    log(
      `${here(CACHE_STAGE_OUT)} is stale: ${stale}. Running the cache stage again (offline${write ? '' : ', in memory'}).`,
    );
  } else {
    log('No cache-stage output yet; running the cache stage first (offline).');
  }
  return runCache(write ? args : { ...args, dryRun: true }, inputs);
}

function describeQueue(queue: readonly ArtistToFetch[], of: number) {
  const billed = queue.filter((a) => a.songBilled.length);
  const settled = billed.filter((a) => !a.searchToo).length;
  return (
    `Artists: ${queue.length} of ${of} — ${settled} settled by song-billed ids (no search), ` +
    `${billed.length - settled} song-billed but searched as well (compilations only, split ids or a one-word name), ` +
    `${queue.length - billed.length} searched`
  );
}

function printShared(rows: readonly ArtistFetchRow[]) {
  const shared = sharedCandidates(rows);
  if (!shared.length) return;
  log(
    `  ${shared.length} MusicBrainz ids are candidates for more than one registry artist (scoring must flag one resolving to two):`,
  );
  for (const { mbid, name, slugs } of shared) {
    log(`    ${name} ${mbid.slice(0, 8)}: ${slugs.join(', ')}`);
  }
}

const describeWikidata = (w: WikidataSummary) =>
  `${w.linkedFromMusicBrainz} items linked, ${w.artistItems} in hand; ` +
  `${w.placeItems} places with their claims, ${w.namedItems} genres/instruments/types/countries named`;

async function runFetch(args: ImportArgs) {
  // Two fetches at once would be two clients, each polite on its own and
  // together twice the rate. A dry run sends nothing, so it needs no lock.
  const lock = args.dryRun ? null : acquireRunLock(FETCH_LOCK);
  try {
    if (args.only === 'songs') await fetchSongs(args);
    else await fetchStage(args);
  } catch (error) {
    if (!(error instanceof RequestCapReached)) throw error;
    log(
      `Stopped at --max-requests ${error.max}: everything fetched is in the cache, and a rerun resumes.`,
    );
    await writeManifest();
  } finally {
    lock?.release();
  }
}

/** `--max-requests`: a smoke test's ceiling, shared by every client of the run. */
class RequestCapReached extends Error {
  constructor(readonly max: number) {
    super(`request cap of ${max} reached`);
    this.name = 'RequestCapReached';
  }
}

function capped(
  http: PoliteHttp,
  counter: { sent: number; max: number | null },
): PoliteHttp {
  if (counter.max === null) return http;
  return {
    stats: http.stats,
    get(url) {
      if (counter.sent >= counter.max!)
        return Promise.reject(new RequestCapReached(counter.max!));
      counter.sent++;
      return http.get(url);
    },
  };
}

async function fetchStage(args: ImportArgs) {
  const inputs = await loadStageInputs();
  const { registry } = inputs;
  const stage = await currentCacheStage(args, inputs);
  const queue = planArtistFetch(registry, stage.artists).slice(
    0,
    args.limit ?? registry.length,
  );

  const cache = createFileCache(HTTP_CACHE_DIR, undefined, log);
  const counter = { sent: 0, max: args.maxRequests };
  const mbHttp = createPoliteHttp({ ...MUSICBRAINZ_HTTP, log });
  const wdHttp = createPoliteHttp({ ...WIKIDATA_HTTP, log });
  const mbGet = cachedGetter(capped(mbHttp, counter), cache, {
    dryRun: args.dryRun,
  });
  const wdGet = cachedGetter(capped(wdHttp, counter), cache, {
    dryRun: args.dryRun,
    ...WIKIDATA_CACHE,
  });
  const wikidata = createWikidataClient(
    wdGet,
    knownEntitiesFrom(cache.entries('www.wikidata.org')),
  );
  const sparqlHttp = createPoliteHttp({ ...SPARQL_HTTP, log });
  const sparqlGet = cachedGetter(capped(sparqlHttp, counter), cache, {
    dryRun: args.dryRun,
  });
  const sparql = createSparqlClient(
    sparqlGet,
    knownP434From(cache.entries(SPARQL_HOST)),
  );

  log(
    describeQueue(queue, registry.length) +
      (args.dryRun ? ' (dry run: cache only)' : ''),
  );
  const started = Date.now();
  const report = await fetchArtists(
    queue,
    { mb: createMusicBrainzClient(mbGet), wikidata, sparql },
    { log },
  );

  const rows = report.rows;
  const count = (test: (row: ArtistFetchRow) => boolean) =>
    rows.filter(test).length;
  log(
    [
      `Done in ${Math.round((Date.now() - started) / 1000)} s.`,
      `  candidates: ${count((r) => r.candidates.length > 0)} artists; ` +
        `${count((r) => r.candidates.length > 1 || r.moreCandidates > 0)} with more than one; ` +
        `${count((r) => !r.pending && !r.error && !r.unanswered && r.candidates.length === 0)} with no exact-name candidate; ` +
        `${count((r) => !!r.unanswered)} with a lookup unanswered; ` +
        `${count((r) => !!r.error)} failed`,
      `  Wikidata: ${describeWikidata(report.wikidata)}`,
      `  MusicBrainz: ${mbHttp.stats.requests} requests (${mbHttp.stats.retries} retries), ${mbGet.stats.hits} from cache`,
      `  Wikidata:    ${wdHttp.stats.requests} requests (${wdHttp.stats.retries} retries), ${wdGet.stats.hits} from cache`,
      `  Query Service (P434): ${sparqlHttp.stats.requests} requests (${sparqlHttp.stats.retries} retries), ${sparqlGet.stats.hits} from cache`,
    ].join('\n'),
  );
  if (args.dryRun) {
    printShared(rows);
    // A search's lookups can't be counted until its answer is in hand. Most
    // names nobody's song names find themselves once; song-billed names
    // searched as well usually find the billed id, which is not looked up
    // twice. The upper bound is every lookup the plan allows.
    const planned = new Map(queue.map((a) => [a.slug, a]));
    const pending = rows.filter((r) => r.pending);
    const least = pending.filter((r) => r.source === 'search').length;
    const most = pending.reduce(
      (sum, r) =>
        sum + (planned.get(r.slug)?.searchLookups ?? MAX_LOOKUPS_PER_ARTIST),
      0,
    );
    const known = mbGet.stats.wouldFetch;
    const minutes = (requests: number) =>
      Math.ceil((requests * MUSICBRAINZ_HTTP.minIntervalMs) / 60_000);
    log(
      `(--dry-run: ${known} MusicBrainz requests known now (≈${minutes(known)} min), ` +
        `plus ${least}–${most} lookups for the ${pending.length} artists whose search is not cached yet ` +
        `(≈${minutes(known + least)}–${minutes(known + most)} min in all) — each lookup also brings a ` +
        `release-group browse and up to two area lookups, and an area not yet in hand its walk to its ` +
        `country, so the true total runs higher — then the P434 fallback and Wikidata in batches of 50. ` +
        `Nothing written.)`,
    );
    return;
  }
  // The file is the account of every artist fetched so far, not just this
  // run's: a `--limit` run adds to it, and its Wikidata figures are counted
  // over all of it from what is in hand.
  const artists = mergeFetchRows(
    registry,
    existsSync(FETCH_STAGE_OUT)
      ? readJson<{ artists: ArtistFetchRow[] }>(FETCH_STAGE_OUT).artists
      : [],
    rows,
  );
  const summary = await summarizeWikidata(artists, wikidata);
  printShared(artists);
  writeJson(FETCH_STAGE_OUT, {
    generatedAt: new Date().toISOString(),
    wikidata: summary,
    artists,
  });
  log(
    `Wrote ${here(FETCH_STAGE_OUT)}: ${artists.length} artists so far; Wikidata ${describeWikidata(summary)}`,
  );
  await writeManifest();
}

// ── score, emit, calibrate ───────────────────────────────────────────────

/**
 * A cache-only getter that remembers what it has read: scoring reads some
 * answers twice (the queue's walk, then the candidates' facts). `urls` is
 * every URL it was asked for.
 */
function memoGetter(
  get: CachedGetter,
): CachedGetter & { urls: ReadonlySet<string> } {
  const seen = new Map<string, Promise<JsonResult | null>>();
  const urls = new Set<string>();
  const memo = (url: string) => {
    let hit = seen.get(url);
    if (!hit) {
      hit = get(url);
      seen.set(url, hit);
      urls.add(url);
    }
    return hit;
  };
  return Object.assign(memo, { stats: get.stats, urls });
}

/** A getter that never makes a request: it reads the cache and counts its misses. */
const dryGetter = (
  cache: ReturnType<typeof createFileCache>,
  options: CachedGetterOptions = {},
) =>
  memoGetter(
    cachedGetter(createPoliteHttp(MUSICBRAINZ_HTTP), cache, {
      ...options,
      dryRun: true,
    }),
  );

/** The most frequent of a report's names, for a line of the summary. */
const topOf = (list: [string, number][]) =>
  list
    .slice(0, 8)
    .map(([name, n]) => `${name} ×${n}`)
    .join(', ') || 'none';

/** The song fields scoring reads: the cache stage's, and genre tags. */
async function loadLibrary(): Promise<LibrarySongFacts[]> {
  const { BUNDLED_SONGS } = await import('@/curriculum/data/songs/bundled');
  return Object.values(BUNDLED_SONGS).map(
    ({ id, title, artist, year, genreTags }) => ({
      id,
      title,
      artist,
      year,
      genreTags,
    }),
  );
}

async function loadEvents(): Promise<HistoricalEvent[]> {
  const { BUNDLED_MUSIC_HISTORY } = await import(
    '@/components/atlas/data/events'
  );
  return BUNDLED_MUSIC_HISTORY;
}

interface ScoreRun {
  registry: readonly RegistryArtist[];
  queue: readonly ArtistToFetch[];
  gathered: Gathered;
  scored: ScoredArtist[];
  built: BuiltSuggestions;
  batch: string;
  cacheManifest: CacheManifest;
  fingerprint: StageFingerprint;
  /** Answers scoring asked the cache for and did not find, by service. */
  missing: { musicbrainz: number; wikidata: number; queryService: number };
  /** The cache stage's song rows (old-cache answers, years copied from MusicBrainz). */
  cacheSongs: readonly SongCacheRow[];
  songs: LibrarySongFacts[];
  events: HistoricalEvent[];
}

/** What is missing, in words; null when the cache holds every answer. */
function whatIsMissing(run: ScoreRun): string | null {
  const { missing } = run;
  const pending = run.built.counts.identity.pending;
  const parts = [
    missing.musicbrainz && `${missing.musicbrainz} MusicBrainz`,
    missing.wikidata && `${missing.wikidata} Wikidata`,
    missing.queryService && `${missing.queryService} Query Service`,
  ].filter(Boolean);
  if (!parts.length && !pending) return null;
  return (
    `${parts.length ? `${parts.join(', ')} answers are not in the cache yet` : 'the cache is not complete'}` +
    (pending ? `, and ${pending} artists are held back whole` : '')
  );
}

async function scoreRun(args: ImportArgs): Promise<ScoreRun> {
  const inputs = await loadStageInputs();
  const { registry } = inputs;
  // Scoring writes nothing under _cache/ (a stale stage is recomputed here).
  const stage = await currentCacheStage(args, inputs, { write: false });
  const queue = planArtistFetch(registry, stage.artists).slice(
    0,
    args.limit ?? registry.length,
  );
  const cache = createFileCache(HTTP_CACHE_DIR, undefined, log);
  // Never a request: every getter reads the cache and counts its misses.
  const dry = (options: CachedGetterOptions = {}) => dryGetter(cache, options);
  const known = knownEntitiesFrom(cache.entries('www.wikidata.org'));
  const mbGet = dry();
  const wdGet = dry(WIKIDATA_CACHE);
  const sparqlGet = dry();
  const [songs, events] = await Promise.all([loadLibrary(), loadEvents()]);
  log(
    `Scoring ${queue.length} of ${registry.length} artists from the cache (no requests) …`,
  );
  const gathered = await gatherEvidence(
    {
      registry,
      queue,
      cacheArtists: stage.artists,
      cacheSongs: stage.songs,
      songs,
      events,
      artistLocations:
        readJson<GatherInputs['artistLocations']>(ARTIST_LOCATIONS),
    },
    {
      mb: createMusicBrainzClient(mbGet),
      wikidata: createWikidataClient(wdGet, known),
      sparql: createSparqlClient(
        sparqlGet,
        knownP434From(cache.entries(SPARQL_HOST)),
      ),
      known,
    },
  );
  const { scored, shared } = scoreArtists(gathered.evidence);
  const cacheManifest = buildCacheManifest(cache, await localInputs());
  const batch = batchOf(
    cacheManifest,
    new Set([...mbGet.urls, ...sparqlGet.urls]),
  );
  const built = buildSuggestions(scored, shared, gathered.wd, batch);
  log(
    `  MusicBrainz answers read: ${mbGet.stats.hits}; not in the cache yet: ${mbGet.stats.wouldFetch}` +
      (wdGet.stats.wouldFetch || sparqlGet.stats.wouldFetch
        ? `; Wikidata ${wdGet.stats.wouldFetch}, Query Service ${sparqlGet.stats.wouldFetch} not in the cache yet`
        : ''),
  );
  return {
    registry,
    queue,
    gathered,
    scored,
    built,
    batch,
    cacheManifest,
    fingerprint: inputs.fingerprint,
    missing: {
      musicbrainz: mbGet.stats.wouldFetch,
      wikidata: wdGet.stats.wouldFetch,
      queryService: sparqlGet.stats.wouldFetch,
    },
    cacheSongs: stage.songs,
    songs,
    events,
  };
}

function printScore({ scored, built, gathered }: ScoreRun) {
  const { counts, unmapped } = built;
  const id = counts.identity;
  const scoredCount = scored.length - id.pending;
  const oneWord = scored.filter(
    (s) => !s.evidence.pending && s.evidence.oneWord,
  );
  const facts = gathered.evidence.flatMap((e) =>
    e.candidates.filter((c) => c.lookedUp),
  );
  const areas = facts.flatMap((c) =>
    [c.area, c.beginArea].filter((a) => a && !a.isCountry),
  );
  const tiers = (t: Record<string, number>) =>
    `sure ${t.sure ?? 0}, likely ${t.likely ?? 0}, ambiguous ${t.ambiguous ?? 0}`;
  const lines = [
    `Identity, ${scoredCount} artists scored: sure ${id.sure}, likely ${id.likely}, ambiguous ${id.ambiguous}, ` +
      `weak ${id.weak} (below ${LIKELY}: nothing offered), none ${id.none} (no candidate); ` +
      `${id.pending} held back (their search is not in the cache yet)`,
    `  one-word names: ${oneWord.length} scored — sure ${oneWord.filter((s) => s.identity.tier === 'sure').length}, ` +
      `likely ${oneWord.filter((s) => s.identity.tier === 'likely').length}, ` +
      `ambiguous ${oneWord.filter((s) => s.identity.tier === 'ambiguous').length}`,
    `  MusicBrainz ids picked for two of our artists: ${built.shared.length} (never sure)`,
    `Evidence in hand: ${facts.length} candidates looked up; release groups for ${facts.filter((c) => c.releaseTitles !== null).length}; ` +
      `${areas.filter((a) => a?.type).length} of ${areas.length} areas typed; ` +
      `Wikidata items for ${facts.filter((c) => c.wikidata.some((q) => gathered.wd.item(q))).length}`,
    `Suggestions: ${counts.suggestions} — ${tiers(counts.byTier)}; ${counts.artistsWithFields} artists with field suggestions`,
    ...Object.entries(counts.byField)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, t]) => `  ${path.padEnd(18)} ${tiers(t)}`),
    `Places: ${counts.placesMapped} place suggestions map to our cities; ${counts.placesToCreate} pin:false places to create`,
  ];
  const top = topOf;
  lines.push(
    `Unmapped (suggested nothing): genres ${top(unmapped.genres)}`,
    `  instruments ${top(unmapped.instruments)}`,
    `  places ${top(unmapped.places)}`,
    `  residences (P551) no other source names, not offered as City: ${unmapped.residences.reduce((n, [, k]) => n + k, 0)}`,
  );
  log(lines.join('\n'));
}

// ── songs (F2) ───────────────────────────────────────────────────────────

/** The old search kept this many recordings: an answer that full may be cut short. */
const OLD_SEARCH_LIMIT = 25;

/**
 * Our artists' sure and likely identities, as the song half rests on them,
 * with the bands named after each that its records may be credited to
 * (`actBands`, from the artist half's own cached lookup of the act).
 */
function picksOf(run: ScoreRun): Map<string, ArtistPick> {
  const cache = createFileCache(HTTP_CACHE_DIR);
  const registry = registryIndex(run.registry);
  const isOurs = (name: string) => registry.has(artistSlug(name));
  const identityRows = new Map(
    run.built.suggestions
      .filter((s) => s.path === 'externalIds.mbid' && s.tier !== 'ambiguous')
      .map((s) => [s.target.slug, s]),
  );
  const out = new Map<string, ArtistPick>();
  for (const { evidence, identity } of run.scored) {
    const pick = identity.pick;
    const row = identityRows.get(evidence.slug);
    if (evidence.pending || !pick || !row || row.value !== pick.mbid) continue;
    if (identity.tier !== 'sure' && identity.tier !== 'likely') continue;
    const facts = evidence.candidates.find((c) => c.mbid === pick.mbid);
    const looked = cache.get(artistLookupUrl(pick.mbid));
    const bands = actBands(
      looked?.status === 200 ? (looked.body as MbArtist) : null,
      evidence.name,
      isOurs,
    );
    out.set(evidence.slug, {
      slug: evidence.slug,
      name: evidence.name,
      mbid: pick.mbid,
      tier: identity.tier,
      confidence: identity.confidence,
      identityId: row.id,
      ...(facts?.askedAs?.length ? { askedAs: facts.askedAs } : {}),
      countryCode:
        facts?.area?.countryCode ?? facts?.beginArea?.countryCode ?? null,
      ...(bands.length ? { bands } : {}),
    });
  }
  return out;
}

/**
 * The committed slug ledger (`record-slugs.json`): the one in `dir`, else —
 * emitting elsewhere to look — the one in `suggestions/`, else none yet.
 */
function readLedger(dir = SUGGESTIONS_DIR): SlugLedger {
  for (const at of [dir, SUGGESTIONS_DIR]) {
    const path = join(at, SONG_ARTIFACT_FILES.ledger);
    if (existsSync(path)) return parseLedger(readFileSync(path, 'utf8'));
  }
  return emptyLedger();
}

interface SongInputs {
  queue: SongToFetch[];
  picks: Map<string, ArtistPick>;
  slots: RegistrySlot[];
  /** Songs whose year is looked for again. */
  requery: number;
}

/** The song queue, from the artist half's scoring and the repo's songs. */
function songInputs(run: ScoreRun): SongInputs {
  const picks = picksOf(run);
  const rows = new Map(run.cacheSongs.map((r) => [r.songId, r]));
  const songs: SongFacts[] = run.songs.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    ...(typeof s.year === 'number' ? { year: s.year } : {}),
    yearFromMusicBrainz: rows.get(s.id)?.yearFromMusicBrainz ?? false,
  }));
  // C15: the songs `enrichSongYears.mjs` missed (several were HTTP 503),
  // and those whose globe event carries the placeholder year.
  const requery = requerySet(
    songs,
    existsSync(YEAR_MISSES)
      ? readJson<{ slug: string }[]>(YEAR_MISSES).map((m) => m.slug)
      : [],
    run.events,
  );
  // The old cache's own answers, whole: read once, and let go of the rest.
  const old = new Map<string, MbSearchRecording[]>();
  if (existsSync(MB_CACHE)) {
    const mbCache = readJson<MbCache>(MB_CACHE);
    for (const row of run.cacheSongs) {
      if (row.byTitle || row.cacheKeys.length !== 1) continue;
      const entry = mbCache[row.cacheKeys[0]];
      const recordings = entry?.recordings ?? [];
      if (!entry || entry.error || recordings.length >= OLD_SEARCH_LIMIT)
        continue;
      old.set(row.songId, recordings as MbSearchRecording[]);
    }
  }
  const queue = planSongFetch({
    songs,
    registry: registryIndex(run.registry),
    picks,
    requery,
    oldAnswer: (id) => old.get(id) ?? null,
  });
  const slots: RegistrySlot[] = run.registry.map((a) => ({
    slug: a.slug,
    mbid: picks.get(a.slug)?.mbid ?? null,
  }));
  return { queue, picks, slots, requery: requery.size };
}

function songClients(
  mbGet: CachedGetter,
  wdGet: CachedGetter,
  cache: ReturnType<typeof createFileCache>,
): SongClients {
  return {
    songs: createSongMusicBrainz(mbGet),
    mb: createMusicBrainzClient(mbGet),
    wikidata: createWikidataClient(
      wdGet,
      knownEntitiesFrom(cache.entries('www.wikidata.org')),
    ),
  };
}

function describeSongQueue(queue: readonly SongToFetch[]) {
  const count = (test: (s: SongToFetch) => boolean) =>
    queue.filter(test).length;
  return (
    `Songs: ${queue.length} — ${count((s) => !!s.lead)} with a lead act of ours MusicBrainz knows ` +
    `(${count((s) => s.lead?.tier === 'sure')} sure, ${count((s) => s.lead?.tier === 'likely')} likely; ` +
    `${count((s) => !!s.oldRecordings)} answered whole by the old cache, no search), ` +
    `${count((s) => !!s.byName)} searched by name for their year only, ${count((s) => !!s.skip)} skipped; ` +
    `${count((s) => s.requery)} have their year looked for again`
  );
}

function summarizeWalk(walk: SongWalk): string {
  const count = (test: (r: SongWalk['rows'][number]) => boolean) =>
    walk.rows.filter(test).length;
  const missing = Object.entries(walk.missing)
    .map(([what, n]) => `${n} ${what}`)
    .join(', ');
  return (
    `  matched ${count((r) => r.match?.status === 'matched')} ` +
    `(sure ${count((r) => r.match?.status === 'matched' && r.match.tier === 'sure')}), ` +
    `ambiguous ${count((r) => r.match?.status === 'ambiguous')}, no recording ${count((r) => r.match?.status === 'none')}, ` +
    `failed ${count((r) => !!r.error)}; albums ${walk.albums.size}, labels ${walk.labels.size}, ` +
    `places ${walk.places.size}, works ${walk.works.size}` +
    (missing ? `\n  not in the cache yet: ${missing}` : '')
  );
}

async function fetchSongs(args: ImportArgs) {
  log('The artist half first, offline: the songs rest on its identities.');
  const run = await scoreRun({ ...args, limit: null });
  const missingArtists = whatIsMissing(run);
  if (missingArtists)
    log(
      `Warning: ${missingArtists}; songs whose act is held back are skipped. Finish the artist fetch first.`,
    );
  const { queue: all } = songInputs(run);
  const queue = all.slice(0, args.limit ?? all.length);
  log(describeSongQueue(queue) + (args.dryRun ? ' (dry run: cache only)' : ''));

  const cache = createFileCache(HTTP_CACHE_DIR, undefined, log);
  const counter = { sent: 0, max: args.maxRequests };
  const mbHttp = createPoliteHttp({ ...MUSICBRAINZ_HTTP, log });
  const wdHttp = createPoliteHttp({ ...WIKIDATA_HTTP, log });
  const mbGet = cachedGetter(capped(mbHttp, counter), cache, {
    dryRun: args.dryRun,
  });
  const wdGet = cachedGetter(capped(wdHttp, counter), cache, {
    dryRun: args.dryRun,
    ...WIKIDATA_CACHE,
  });
  const started = Date.now();
  const walk = await walkSongs(queue, songClients(mbGet, wdGet, cache), {
    log,
  });
  log(
    [
      `Done in ${Math.round((Date.now() - started) / 1000)} s.`,
      summarizeWalk(walk),
      `  MusicBrainz: ${mbHttp.stats.requests} requests (${mbHttp.stats.retries} retries), ${mbGet.stats.hits} from cache`,
      `  Wikidata:    ${wdHttp.stats.requests} requests (${wdHttp.stats.retries} retries), ${wdGet.stats.hits} from cache`,
    ].join('\n'),
  );
  if (args.dryRun) {
    // Each answer leads to the next, so a dry run counts only the first
    // unanswered step of each song. What follows a search: the recording's
    // lookup, its work, and a share of the albums, labels and studios.
    const searches = walk.rows.filter((r) => r.pending === 'search').length;
    const known = mbGet.stats.wouldFetch;
    const minutes = (requests: number) =>
      Math.ceil((requests * MUSICBRAINZ_HTTP.minIntervalMs) / 60_000);
    const least = known + searches * 2;
    const most = known + searches * 5;
    log(
      `(--dry-run: ${known} MusicBrainz requests known now; ${searches} songs' searches not cached, ` +
        `each followed by 2–5 more (recording, work, and shares of album, label, studio and area lookups): ` +
        `${least}–${most} MusicBrainz requests in all, ≈${minutes(least)}–${minutes(most)} min, ` +
        `plus a few Wikidata batches. Nothing written.)`,
    );
    return;
  }
  writeJson(SONG_FETCH_OUT, {
    generatedAt: new Date().toISOString(),
    songs: walk.rows.map((r) => ({
      songId: r.songId,
      lead: r.lead,
      source: r.source,
      pages: r.pages,
      ...(r.skipped ? { skipped: r.skipped } : {}),
      ...(r.pending ? { pending: r.pending } : {}),
      ...(r.error ? { error: r.error } : {}),
      ...(r.match
        ? {
            match: r.match.status,
            ...(r.match.status === 'matched'
              ? { tier: r.match.tier, recording: r.match.take.recording.id }
              : { why: r.match.reasons }),
          }
        : {}),
      ...(r.album ? { album: r.album.groupId } : {}),
    })),
  });
  log(`Wrote ${here(SONG_FETCH_OUT)}`);
  await writeManifest();
}

interface SongRun {
  inputs: SongInputs;
  walk: SongWalk;
  built: BuiltSongSuggestions;
  batch: string;
  /** Answers the walk asked the cache for and did not find. */
  missing: number;
}

async function scoreSongs(run: ScoreRun, args: ImportArgs): Promise<SongRun> {
  const inputs = songInputs(run);
  const queue = inputs.queue.slice(0, args.limit ?? inputs.queue.length);
  const cache = createFileCache(HTTP_CACHE_DIR, undefined, log);
  const mbGet = dryGetter(cache);
  const wdGet = dryGetter(cache, WIKIDATA_CACHE);
  log(`Scoring ${queue.length} songs from the cache (no requests) …`);
  const walk = await walkSongs(queue, songClients(mbGet, wdGet, cache));
  const batch = batchOf(run.cacheManifest, mbGet.urls).replace(
    /^mb-/,
    'mb-songs-',
  );
  const built = buildSongSuggestions({
    queue,
    walk,
    picks: inputs.picks,
    registry: inputs.slots,
    artistPlaces: run.built.placeBook,
    wd: run.gathered.wd,
    batch,
    ledger: readLedger(args.out ?? SUGGESTIONS_DIR),
  });
  return {
    inputs,
    walk,
    built,
    batch,
    missing: mbGet.stats.wouldFetch + wdGet.stats.wouldFetch,
  };
}

function printSongScore({ built, walk, inputs, missing }: SongRun) {
  const { counts, unmapped } = built;
  const tiers = (t: Record<string, number>) =>
    `sure ${t.sure ?? 0}, likely ${t.likely ?? 0}`;
  const m = counts.matches;
  const top = topOf;
  log(
    [
      describeSongQueue(inputs.queue),
      `Songs, ${counts.songs} walked: matched ${m.matched} (${tiers(counts.matchTiers)}), ambiguous ${m.ambiguous}, ` +
        `no recording ${m.none}, not fetched yet ${m.pending}, skipped ${m.skipped}, failed ${m.error}`,
      summarizeWalk(walk),
      `Suggestions: ${counts.suggestions} — ${tiers(counts.byTier)}; ${counts.songsWithSuggestions} songs with suggestions`,
      ...Object.entries(counts.byField)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, t]) => `  ${path.padEnd(22)} ${tiers(t)}`),
      `Credits: ${counts.creditLinks.ours} linked to our artists, ${counts.creditLinks.created} to people created, ${counts.creditLinks.nameOnly} names only`,
      `Records to make: ${counts.records.releases} releases, ${counts.records.labels} labels, ${counts.records.studios} studios, ` +
        `${counts.records.artists} artists, ${counts.records.places} pin:false places; ` +
        `linked to records we have: ${counts.existing.labels} labels, ${counts.existing.studios} studios`,
      `Unmapped: roles ${top(unmapped.roles)}`,
      `  instruments ${top(unmapped.instruments)}`,
      `  places ${top(unmapped.places)}`,
      `  namesakes of our unsettled artists (not created) ${top(unmapped.namesakes)}`,
      `  years not offered (no dated record of the act's own): ${unmapped.years.join(', ') || 'none'}`,
      ...(missing
        ? [
            `Warning: ${missing} answers are not in the cache yet: the song fetch has not finished.`,
          ]
        : []),
    ].join('\n'),
  );
}

async function runScore(args: ImportArgs) {
  const songsToo = args.only !== 'artists';
  const artistsToo = args.only !== 'songs';
  // The songs rest on every artist's identity: never a part of the registry.
  const run = await scoreRun(songsToo ? { ...args, limit: null } : args);
  if (artistsToo) printScore(run);
  const songs = songsToo ? await scoreSongs(run, args) : null;
  if (songs) printSongScore(songs);
  if (args.dryRun) {
    log('(--dry-run: nothing written)');
    return;
  }
  if (artistsToo) {
    const path = args.out
      ? join(args.out, 'stage-score.json')
      : SCORE_STAGE_OUT;
    writeJson(path, {
      generatedAt: new Date().toISOString(),
      batch: run.batch,
      counts: run.built.counts,
      artists: run.scored.map(({ evidence, identity }) => ({
        slug: evidence.slug,
        tier: evidence.pending ? 'pending' : identity.tier,
        confidence: identity.confidence,
        pick: identity.pick,
        runnersUp: identity.ranked.slice(1, 3),
        notes: identity.notes,
      })),
    });
    log(`Wrote ${here(path)} (a report; the artifacts are emit's)`);
  }
  if (songs) {
    const path = args.out
      ? join(args.out, 'stage-score-songs.json')
      : SONG_SCORE_OUT;
    writeJson(path, {
      generatedAt: new Date().toISOString(),
      batch: songs.batch,
      counts: songs.built.counts,
      matches: songs.built.matches,
    });
    log(`Wrote ${here(path)} (a report; the artifacts are emit's)`);
  }
}

function readManifest(dir = SUGGESTIONS_DIR): SuggestionsManifest | null {
  const path = join(dir, ARTIFACT_FILES.manifest);
  return existsSync(path) ? readJson<SuggestionsManifest>(path) : null;
}

function artifactsOf(
  run: ScoreRun,
  inputs: CacheManifest['inputs'],
  dir = SUGGESTIONS_DIR,
) {
  return emitArtifacts({
    built: run.built,
    batch: run.batch,
    registryArtists: run.registry.length,
    cache: {
      digest: run.cacheManifest.responses.digest,
      responses: run.cacheManifest.responses.count,
      byHost: run.cacheManifest.responses.byHost,
    },
    inputs,
    stageFingerprint: run.fingerprint.sha256,
    previous: readManifest(dir),
  });
}

const kb = (text: string) =>
  `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`;

/**
 * The song rows an earlier emit left in `dir` that rest on an identity row
 * `artists.json` is about to lose (`strandedSongRows`); 0 with no song
 * files there.
 */
function strandedIn(dir: string, artistRowIds: ReadonlySet<string>): number {
  const path = join(dir, SONG_ARTIFACT_FILES.songs);
  return existsSync(path)
    ? strandedSongRows(readFileSync(path, 'utf8'), artistRowIds)
    : 0;
}

async function runEmit(args: ImportArgs) {
  const songsAsked = args.only !== 'artists';
  const artistsToo = args.only !== 'songs';
  const run = await scoreRun(songsAsked ? { ...args, limit: null } : args);
  if (artistsToo) printScore(run);
  const songs = songsAsked ? await scoreSongs(run, args) : null;
  if (songs) printSongScore(songs);

  const missing = whatIsMissing(run);
  if (missing)
    log(
      `Warning: ${missing}. The fetch has not finished: run it again, then emit.`,
    );
  // Each half is written whole or not at all. The songs rest on the
  // artists, so an unfinished artist half holds everything back; an
  // unfinished song half, asked for only by default, is left out and keeps
  // the files it had.
  const artistsReady = !missing || args.partial;
  const songsReady = !!songs && (!songs.missing || args.partial);
  const songsToo = songsAsked && songsReady;
  if (songsAsked && !songsReady && args.only !== 'songs')
    log(
      'The song fetch has not finished: the song half is left out (its files, if any, are kept). ' +
        '`fetch --only songs` finishes it; --partial writes it anyway.',
    );

  const dir = args.out ?? SUGGESTIONS_DIR;
  const previous = readManifest(dir);
  const artist = artifactsOf(run, await localInputs(), dir);
  const song: EmittedSongArtifacts | null =
    songs && songsToo
      ? emitSongArtifacts(songs.built, songs.batch, songs.inputs.requery)
      : null;
  const manifest = withSongs(artist.manifest, song, previous);
  const files: Record<string, string> = {
    ...(artistsToo
      ? {
          [ARTIFACT_FILES.artists]: artist.files[ARTIFACT_FILES.artists],
          [ARTIFACT_FILES.places]: artist.files[ARTIFACT_FILES.places],
        }
      : {}),
    ...(song?.files ?? {}),
    [ARTIFACT_FILES.manifest]: manifestJson(manifest),
  };
  log(
    `Artifacts: ${Object.entries(files)
      .map(([name, text]) => `${name} ${kb(text)}`)
      .join(', ')}`,
  );
  // The song half left out keeps its files: only while every identity row
  // they rest on is still in the artists.json written beside them.
  const stranded =
    artistsToo && !song
      ? strandedIn(dir, new Set(run.built.suggestions.map((row) => row.id)))
      : 0;
  if (stranded)
    log(
      `Warning: ${stranded} rows of the ${SONG_ARTIFACT_FILES.songs} kept in ${here(dir)} rest on identity rows ` +
        'the new artists.json does not have.',
    );
  if (args.dryRun) {
    log('(--dry-run: nothing written)');
    return;
  }
  if (args.limit) {
    log(
      '--limit scores part of the queue; the artifacts must cover all of it. Nothing written.',
    );
    return;
  }
  const refuse = (why: string) => {
    log(`Nothing written: ${why}`);
    process.exitCode = 1;
  };
  if (!artistsReady)
    return refuse(
      'the artist fetch has not finished, and artifacts from an unfinished cache would be committed ' +
        'and calibrated as if whole (the songs rest on it too). --partial writes them anyway (with --out, to look).',
    );
  if (args.only === 'songs' && !songsReady)
    return refuse(
      'the song fetch has not finished. Run `fetch --only songs` again; --partial writes them anyway (with --out, to look).',
    );
  if (stranded)
    return refuse(
      `the song half is left out, and ${stranded} of the song rows kept from the last emit would rest on ` +
        'identity rows the new artists.json no longer has. Finish `fetch --only songs` and emit both halves ' +
        '(or emit --partial to write the song half as it stands).',
    );
  // Only the song half: the manifest describes artists.json as scored now,
  // so the file on disk must be exactly that.
  if (!artistsToo) {
    const onDisk = previous?.files.find(
      (f) => f.file === ARTIFACT_FILES.artists,
    )?.sha256;
    const fresh = artist.manifest.files.find(
      (f) => f.file === ARTIFACT_FILES.artists,
    )?.sha256;
    if (onDisk !== fresh)
      return refuse(
        `${ARTIFACT_FILES.artists} in ${here(dir)} is not what the artist half scores now. ` +
          'Run emit (both halves) or emit --only artists first.',
      );
  }
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    writeFileAtomic(join(dir, name), text);
  }
  log(`Wrote ${here(dir)}/{${Object.keys(files).join(',')}}`);
}

async function runCalibrate(args: ImportArgs) {
  const run = await scoreRun(args);
  const labelsAt = args.out
    ? join(args.out, 'artists-100.json')
    : CALIBRATION_FILE;
  const labelled = existsSync(labelsAt)
    ? readJson<CalibrationFile>(labelsAt)
    : null;
  // Once the owner has written in the sheet it is his work: measured, never
  // drawn again. Until then every run draws it afresh.
  const olderRule =
    labelled && sampleRuleOf(labelled) < SAMPLE_RULE
      ? sampleRuleOf(labelled)
      : null;

  if (calibrationStep(labelled) === 'draw') {
    const file = calibrationFile(run.scored);
    log(
      `Calibration sample: ${file.sample.size} artists, ${file.sample.withSongs} with library songs ` +
        `(${file.sample.oneWord} one-word names)\n` +
        STRATA.map((s) => {
          const { sampled, withSongs, population } = file.sample.strata[s];
          return `  ${s.padEnd(14)} ${String(sampled).padStart(3)} drawn of ${withSongs} with songs (${population} in the scoring)`;
        }).join('\n'),
    );
    const missing = whatIsMissing(run);
    if (missing)
      log(
        `Warning: ${missing}. A sample drawn now is drawn from tiers the finished fetch will change.`,
      );
    if (args.dryRun || args.limit) {
      log(`(${args.dryRun ? '--dry-run' : '--limit'}: nothing written)`);
      return;
    }
    if (missing && !args.partial) {
      log(
        'Nothing written: the sample is drawn once and labelled by hand, so it waits for the finished fetch. ' +
          '--partial draws it anyway (with --out, to look).',
      );
      process.exitCode = 1;
      return;
    }
    const path = args.out
      ? join(args.out, 'artists-100.json')
      : CALIBRATION_FILE;
    mkdirSync(dirname(path), { recursive: true });
    writeFileAtomic(path, `${JSON.stringify(file, null, 2)}\n`);
    log(
      `Wrote ${here(path)}` +
        (olderRule
          ? ` (in place of an unlabelled sheet drawn by sample rule ${olderRule})`
          : '') +
        ': fill in each "label" (see the top of importSuggestions.ts), then run calibrate again.',
    );
    return;
  }

  if (olderRule)
    log(
      `${here(labelsAt)} was drawn by sample rule ${olderRule} (the rule is ${SAMPLE_RULE} now: only artists ` +
        'with library songs). It has been written in, so it is kept and measured as it is.',
    );
  const current = new Map(
    run.scored.map((s) => [s.evidence.slug, currentPickOf(s)]),
  );
  const result = measurePrecision(labelled!, current);
  const ratio = (n: number | null) =>
    n === null ? '–' : `${Math.round(n * 1000) / 10}%`;
  log(
    [
      `Labelled ${result.labelled} of ${labelled!.artists.length} (${result.unlabelled} left).`,
      `Sure picks in the sample: ${result.sure} — ${result.sureCorrect} correct, ${result.sureWrong} wrong, ` +
        `${result.sureOpen} not judged (unlabelled, or the pick changed since it was labelled).`,
      ...STRATA.map((s) => {
        const r = result.strata[s];
        return `  ${s.padEnd(14)} ${r.correct} correct, ${r.wrong} wrong, ${r.open} open — ${ratio(r.precision)} (${r.population} in the scoring)`;
      }),
      `Sure-tier precision: ${ratio(result.precision)} weighted by stratum (${ratio(result.plainPrecision)} plain); ` +
        `the bar is ${PRECISION_BAR * 100}%, with every sure pick judged.`,
      `Likely picks: ${result.likely.correct} correct, ${result.likely.wrong} wrong.`,
      ...result.wrong.map(
        (w) => `  wrong: ${w.slug} (${w.tier}) → ${w.pick ?? 'no pick'}`,
      ),
    ].join('\n'),
  );
  if (!result.passes) {
    log(
      `Not calibrated (the manifest keeps calibrated: false):\n${result.blocking.map((b) => `  - ${b}`).join('\n')}`,
    );
    return;
  }
  const dir = args.out ?? SUGGESTIONS_DIR;
  const manifest = readManifest(dir);
  const fresh = artifactsOf(run, await localInputs(), dir).manifest;
  const rows = (m: SuggestionsManifest | null) =>
    m?.files.find((f) => f.file === ARTIFACT_FILES.artists)?.sha256;
  if (!manifest || rows(manifest) !== rows(fresh)) {
    log(
      'The committed suggestions/artists.json is not what this scoring emits; run emit, then calibrate again.',
    );
    return;
  }
  const updated: SuggestionsManifest = {
    ...manifest,
    calibrated: true,
    measuredPrecision: Math.round(result.precision! * 10_000) / 10_000,
    calibration: {
      file: relative(ENRICHMENT_DIR, CALIBRATION_FILE),
      labelled: result.labelled,
      sureLabelled: result.sureCorrect + result.sureWrong,
      sureCorrect: result.sureCorrect,
      strata: Object.fromEntries(
        STRATA.map((s) => [
          s,
          {
            population: result.strata[s].population,
            correct: result.strata[s].correct,
            wrong: result.strata[s].wrong,
          },
        ]),
      ),
      measuredAt: new Date().toISOString(),
    },
  };
  if (args.dryRun) {
    log(
      '(--dry-run: the manifest would be marked calibrated; nothing written)',
    );
    return;
  }
  writeFileAtomic(
    join(dir, ARTIFACT_FILES.manifest),
    `${JSON.stringify(updated, null, 2)}\n`,
  );
  log(
    `Calibrated: ${here(join(dir, ARTIFACT_FILES.manifest))} now says measuredPrecision ${updated.measuredPrecision}.`,
  );
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    log(USAGE);
    return;
  }
  let args: ImportArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  switch (args.stage) {
    case 'cache':
      if (args.only || args.limit)
        log(
          '(--only and --limit do not apply to the cache stage; it reads everything, offline)',
        );
      await runCache(args);
      break;
    case 'fetch':
      await runFetch(args);
      break;
    case 'score':
      await runScore(args);
      break;
    case 'emit':
      await runEmit(args);
      break;
    case 'calibrate':
      if (args.only === 'songs') {
        log(
          'Calibration measures the artist identities the song rows rest on; the song rows have no sample of their own yet.',
        );
        break;
      }
      await runCalibrate(args);
      break;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
