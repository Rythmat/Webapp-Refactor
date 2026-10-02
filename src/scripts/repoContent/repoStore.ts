import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { placeHome } from '@/content/records/compose';
import type {
  ContentMockServer,
  MockRequest,
  MockResponse,
  MockSeed,
  MockSuggestionSources,
  StoredItem,
} from '@/features/admin/content/mock/contentMockServer';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import type { MockVocabularySources } from '@/features/admin/content/mock/vocabulary';
import { isProcessRunning } from '@/scripts/enrichment/import/runLock';
import {
  type GitFileStatus,
  type GitRunner,
  type GitStatusRead,
  readGitStatus,
} from './gitStatus';
import { addedSourceMentions, CATALOGUE_MENTION } from './importRules';
import {
  firstDifference,
  formatPath,
  type Json,
  jsonEqual,
  toJson,
} from './literal';
import { REGISTRY_FILE } from './sources/artists';
import {
  byCodeUnit,
  type FilePlan,
  fsReader,
  type ItemChange,
  itemKey,
  jsonBody,
  oneChangePerItem,
  overlayReader,
  type PlanContext,
  type PlanOptions,
  type RepoFile,
  type RepoItem,
  type RepoItemStatus,
  type RepoReader,
  RepoContentError,
  type RepoSource,
  sha256,
} from './sources/common';
import { REPO_SOURCES, SOURCE_OF_KIND } from './sources/index';
import { CITIES_FILE, PLACES_FILE } from './sources/places';
import {
  PROGRESSION_ID_MARK_FILE,
  readProgressionIdMark,
} from './sources/progressions';
import { repoVocabularySources } from './sources/vocabulary';

/**
 * The repo store, loaded (design A.4, "Load"): every content kind repo mode
 * serves, read from the repo's own data files into the items the content
 * mock is seeded with.
 *
 * Each adapter in `sources/` reads its kind's files; this puts them
 * together. An item is the mock's seed item (`kind`, `slug`, `body`, and
 * `derivedFrom` on a song's own globe event, as `mock/seed.ts` makes them)
 * plus its status (a song is a draft until `bundled.ts` registers it), its
 * file, that file's sha256 and its mtime as `updatedAt`. The store keeps
 * the text and hash of every file it read, which is the file index the
 * flush compares against before it writes (step 2).
 *
 * `RepoStore` loads and plans. `plan` asks the adapters for the new text
 * of each file a set of changes touches and returns it, writing nothing;
 * `verify` reads those texts back as the store would after a write,
 * through a reader that holds them in memory, and checks that every item
 * comes out as intended and no other item moved. `LiveRepoStore`, at the
 * end of this file, holds the content server over a `RepoStore` and does
 * the rest of design A.4: the serial queue, the flush (check, write,
 * rename), the decisions log, and the reload from disk. The HTTP layer
 * around it is `repoHttp.ts`.
 *
 * Node only, with nothing from Vite: the dev server loads it through
 * `ssrLoadModule` and the bulk import runs it under `npx tsx`. It never
 * imports a data module; the song files are read as text, so the broken
 * `_generated_index.ts` is neither imported nor read.
 */

/** The repository root: three levels up from this file. */
export const REPO_ROOT = resolve(
  fileURLToPath(new URL('../../../', import.meta.url)),
);

/**
 * The root the store reads: `REPO_CONTENT_ROOT` (a process variable, not a
 * `VITE_` one) when set, pointing it at a scratch copy for tests and
 * browser checks, and the repository otherwise.
 */
export const repoContentRoot = (
  env: Readonly<Record<string, string | undefined>> = process.env,
): string =>
  env.REPO_CONTENT_ROOT ? resolve(env.REPO_CONTENT_ROOT) : REPO_ROOT;

export interface RepoStoreOptions {
  /** The directory repo paths are relative to; `repoContentRoot()` by default. */
  root?: string;
  /** Reads the files; `fsReader(root)` by default. */
  reader?: RepoReader;
}

/** The store as loaded from one reading of the files. */
export class RepoStore {
  private constructor(
    /** What the files were read through. */
    readonly reader: RepoReader,
    private readonly byKey: ReadonlyMap<string, RepoItem>,
    private readonly fileMap: ReadonlyMap<string, RepoFile>,
    /** Files an adapter reads that do not exist yet (a JSON file nobody has saved to). */
    readonly missing: readonly string[],
    /** What a person should know that did not stop the load. */
    readonly warnings: readonly string[],
    readonly loadedAt: Date,
  ) {}

  /** Reads every kind's files. Throws `REPO_LOAD_FAILED` naming a file that is not data. */
  static async load(options: RepoStoreOptions = {}): Promise<RepoStore> {
    const reader =
      options.reader ?? fsReader(options.root ?? repoContentRoot());
    const loaded = await Promise.all(
      REPO_SOURCES.map((source) => source.load(reader)),
    );
    const byKey = new Map<string, RepoItem>();
    const files = new Map<string, RepoFile>();
    const missing: string[] = [];
    const warnings: string[] = [];
    for (const part of loaded) {
      for (const item of part.items) {
        const key = itemKey(item.kind, item.slug);
        if (byKey.has(key)) {
          throw new RepoContentError(
            'REPO_LOAD_FAILED',
            500,
            `${item.kind} '${item.slug}' is in ${byKey.get(key)!.file} and in ${item.file}`,
            item.file,
          );
        }
        byKey.set(key, item);
      }
      for (const file of part.files) files.set(file.path, file);
      missing.push(...part.missing);
      warnings.push(...part.warnings);
    }
    // A song's own globe event, as the seed marks it.
    for (const item of byKey.values()) {
      if (item.kind !== 'globe_event' || !item.slug.startsWith('song-')) {
        continue;
      }
      const song = item.slug.slice('song-'.length);
      if (byKey.has(itemKey('song', song))) {
        item.derivedFrom = { kind: 'song', slug: song };
      }
    }
    return new RepoStore(reader, byKey, files, missing, warnings, new Date());
  }

  get root(): string {
    return this.reader.root;
  }

  /**
   * This store as read through `reader`. The flush uses it once the planned
   * files are on disk: `verify` has already read them back through an
   * overlay, so the store it returned is the disk's, and only its reader
   * has to move from the overlay to the disk (or, in a dry run, to the
   * overlay that stands in for it).
   */
  rebased(reader: RepoReader): RepoStore {
    return new RepoStore(
      reader,
      this.byKey,
      this.fileMap,
      this.missing,
      this.warnings,
      this.loadedAt,
    );
  }

  /** Every item, or every item of one kind, in load order. */
  items(kind?: MockKind): RepoItem[] {
    const all = [...this.byKey.values()];
    return kind ? all.filter((item) => item.kind === kind) : all;
  }

  item(kind: MockKind, slug: string): RepoItem | undefined {
    return this.byKey.get(itemKey(kind, slug));
  }

  /** The items as the content mock's seed. */
  seed(): MockSeed & { items: RepoItem[] } {
    return { items: this.items() };
  }

  /** A file as loaded, or null when it did not exist. */
  file(path: string): RepoFile | null {
    return this.fileMap.get(path) ?? null;
  }

