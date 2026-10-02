import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { RecordComposeError } from '@/content/records/compose';
import type { MockSeedItem } from '@/features/admin/content/mock/contentMockServer';
import type { Body, MockKind } from '@/features/admin/content/mock/mockKinds';
import slugPatterns from '@/scripts/apiContract/slugPatterns.generated.json';
import {
  formatJsonLines,
  JsonLinesError,
  type JsonLinesLayout,
  parseJsonLines,
  isCanonicalJsonLines,
} from '../jsonLines';
import {
  type DeclarationLocator,
  firstDifference,
  formatPath,
  type Json,
  NotJsonError,
  readDeclaration,
  RepoUnwritableError,
  strictJson,
  toJson,
} from '../literal';

/**
 * What every repo-mode adapter shares: how files are read, what an item and
 * a change look like, what a planned write is, and the errors.
 *
 * Repo mode's store is the repo's own data files (design A.4, C.1). Each
 * content kind has an adapter in this folder that knows which files hold it,
 * reads them into items shaped like the mock's seed (`MockSeedItem`, plus
 * the status, the file it came from, that file's hash and its mtime), and,
 * given changed items, works out the new text of each file they touch. An
 * adapter never writes: it returns plans (`FilePlan`, a path and a text),
 * and whoever holds the store decides whether and when to put them on disk.
 *
 * Paths are repo-relative and use `/`, as git and the design name them. A
 * `RepoReader` turns them into files under some root: the repo itself, a
 * scratch copy (`REPO_CONTENT_ROOT`), or a reader with some files replaced
 * in memory, which is how a plan is read back before anything is written.
 *
 * Node only (the file system and `node:crypto`), with nothing from Vite, so
 * the store runs under `npx tsx` for the bulk import as well as in the dev
 * server.
 */

/* ── Files ─────────────────────────────────────────────────────────── */

/** A file as read: its text, the hash of its bytes, and when it last changed. */
export interface RepoFile {
  /** Repo-relative, with `/`. */
  path: string;
  text: string;
  /** Hex sha256 of the file's bytes. The store compares it before a write. */
  sha256: string;
  mtime: Date;
}

/** Reads repo-relative paths under a root. */
export interface RepoReader {
  /** The absolute directory paths are relative to. */
  readonly root: string;
  /** The file at `path`, or null when there is none. */
  read(path: string): Promise<RepoFile | null>;
  /** The names of the files directly in `dir`, sorted; none when `dir` does not exist. */
  list(dir: string): Promise<string[]>;
}

export const sha256 = (data: string | Uint8Array): string =>
  createHash('sha256').update(data).digest('hex');

/**
 * Code-unit order, which does not depend on the machine's locale: the order
 * files are listed and loaded in has to be the same everywhere.
 */
export const byCodeUnit = (a: string, b: string): number => {
  if (a < b) return -1;
  return a > b ? 1 : 0;
};

const isMissing = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
};

