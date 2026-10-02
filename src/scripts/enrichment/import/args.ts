/**
 * The importer's command line: a stage, then flags.
 *
 *   cache | fetch | score | emit | calibrate
 *   --only artists|songs   which half (both when left out, for score and emit)
 *   --limit N              the first N of the queue — for smoke tests
 *   --max-requests N       fetch: stop after N requests (a smoke test's ceiling)
 *   --dry-run              count what would be requested or written; do neither
 *   --out DIR              score, emit and calibrate write here instead (to look first)
 *   --partial              emit or draw the calibration sample from a cache the fetch
 *                          has not finished (for a look; never to commit)
 */

export const STAGES = ['cache', 'fetch', 'score', 'emit', 'calibrate'] as const;
export type Stage = (typeof STAGES)[number];

export const SCOPES = ['artists', 'songs'] as const;
export type Scope = (typeof SCOPES)[number];

export interface ImportArgs {
  stage: Stage;
  only: Scope | null;
  limit: number | null;
  dryRun: boolean;
  /** score, emit, calibrate: another folder to write into, to look before committing. */
  out: string | null;
  /** emit, calibrate: write even though the cache is missing answers. */
  partial: boolean;
  /** fetch: stop once this many requests have gone out (retries not counted). */
  maxRequests: number | null;
}

export const USAGE = `Usage (from the repo root):
  npx tsx src/scripts/enrichment/importSuggestions.ts <stage> [flags]

Stages:
  cache     offline: read _mb_cache.json for song-billed artist ids and album candidates
  fetch     MusicBrainz + Wikidata into the per-URL cache (resumable; rerun to continue);
            --only songs fetches the library songs' recordings, works, albums, labels
            and studios (the artist half must be fetched first: songs rest on it)
  score     offline: identity and field scoring over the cache; prints counts
  emit      offline: score, then write suggestions/{artists,places,manifest}.json and
            the song half's {songs,matches,releases,labels,studios,artists-created,
            record-places}.json (--only picks one half; the other keeps its files)
  calibrate offline: write calibration/artists-100.json for the owner to label,
            or, once labelled, measure sure-tier precision (>= 98% marks the
            manifest calibrated)

Flags:
  --only artists|songs   which half to run
  --limit N              only the first N of the queue
  --max-requests N       fetch: stop after N requests (a smoke test's ceiling)
  --dry-run              report what would be requested or written; write nothing
  --out DIR              score, emit, calibrate: write into DIR instead (to look before committing)
  --partial              emit, calibrate: write even though the fetch has not finished
                         (answers missing from the cache); for a look, never to commit`;

const isStage = (value: string): value is Stage =>
  (STAGES as readonly string[]).includes(value);
const isScope = (value: string): value is Scope =>
  (SCOPES as readonly string[]).includes(value);

/** Throws with a message fit to print above the usage. */
export function parseArgs(argv: readonly string[]): ImportArgs {
  const args: ImportArgs = {
    stage: 'cache',
    only: null,
    limit: null,
    dryRun: false,
    out: null,
    partial: false,
    maxRequests: null,
  };
  let stage: string | null = null;
  // `--flag value` and `--flag=value` both work.
  const tokens = argv.flatMap((token) =>
    /^--[a-z-]+=/.test(token) ? token.split(/=(.*)/s, 2) : [token],
  );
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const value = () => {
      const next = tokens[++i];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`${token} needs a value`);
      }
      return next;
    };
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--partial') args.partial = true;
    else if (token === '--only') {
      const scope = value();
      if (!isScope(scope))
        throw new Error(`--only takes artists or songs, not "${scope}"`);
      args.only = scope;
    } else if (token === '--limit') {
      const raw = value();
      const limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error(`--limit takes a whole number above 0, not "${raw}"`);
      }
      args.limit = limit;
    } else if (token === '--max-requests') {
      const raw = value();
      const max = Number(raw);
      if (!Number.isInteger(max) || max < 1) {
        throw new Error(
          `--max-requests takes a whole number above 0, not "${raw}"`,
        );
      }
      args.maxRequests = max;
    } else if (token === '--out') args.out = value();
    else if (token.startsWith('--')) throw new Error(`unknown flag ${token}`);
    else if (stage)
      throw new Error(`one stage at a time (got "${stage}" and "${token}")`);
    else stage = token;
  }
  if (!stage) throw new Error('which stage?');
  if (!isStage(stage)) throw new Error(`unknown stage "${stage}"`);
  args.stage = stage;
  return args;
}