  /** Every file read, and every file expected but missing (null), by path: the sha256 the flush checks. */
  fileIndex(): Map<string, string | null> {
    const index = new Map<string, string | null>();
    for (const [path, file] of this.fileMap) index.set(path, file.sha256);
    for (const path of this.missing) index.set(path, null);
    return index;
  }

  /** What the adapters see of the store while they plan. */
  private context(): PlanContext {
    return {
      file: (path) => this.file(path),
      item: (kind, slug) => this.item(kind, slug),
      items: (kind) => this.items(kind),
    };
  }

  /**
   * The file writes that make `changes`: one plan per file, with its new
   * text (or null to delete it) and the hash it was worked out from.
   * Nothing is written. Every body is first taken as JSON as it stands
   * (`jsonBody`: a NaN or a Date is `REPO_BAD_CHANGE`), and the adapters
   * are handed that. Throws the adapters' refusals: `REPO_READ_ONLY`,
   * `REPO_BAD_CHANGE`, `REPO_UNWRITABLE`.
   */
  async plan(
    changes: readonly ItemChange[],
    options: PlanOptions = {},
  ): Promise<FilePlan[]> {
    oneChangePerItem(changes);
    const bySource = new Map<RepoSource, ItemChange[]>();
    for (const change of changes) {
      const source = SOURCE_OF_KIND[change.kind];
      if (!source) {
        throw new RepoContentError(
          'REPO_BAD_CHANGE',
          422,
          `${change.kind} is not served in repo mode; switch repo mode off to edit it through the API`,
        );
      }
      // A read-only kind refuses every change as it is (403), body or not.
      const checked = source.readOnly
        ? change
        : { ...change, body: jsonBody(change) };
      bySource.set(source, [...(bySource.get(source) ?? []), checked]);
    }
    const context = this.context();
    const plans: FilePlan[] = [];
    // One at a time: prettier is async, and the order keeps plans stable.
    for (const source of REPO_SOURCES) {
      const mine = bySource.get(source);
      if (mine) plans.push(...(await source.plan(mine, context, options)));
    }
    const paths = new Set<string>();
    for (const planned of plans) {
      if (paths.has(planned.path)) {
        throw new Error(`${planned.path} was planned twice (internal error)`);
      }
      paths.add(planned.path);
    }
    return plans;
  }

