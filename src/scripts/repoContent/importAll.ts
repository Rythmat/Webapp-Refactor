import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSuggestion } from '@/content/suggestions/apply';
import {
  decisionsBySuggestion,
  suggestionStatus,
} from '@/content/suggestions/status';
import type { Suggestion } from '@/content/suggestions/types';
import {
  createContentMockServer,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import {
  decisionsFileText,
  type DecisionResult,
} from '@/features/admin/content/mock/decisions';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import {
  acquireRunLock,
  type RunLock,
} from '@/scripts/enrichment/import/runLock';
import { type GitRunner, readGitStatus, runGit } from './gitStatus';
import {
  addedSourceMentions,
  bump,
  groupOf,
  IMPORT_GROUPS,
  type ImportGroup,
  judge,
  KNOWN_WRONG,
  type KnownWrong,
  knownWrongFor,
  namesakesOf,
  overwrittenPaths,
  parseGroups,
  type SkipReason,
  STUDENT_VISIBLE,
  studentVisibleChanges,
  tallyKey,
  type Verdict,
} from './importRules';
import {
  DECISIONS_PATH,
  IMPORT_LOCK_FILE,
  loadRepoStore,
  loadRepoSuggestions,
  repoContentRoot,
  writeRepoFiles,
} from './repoStore';
import { ARTIST_LOCATIONS_FILE } from './sources/artistLocations';
import { REGISTRY_FILE } from './sources/artists';
import {
  type FilePlan,
  type ItemChange,
  itemKey,
  sha256,
} from './sources/common';
import { SONG_EVENTS_FILE } from './sources/events';
import { CITIES_FILE } from './sources/places';
import { BUNDLED_SONGS_FILE, SONGS_DIR } from './sources/songs';

/**
 * The bulk import (design E, "everything now"): every sure and likely
 * suggestion, from the importer's artifacts and the app's Stage-1
 * planners, written into the repo's data files as plain data.
 *
 *   npx tsx src/scripts/repoContent/importAll.ts --dry-run
 *   npx tsx src/scripts/repoContent/importAll.ts --dry-run --only artists
 *   npx tsx src/scripts/repoContent/importAll.ts --dry-run --hold-student-visible
 *
 * Run from the repo root. `REPO_CONTENT_ROOT` points it at a copy of the
 * repo instead. A dry run does all of the work in memory, plans every file
 * and reads the plan back, and writes nothing but its report; without
 * `--dry-run` it writes the files, and `decisions.json` beside the
 * importer's artifacts. The owner reads the dry run's report before any
 * real run.
 *
 * How it goes:
 *  1. Take the run lock (`_cache/repo-import.lock`): one import at a time.
 *  2. Load the repo store (`repoStore.ts`), the importer's artifacts, the
 *     committed decisions and the app's planners, and host the content
 *     mock over them in repo mode, in-process, with no HTTP.
 *  3. Group by group (artists, songs, events, progressions: `--only`
 *     picks some), in waves: judge every suggestion on offer
 *     (`importRules.ts` `judge`) against the store as it is now, and hand
 *     the rows of the group whose turn it is that go to the
 *     server's `importDecisions`, which is `decide` with the import's
 *     policy: an admin's accept per row, `method: 'import'`, the records a
 *     row needs made first, one save per item, values written bare (no
 *     `unverified`, no source, no external id). A row resting on another
 *     waits for the wave after it goes in: an identity's rows go first,
 *     the Label rows after the Album rows that make their releases. The
 *     app's planners plan again from the store as each wave leaves it. A
 *     row is offered once: whatever becomes of it (imported, refused) is
 *     final. A group ends when a wave has nothing left to offer, and the
 *     next begins from the store as it left it.
 *  4. Plan the files the saves touched and read the plan back
 *     (`RepoStore.plan`, `verify`). Then the gate checks four things:
 *      - no value the store held is written over;
 *      - no protected file changes (the globe's roster, cities, song events
 *        and song pins, and `bundled.ts`);
 *      - nothing a student reads changes beyond what `STUDENT_VISIBLE`
 *        allows;
 *      - no file comes to name an outside catalogue (`sourceMentions`).
 *  5. Ask git which of the files it would write are not committed as they
 *     are (`git`): a real run that fails part way is undone with `git
 *     checkout` and `git clean`, which only works for files git holds. A
 *     real run refuses while any is listed, unless `--allow-uncommitted`.
 *  6. Without `--dry-run`, and only when the gate passes and git holds the
 *     files: check every file is still as it was loaded (`checkBases`),
 *     then write the data files and `decisions.json` together
 *     (`writeRepoFiles`: every text staged first, then each renamed into
 *     place), and check what landed. A repo-mode dev server writes nothing
 *     while the run lock is held (`REPO_BUSY`).
 *  7. Write the report, `src/scripts/enrichment/_repo-import-report.json`
 *     (gitignored), with every row's verdict.
 *
 * Idempotent: only open suggestions go, and a value in the files reads as
 * applied, so a second run writes nothing and logs nothing.
 *
 * What it writes names no outside catalogue: values and records go in bare
 * (`withoutProvenance`), revision notes carry suggestion ids only, and
 * `decisions.json` keeps the bare values. The trail to the sources is the
 * suggestion ids, which lead back to the importer's artifacts, and this
 * report; both are developer files under `src/scripts/`, never shown on
 * the site.
 */

/** Who the import decides as: `by` on every decision it logs. */
export const IMPORT_VIEWER: MockViewer = {
  role: 'admin',
  userId: 'repo-import',
  name: 'Bulk import',
};

/** The report, gitignored by `**\/_*.json`. */
export const REPORT_FILE = 'src/scripts/enrichment/_repo-import-report.json';
/**
 * Held by a running import (the `_cache` folder is gitignored). The repo
 * content server reads it too, and writes nothing while it is held.
 */
export const LOCK_FILE = IMPORT_LOCK_FILE;

/**
 * Files the import never writes, whatever its rules say: the globe's
 * roster, its cities and song events, the song pins, and the song
 * registrations that decide what students see. The gate refuses a plan
 * that touches one.
 */
export const PROTECTED_FILES: readonly string[] = [
  ARTIST_LOCATIONS_FILE,
  CITIES_FILE,
  REGISTRY_FILE,
  SONG_EVENTS_FILE,
  BUNDLED_SONGS_FILE,
];

/**
 * Waves a group may take before the run gives up: a chain of rows resting
 * on rows is two or three long.
 */
const MAX_WAVES = 12;

type Body = Record<string, unknown>;

export interface ImportOptions {
  /** Plan and report, and write no data file. */
  dryRun: boolean;
  /** The groups to import; null for all. */
  only?: ReadonlySet<ImportGroup> | null;
  /** Leave the student-visible fields (song credits and years) out. */
  holdStudentVisible?: boolean;
  /** The repo, or a copy of it; `repoContentRoot()` by default. */
  root?: string;
  /**
   * Where the report goes, relative to the root or absolute; `REPORT_FILE`
   * by default, and null for none.
   */
  report?: string | null;
  /** Leave the app's planners out (tests that offer rows of their own). */
  planners?: boolean;
  /**
   * Write even though git does not hold some of the files as they are
   * (untracked, or changed since the last commit), so a run that fails
   * part way cannot be undone from git. Off by default.
   */
  allowUncommitted?: boolean;
  /** How git is run (`runGit` by default); false for no git at all. */
  git?: GitRunner | false;
  /** `KNOWN_WRONG` by default. */
  knownWrong?: readonly KnownWrong[];
  now?: () => Date;
  /** Progress lines; none by default. */
  log?: (line: string) => void;
}

/* ── The report ────────────────────────────────────────────────────── */

/** What became of one row. */
export type RowOutcome =
  | { outcome: 'imported'; wave: number }
  | {
      outcome: 'skipped';
      reason: SkipReason;
      detail: string;
      wave: number;
      current?: unknown;
      rows?: string[];
    }
  | {
      outcome: 'refused';
      code: string;
      error: string;
      wave: number;
      current?: unknown;
    }
  /** Still waiting on the row it rests on when the waves ran out. */
  | { outcome: 'waiting'; on: string; wave: number };

/** One row in the report: what it offered, from whom, and its outcome. */
export type ReportRow = RowOutcome & {
  target: string;
  path: string;
  tier: string;
  providers: string;
  display: string;
  /**
   * For a row still waiting when the waves ran out: no longer offered by
   * then (the app's planners moved on).
   */
  withdrawn?: boolean;
};

export interface WaveReport {
  wave: number;
  /** The group whose turn it was; `other` for the rows about a kind in none. */
  group: ImportGroup | 'other';
  offered: number;
  saved: number;
  refused: number;
  recordsMade: number;
}

/** A song and what the import gives it that students see. */
export interface StudentSong {
  song: string;
  title: string;
  artist: string;
}

export interface ImportReport {
  generatedAt: string;
  dryRun: boolean;
  root: string;
  only: ImportGroup[] | null;
  holdStudentVisible: boolean;
  /** Whether it wrote the data files (never on a dry run, nor past a failed gate). */
  wrote: boolean;
  catalog: {
    /** Every row offered over the run (the app's are planned again each wave). */
    total: number;
    /** By the providers offering each row, joined with `+`. */
    byProviders: Record<string, number>;
    batches: string[];
    /** What the artifacts held that is not served, and why. */
    notServed: string[];
  };
  waves: WaveReport[];
  imported: {
    rows: number;
    /** `kind path tier` → rows. */
    byField: Record<string, number>;
    /** `providers` → rows. */
    byProviders: Record<string, number>;
  };
  skipped: {
    rows: number;
    byReason: Record<string, number>;
    /** Reason → `kind path tier` → rows. */
    byReasonField: Record<string, Record<string, number>>;
  };
  refused: {
    rows: number;
    byCode: Record<string, number>;
    list: {
      id: string;
      target: string;
      path: string;
      code: string;
      error: string;
    }[];
  };
  /** Fields where the top two sources tie, so nothing is written. */
  sourcesDisagree: {
    fields: number;
    rows: number;
    list: {
      target: string;
      path: string;
      offers: {
        value: unknown;
        tier: string;
        confidence: number;
        providers: string;
      }[];
    }[];
  };
  lost: {
    rows: number;
    list: { target: string; path: string; value: unknown; beatenBy: unknown }[];
  };
  conflicts: {
    rows: number;
    list: { target: string; path: string; value: unknown; current: unknown }[];
  };
  /** Each `KNOWN_WRONG` entry, and how many rows it held back. */
  knownWrongEntries: { name: string; why: string; rows: number }[];
  /** The rows `KNOWN_WRONG` held back. */
  knownWrong: { id: string; target: string; path: string; detail: string }[];
  recordsMade: {
    total: number;
    byKind: Record<string, number>;
    list: { kind: string; slug: string; name: string }[];
  };
  itemsChanged: { total: number; byKind: Record<string, number> };
  studentVisible: {
    credits: {
      songs: number;
      credits: number;
      list: (StudentSong & {
        /**
         * Each credit added, as the song page shows it: the name, and the
         * instrument in place of the role when there is one. The artist it
         * links to is shown only in the console.
         */
        credits: {
          name: string;
          role: string;
          instrument?: string;
          artistGlobeId?: string;
        }[];
      })[];
    };
    years: {
      songs: number;
      list: (StudentSong & { year: unknown; providers: string })[];
    };
  };
  files: {
    path: string;
    items: number;
    bytesBefore: number | null;
    bytesAfter: number | null;
  }[];
  decisions: { before: number; after: number; added: number; path: string };
  /**
   * What git says of the files the run would write over: whether it
   * answered, and those it does not hold as they are (untracked, or
   * changed since the last commit). A real run refuses while any is
   * listed, unless asked not to (`allowUncommitted`), because git could
   * not undo a run that failed part way.
   */
  git: {
    answered: boolean;
    error: string | null;
    uncommitted: { path: string; code: string }[];
  };
  /** The dry-run gate. `ok` false stops a real run before it writes. */
  gate: {
    ok: boolean;
    protectedFiles: string[];
    overwrites: { item: string; paths: string[] }[];
    studentVisible: { item: string; problems: string[] }[];
    /**
     * Files the plan would make name an outside catalogue, with how many
     * mentions each would gain and the first few (`sourceMentions`).
     */
    sourceMentions: { path: string; added: number; examples: string[] }[];
    problems: string[];
  };
  /** Every row offered, by id. */
  rows: Record<string, ReportRow>;
}

/* ── The run ───────────────────────────────────────────────────────── */

const providersOf = (suggestion: Pick<Suggestion, 'sources'>) =>
  [...new Set(suggestion.sources.map((source) => source.provider))]
    .sort()
    .join('+');

const targetOf = (suggestion: Pick<Suggestion, 'target'>) =>
  `${suggestion.target.kind}:${suggestion.target.slug}`;

const textOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const absolute = (root: string, path: string) =>
  isAbsolute(path) ? path : join(root, path);

/** Runs the import. Throws before writing anything when it cannot finish. */
export async function runImport(options: ImportOptions): Promise<ImportReport> {
  const root = options.root ?? repoContentRoot();
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const only = options.only ?? null;
  const hold = options.holdStudentVisible === true;

  // A mistyped REPO_CONTENT_ROOT would otherwise be made, lock and all.
  if (!existsSync(join(root, SONGS_DIR)))
    throw new Error(
      `${root} is not a copy of the repo: it has no ${SONGS_DIR}`,
    );
  let lock: RunLock;
  try {
    lock = acquireRunLock(join(root, LOCK_FILE), { now });
  } catch (error) {
    // The lock's own words are about the importer's fetch; the holder's
    // process and start are what is worth keeping.
    const holder = /\(process \d+, since [^)]+\)/.exec(
      (error as Error).message,
    );
    throw new Error(
      `another bulk import is running on this copy of the repo ${holder?.[0] ?? ''} and holds ${LOCK_FILE}: wait for it to finish, or stop it first`,
    );
  }
  try {
    log(`Loading the repo store from ${root}`);
    const store = await loadRepoStore({ root });
    const sources = await loadRepoSuggestions(store.reader, {
      planners: options.planners !== false,
    });
    if (sources.committed?.error || sources.committed?.refused.length)
      throw new Error(
        `${DECISIONS_PATH} has rows that cannot be read (${
          sources.committed.error ?? sources.committed.refused.join(', ')
        }); the import would drop them when it writes the log, so fix the file first`,
      );

    const touched = new Set<string>();
    const server = createContentMockServer({
      seed: store.seed(),
      mode: 'repo',
      now,
      suggestions: sources,
      onTouched: (item) => touched.add(itemKey(item.kind, item.slug)),
    });

    // Each item's body as the run found it, and as it is now.
    const start = new Map<string, Body>();
    const savedAt = new Map<string, Date>();
    for (const item of store.items()) {
      start.set(itemKey(item.kind, item.slug), item.body);
      savedAt.set(itemKey(item.kind, item.slug), item.updatedAt);
    }
    const live = new Map(start);
    const refresh = () => {
      for (const item of server.snapshot().items) {
        const key = itemKey(item.kind, item.slug);
        if (item.deleted || !item.body) live.delete(key);
        else live.set(key, item.body);
        savedAt.set(key, item.updatedAt);
      }
    };
    const bodyOf = (kind: string, slug: string) =>
      live.get(itemKey(kind as MockKind, slug));

    const rows = new Map<string, ReportRow>();
    /**
     * Each row as it was when its outcome was reached: the app's planners
     * offer a row again each wave, and may offer it at another tier once
     * the records it needed exist.
     */
    const decidedAs = new Map<string, Suggestion>();
    /** Rows a save refused: not offered again, and final. */
    const refusedIds = new Set<string>();
    const describe = (suggestion: Suggestion) => ({
      target: targetOf(suggestion),
      path: suggestion.path,
      tier: suggestion.tier,
      providers: providersOf(suggestion),
      display: suggestion.display,
    });
    /** A row's first outcome that is not waiting stays; waiting is updated. */
    const record = (suggestion: Suggestion, outcome: RowOutcome) => {
      const had = rows.get(suggestion.id);
      if (had && had.outcome !== 'waiting') return;
      rows.set(suggestion.id, { ...describe(suggestion), ...outcome });
      decidedAs.set(suggestion.id, suggestion);
    };
    const final = (id: string) => {
      const had = rows.get(id);
      return !!had && had.outcome !== 'waiting';
    };

    const waves: WaveReport[] = [];
    let offered: readonly Suggestion[] = [];
    let wave = 0;
    /**
     * One group's waves: judge what is on offer, hand the rows that go to
     * `importDecisions`, and again, until a wave has nothing to offer.
     * Rows outside the group are passed over here and met in their own.
     */
    const runGroup = (group: ImportGroup | null) => {
      const inScope = (kind: string) => groupOf(kind) === group;
      for (let turn = 1; turn <= MAX_WAVES; turn += 1) {
        offered = server.suggestions();
        const decided = decisionsBySuggestion(server.decisionsFile().decisions);
        const verdicts = judge({
          suggestions: offered,
          live: bodyOf,
          start: (kind, slug) => start.get(itemKey(kind as MockKind, slug)),
          status: (suggestion) =>
            suggestionStatus(
              suggestion,
              bodyOf(suggestion.target.kind, suggestion.target.slug),
              decided,
              {
                savedAt: savedAt.get(
                  itemKey(
                    suggestion.target.kind as MockKind,
                    suggestion.target.slug,
                  ),
                ),
              },
            ),
          current: (suggestion) =>
            checkSuggestion(
              bodyOf(suggestion.target.kind, suggestion.target.slug) ?? {},
              suggestion,
            ).current,
          inScope,
          holdStudentVisible: hold,
          knownWrong: options.knownWrong ?? KNOWN_WRONG,
          refused: refusedIds,
          namesakes: namesakesOf(
            [...live].flatMap(([key, body]) => {
              const at = key.indexOf(':');
              const kind = key.slice(0, at);
              return kind === 'artist'
                ? [{ kind, slug: key.slice(at + 1), body }]
                : [];
            }),
          ),
        });

        const going: Suggestion[] = [];
        const verdictsHere: [Suggestion, Verdict][] = [];
        for (const suggestion of offered) {
          if (final(suggestion.id)) continue;
          const verdict: Verdict = verdicts.get(suggestion.id)!;
          if (verdict.state === 'take') going.push(suggestion);
          else verdictsHere.push([suggestion, verdict]);
        }
        // A pass with nothing to offer is the check after the last wave,
        // and its verdicts are dated to that wave.
        if (going.length) wave += 1;
        for (const [suggestion, verdict] of verdictsHere) {
          if (verdict.state === 'wait')
            record(suggestion, { outcome: 'waiting', on: verdict.on, wave });
          else if (
            verdict.state === 'skip' &&
            verdict.reason !== 'out-of-scope'
          )
            record(suggestion, {
              outcome: 'skipped',
              reason: verdict.reason,
              detail: verdict.detail,
              wave,
              ...(verdict.current !== undefined
                ? { current: verdict.current }
                : {}),
              ...(verdict.rows ? { rows: verdict.rows } : {}),
            });
        }
        if (!going.length) return;

        const madeBefore = [...touched].filter((key) => !start.has(key)).length;
        const results: DecisionResult[] = server.importDecisions(
          going.map((suggestion) => ({
            suggestionId: suggestion.id,
            op: 'accept',
            method: 'import',
          })),
          IMPORT_VIEWER,
        );
        let saved = 0;
        let refused = 0;
        results.forEach((result, index) => {
          const suggestion = going[index];
          if (result.outcome === 'refused') {
            refused += 1;
            refusedIds.add(suggestion.id);
            record(suggestion, {
              outcome: 'refused',
              code: result.code,
              error: result.error,
              wave,
              ...(result.current !== undefined
                ? { current: result.current }
                : {}),
            });
          } else if (result.outcome === 'already') {
            record(suggestion, {
              outcome: 'skipped',
              reason: 'already',
              detail: 'another row in the same save wrote it first',
              wave,
            });
          } else {
            saved += 1;
            record(suggestion, { outcome: 'imported', wave });
          }
        });
        refresh();
        const recordsMade =
          [...touched].filter((key) => !start.has(key)).length - madeBefore;
        waves.push({
          wave,
          group: group ?? 'other',
          offered: going.length,
          saved,
          refused,
          recordsMade,
        });
        log(
          `Wave ${wave} (${group ?? 'other'}): ${going.length} rows offered, ${saved} imported, ${refused} refused, ${recordsMade} records made`,
        );
        // No stop on a wave that saved nothing: the next one settles the
        // rows resting on what it refused, and then has nothing to offer.
      }
      throw new Error(
        `the ${group ?? 'other'} rows were still going after ${MAX_WAVES} waves; nothing was written`,
      );
    };
    // The groups in order, each to its end (importRules.ts `IMPORT_GROUPS`),
    // then, when every group is asked for, the rows about a kind in none.
    for (const group of IMPORT_GROUPS)
      if (!only || only.has(group)) runGroup(group);
    if (!only) runGroup(null);

    // What is left unjudged was out of every group asked for.
    for (const suggestion of offered)
      if (!rows.has(suggestion.id))
        record(suggestion, {
          outcome: 'skipped',
          reason: 'out-of-scope',
          detail: `about a ${suggestion.target.kind}, outside the groups asked for`,
          wave,
        });
    const stillOffered = new Set(offered.map((suggestion) => suggestion.id));
    for (const [id, row] of rows)
      if (row.outcome === 'waiting' && !stillOffered.has(id))
        rows.set(id, { ...row, withdrawn: true });

    // The files the saves touched, planned and read back.
    const stored = server.snapshot().items;
    const changes: ItemChange[] = stored.map((item) => ({
      kind: item.kind,
      slug: item.slug,
      body: item.deleted ? null : item.body,
    }));
    log(`Planning ${changes.length} changed items`);
    const plans = await store.plan(changes);
    await store.verify(changes, plans);

    const decisionsBefore = await store.reader.read(DECISIONS_PATH);
    const decisionsText = decisionsFileText(server.decisionsFile());
    const decisionsPlan: FilePlan | null =
      decisionsText === decisionsBefore?.text
        ? null
        : {
            path: DECISIONS_PATH,
            before: decisionsBefore?.text ?? null,
            baseSha256: decisionsBefore?.sha256 ?? null,
            text: decisionsText,
            items: [],
          };

    const report = buildReport({
      root,
      options: { dryRun: options.dryRun, only, hold },
      stored,
      start,
      rows,
      decidedAs,
      waves,
      plans,
      decisionsPlan,
      knownWrongList: options.knownWrong ?? KNOWN_WRONG,
      decisionsBefore: sources.committed?.decisions.length ?? 0,
      decisionsAfter: server.decisionsFile().decisions.length,
      notServed: [...(sources.refused ?? [])],
      batches: (sources.batches ?? []).map((batch) => batch.batch),
      now,
    });

    // The way back from a real run that fails part way is git, so ask it
    // which of the files it would write over it does not hold as they are.
    const writes = decisionsPlan ? [...plans, decisionsPlan] : plans;
    report.git = await gitHolds(root, writes, options.git);

    // The gate stops a real run before it writes, and so do files git could
    // not restore; the report still goes out: it says why.
    const stopped = options.dryRun
      ? null
      : !report.gate.ok
        ? new Error(
            `the gate refused the plan, so no data file was written: ${report.gate.problems.join('; ')}`,
          )
        : report.git.uncommitted.length && !options.allowUncommitted
          ? new Error(
              `git does not hold ${report.git.uncommitted.length} of the files this run would write over as they are (${report.git.uncommitted
                .slice(0, 5)
                .map((file) => file.path)
                .join(', ')}${
                report.git.uncommitted.length > 5 ? ', …' : ''
              }), so a run that failed part way could not be undone from git: commit them first, or pass --allow-uncommitted. No data file was written`,
            )
          : null;
    if (!options.dryRun && !stopped) {
      if (writes.length) {
        // Right before anything is written: every file, decisions.json
        // included, is still the one its plan was worked out from.
        await store.checkBases(writes);
        log(`Writing ${writes.length} files`);
        await writeRepoFiles(
          root,
          writes.map(({ path, text }) => ({ path, text })),
        );
        for (const planned of writes) {
          const landed = await store.reader.read(planned.path);
          if (
            (landed?.sha256 ?? null) !==
            (planned.text === null ? null : sha256(planned.text))
          )
            throw new Error(
              `${planned.path} does not hold what was written; restore the data files from git (git checkout, and git clean for the files it made) and run again`,
            );
        }
        if (decisionsPlan) server.markDecisionsCommitted();
      }
      report.wrote = writes.length > 0;
    }

    if (options.report !== null) {
      const path = absolute(root, options.report ?? REPORT_FILE);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(report, null, 1)}\n`);
      log(`Report: ${path}`);
    }
    if (stopped) throw stopped;
    return report;
  } finally {
    lock.release();
  }
}

/* ── Building the report ───────────────────────────────────────────── */

interface ReportInput {
  root: string;
  options: {
    dryRun: boolean;
    only: ReadonlySet<ImportGroup> | null;
    hold: boolean;
  };
  stored: readonly {
    kind: MockKind;
    slug: string;
    body: Body | null;
    deleted: boolean;
  }[];
  start: ReadonlyMap<string, Body>;
  rows: ReadonlyMap<string, ReportRow>;
  /** Each row as it was when its outcome was reached. */
  decidedAs: ReadonlyMap<string, Suggestion>;
  waves: WaveReport[];
  plans: readonly FilePlan[];
  decisionsPlan: FilePlan | null;
  knownWrongList: readonly KnownWrong[];
  decisionsBefore: number;
  decisionsAfter: number;
  notServed: string[];
  batches: string[];
  now: () => Date;
}

function buildReport(input: ReportInput): ImportReport {
  const { rows, decidedAs: seen, start } = input;
  const catalogByProviders: Record<string, number> = {};
  for (const suggestion of seen.values())
    bump(catalogByProviders, providersOf(suggestion));

  const importedByField: Record<string, number> = {};
  const importedByProviders: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const byReasonField: Record<string, Record<string, number>> = {};
  const byCode: Record<string, number> = {};
  const refusedList: ImportReport['refused']['list'] = [];
  const lostList: ImportReport['lost']['list'] = [];
  const conflictList: ImportReport['conflicts']['list'] = [];
  const knownWrong: ImportReport['knownWrong'] = [];
  const disagree = new Map<string, Suggestion[]>();
  let imported = 0;
  let skipped = 0;
  let refused = 0;

  for (const [id, row] of rows) {
    const suggestion = seen.get(id)!;
    const field = tallyKey(suggestion);
    if (row.outcome === 'imported') {
      imported += 1;
      bump(importedByField, field);
      bump(importedByProviders, row.providers);
    } else if (row.outcome === 'skipped') {
      skipped += 1;
      bump(byReason, row.reason);
      bump((byReasonField[row.reason] ??= {}), field);
      if (row.reason === 'sources-disagree') {
        const key = `${row.target}\u0000${row.path}`;
        disagree.set(key, [...(disagree.get(key) ?? []), suggestion]);
      } else if (row.reason === 'lost') {
        const winner = row.rows?.[0] ? seen.get(row.rows[0]) : undefined;
        lostList.push({
          target: row.target,
          path: row.path,
          value: suggestion.value,
          beatenBy: winner?.value,
        });
      } else if (row.reason === 'conflict') {
        conflictList.push({
          target: row.target,
          path: row.path,
          value: suggestion.value,
          current: row.current,
        });
      } else if (row.reason === 'known-wrong') {
        knownWrong.push({
          id,
          target: row.target,
          path: row.path,
          detail: row.detail,
        });
      }
    } else if (row.outcome === 'refused') {
      refused += 1;
      bump(byCode, row.code);
      refusedList.push({
        id,
        target: row.target,
        path: row.path,
        code: row.code,
        error: row.error,
      });
    } else {
      skipped += 1;
      bump(byReason, 'waiting');
    }
  }

  // What was made, and what changed, from the saves themselves.
  const recordsMade: ImportReport['recordsMade'] = {
    total: 0,
    byKind: {},
    list: [],
  };
  const itemsChanged: ImportReport['itemsChanged'] = { total: 0, byKind: {} };
  const gate: ImportReport['gate'] = {
    ok: true,
    protectedFiles: input.plans
      .map((planned) => planned.path)
      .filter((path) => PROTECTED_FILES.includes(path)),
    overwrites: [],
    studentVisible: [],
    sourceMentions: [],
    problems: [],
  };
  const credits: ImportReport['studentVisible']['credits'] = {
    songs: 0,
    credits: 0,
    list: [],
  };
  const years: ImportReport['studentVisible']['years'] = {
    songs: 0,
    list: [],
  };
  const importedYear = new Map<string, Suggestion>();
  for (const [id, row] of rows)
    if (row.outcome === 'imported' && row.path === 'year')
      importedYear.set(row.target, seen.get(id)!);

  for (const item of input.stored) {
    const key = itemKey(item.kind, item.slug);
    const before = start.get(key);
    const after = item.deleted ? null : item.body;
    const problems = studentVisibleChanges(item.kind, before, after, {
      hold: input.options.hold,
    });
    if (problems.length) gate.studentVisible.push({ item: key, problems });
    if (!before) {
      recordsMade.total += 1;
      bump(recordsMade.byKind, item.kind);
      recordsMade.list.push({
        kind: item.kind,
        slug: item.slug,
        name: textOf(after?.name) || textOf(after?.title),
      });
      continue;
    }
    const overwritten = overwrittenPaths(before, after);
    if (overwritten.length)
      gate.overwrites.push({ item: key, paths: overwritten });
    if (!after) continue;
    itemsChanged.total += 1;
    bump(itemsChanged.byKind, item.kind);
    if (item.kind !== 'song') continue;
    const song: StudentSong = {
      song: item.slug,
      title: textOf(after.title),
      artist: textOf(after.artist),
    };
    const had = Array.isArray(before.credits) ? before.credits.length : 0;
    const now = Array.isArray(after.credits) ? after.credits : [];
    if (now.length > had) {
      const added = now.slice(had).map((credit) => {
        const entry = (credit ?? {}) as Body;
        return {
          name: textOf(entry.name),
          role: textOf(entry.role),
          ...(textOf(entry.instrument)
            ? { instrument: textOf(entry.instrument) }
            : {}),
          ...(textOf(entry.artistGlobeId)
            ? { artistGlobeId: textOf(entry.artistGlobeId) }
            : {}),
        };
      });
      credits.songs += 1;
      credits.credits += added.length;
      credits.list.push({ ...song, credits: added });
    }
    if (before.year === undefined && after.year !== undefined) {
      const row = importedYear.get(key);
      years.songs += 1;
      years.list.push({
        ...song,
        year: after.year,
        providers: row ? providersOf(row) : '',
      });
    }
  }
  if (gate.protectedFiles.length)
    gate.problems.push(
      `the plan touches files the import never writes: ${gate.protectedFiles.join(', ')}`,
    );
  if (gate.overwrites.length)
    gate.problems.push(
      `${gate.overwrites.length} items would have a stated value written over`,
    );
  if (gate.studentVisible.length)
    gate.problems.push(
      `${gate.studentVisible.length} items would change what students read beyond the rules`,
    );
  // decisions.json is checked too: the console's mock reads it.
  for (const planned of [
    ...input.plans,
    ...(input.decisionsPlan ? [input.decisionsPlan] : []),
  ]) {
    const added = addedSourceMentions(planned.before, planned.text);
    if (added.length)
      gate.sourceMentions.push({
        path: planned.path,
        added: added.length,
        examples: added.slice(0, 5),
      });
  }
  if (gate.sourceMentions.length)
    gate.problems.push(
      `${gate.sourceMentions.length} files would name an outside catalogue: ${gate.sourceMentions
        .map((file) => file.path)
        .join(', ')}`,
    );
  gate.ok = gate.problems.length === 0;

  const sizeOf = (text: string | null) =>
    text === null ? null : Buffer.byteLength(text);
  const files = [
    ...input.plans,
    ...(input.decisionsPlan ? [input.decisionsPlan] : []),
  ].map((planned) => ({
    path: planned.path,
    items: planned.items.length,
    bytesBefore: sizeOf(planned.before),
    bytesAfter: sizeOf(planned.text),
  }));

  const disagreeList = [...disagree.values()].map((list) => ({
    target: targetOf(list[0]),
    path: list[0].path,
    offers: list.map((suggestion) => ({
      value: suggestion.value,
      tier: suggestion.tier,
      confidence: suggestion.confidence,
      providers: providersOf(suggestion),
    })),
  }));

  // Every row that was offered, in a stable order.
  const ordered: Record<string, ReportRow> = {};
  for (const id of [...rows.keys()].sort()) ordered[id] = rows.get(id)!;

  return {
    generatedAt: input.now().toISOString(),
    dryRun: input.options.dryRun,
    root: input.root,
    only: input.options.only
      ? IMPORT_GROUPS.filter((group) => input.options.only!.has(group))
      : null,
    holdStudentVisible: input.options.hold,
    wrote: false,
    catalog: {
      total: seen.size,
      byProviders: catalogByProviders,
      batches: input.batches,
      notServed: input.notServed,
    },
    waves: input.waves,
    imported: {
      rows: imported,
      byField: importedByField,
      byProviders: importedByProviders,
    },
    skipped: { rows: skipped, byReason, byReasonField },
    refused: { rows: refused, byCode, list: refusedList },
    sourcesDisagree: {
      fields: disagreeList.length,
      rows: disagreeList.reduce((sum, entry) => sum + entry.offers.length, 0),
      list: disagreeList,
    },
    lost: { rows: lostList.length, list: lostList },
    conflicts: { rows: conflictList.length, list: conflictList },
    knownWrongEntries: input.knownWrongList.map((entry) => ({
      name: entry.name,
      why: entry.why,
      rows: knownWrong.filter(
        ({ id }) =>
          knownWrongFor(seen.get(id)!, input.knownWrongList) === entry,
      ).length,
    })),
    knownWrong,
    recordsMade,
    itemsChanged,
    studentVisible: { credits, years },
    files,
    decisions: {
      before: input.decisionsBefore,
      after: input.decisionsAfter,
      added: input.decisionsAfter - input.decisionsBefore,
      path: DECISIONS_PATH,
    },
    gate,
    // Filled in by the run once the plan is known (`gitHolds`).
    git: { answered: false, error: null, uncommitted: [] },
    rows: ordered,
  };
}

/**
 * Which of `plans` git does not hold as they are: a file that exists and
 * is untracked or changed since the last commit. A file the run would make
 * is left out, since `git clean` takes it away again. When git does not
 * answer (a copy that is no repository), it says so and lists nothing.
 */
export async function gitHolds(
  root: string,
  plans: readonly Pick<FilePlan, 'path' | 'baseSha256'>[],
  run: GitRunner | false = runGit,
): Promise<ImportReport['git']> {
  const existing = plans
    .filter((planned) => planned.baseSha256 !== null)
    .map((planned) => planned.path);
  if (run === false || !existing.length) {
    return {
      answered: run !== false,
      error: run === false ? 'git is off' : null,
      uncommitted: [],
    };
  }
  const read = await readGitStatus(root, existing, run);
  const planned = new Set(existing);
  return {
    answered: read.git,
    error: read.error,
    uncommitted: read.files
      .filter((file) => planned.has(file.path))
      .map(({ path, code }) => ({ path, code })),
  };
}

/* ── The command line ──────────────────────────────────────────────── */

export const USAGE = `Usage (from the repo root):
  npx tsx src/scripts/repoContent/importAll.ts [--dry-run] [--only GROUPS] [--hold-student-visible] [--allow-uncommitted] [--report PATH]

  --dry-run               do everything in memory and write only the report
  --only GROUPS           ${IMPORT_GROUPS.join(', ')}, comma-separated (all when left out)
  --hold-student-visible  leave out what students read: ${STUDENT_VISIBLE.map((field) => field.name).join(' and ')}
  --allow-uncommitted     write even over files git does not hold as they are
                          (a failed run could not then be undone from git)
  --report PATH           where the report goes (default ${REPORT_FILE})

REPO_CONTENT_ROOT=<dir> runs it on a copy of the repo instead. Stop a
repo-mode dev server (VITE_CONTENT_REPO=1) before a real run: it writes
nothing while the run holds its lock, and reloads once the files land.`;

export interface CliArgs {
  dryRun: boolean;
  only: Set<ImportGroup> | null;
  holdStudentVisible: boolean;
  allowUncommitted: boolean;
  report: string | null;
  help: boolean;
}

/** Reads the command line; throws with a message to print above the usage. */
export function parseCliArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    only: null,
    holdStudentVisible: false,
    allowUncommitted: false,
    report: null,
    help: false,
  };
  const tokens = argv.flatMap((token) =>
    /^--[a-z-]+=/.test(token) ? token.split(/=(.*)/s, 2) : [token],
  );
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = () => {
      const value = tokens[(index += 1)];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`${token} needs a value`);
      return value;
    };
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--hold-student-visible') args.holdStudentVisible = true;
    else if (token === '--allow-uncommitted') args.allowUncommitted = true;
    else if (token === '--only') args.only = parseGroups(next());
    else if (token === '--report') args.report = next();
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument ${token}`);
  }
  return args;
}