/** Reads the real file system under `root`. */
export function fsReader(root: string): RepoReader {
  return {
    root,
    async read(path) {
      const absolute = join(root, path);
      try {
        const [bytes, info] = await Promise.all([
          readFile(absolute),
          stat(absolute),
        ]);
        return {
          path,
          text: bytes.toString('utf8'),
          sha256: sha256(bytes),
          mtime: info.mtime,
        };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async list(dir) {
      try {
        const entries = await readdir(join(root, dir), { withFileTypes: true });
        return entries
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
          .sort(byCodeUnit);
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
    },
  };
}

const parentOf = (path: string): string => {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
};

/**
 * `base` with some files replaced: a text for a file written, null for one
 * deleted. Planned writes are read back through one of these before they
 * reach the disk, so the check sees exactly what the disk would hold.
 */
export function overlayReader(
  base: RepoReader,
  overrides: ReadonlyMap<string, string | null>,
  mtime: Date = new Date(),
): RepoReader {
  return {
    root: base.root,
    async read(path) {
      if (!overrides.has(path)) return base.read(path);
      const text = overrides.get(path);
      if (text === null || text === undefined) return null;
      return { path, text, sha256: sha256(text), mtime };
    },
    async list(dir) {
      const names = new Set(await base.list(dir));
      for (const [path, text] of overrides) {
        if (parentOf(path) !== dir) continue;
        const name = path.slice(dir.length + 1);
        if (text === null) names.delete(name);
        else names.add(name);
      }
      return [...names].sort(byCodeUnit);
    },
  };
}

/**
 * `fn` over `values`, at most `limit` at once, results in order. Reading 640
 * song files all at once can run out of file descriptors on macOS.
 */
export async function mapLimit<T, R>(
  values: readonly T[],
  limit: number,
  fn: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array<R>(values.length);
  let next = 0;
  const worker = async () => {
    while (next < values.length) {
      const index = next++;
      out[index] = await fn(values[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, worker),
  );
  return out;
}

/* ── Items and changes ─────────────────────────────────────────────── */

/**
 * Whether students see a song. Every other kind is always `published`: git
 * is the review step, and commit plus deploy is the publish (design B).
 */
export type RepoItemStatus = 'published' | 'draft';

/**
 * One content item as the repo holds it: the mock's seed item, plus what
 * the store needs to notice edits made outside it.
 */
export interface RepoItem extends MockSeedItem {
  /** A song is published when `bundled.ts` registers it, and a draft otherwise. */
  status: RepoItemStatus;
  /**
   * The newest mtime of `files`, which the server reports as `updatedAt`,
   * so a console holding the item notices an edit made outside it.
   */
  updatedAt: Date;
  /** The file the item lives in. A roster artist lives in the registry. */
  file: string;
  /** That file's sha256 as loaded. */
  sha256: string;
  /** Every file the body is read from, `file` first: a roster artist with an artists.json row is in two. */
  files: string[];
}

/** `kind:slug`, the key items are held and reported by. */
export const itemKey = (kind: MockKind, slug: string): string =>
  `${kind}:${slug}`;

/** A change to one item, as the server hands it to the store. */
export interface ItemChange {
  kind: MockKind;
  slug: string;
  /** The item's whole new body, or null to remove the item. */
  body: Body | null;
  /**
   * Songs only: `published` registers the song in `bundled.ts`, `draft`
   * takes it out. Absent keeps what it is; a new song starts as a draft.
   */
  status?: RepoItemStatus;
  /**
   * Artists only: whether the artist is on the globe roster afterwards.
   * Absent keeps what it is; a new artist starts off the roster.
   */
  roster?: boolean;
}

/** A planned write of one file: nothing is on disk until the store puts it there. */
export interface FilePlan {
  /** Repo-relative, with `/`. */
  path: string;
  /** The text the plan was worked out from; null when the file did not exist. */
  before: string | null;
  /**
   * The sha256 of the file as loaded, or null when it did not exist. The
   * store writes only if the disk still holds this (design A.4, flush step
   * 2), and null means the file must still not exist: a file found there
   * was made since the load, and is a conflict like any other
   * (`RepoStore.checkBases`, 409 `REPO_FILE_CHANGED`).
   */
  baseSha256: string | null;
  /** The file's new text, or null to delete the file. */
  text: string | null;
  /** The items (`kind:slug`) whose changes make this write. */
  items: string[];
}

/** What an adapter is told when it plans: the store as loaded. */
export interface PlanContext {
  /** A file as loaded, or null when it did not exist. */
  file(path: string): RepoFile | null;
  item(kind: MockKind, slug: string): RepoItem | undefined;
  items(kind: MockKind): readonly RepoItem[];
}

export interface PlanOptions {
  /**
   * Plan every file the changes touch, even when its text comes out the
   * same, having run it through the writer, prettier and the read-back
   * check. The no-op test uses it to prove unchanged items give unchanged
   * bytes; the store has no need to.
   */
  force?: boolean;
}

/** One kind's files, read. */
export interface LoadedSource {
  items: RepoItem[];
  /** The files read. */
  files: RepoFile[];
  /** Files the adapter reads that do not exist yet: a JSON file nothing has been saved to. */
  missing: string[];
  /** What a person should know that does not stop the load. */
  warnings: string[];
}

/** An adapter: the files one or more kinds live in, read and planned. */
export interface RepoSource {
  /** For messages. */
  readonly name: string;
  readonly kinds: readonly MockKind[];
  /** Whether every change is refused (`artist_location`: the pins never move). */
  readonly readOnly: boolean;
  /** Every file it reads, repo-relative, including JSON files that do not exist yet. */
  files(reader: RepoReader): Promise<string[]>;
  load(reader: RepoReader): Promise<LoadedSource>;
  /** The writes that make `changes`, one plan per file, without writing anything. */
  plan(
    changes: readonly ItemChange[],
    context: PlanContext,
    options?: PlanOptions,
  ): Promise<FilePlan[]>;
}

/* ── Errors ────────────────────────────────────────────────────────── */

/**
 * What the store refuses, with the status the HTTP layer answers it with.
 *
 *  - `REPO_READ_ONLY` (403): a change to a kind repo mode never writes.
 *  - `REPO_BAD_CHANGE` (422): a change the files cannot express: a body
 *    whose identity is not its slug (renaming is off), a removal of
 *    something that is not there, a published song deleted.
 *  - `REPO_UNWRITABLE` (422): the change is fine, but the file cannot take
 *    it without a person (a comment in the way, a record in the wrong file).
 *    `RepoUnwritableError` from `literal.ts` is the same code, with a line.
 *  - `REPO_FILE_CHANGED` (409): a file a plan was worked out from is not
 *    what it was when the store loaded it (edited, deleted, or made where
 *    there was none). The store reloads and the client tries again.
 *  - `REPO_BUSY` (409): a bulk import holds its run lock and is writing
 *    the data files; nothing is written until it has finished.
 *  - `REPO_LOAD_FAILED` (500): a data file that cannot be read as data.
 */
export type RepoErrorCode =
  | 'REPO_READ_ONLY'
  | 'REPO_BAD_CHANGE'
  | 'REPO_UNWRITABLE'
  | 'REPO_FILE_CHANGED'
  | 'REPO_BUSY'
  | 'REPO_LOAD_FAILED';

export class RepoContentError extends Error {
  constructor(
    readonly code: RepoErrorCode,
    readonly status: number,
    message: string,
    /** The file it is about, when there is one. */
    readonly file?: string,
  ) {
    super(message);
    this.name = 'RepoContentError';
  }
}

export const badChange = (change: ItemChange, reason: string) =>
  new RepoContentError(
    'REPO_BAD_CHANGE',
    422,
    `${change.kind} '${change.slug}': ${reason}`,
  );

/**
 * A change's body as JSON (`strictJson`), null for a removal, or
 * `REPO_BAD_CHANGE` naming what in it JSON cannot hold: a NaN, a Date, an
 * undefined array element. The store takes every body through this before
 * an adapter sees it, so what is planned, and what the plan is checked
 * against, is the body as sent and never the null or string a JSON round
 * trip would have made of part of it.
 */
export function jsonBody(change: ItemChange): Body | null {
  if (change.body === null) return null;
  try {
    return strictJson(change.body) as Body;
  } catch (error) {
    if (!(error instanceof NotJsonError)) throw error;
    throw badChange(
      change,
      `the body is not JSON as it stands: ${error.message}`,
    );
  }
}

/** A load failure naming the file, keeping what the reader said. */
export function loadFailed(path: string, error: unknown): RepoContentError {
  if (error instanceof RepoContentError) return error;
  const reason = error instanceof Error ? error.message : String(error);
  return new RepoContentError(
    'REPO_LOAD_FAILED',
    500,
    `${path} could not be read as data: ${reason}`,
    path,
  );
}

/**
 * The errors the writers throw about a file (a JSON-lines record the schema
 * does not allow, artists that cannot be split back), as the store's own
 * 422. `RepoUnwritableError` already is one and passes through.
 */
export function unwritable(path: string, error: unknown): Error {
  if (error instanceof RepoUnwritableError) return error;
  if (error instanceof RepoContentError) return error;
  if (error instanceof JsonLinesError || error instanceof RecordComposeError) {
    return new RepoContentError(
      'REPO_UNWRITABLE',
      422,
      `${path}: ${error.message}`,
      path,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

/* ── Shared steps ──────────────────────────────────────────────────── */

const SLUG_PATTERNS = slugPatterns as Record<
  string,
  { identity: 'id' | 'slug'; pattern: string | null }
>;

/**
 * A kind's slug pattern, from the contract's generated table
 * (`slugPatterns.generated.json`), which the mock and the API check too.
 */
export function slugPattern(kind: MockKind): RegExp {
  const source = SLUG_PATTERNS[kind]?.pattern;
  if (!source) throw new Error(`the contract gives ${kind} no slug pattern`);
  return new RegExp(source);
}

/** Evaluated declarations as JSON text, by the locator and the file's hash. */
const declarationCache = new Map<string, string>();

/**
 * A TypeScript data file's declaration, read as data (`literal.ts`), and
 * remembered by the file's hash: a reload after one song was saved parses
 * that one song again, not all 640. What is remembered is JSON text, so
 * each call returns a fresh value that no other item shares.
 */
export function declarationValue(
  file: RepoFile,
  locator: DeclarationLocator,
): Json {
  const key = `${locator.label}\n${file.sha256}`;
  const cached = declarationCache.get(key);
  if (cached !== undefined) return JSON.parse(cached) as Json;
  const { value } = readDeclaration(file.text, file.path, locator);
  if (declarationCache.size >= 4000) declarationCache.clear();
  declarationCache.set(key, JSON.stringify(value));
  return value;
}

/**
 * Refuses a change whose body does not name the item it is saved as:
 * renaming is off in repo mode (design B), and the store keys items by
 * slug. `pattern` is the kind's slug pattern (`slugPatterns.generated.json`),
 * which also keeps a song id from naming a path outside its folder.
 */
export function checkIdentity(
  change: ItemChange,
  identity: string,
  pattern: RegExp,
): void {
  if (!pattern.test(change.slug)) {
    throw badChange(change, `the slug does not match ${String(pattern)}`);
  }
  if (change.body === null) return;
  const value = change.body[identity];
  if (String(value) !== change.slug) {
    throw badChange(
      change,
      `the body's ${identity} is ${JSON.stringify(value)}; renaming is off, so it must be the slug`,
    );
  }
}

/** Refuses two changes to one item in the same plan. */
export function oneChangePerItem(changes: readonly ItemChange[]): void {
  const seen = new Set<string>();
  for (const change of changes) {
    const key = itemKey(change.kind, change.slug);
    if (seen.has(key)) {
      throw badChange(change, 'changed twice in one save');
    }
    seen.add(key);
  }
}

/** The newest of some dates. */
export const newest = (dates: readonly Date[]): Date =>
  new Date(Math.max(...dates.map((date) => date.getTime())));

/** An item read from one file. */
export const itemFrom = (
  kind: MockKind,
  slug: string,
  body: Body,
  file: RepoFile,
  status: RepoItemStatus = 'published',
): RepoItem => ({
  kind,
  slug,
  body,
  status,
  updatedAt: file.mtime,
  file: file.path,
  sha256: file.sha256,
  files: [file.path],
});

/** The plan for a file, or null when the text came out the same and nothing forces it. */
export function planFor(
  path: string,
  file: RepoFile | null,
  text: string | null,
  items: readonly string[],
  force = false,
): FilePlan | null {
  const before = file?.text ?? null;
  if (text === before && !force) return null;
  return {
    path,
    before,
    baseSha256: file?.sha256 ?? null,
    text,
    items: [...items],
  };
}

/**
 * The records of a JSON-lines file as loaded, or none when it does not
 * exist yet, with a warning when a hand edit left it out of the canonical
 * layout (it still loads; its next write re-lays it).
 */
export function jsonLinesRecords(
  path: string,
  file: RepoFile | null,
  layout: JsonLinesLayout,
): { records: Record<string, unknown>[]; warnings: string[] } {
  if (!file) return { records: [], warnings: [] };
  try {
    const records = parseJsonLines(file.text, layout, path);
    const warnings = isCanonicalJsonLines(file.text, layout)
      ? []
      : [
          `${path} is not in the one-record-per-line layout; its next write re-lays the whole file`,
        ];
    return { records, warnings };
  } catch (error) {
    throw loadFailed(path, error);
  }
}

/** Reads a JSON-lines file: see `jsonLinesRecords`. */
export async function readJsonLinesFile(
  reader: RepoReader,
  path: string,
  layout: JsonLinesLayout,
): Promise<{
  file: RepoFile | null;
  records: Record<string, unknown>[];
  warnings: string[];
}> {
  const file = await reader.read(path);
  return { file, ...jsonLinesRecords(path, file, layout) };
}

/**
 * The new text of a JSON-lines file holding `records`, read back before it
 * is returned: the records it parses to must be the intended ones, exactly.
 */
export function jsonLinesText(
  path: string,
  records: readonly Record<string, unknown>[],
  layout: JsonLinesLayout,
): string {
  let text: string;
  try {
    text = formatJsonLines(records, layout);
  } catch (error) {
    throw unwritable(path, error);
  }
  const identity = layout.identity;
  const back = new Map(
    parseJsonLines(text, layout, path).map((record) => [
      String(record[identity]),
      toJson(record),
    ]),
  );
  const problems: string[] = [];
  if (back.size !== records.length) {
    problems.push(`${records.length} records written, ${back.size} read back`);
  }
  for (const record of records) {
    const id = String(record[identity]);
    const read = back.get(id);
    const differs =
      read === undefined ? [] : firstDifference(read, toJson(record) as Json);
    if (differs !== null) {
      problems.push(
        `${identity} '${id}' reads back different at ${formatPath(differs)}`,
      );
    }
  }
  if (problems.length) {
    throw new RepoContentError(
      'REPO_UNWRITABLE',
      422,
      `${path} does not read back as intended; nothing was written: ${problems.join('; ')}`,
      path,
    );
  }
  return text;
}