  /**
   * Reads `plans` back as the store would after writing them, with the
   * planned texts held in memory, and checks the result against `changes`:
   * each changed item has its new body (and a song its status, an artist
   * its place on the roster, a place the file its pin chooses), each
   * removed item is gone, and every other item is exactly as it was.
   * Returns the store as it would load after the write; throws
   * `REPO_UNWRITABLE` listing what came out different, or saying why the
   * files would not load at all.
   */
  async verify(
    changes: readonly ItemChange[],
    plans: readonly FilePlan[],
  ): Promise<RepoStore> {
    const overlay = overlayReader(
      this.reader,
      new Map(plans.map((planned) => [planned.path, planned.text])),
    );
    let after: RepoStore;
    try {
      after = await RepoStore.load({ reader: overlay });
    } catch (error) {
      throw new RepoContentError(
        'REPO_UNWRITABLE',
        422,
        `the planned files would not load; nothing was written: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    /** What an item should read back as; `file` for places, `roster` for artists. */
    interface Expected {
      body: Json;
      status: RepoItemStatus;
      file?: string;
      roster?: boolean;
    }
    const where = (kind: MockKind, file: string, onRoster: boolean) =>
      kind === 'globe_city'
        ? { file }
        : kind === 'artist'
          ? { roster: onRoster }
          : {};
    const expected = new Map<string, Expected>();
    for (const item of this.byKey.values()) {
      expected.set(itemKey(item.kind, item.slug), {
        body: toJson(item.body),
        status: item.status,
        ...where(item.kind, item.file, item.file === REGISTRY_FILE),
      });
    }
    for (const change of changes) {
      const key = itemKey(change.kind, change.slug);
      if (change.body === null) {
        expected.delete(key);
        continue;
      }
      const existing = this.item(change.kind, change.slug);
      expected.set(key, {
        body: jsonBody(change) as Json,
        status:
          change.kind === 'song'
            ? (change.status ?? existing?.status ?? 'draft')
            : 'published',
        ...where(
          change.kind,
          placeHome(change.body as { pin?: boolean }) === 'cities'
            ? CITIES_FILE
            : PLACES_FILE,
          change.roster ?? existing?.file === REGISTRY_FILE,
        ),
      });
    }

    const problems: string[] = [];
    for (const [key, want] of expected) {
      const [kind, ...rest] = key.split(':');
      const got = after.item(kind as MockKind, rest.join(':'));
      if (!got) {
        problems.push(`${key} is missing`);
        continue;
      }
      const differs = firstDifference(toJson(got.body), want.body);
      if (differs !== null) {
        problems.push(`${key} differs at ${formatPath(differs)}`);
      }
      if (got.status !== want.status) {
        problems.push(`${key} is ${got.status}, not ${want.status}`);
      }
      if (want.file !== undefined && got.file !== want.file) {
        problems.push(`${key} is in ${got.file}, not ${want.file}`);
      }
      if (
        want.roster !== undefined &&
        (got.file === REGISTRY_FILE) !== want.roster
      ) {
        problems.push(
          `${key} is ${want.roster ? 'not ' : ''}on the roster, and should ${want.roster ? '' : 'not '}be`,
        );
      }
    }
    for (const item of after.items()) {
      if (!expected.has(itemKey(item.kind, item.slug))) {
        problems.push(`${itemKey(item.kind, item.slug)} appeared`);
      }
    }
    if (problems.length) {
      throw new RepoContentError(
        'REPO_UNWRITABLE',
        422,
        `the planned files do not read back as intended; nothing was written: ${problems
          .slice(0, 10)
          .join(
            '; ',
          )}${problems.length > 10 ? ` (and ${problems.length - 10} more)` : ''}`,
      );
    }
    return after;
  }

  /**
   * Design A.4's flush step 2 as a check of its own: reads each planned
   * file again and requires it to be the file the plan was worked out from,
   * with the same sha256, or, for a plan whose base is null, still no file
   * at all. A file made where the store saw none is as much a conflict as
   * an edited one: the plan's `before: null` would misstate it, and the
   * write would replace it unseen. Throws 409 `REPO_FILE_CHANGED` naming
   * each file that moved; the flush (a later phase) calls this right before
   * it writes and reloads on that answer. Reads only.
   */
  async checkBases(
    plans: readonly Pick<FilePlan, 'path' | 'baseSha256'>[],
  ): Promise<void> {
    const moved: { path: string; how: string }[] = [];
    for (const planned of plans) {
      const now = await this.reader.read(planned.path);
      if ((now?.sha256 ?? null) === planned.baseSha256) continue;
      const how =
        planned.baseSha256 === null
          ? 'made'
          : now === null
            ? 'deleted'
            : 'edited';
      moved.push({ path: planned.path, how });
    }
    if (moved.length) {
      throw new RepoContentError(
        'REPO_FILE_CHANGED',
        409,
        `files changed on disk since the store loaded them; nothing was written: ${moved
          .map(({ path, how }) => `${path} (${how} since the load)`)
          .join(', ')}`,
        moved[0].path,
      );
    }
  }

  /**
   * `checkBases` over every file the store read or found missing: throws
   * 409 `REPO_FILE_CHANGED` when any of them moved on disk since the load.
   * A flush asks this when `verify` fails, because `verify` reads every
   * file the plan leaves alone from disk: an edit made outside to one of
   * those reads back as a difference in an item the save never touched,
   * which is a file that changed, not a change the files cannot take.
   */
  async checkUnchanged(): Promise<void> {
    await this.checkBases(
      [...this.fileIndex()].map(([path, baseSha256]) => ({ path, baseSha256 })),
    );
  }
}

/** Loads the store: `RepoStore.load`. */
export const loadRepoStore = (options?: RepoStoreOptions): Promise<RepoStore> =>
  RepoStore.load(options);

/* ── Suggestions ───────────────────────────────────────────────────── */

/** The importer's committed artifacts and the owner's decisions. */
export const SUGGESTIONS_DIR = 'src/scripts/enrichment/suggestions';

/**
 * What the repo server serves as suggestions (design A.4, "Load"): the
 * importer's artifacts in `src/scripts/enrichment/suggestions/*.json`, read
 * with the mock's own `readSuggestionArtifacts`; the committed
 * `decisions.json`, with `parseDecisionsFile`; and the app's Stage-1
 * planners from `src/content/linking`. The same as `mock/seed.ts`'s
 * `loadSuggestionSeed` gives the in-browser mock, read from the file system
 * rather than through `import.meta.glob`.
 *
 * The modules are imported when this is called, so loading the store's
 * items does not pay for them. `planners: false` leaves the planners out.
 */
export async function loadRepoSuggestions(
  reader: RepoReader,
  options: { planners?: boolean } = {},
): Promise<MockSuggestionSources> {
  return (await loadSuggestionParts(reader, options)).sources;
}

/** The committed decisions log, beside the importer's artifacts. */
export const DECISIONS_PATH = `${SUGGESTIONS_DIR}/decisions.json`;

/**
 * The bulk import's run lock (`importAll.ts`, under the gitignored
 * `_cache`): a file naming the process that holds it. The import checks
 * every file's base and then renames some 600 files into place; a save the
 * console made in between would land and then be written over. So the
 * live store writes nothing while a running import holds it.
 */
export const IMPORT_LOCK_FILE =
  'src/scripts/enrichment/_cache/repo-import.lock';

/** The suggestions as read, with what a reload needs to tell whether they moved. */
interface SuggestionParts {
  sources: MockSuggestionSources;
  /** Each artifact's sha256, by repo path; `decisions.json` is not one. */
  artifacts: Map<string, string>;
  /** `decisions.json`'s sha256 as read; null when there is none. */
  decisionsSha: string | null;
}

const sameShas = (
  a: ReadonlyMap<string, string>,
  b: ReadonlyMap<string, string>,
): boolean =>
  a.size === b.size && [...a].every(([path, sha]) => b.get(path) === sha);

/**
 * `loadRepoSuggestions`, keeping the hashes it read: a reload hands the
 * last parts back as `previous`, and when no artifact moved their parsed
 * rows are reused (they run to megabytes), and so are the app's planners,
 * which hold nothing of the store. `decisions.json` is always read again.
 */
async function loadSuggestionParts(
  reader: RepoReader,
  options: { planners?: boolean; previous?: SuggestionParts | null } = {},
): Promise<SuggestionParts> {
  const names = (await reader.list(SUGGESTIONS_DIR)).filter((name) =>
    name.endsWith('.json'),
  );
  // Keyed as `import.meta.glob` keys them, which the reader expects.
  const texts: Record<string, string> = {};
  const artifacts = new Map<string, string>();
  let decisionsFile: RepoFile | null = null;
  for (const name of names) {
    const path = `${SUGGESTIONS_DIR}/${name}`;
    const file = await reader.read(path);
    if (!file) continue;
    if (path === DECISIONS_PATH) {
      decisionsFile = file;
      continue;
    }
    texts[`/${path}`] = file.text;
    artifacts.set(path, file.sha256);
  }
  const [{ readSuggestionArtifacts, appPlannerFrom }, decisions] =
    await Promise.all([
      import('@/features/admin/content/mock/suggestions'),
      import('@/features/admin/content/mock/decisions'),
    ]);
  const previous = options.previous ?? null;
  const reuse = previous !== null && sameShas(previous.artifacts, artifacts);
  const read = reuse
    ? {
        suggestions: previous.sources.imported ?? [],
        batches: previous.sources.batches ?? [],
        refused: previous.sources.refused ?? [],
      }
    : readSuggestionArtifacts(texts);
  const app =
    previous !== null
      ? (previous.sources.app ?? null)
      : options.planners === false
        ? null
        : appPlannerFrom(await import('@/content/linking'));
  return {
    sources: {
      imported: read.suggestions,
      batches: read.batches,
      refused: read.refused,
      ...(decisionsFile
        ? { committed: decisions.parseDecisionsFile(decisionsFile.text) }
        : {}),
      app,
    },
    artifacts,
    decisionsSha: decisionsFile?.sha256 ?? null,
  };
}

/* ── Events and places that code names ─────────────────────────────── */

/**
 * The code that names globe events by id (design B, "Deletes"): the globe's
 * connections between events, its historical modules and guided tours, and
 * the classroom's annual curriculum. None of it is content the store holds,
 * so the content server's reference check (409 `REFERENCED`) cannot see it.
 */
export const EVENT_CODE_FILES: readonly string[] = [
  'src/components/atlas/data/eventConnections.ts',
  'src/components/atlas/data/historicalModules.ts',
  'src/components/atlas/data/guidedTours.ts',
  'src/features/classroom/annual/curriculumTemplate.ts',
];

/**
 * The code that names globe cities by id: the guided tours' stops and city
 * tours (`cityId: 'memphis'`, `cityTour('memphis', …)`), and the globe
 * dashboard's featured cities. Both look the id up in `CITIES` and quietly
 * drop what they do not find, so a city taken off the globe would leave a
 * tour with no stops and nothing would say so.
 */
export const CITY_CODE_FILES: readonly string[] = [
  'src/components/atlas/data/guidedTours.ts',
  'src/components/ClassroomLayout/globe/data/featured.ts',
];

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Which of `files` name each of `ids` as a whole string literal (`'id'`,
 * `"id"` or a template), by id; an id no file names is left out. A file
 * that is not there names nothing: a scratch copy may hold only the data
 * files, and a test holds the repo's lists to files that exist.
 */
export async function codeReferences(
  reader: RepoReader,
  files: readonly string[],
  ids: readonly string[],
): Promise<Map<string, string[]>> {
  const named = new Map<string, string[]>();
  if (!ids.length) return named;
  for (const path of files) {
    const file = await reader.read(path);
    if (!file) continue;
    for (const id of ids) {
      if (new RegExp(`(['"\`])${escapeRegExp(id)}\\1`).test(file.text)) {
        named.set(id, [...(named.get(id) ?? []), path]);
      }
    }
  }
  return named;
}

/** `codeReferences` over `EVENT_CODE_FILES`. */
export const eventCodeReferences = (
  reader: RepoReader,
  ids: readonly string[],
): Promise<Map<string, string[]>> =>
  codeReferences(reader, EVENT_CODE_FILES, ids);

/**
 * Refuses taking away a globe event or a globe city that code names (422
 * `REPO_BAD_CHANGE`, as for a published song, which code names too): an
 * event deleted, or a city deleted or moved off the globe (`pin: false`
 * moves it out of `CITIES` into `places.json`). Either would leave the
 * student app pointing at nothing, and no validation would say so; so
 * `force` does not apply. The code is changed first, by hand.
 */
async function refuseCodeNamedRemovals(
  reader: RepoReader,
  store: RepoStore,
  changes: readonly ItemChange[],
): Promise<void> {
  const events = changes
    .filter((change) => change.kind === 'globe_event' && change.body === null)
    .map((change) => change.slug);
  const cities = changes
    .filter(
      (change) =>
        change.kind === 'globe_city' &&
        store.item('globe_city', change.slug)?.file === CITIES_FILE &&
        (change.body === null ||
          placeHome(change.body as { pin?: boolean }) !== 'cities'),
    )
    .map((change) => change.slug);
  const refuse = (
    named: Map<string, string[]>,
    what: string,
    how: string,
  ): void => {
    if (!named.size) return;
    const [[id, files]] = named;
    throw new RepoContentError(
      'REPO_BAD_CHANGE',
      422,
      `Code uses the ${what} '${id}' (${files.join(', ')})${
        named.size > 1 ? `, and ${named.size - 1} more of these ${what}s` : ''
      }: take it out of the code first, then ${how}. Nothing was written.`,
      files[0],
    );
  };
  refuse(await eventCodeReferences(reader, events), 'event', 'delete it');
  refuse(
    await codeReferences(reader, CITY_CODE_FILES, cities),
    'city',
    'delete it or take it off the globe',
  );
}

/* ── Writing ───────────────────────────────────────────────────────── */

/**
 * Where a new text waits before it is renamed into place (design A.4,
 * flush step 5): under the root, so on the same file system and the rename
 * is atomic, and inside `node_modules`, which Vite's watcher ignores.
 */
export const REPO_WRITE_DIR = 'node_modules/.cache/repo-content';

/** One file as a flush writes it: its new text, or null to delete it. */
export interface RepoWrite {
  /** Repo-relative, with `/`. */
  path: string;
  text: string | null;
}

/**
 * What the store itself last wrote to each file, by absolute path, as a
 * sha256 (null for a file it deleted). The dev server's plugin asks it
 * whether a change Vite noticed is the store's own (design A.3, "Our own
 * writes"), and lets no such change reach the page as HMR. A file is noted
 * before it is renamed into place, so the watcher can never see it first.
 */
export class OwnWrites {
  private readonly byFile = new Map<string, string | null>();

  note(absolute: string, text: string | null): void {
    this.byFile.set(resolve(absolute), text === null ? null : sha256(text));
  }

  forget(absolute: string): void {
    this.byFile.delete(resolve(absolute));
  }

  /** Whether `text` (null: no file) is what the store last wrote at `absolute`. */
  holds(absolute: string, text: string | null): boolean {
    const key = resolve(absolute);
    if (!this.byFile.has(key)) return false;
    const wrote = this.byFile.get(key);
    return text === null ? wrote === null : wrote === sha256(text);
  }
}

/**
 * Puts `writes` on disk under `root` (design A.4, flush step 5). Every new
 * text goes to a temp file under `REPO_WRITE_DIR` first; only once all of
 * them are there does each take its place, by a rename, which on one file
 * system is atomic: a reader sees the old file or the new one, never half
 * of either. A deletion is an unlink in the same pass. A path that would
 * land outside `root` is refused before anything is written.
 *
 * If a rename fails part-way, the files renamed before it stay written and
 * the rest do not; the caller reads the store from disk again, which is
 * the rollback (the disk is the truth).
 */
export async function writeRepoFiles(
  root: string,
  writes: readonly RepoWrite[],
  own?: OwnWrites,
): Promise<void> {
  const base = resolve(root);
  const targets = writes.map((write) => {
    const absolute = resolve(base, write.path);
    if (!absolute.startsWith(base + sep)) {
      throw new RepoContentError(
        'REPO_BAD_CHANGE',
        422,
        `${write.path} is outside the repo; nothing was written`,
        write.path,
      );
    }
    return absolute;
  });
  const temp = join(base, REPO_WRITE_DIR);
  const staged: (string | null)[] = [];
  const clear = (from: number) =>
    Promise.all(
      staged
        .slice(from)
        .map((path) => (path ? rm(path, { force: true }) : undefined)),
    );
  try {
    await mkdir(temp, { recursive: true });
    for (const write of writes) {
      if (write.text === null) {
        staged.push(null);
        continue;
      }
      const path = join(temp, `${randomUUID()}-${basename(write.path)}`);
      staged.push(path);
      await writeFile(path, write.text, 'utf8');
    }
  } catch (error) {
    await clear(0);
    throw error;
  }
  for (let index = 0; index < writes.length; index++) {
    const target = targets[index];
    const from = staged[index];
    own?.note(target, writes[index].text);
    try {
      if (from === null) {
        await rm(target, { force: true });
      } else {
        await mkdir(dirname(target), { recursive: true });
        await rename(from, target);
      }
    } catch (error) {
      own?.forget(target);
      await clear(index);
      throw error;
    }
  }
}

/**
 * Refuses a save that would add an outside catalogue's name, link or id to
 * a data file the site reads (422 `REPO_BAD_CHANGE`; owner decision of 30
 * September 2026). Whatever path a value took (a person's accept, a typed
 * value, a pasted link), the files carry none. Only what a plan adds is
 * counted (`addedSourceMentions`), so a file that already names one (a code
 * comment) can still be saved. The decisions log is not checked: it lives
 * in developer tooling, where the trail is kept. The message names no
 * catalogue, since the console shows it.
 */
export function refuseCatalogueMentions(
  plans: readonly Pick<FilePlan, 'path' | 'before' | 'text'>[],
): void {
  for (const planned of plans) {
    if (
      addedSourceMentions(planned.before, planned.text, CATALOGUE_MENTION)
        .length
    )
      throw new RepoContentError(
        'REPO_BAD_CHANGE',
        422,
        `${planned.path} would gain a link or an id from an outside source; the site's data carries none, so nothing was written`,
        planned.path,
      );
  }
}

/* ── The live store ────────────────────────────────────────────────── */

type MockServerModule =
  typeof import('@/features/admin/content/mock/contentMockServer');
type DecisionsModule = typeof import('@/features/admin/content/mock/decisions');

/** Which adapter, and which kinds, each data file belongs to. */
interface RepoLayout {
  /** Every file an adapter reads (a JSON file not made yet included), with the kinds it holds. */
  files: Map<string, { source: RepoSource; kinds: MockKind[] }>;
  /**
   * Folders only one adapter reads from, such as the songs' folder: a file
   * that appears there is that adapter's even before it has been loaded.
   */
  dirs: Map<string, RepoSource>;
}

const parentDir = (path: string): string => {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
};

/**
 * The layout of the files as `store` read them. A file's kinds are those
 * of the items read from it; a file holding none (an empty JSON array)
 * belongs to its adapter's one kind, or, for an adapter of several, to the
 * kind its name starts with (`releases.json`, a release).
 */
async function layoutOf(store: RepoStore): Promise<RepoLayout> {
  const held = new Map<string, Set<MockKind>>();
  for (const item of store.items()) {
    for (const path of item.files) {
      held.set(path, (held.get(path) ?? new Set()).add(item.kind));
    }
  }
  const files: RepoLayout['files'] = new Map();
  const owners = new Map<string, Set<RepoSource>>();
  for (const source of REPO_SOURCES) {
    for (const path of await source.files(store.reader)) {
      const name = path.slice(path.lastIndexOf('/') + 1);
      const named = source.kinds.filter((kind) => name.startsWith(kind));
      const kinds = held.get(path)?.size
        ? [...held.get(path)!]
        : source.kinds.length === 1
          ? [...source.kinds]
          : named.length
            ? named
            : [...source.kinds];
      files.set(path, { source, kinds });
      const dir = parentDir(path);
      owners.set(dir, (owners.get(dir) ?? new Set()).add(source));
    }
  }
  const dirs: RepoLayout['dirs'] = new Map();
  for (const [dir, sources] of owners) {
    if (sources.size === 1) dirs.set(dir, [...sources][0]);
  }
  return { files, dirs };
}

/** The kinds a repo path holds, by the layout; none for a file that is not data. */
function kindsOfPath(layout: RepoLayout, path: string): MockKind[] {
  const known = layout.files.get(path);
  if (known) return known.kinds;
  const owner = layout.dirs.get(parentDir(path));
  return owner && /\.(ts|json)$/.test(path) && owner.kinds.length === 1
    ? [...owner.kinds]
    : [];
}

/** One changed data file, for the console's "Commit and deploy" view. */
export interface RepoStatusFile extends GitFileStatus {
  /** The content kinds it holds; none for `decisions.json`. */
  kinds: MockKind[];
}

/** What `GET /repo/status` answers: git's word on the data files. */
export interface RepoStatus {
  /** The directory the store reads (`REPO_CONTENT_ROOT` or the repo). */
  root: string;
  /** Whether git answered for it. */
  git: boolean;
  branch: string | null;
  /** The data files git has not committed, by path. */
  files: RepoStatusFile[];
  /**
   * How many of those files there are by kind, each counted once under the
   * first kind it holds: `/overview`'s `changedSincePublish`, which the
   * edit bar adds up into one count of files.
   */
  byKind: Partial<Record<MockKind, number>>;
  /** Whether `decisions.json` is among them. */
  decisions: boolean;
  /** Why git did not answer; null when it did. */
  error: string | null;
  checkedAt: string;
}

/** A roster move (`POST /repo/roster`), as done. */
export interface RosterMove {
  slug: string;
  on: boolean;
  /** False when the artist already was where it was asked to be. */
  changed: boolean;
  /** The files written. */
  files: string[];
}

export interface LiveRepoOptions {
  /** The directory repo paths are relative to; `repoContentRoot()` by default. */
  root?: string;
  /** The content server's clock, for tests. */
  now?: () => Date;
  /** Load the app's Stage-1 planners (default true). */
  planners?: boolean;
  /**
   * Plan, read back and keep every write in memory instead of on disk: the
   * bulk import's dry run. Later saves plan against what the earlier ones
   * would have written (`plannedWrites`).
   */
  dryRun?: boolean;
  /** How git is run for `/repo/status`; false for no git at all. */
  git?: GitRunner | false;
  /** Where the store says what a person should know. */
  log?: (message: string) => void;
}

/** A request that touched items and then failed: what a rebuild needs to undo it. */
interface FailedRequest {
  /** The items it touched, by `kind:slug`. */
  keys: ReadonlySet<string>;
  /** Each one's revision before the request. */
  before: ReadonlyMap<string, number>;
}

const sameBody = (a: unknown, b: unknown): boolean =>
  jsonEqual(toJson(a), toJson(b));

/**
 * The repo content server's store (design A.4): the content mock in repo
 * mode, seeded from a `RepoStore`, with every change it makes written back
 * into the repo's files before the request is answered.
 *
 *  - **One at a time.** Every request, save or read, goes through a serial
 *    queue: prettier is async, and nothing may read the server between a
 *    change and its write.
 *  - **The flush.** The server reports each item it changes (`onTouched`).
 *    Once it has answered, those items become changes; the store plans the
 *    files they touch (grouped by file, one plan per file, every text
 *    worked out before anything is written), reads the plan back
 *    (`verify`, the round-trip check), checks that each file is still the
 *    one it was planned from (`checkBases`, 409 `REPO_FILE_CHANGED`),
 *    writes each through a temp file and a rename, and notes its own
 *    writes. If the decisions log moved, `decisions.json` is written in
 *    the same pass (`decisionsFileText`) and the log marked committed.
 *  - **Code that names events.** Deleting a globe event that code names
 *    (`EVENT_CODE_FILES`) is refused before anything is planned, `force`
 *    or not: the content server cannot see that code.
 *  - **Rollback is a reload.** If any step fails, the whole store is read
 *    from disk again, the server rebuilt over it, and the failure is the
 *    answer. The disk is the truth.
 *  - **Reload.** An edit made outside (a hand edit, `git checkout`, the
 *    bulk import) is picked up by `externalChange`, which reloads when a
 *    data file no longer holds what the store read. Items that read the
 *    same keep their revision, so a console holding them is not told they
 *    moved; the rest get the next one.
 *
 * Node only, like the rest of the folder: the dev server's plugin holds one
 * through `repoHttp.ts`, and the bulk import can drive one in-process.
 */
/** The progression ids' high-water mark the store's file holds, if any. */
const markOption = (store: RepoStore): { progressionIdMark?: number } => {
  const mark = readProgressionIdMark(
    store.file(PROGRESSION_ID_MARK_FILE)?.text,
  );
  return mark === null ? {} : { progressionIdMark: mark };
};

export class LiveRepoStore {
  private storeNow!: RepoStore;
  private serverNow!: ContentMockServer;
  private layout!: RepoLayout;
  private parts: SuggestionParts | null = null;
  private decisionsSha: string | null = null;
  /** What the vocabulary's rules read besides the records, read once. */
  private vocabulary: MockVocabularySources | null = null;
  /** Why the files could not be read at the last try; null when they could. */
  private broken: Error | null = null;
  private readonly touched = new Map<string, StoredItem>();
  private readonly revisionBefore = new Map<string, number>();
  private chain: Promise<void> = Promise.resolve();
  private gitStatus: RepoStatus | null = null;
  private gitRun: Promise<RepoStatus> | null = null;
  /** What a dry run has written, in memory. */
  private readonly dryFiles = new Map<string, string | null>();
  /** What the files are read through: the disk, or the dry run's overlay on it. */
  private readonly reader: RepoReader;
  readonly own = new OwnWrites();
  readonly root: string;
  readonly dryRun: boolean;

  private constructor(
    private readonly options: LiveRepoOptions,
    private readonly modules: {
      server: MockServerModule;
      decisions: DecisionsModule;
    },
  ) {
    this.root = resolve(options.root ?? repoContentRoot());
    this.dryRun = options.dryRun === true;
    const disk = fsReader(this.root);
    this.reader = this.dryRun ? overlayReader(disk, this.dryFiles) : disk;
  }

  /** Reads the files and starts the server over them. Throws what the load throws. */
  static async open(options: LiveRepoOptions = {}): Promise<LiveRepoStore> {
    const [server, decisions] = await Promise.all([
      import('@/features/admin/content/mock/contentMockServer'),
      import('@/features/admin/content/mock/decisions'),
    ]);
    const live = new LiveRepoStore(options, { server, decisions });
    await live.rebuild(null);
    return live;
  }

  /** The files as last read or written. */
  get store(): RepoStore {
    return this.storeNow;
  }

  /** The content server over them. Change it only through `handle` or `run`. */
  get server(): ContentMockServer {
    return this.serverNow;
  }

  /** What a dry run would have written, by path (null: deleted). */
  plannedWrites(): ReadonlyMap<string, string | null> {
    return this.dryFiles;
  }

  /* ── The queue ── */

  private queue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Reads the files again first, when the last try could not. */
  private async ensureLoaded(): Promise<void> {
    if (this.broken) await this.rebuild(null);
  }

  private readonly noteTouched = (item: StoredItem) => {
    const key = itemKey(item.kind, item.slug);
    // `touch` counts the change before it says so: this is the one before.
    if (!this.touched.has(key)) this.revisionBefore.set(key, item.revision - 1);
    this.touched.set(key, item);
  };

  private readonly uncommitted = (kind: MockKind): number =>
    this.gitStatus?.byKind[kind] ?? 0;

  /**
   * One content API request (`/api/admin/content/*`, repo mode's profile),
   * answered once its changes are on disk. A failure to write is the
   * answer instead: 409 `REPO_FILE_CHANGED` when a file moved underneath,
   * 422 `REPO_UNWRITABLE` or `REPO_BAD_CHANGE` when the files cannot take
   * the change, 500 `REPO_WRITE_FAILED` when the disk refused; the store is
   * read from disk again either way.
   */
  handle(request: MockRequest): Promise<MockResponse> {
    return this.queue(async () => {
      try {
        await this.ensureLoaded();
      } catch (error) {
        return failureResponse(error);
      }
      // `/overview` counts what git has not committed from the last answer
      // git gave; a save just before it has asked again, so wait for that.
      if (request.path === '/overview' && this.gitRun) await this.gitRun;
      const response = await this.step(() => this.serverNow.handle(request));
      try {
        await this.flush();
      } catch (error) {
        return failureResponse(error);
      }
      return response;
    });
  }

  /**
   * `task` against the server, in the queue, with whatever it changes
   * written before this resolves: the bulk import's way in
   * (`server.importDecisions`). A failed write rejects, after the store has
   * been read from disk again.
   */
  run<T>(task: (server: ContentMockServer) => T): Promise<T> {
    return this.queue(async () => {
      await this.ensureLoaded();
      const result = await this.step(() => task(this.serverNow));
      await this.flush();
      return result;
    });
  }

  /**
   * Runs `task` with the touched set cleared first. A task that throws is a
   * bug somewhere: whatever it changed before it threw is thrown away with
   * a reload, and the error goes on.
   */
  private async step<T>(task: () => T): Promise<T> {
    this.touched.clear();
    this.revisionBefore.clear();
    try {
      return task();
    } catch (error) {
      const failed = this.takeTouched();
      if (failed.keys.size) await this.rebuild(failed).catch(() => undefined);
      throw error;
    }
  }

  private takeTouched(): FailedRequest & { items: StoredItem[] } {
    const out = {
      keys: new Set(this.touched.keys()),
      before: new Map(this.revisionBefore),
      items: [...this.touched.values()],
    };
    this.touched.clear();
    this.revisionBefore.clear();
    return out;
  }

  /* ── The flush ── */

  /** The touched items as changes to the files: only what differs from them. */
  private changesFrom(items: readonly StoredItem[]): ItemChange[] {
    const changes: ItemChange[] = [];
    for (const item of items) {
      const inFiles = this.storeNow.item(item.kind, item.slug);
      if (item.deleted || item.body === null) {
        if (inFiles)
          changes.push({ kind: item.kind, slug: item.slug, body: null });
        continue;
      }
      const status: RepoItemStatus | undefined =
        item.kind === 'song'
          ? item.status === 'published'
            ? 'published'
            : 'draft'
          : undefined;
      if (
        inFiles &&
        sameBody(inFiles.body, item.body) &&
        (status === undefined || inFiles.status === status)
      ) {
        continue;
      }
      changes.push({
        kind: item.kind,
        slug: item.slug,
        body: item.body,
        ...(status ? { status } : {}),
      });
    }
    return changes;
  }

  private async flush(): Promise<void> {
    const failed = this.takeTouched();
    const changes = this.changesFrom(failed.items);
    const decisionsText =
      this.serverNow.decisionCounts().notDownloaded > 0
        ? this.modules.decisions.decisionsFileText(
            this.serverNow.decisionsFile(),
          )
        : null;
    if (!changes.length && decisionsText === null) return;
    try {
      await this.commit(changes, decisionsText);
    } catch (error) {
      await this.rebuild(failed).catch((reload: unknown) => {
        this.options.log?.(
          `[repo-content] the files could not be read again after a failed write: ${String(reload)}`,
        );
      });
      throw error;
    }
  }

  /**
   * Design A.4's flush steps 1–7 for `changes` (and `decisions.json`, when
   * `decisionsText` is given): plan, read back, check the bases, write,
   * move the store onto what was written. Returns the paths written.
   */
  private async commit(
    changes: readonly ItemChange[],
    decisionsText: string | null,
  ): Promise<string[]> {
    if (!this.dryRun) await this.refuseWhileImporting();
    if (decisionsText !== null) this.refuseDamagedDecisions();
    await refuseCodeNamedRemovals(this.reader, this.storeNow, changes);
    const plans = changes.length ? await this.storeNow.plan(changes) : [];
    let after: RepoStore = this.storeNow;
    if (plans.length) {
      try {
        after = await this.storeNow.verify(changes, plans);
      } catch (error) {
        // An edit made outside, to a file this save leaves alone, reads
        // back as a difference in someone else's item: that is 409, so the
        // console reloads and tries again, not 422.
        await this.storeNow.checkUnchanged();
        throw error;
      }
    }
    refuseCatalogueMentions(plans);
    const writes: RepoWrite[] = plans.map(({ path, text }) => ({ path, text }));
    if (decisionsText !== null) {
      writes.push({ path: DECISIONS_PATH, text: decisionsText });
    }
    if (!writes.length) return [];
    if (this.dryRun) {
      for (const write of writes) this.dryFiles.set(write.path, write.text);
    } else {
      // Step 2, right before anything is written: every file is still the
      // one its plan was worked out from.
      await this.storeNow.checkBases(plans);
      if (decisionsText !== null) await this.checkDecisionsBase();
      await writeRepoFiles(this.root, writes, this.own);
    }
    if (plans.length) {
      this.storeNow = after.rebased(this.reader);
      this.layout = await layoutOf(this.storeNow);
    }
    if (decisionsText !== null) {
      this.decisionsSha = sha256(decisionsText);
      this.serverNow.markDecisionsCommitted();
    }
    void this.refreshGit();
    return writes.map((write) => write.path);
  }

  /**
   * Refuses to write while a bulk import is running on this root (409
   * `REPO_BUSY`): the import has checked its files' bases and is renaming
   * its own texts into place, and would write over a save made now. A lock
   * left by an import that was killed names a process that is gone, and
   * holds nothing.
   */
  private async refuseWhileImporting(): Promise<void> {
    let holder: { pid?: unknown; startedAt?: unknown };
    try {
      holder = JSON.parse(
        await readFile(join(this.root, IMPORT_LOCK_FILE), 'utf8'),
      ) as typeof holder;
    } catch {
      return;
    }
    if (typeof holder.pid !== 'number' || !isProcessRunning(holder.pid)) {
      return;
    }
    throw new RepoContentError(
      'REPO_BUSY',
      409,
      `A bulk import is writing the data files (process ${holder.pid}, since ${String(holder.startedAt ?? '?')}); save again once it finishes. Nothing was written.`,
      IMPORT_LOCK_FILE,
    );
  }

  /**
   * Refuses to write `decisions.json` while the copy on disk has rows that
   * do not read (422 `REPO_UNWRITABLE`): the server holds only the rows
   * that did, so writing its log would drop the others without a word, as
   * the bulk import refuses to as well. Whoever made the file unreadable (a
   * merge left half done, a hand edit) fixes it, and the store reloads.
   */
  private refuseDamagedDecisions(): void {
    const damage = decisionsDamage(this.parts);
    if (damage === null) return;
    throw new RepoContentError(
      'REPO_UNWRITABLE',
      422,
      `${DECISIONS_PATH} has rows that cannot be read (${damage}); saving a decision would drop them when it writes the log, so fix the file first. Nothing was written.`,
      DECISIONS_PATH,
    );
  }

  /** `decisions.json` is still what the store last read or wrote. */
  private async checkDecisionsBase(): Promise<void> {
    const now = await this.reader.read(DECISIONS_PATH);
    if ((now?.sha256 ?? null) === this.decisionsSha) return;
    throw new RepoContentError(
      'REPO_FILE_CHANGED',
      409,
      `files changed on disk since the store loaded them; nothing was written: ${DECISIONS_PATH} (${
        this.decisionsSha === null ? 'made' : now ? 'edited' : 'deleted'
      } since the load)`,
      DECISIONS_PATH,
    );
  }

  /* ── Reloading ── */

  /**
   * Reads every file again and rebuilds the server over them, carrying each
   * item's revision over when it reads the same (see `carryOver`). After a
   * failed request, `failed` names what it touched. Returns the kinds whose
   * items changed, and `suggestions` when the artifacts or the decisions
   * did. If the files cannot be read, the store keeps what it had, answers
   * every request with that error until they can, and throws it.
   */
  private async rebuild(failed: FailedRequest | null): Promise<string[]> {
    let store: RepoStore;
    let parts: SuggestionParts;
    try {
      store = await RepoStore.load({ reader: this.reader });
      parts = await loadSuggestionParts(store.reader, {
        planners: this.options.planners,
        previous: this.parts,
      });
    } catch (error) {
      this.broken = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
    const previous = this.parts
      ? { store: this.storeNow, server: this.serverNow }
      : null;
    const { items, kinds } = carryOver(store, previous, failed);
    // Against what the store last read or wrote: its own decisions.json
    // write is no news.
    const suggestionsMoved =
      this.parts !== null &&
      (!sameShas(this.parts.artifacts, parts.artifacts) ||
        this.decisionsSha !== parts.decisionsSha);
    // With the importer's alias tables, which app code may not import: a
    // tag a genre alias leads to is warned about when taken off, and an
    // instrument an alias leads to cannot be deleted.
    this.vocabulary ??= await repoVocabularySources();
    this.serverNow = this.modules.server.createContentMockServer({
      seed: { items },
      mode: 'repo',
      ...(this.options.now ? { now: this.options.now } : {}),
      suggestions: parts.sources,
      vocabulary: this.vocabulary,
      onTouched: this.noteTouched,
      uncommitted: this.uncommitted,
      // The ids' high-water mark as the file says now, not as the module
      // graph last loaded it.
      ...markOption(store),
    });
    this.storeNow = store;
    this.parts = parts;
    this.decisionsSha = parts.decisionsSha;
    this.layout = await layoutOf(store);
    this.broken = null;
    for (const warning of store.warnings) {
      this.options.log?.(`[repo-content] ${warning}`);
    }
    const damage = decisionsDamage(parts);
    if (damage !== null) {
      this.options.log?.(
        `[repo-content] ${DECISIONS_PATH} has rows that cannot be read (${damage}): no decision is saved until the file is fixed`,
      );
    }
    void this.refreshGit();
    return [...kinds, ...(suggestionsMoved ? ['suggestions'] : [])];
  }

  /** Reads the files again now, whatever they hold. Returns what `rebuild` does. */
  reload(): Promise<string[]> {
    return this.queue(() => this.rebuild(null));
  }

  /** Whether an absolute path is one of the data files, or where one would appear. */
  covers(absolute: string): boolean {
    const path = this.relative(absolute);
    if (path === null) return false;
    if (this.layout.files.has(path)) return true;
    if (parentDir(path) === SUGGESTIONS_DIR) return path.endsWith('.json');
    return kindsOfPath(this.layout, path).length > 0;
  }

  /** The folders and files a watcher should cover, absolute. */
  watchPaths(): string[] {
    const paths = new Set<string>([join(this.root, SUGGESTIONS_DIR)]);
    for (const dir of this.layout.dirs.keys()) paths.add(join(this.root, dir));
    for (const path of this.layout.files.keys()) {
      if (!this.layout.dirs.has(parentDir(path))) {
        paths.add(join(this.root, path));
      }
    }
    return [...paths].sort(byCodeUnit);
  }

  /** `absolute` as a repo path under the root, or null when it is not under it. */
  private relative(absolute: string): string | null {
    const path = relative(this.root, resolve(absolute));
    if (!path || path.startsWith('..') || isAbsolute(path)) return null;
    return path.split(sep).join('/');
  }

  /** Whether `text` at `absolute` is what the store itself last wrote there. */
  isOwnWrite(absolute: string, text: string | null): boolean {
    return this.own.holds(absolute, text);
  }

  /**
   * Files changed on disk (absolute paths, as the watcher saw them). When
   * one of them no longer holds what the store read, the store reloads and
   * this returns the kinds that changed; otherwise nothing happens (the
   * store's own writes come back this way too) and it returns none.
   */
  externalChange(files: readonly string[]): Promise<string[]> {
    return this.queue(async () => {
      if (this.broken) return this.rebuild(null);
      const paths = files
        .filter((file) => this.covers(file))
        .map((file) => this.relative(file)!);
      for (const path of new Set(paths)) {
        const now = (await this.reader.read(path))?.sha256 ?? null;
        const held =
          path === DECISIONS_PATH
            ? this.decisionsSha
            : parentDir(path) === SUGGESTIONS_DIR
              ? (this.parts?.artifacts.get(path) ?? null)
              : (this.storeNow.file(path)?.sha256 ?? null);
        if (now === held) continue;
        // A file in an adapter's folder that it would not read (a helper
        // module beside the songs) is not data.
        if (
          held === null &&
          !this.layout.files.has(path) &&
          parentDir(path) !== SUGGESTIONS_DIR &&
          !(await this.readsNow(path))
        ) {
          continue;
        }
        return this.rebuild(null);
      }
      return [];
    });
  }

  /** Whether an adapter would read `path` as the files are now. */
  private async readsNow(path: string): Promise<boolean> {
    const owner = this.layout.dirs.get(parentDir(path));
    if (!owner) return false;
    return (await owner.files(this.reader)).includes(path);
  }

  /* ── The roster ── */

  /** The slugs on the globe roster (`artistRegistry.ts`), in its order. */
  roster(): Promise<string[]> {
    return this.queue(async () => {
      await this.ensureLoaded();
      return this.storeNow
        .items('artist')
        .filter((item) => item.file === REGISTRY_FILE)
        .map((item) => item.slug);
    });
  }

  /**
   * Puts an artist on the globe roster or takes it off (`POST /repo/roster`,
   * design C.1): its name and aliases move between `artistRegistry.ts` and
   * `artists.json`, and nothing else about it changes. Null when there is
   * no such artist in the files.
   */
  setRoster(slug: string, on: boolean): Promise<RosterMove | null> {
    return this.queue(async () => {
      await this.ensureLoaded();
      const item = this.storeNow.item('artist', slug);
      if (!item) return null;
      if ((item.file === REGISTRY_FILE) === on) {
        return { slug, on, changed: false, files: [] };
      }
      try {
        const files = await this.commit(
          [{ kind: 'artist', slug, body: item.body, roster: on }],
          null,
        );
        return { slug, on, changed: true, files };
      } catch (error) {
        await this.rebuild(null).catch(() => undefined);
        throw error;
      }
    });
  }

  /* ── Git ── */

  /**
   * Asks git which data files it has not committed (`GET /repo/status`),
   * and keeps the answer for `/overview`, which must answer at once
   * (`uncommitted`). Never rejects: no git is an answer too.
   */
  refreshGit(): Promise<RepoStatus> {
    const runner = this.options.git;
    const run = (async (): Promise<RepoStatus> => {
      const read: GitStatusRead =
        runner === false
          ? { git: false, branch: null, files: [], error: 'git is off' }
          : await readGitStatus(this.root, this.gitPaths(), runner);
      return this.statusOf(read);
    })();
    this.gitRun = run;
    void run.then((status) => {
      if (this.gitRun === run) this.gitStatus = status;
    });
    return run;
  }

  /** The paths git is asked about: the adapters' own folders, their other files, and `decisions.json`. */
  private gitPaths(): string[] {
    const paths = new Set<string>([DECISIONS_PATH]);
    for (const dir of this.layout.dirs.keys()) paths.add(dir);
    for (const path of this.layout.files.keys()) {
      if (!this.layout.dirs.has(parentDir(path))) paths.add(path);
    }
    return [...paths].sort(byCodeUnit);
  }

  private statusOf(read: GitStatusRead): RepoStatus {
    const files: RepoStatusFile[] = [];
    const byKind: Partial<Record<MockKind, number>> = {};
    let decisions = false;
    for (const file of read.files) {
      if (file.path === DECISIONS_PATH) {
        decisions = true;
        files.push({ ...file, kinds: [] });
        continue;
      }
      const kinds = kindsOfPath(this.layout, file.path);
      if (!kinds.length) continue;
      files.push({ ...file, kinds });
      // Once per file, under its first kind: the edit bar adds the kinds up,
      // and a file of an adapter with several kinds and no items of its own
      // (the vocabulary's contract copy and manifest) would count once for
      // each of genre, subgenre and instrument.
      byKind[kinds[0]] = (byKind[kinds[0]] ?? 0) + 1;
    }
    return {
      root: this.root,
      git: read.git,
      branch: read.branch,
      files,
      byKind,
      decisions,
      error: read.error,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * The seed a rebuild starts the server from: every item as the files hold
 * it, each carrying over what the server it replaces said of it.
 *
 *  - An item whose files did not move, or whose body and status read the
 *    same, keeps its revision and `updatedAt`: nothing about it changed,
 *    and a console holding it must not be told otherwise.
 *  - An item the failed request touched, which the disk still holds as it
 *    was before that request, gets back its revision from before it: the
 *    client never got the answer that moved it.
 *  - Anything else that the server held gets the next revision; a new item
 *    starts at 1.
 *
 * Returns the kinds of the items that changed, appeared or went.
 */
function carryOver(
  store: RepoStore,
  previous: { store: RepoStore; server: ContentMockServer } | null,
  failed: FailedRequest | null,
): { items: RepoItem[]; kinds: Set<MockKind> } {
  const kinds = new Set<MockKind>();
  if (!previous) return { items: store.items(), kinds };
  const filesSame = (was: RepoItem, now: RepoItem) =>
    was.files.length === now.files.length &&
    was.files.every(
      (path, index) =>
        now.files[index] === path &&
        previous.store.file(path)?.sha256 === store.file(path)?.sha256,
    );
  const items = store.items().map((item): RepoItem => {
    const key = itemKey(item.kind, item.slug);
    const held = previous.server.storedItem(item.kind, item.slug);
    if (!held) {
      kinds.add(item.kind);
      return item;
    }
    const was = previous.store.item(item.kind, item.slug);
    if (failed?.keys.has(key)) {
      if (was && was.status === item.status && sameBody(was.body, item.body)) {
        return { ...item, revision: failed.before.get(key) ?? held.revision };
      }
      kinds.add(item.kind);
      return { ...item, revision: held.revision + 1 };
    }
    const unchanged =
      !held.deleted &&
      held.body !== null &&
      ((was !== undefined && filesSame(was, item)) ||
        (held.status === item.status && sameBody(held.body, item.body)));
    if (unchanged) {
      return { ...item, revision: held.revision, updatedAt: held.updatedAt };
    }
    kinds.add(item.kind);
    return { ...item, revision: held.revision + 1 };
  });
  for (const item of previous.store.items()) {
    if (!store.item(item.kind, item.slug)) kinds.add(item.kind);
  }
  return { items, kinds };
}

/**
 * A failed flush as the content API answers it. The store's refusals
 * (`RepoContentError`) and the writer's (`RepoUnwritableError`, which names
 * the line to go and edit by hand) carry their own status and code.
 */
/** Why the committed `decisions.json` did not read in full; null when it did. */
function decisionsDamage(parts: SuggestionParts | null): string | null {
  const committed = parts?.sources.committed;
  if (!committed) return null;
  // On one line: JSON's own message quotes the text around the fault.
  if (committed.error) return committed.error.replace(/\s+/g, ' ');
  return committed.refused.length ? committed.refused.join(', ') : null;
}

function failureResponse(error: unknown): MockResponse {
  const refusal = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
    file?: unknown;
    line?: unknown;
  };
  if (
    error instanceof Error &&
    typeof refusal.status === 'number' &&
    typeof refusal.code === 'string' &&
    refusal.code.startsWith('REPO_')
  ) {
    return {
      status: refusal.status,
      body: {
        error: error.message,
        code: refusal.code,
        ...(typeof refusal.file === 'string' ? { file: refusal.file } : {}),
        ...(typeof refusal.line === 'number' ? { line: refusal.line } : {}),
      },
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    status: 500,
    body: {
      error: `The repo files could not be written (${message}). The store was read from disk again.`,
      code: 'REPO_WRITE_FAILED',
    },
  };
}