/** One line per count, for the terminal. */
export function summaryLines(report: ImportReport): string[] {
  return [
    `${report.dryRun ? 'Dry run' : 'Import'} over ${report.root}${
      report.only ? ` (only ${report.only.join(', ')})` : ''
    }${report.holdStudentVisible ? ', student-visible fields held back' : ''}`,
    `Offered: ${report.catalog.total} rows`,
    `Imported: ${report.imported.rows} rows into ${report.itemsChanged.total} items; ${report.recordsMade.total} records made (${Object.entries(
      report.recordsMade.byKind,
    )
      .map(([kind, count]) => `${count} ${kind}`)
      .join(', ')})`,
    `Skipped: ${report.skipped.rows} (${Object.entries(report.skipped.byReason)
      .map(([reason, count]) => `${reason} ${count}`)
      .join(', ')})`,
    `Refused: ${report.refused.rows}${
      report.refused.rows
        ? ` (${Object.entries(report.refused.byCode)
            .map(([code, count]) => `${code} ${count}`)
            .join(', ')})`
        : ''
    }`,
    `Sources disagree on ${report.sourcesDisagree.fields} fields (${report.sourcesDisagree.rows} rows); ${report.conflicts.rows} conflicts with stated values; ${report.lost.rows} rows lost to a better one`,
    `Students would see: credits on ${report.studentVisible.credits.songs} songs (${report.studentVisible.credits.credits} credits), a year on ${report.studentVisible.years.songs} songs`,
    `Files: ${report.files.length} (${report.files.filter((file) => file.bytesBefore === null).length} new)`,
    `Decisions logged: ${report.decisions.added}`,
    !report.git.answered
      ? `Git: did not answer (${report.git.error ?? 'no repository'}), so a failed run could not be undone from git`
      : report.git.uncommitted.length
        ? `Git: ${report.git.uncommitted.length} of the files it would write over are not committed as they are; commit them first (a real run refuses, unless --allow-uncommitted)`
        : 'Git: holds every file it would write over, so a failed run can be undone with git checkout and git clean',
    report.gate.ok
      ? 'Gate: passed (nothing stated written over, no protected file, nothing students read beyond the rules, no outside catalogue named)'
      : `Gate: FAILED: ${report.gate.problems.join('; ')}`,
    report.wrote
      ? 'Files written.'
      : report.dryRun
        ? 'Dry run: nothing written but the report.'
        : 'Nothing to write.',
  ];
}

async function main(argv: readonly string[]): Promise<void> {
  let args: CliArgs;
  try {
    args = parseCliArgs(argv);
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const report = await runImport({
    dryRun: args.dryRun,
    only: args.only,
    holdStudentVisible: args.holdStudentVisible,
    allowUncommitted: args.allowUncommitted,
    ...(args.report ? { report: resolve(args.report) } : {}),
    log: (line) => console.log(line),
  });
  for (const line of summaryLines(report)) console.log(line);
  if (!report.gate.ok) process.exitCode = 1;
}

/** Run as a script (`npx tsx …/importAll.ts`), not when a test imports it. */
const isMain =
  !!process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain)
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
