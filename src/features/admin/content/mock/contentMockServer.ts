import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import { GENRES } from '@/content/graph/genres';
import { artistSlug } from '@/content/graph/slugs';
import { samePlace } from '@/content/linking/samePlace';
import type { BundleObject, ContentManifest } from '@/content/manifest';
import type {
  Suggestion,
  SuggestionProvider,
  SuggestionTier,
} from '@/content/suggestions/types';
import {
  references,
  validateVocabulary,
  validateWrite,
  type VocabularyWrite,
} from '@/content/vocabulary/validate';
import { PROGRESSION_ID_HIGH_WATER } from '@/curriculum/data/progressionIdMark';
import type {
  ContentEditState,
  ContentItemDetail,
  ContentListItem,
  ContentOverviewRow,
  ContentRelease,
  ContentReleaseStatus,
  ContentStatus,
  PendingEdit,
  ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import CONTRACT_MANIFEST from '@/scripts/apiContract/manifest.json';
import {
  createDecisionLog,
  decisionHolds,
  placeSpotOf,
  decide,
  DECISION_OPS,
  isReplayNote,
  replayDecisions,
  type DecisionHost,
  type DecisionRequest,
  type ParsedDecisionsFile,
  type ReplayReport,
  type StoredDecision,
} from './decisions';
import {
  ALL_KINDS,
  authoritativeIn,
  BUNDLE,
  identityOf,
  identityValue,
  isVocabularyKind,
  kindsFor,
  project,
  schemaVersionOf,
  templateFor,
  type Body,
  type MockKind,
  type Projection,
} from './mockKinds';
import type { ContentMockMode } from './mockSwitch';
import { fnv, jsonEqual } from './patch';
import { progressionProblems } from './progressionProblems';
import {
  createSuggestionCatalog,
  DECISION_STATES,
  plannerInput,
  selectSuggestions,
  SUGGESTION_STATUSES,
  summarizeBatches,
  type AppPlanner,
  type ImportBatch,
  type SuggestionFilter,
  type ViewOf,
} from './suggestions';
import {
  createValidator,
  isError,
  refPathsTargeting,
  valuesAt,
  type RefLookup,
} from './validation';
import {
  asValidationProblem,
  bodyReferences,
  REPO_VOCABULARY_SOURCES,
  referrersFrom,
  vocabularyRecords,
  type MockVocabularySources,
} from './vocabulary';

/**
 * An in-memory copy of the content API, for running the console offline.
 *
 * Pure: a request goes in as data and a status and body come out, with no
 * fetch, no storage and no timers, so tests drive it directly and the browser
 * adapter (handleMockRequest.ts) is a thin shell around it. It implements
 * every endpoint src/hooks/data/admin/useAdminContent.ts calls, with the
 * semantics the console depends on (editors propose, admins approve, publish
 * builds versioned releases), plus the endpoints
 * docs/console-content-api-contract.md adds. In `legacy` mode it behaves as
 * today's API does, so the console's fallbacks can be rehearsed.
 *
 * In `repo` mode it is the dev repo content server's store (mockSwitch.ts):
 * seeded from the repo's data files by `src/scripts/repoContent/`, which
 * hears of every change through `onTouched` and writes it back into the
 * files. What differs there is what a save into the repo means:
 * - Admins only (403 `REPO_ADMIN_ONLY`): a save goes straight into the
 *   files, so there is nobody's proposal to review.
 * - No proposals, releases or rollback (404 `REPO_MODE`): publishing is
 *   commit and deploy, and `view=published` is the working view.
 * - No drafts, except a song `bundled.ts` does not register. Any other kind
 *   saved as a draft or archived is saved published, with a
 *   `REPO_NO_DRAFTS` warning.
 * - Every kind it serves is authoritative, and none has a bundle.
 * - No song → event derivation: a song's event changes only when it is
 *   edited itself.
 * - `artist_location` is read-only (403 `REPO_READ_ONLY`): it pins the
 *   songs, and the pins do not move from here.
 * - A new item's id is its seed id, so it keeps it when the store reloads.
 * - The committed decisions are never replayed: the files are the truth.
 * - It serves the vocabulary kinds too (genres, subgenres, instruments),
 *   which the contract has none of. A save is held to the vocabulary's
 *   rules (src/content/vocabulary/validate.ts): an id and `taught` never
 *   change, a subgenre's parent is a genre, a globe tag names one record,
 *   and so on (`vocabulary` says what they read besides the records). A
 *   record anything still names is never deleted, `force` or not: its
 *   subgenres, an instrument's typical genres, its own tags, a code table
 *   or another item's field (409 `REFERENCED`).
 *
 * Every mode but `legacy` exports each item's `revision` and honours a
 * PUT's `expectedRevision` (contract 5b, 409 `REVISION_CONFLICT`), and
 * refuses to delete an item another one names (409 `REFERENCED`, unless
 * `force=true`).
 *
 * Not here yet, as §3.6 of docs/console-content-graph-design.md defers them:
 * rename, merge, cycle and vocabulary checks, and the Teach endpoints.
 *
 * Where it is narrower than the real API, or decides something the contract
 * leaves open:
 * - The song → globe event derivation is a minimal copy of the server's
 *   (deriveSongEvent): it runs when an admin's song save or approve lands,
 *   maps the fields the contract lists, and keeps an existing event's pin
 *   unless the lead act's basedInPlaceId is live.
 * - After a reload only the newest few snapshots per kind survive
 *   (persist.ts), so an older release is still listed but cannot be restored;
 *   its `error` says so.
 * - `GET /items` with no `limit` returns every match: the contract sets no
 *   page size, and the console's tables do not follow `nextCursor` yet.
 * - `GET /items/:id` for a new item that exists only as a proposal returns the
 *   proposal as `body` as well as `pendingBody`, so the detail's `body` is
 *   never null.
 * - Suggestions (contract §10, not in the API yet) are served from what the
 *   caller hands in (`suggestions`): the importer's artifacts and the app's
 *   planners. Decisions are kept in the store and saved with it; the
 *   committed `decisions.json` is replayed by `replayCommittedDecisions`.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface MockSeedItem {
  kind: MockKind;
  slug: string;
  body: Body;
  /** For the song-derived globe events: the song they come from. */
  derivedFrom?: { kind: MockKind; slug: string };
  /**
   * The item's status; `published` when left out. In repo mode a song is a
   * draft until `bundled.ts` registers it.
   */
  status?: ContentStatus;
  /**
   * When the item last changed; `SEED_EPOCH` when left out. Repo mode gives
   * its file's mtime, so a console holding the item notices an edit made
   * outside it, and a decision older than that edit reads as overtaken.
   */
  updatedAt?: Date;
  /**
   * The revision the item starts at; 1 when left out. Repo mode's store
   * reloads the files after an edit made outside it, and hands each item
   * that reads the same the revision it had, so a client holding it is not
   * told it moved; an item that changed gets the next one.
   */
  revision?: number;
}

export interface MockSeed {
  items: MockSeedItem[];
}

export interface MockViewer {
  role: 'admin' | 'editor';
  userId: string;
  name?: string;
}

export interface MockRequest {
  method: string;
  /** The path under /api/admin/content, e.g. `/items/abc/approve`. */
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  viewer: MockViewer;
}

/** A 2xx body goes out as SuperJSON; anything else as plain JSON. */
export interface MockResponse {
  status: number;
  body: unknown;
}

export interface StoredRevision {
  id: string;
  revision: number;
  title: string;
  note: string | null;
  authorId: string | null;
  createdAt: Date;
}

export interface StoredItem {
  id: string;
  kind: MockKind;
  slug: string;
  status: ContentStatus;
  /** Null only for a new item that exists as a proposal. */
  body: Body | null;
  overrides: Body | null;
  pendingBody: Body | null;
  pendingOverrides: Body | null;
  pendingNote: string | null;
  pendingAt: Date | null;
  pendingById: string | null;
  editState: ContentEditState;
  reviewNote: string | null;
  reviewedAt: Date | null;
  derivedFromId: string | null;
  derivedFromSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
  /** Soft-deleted: gone from every endpoint, still in the releases it was in. */
  deleted: boolean;
  revisions: StoredRevision[];
  /** Changed since the seed. Only touched items are persisted. */
  touched: boolean;
  /**
   * Bumped on every stored change to the item — its body, its proposal,
   * its status, its review state, its deletion — and never otherwise: the
   * `revision` export rows and details carry, and a PUT's
   * `expectedRevision` is checked against (contract 5b). A seeded item
   * starts at 1; a new one is 1 once it is first saved. Not the numbering
   * of `revisions`, which counts only the body's saves.
   */
  revision: number;
}

export interface ReleaseEntry {
  itemId: string;
  slug: string;
  /** The compiled body, overrides applied: what the bundle serves. */
  body: Body;
}

export interface StoredRelease {
  id: string;
  kind: MockKind;
  version: number;
  status: ContentReleaseStatus;
  itemCount: number;
  totalBytes: number;
  objectKeys: string[];
  error: string | null;
  startedAt: Date;
  publishedAt: Date | null;
  parts: number[];
  partsDone: number[];
  /** Null once the snapshot is pruned; such a release cannot be rolled back to. */
  entries: ReleaseEntry[] | null;
  /** The release the seed starts with (version 1 of each seeded kind). */
  seeded: boolean;
}

export interface MockStoreSnapshot {
  seq: number;
  items: StoredItem[];
  releases: StoredRelease[];
  /** Display names of everyone who has written, for the review queue. */
  users: Record<string, string>;
  /** Every suggestion decision (decisions.ts). */
  decisions: StoredDecision[];
}

/**
 * The suggestions a server serves (suggestions.ts), loaded by seed.ts
 * `loadSuggestionSeed`. Every part is optional: a server with none serves an
 * empty list.
 */
export interface MockSuggestionSources {
  /** The importer's, from its committed artifacts. */
  imported?: readonly Suggestion[];
  /** Each import run and its calibration. */
  batches?: readonly ImportBatch[];
  /** What the artifacts held that is not served, and why. */
  refused?: readonly string[];
  /** The app's Stage-1 planners; null while src/content/linking is absent. */
  app?: AppPlanner | null;
  /** The committed decisions.json, read; absent when there is none. */
  committed?: ParsedDecisionsFile;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** When the seed says everything was created and first published. */
export const SEED_EPOCH = new Date('2026-09-29T00:00:00.000Z');

/** Items per release part, like the real publisher's shards. */
const SHARD_SIZE = 200;
const LIST_MAX_LIMIT = 200;
const EXPORT_DEFAULT_LIMIT = 200;
const EXPORT_MAX_LIMIT = 500;
const SUGGESTIONS_DEFAULT_LIMIT = 200;
const SUGGESTIONS_MAX_LIMIT = 1000;
/** Decisions per POST: a whole bulk run of Stage 1 fits in one. */
const DECISIONS_MAX = 5000;
const PROVIDERS: readonly SuggestionProvider[] = [
  'app',
  'musicbrainz',
  'wikidata',
];
const TIERS: readonly SuggestionTier[] = ['sure', 'likely', 'ambiguous'];
const EXPORT_OMITTABLE = new Set(['sections', 'audioSources']);

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: { error: string; code: string } & Record<string, unknown>,
  ) {
    super(body.error);
  }
}

const fail = (
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
): never => {
  throw new HttpError(status, { error, code, ...extra });
};

/** A stable id per (kind, slug), so persisted patches survive a reload. */
const seedItemId = (kind: string, slug: string) => {
  const text = `${kind}\u0000${slug}`;
  return `c${fnv(text, 0x811c9dc5)}${fnv(text, 0x5bd1e995)}`;
};

const slugKey = (kind: string, slug: string) => `${kind}\u0000${slug}`;

const isPlainObject = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const encodeCursor = (offset: number) => btoa(`o:${offset}`);
const decodeCursor = (cursor: string | undefined): number => {
  if (!cursor) return 0;
  try {
    const match = /^o:(\d+)$/.exec(atob(cursor));
    if (match) return Number(match[1]);
  } catch {
    // Fall through to the 400 below.
  }
  return fail(400, 'BAD_REQUEST', 'That cursor is not one this API issued.');
};

const parseLimit = (raw: string | undefined, fallback: number, max: number) => {
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < 1)
    return fail(400, 'BAD_REQUEST', '`limit` must be a positive integer.');
  return Math.min(Number(raw), max);
};

/** What a publish compiles: the body with any overrides applied on top. */
const compile = (body: Body, overrides: Body | null): Body =>
  overrides ? { ...body, ...overrides } : body;

const bundleKey = (bundle: string, version: number, part: number) =>
  `content/${bundle}/v${version}/part-${part}.json`;

/** Shown on a release whose items persist.ts no longer keeps. */
const PRUNED_NOTE =
  'The offline mock no longer keeps this version’s items, so it cannot be restored here.';

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
const objects = (value: unknown): Body[] =>
  Array.isArray(value) ? value.filter(isPlainObject) : [];

/**
 * The 422's `error`, naming what is wrong: pages show `error` as it is, and
 * the song importer lists it per song, so a bare "failed validation" would
 * leave nobody able to act on it. `problems` keeps the full list.
 */
const failureMessage = (
  lead: string,
  problems: ValidationProblem[],
  withSlug: boolean,
) => {
  const errors = problems.filter(isError);
  const shown = errors
    .slice(0, 3)
    .map((problem) =>
      withSlug ? `${problem.slug}: ${problem.detail}` : problem.detail,
    );
  if (errors.length > 3) shown.push(`and ${errors.length - 3} more`);
  return `${lead} — ${shown.join('; ')}`;
};

/** An event's genre pills: the song's genre tags, by their display names. */
const GENRE_NAMES = new Map(GENRES.map((genre) => [genre.id, genre.name]));

/** Where the derivation pins a song nothing else places, as today. */
const NEW_YORK: Body = {
  lat: 40.71,
  lng: -74.01,
  city: 'New York',
  country: 'US',
};

/**
 * The fields the derivation writes from the song (contract, "Song → globe
 * event carries the recording"), each omitted when the song gives it no
 * value: never `null`, never `[]`. The first five need song v1, the rest
 * song v2.
 */
const DERIVED_FIELDS = [
  'label',
  'studio',
  'recordedYear',
  'credits',
  'artistIds',
  'releaseIds',
  'studioIds',
  'labelIds',
  'placeId',
];

// ── The server ──────────────────────────────────────────────────────────────

export interface CreateMockServerOptions {
  seed: MockSeed;
  mode: ContentMockMode;
  /** Injectable clock, for tests. */
  now?: () => Date;
  /** What `/suggestions` serves; none when left out. */
  suggestions?: MockSuggestionSources;
  /**
   * Told of every stored change as it is made, with the item changed: a
   * save, a new item, a delete, a proposal, a review. The repo store
   * (repo mode) collects the items one request touched and writes their
   * files once the request is answered. It is called once per change, so
   * an item can come more than once in one request, and a request that
   * fails part-way may have touched some before it failed.
   */
  onTouched?: (item: StoredItem) => void;
  /**
   * Repo mode: how many of a kind's data files git reports as changed and
   * not committed yet, which `/overview` reports as `changedSincePublish`
   * (design B: publishing is commit and deploy). Read as it is asked, so it
   * must answer at once, from what the store last found. 0 when left out.
   */
  uncommitted?: (kind: MockKind) => number;
  /**
   * Repo mode: what the vocabulary's rules read besides the genre,
   * subgenre and instrument items (the tag lists, the globe's instruments,
   * the artist registry, the importer's aliases, the code tables). The
   * repo's, as the app's modules have them, for whatever is left out.
   */
  vocabulary?: Partial<MockVocabularySources>;
  /**
   * The highest chord progression id ever handed out, as the repo's
   * `progressionIdMark.ts` says now (the repo store reads the file). The
   * bundled mark when left out.
   */
  progressionIdMark?: number;
}

export function createContentMockServer({
  seed,
  mode,
  now = () => new Date(),
  suggestions: suggestionSources = {},
  onTouched,
  uncommitted,
  vocabulary: vocabularyOption = {},
  progressionIdMark = PROGRESSION_ID_HIGH_WATER,
}: CreateMockServerOptions) {
  const vocabularySources: MockVocabularySources = {
    ...REPO_VOCABULARY_SOURCES,
    ...vocabularyOption,
  };
  const served = new Set<string>(kindsFor(mode));
  const validator = createValidator(mode);
  const repo = mode === 'repo';

  const items = new Map<string, StoredItem>();
  const bySlug = new Map<string, string>();
  const seedBodies = new Map<string, Body>();
  const seedRevisions = new Map<string, StoredRevision>();
  const seedReleaseEntries = new Map<MockKind, ReleaseEntry[]>();
  const seedReleases = new Map<MockKind, StoredRelease>();
  let releases: StoredRelease[] = [];
  let seq = 0;
  let generation = 0;
  const listeners = new Set<() => void>();
  const users = new Map<string, string>();
  const committedDecisions = suggestionSources.committed;
  const log = createDecisionLog(committedDecisions?.decisions ?? []);
  let replayReport: ReplayReport | null = null;

  const changed = () => {
    generation += 1;
    for (const listener of listeners) listener();
  };

  // ── Seeding ──
  for (const entry of seed.items) {
    if (!served.has(entry.kind)) continue;
    const id = seedItemId(entry.kind, entry.slug);
    if (items.has(id))
      throw new Error(`Seed has two items for ${entry.kind} "${entry.slug}"`);
    const updatedAt = entry.updatedAt ?? SEED_EPOCH;
    const revision = seedRevision(
      id,
      entry.kind,
      entry.slug,
      entry.body,
      updatedAt,
    );
    seedRevisions.set(id, revision);
    const derivedFromId = entry.derivedFrom
      ? seedItemId(entry.derivedFrom.kind, entry.derivedFrom.slug)
      : null;
    items.set(id, {
      id,
      kind: entry.kind,
      slug: entry.slug,
      status: entry.status ?? 'published',
      body: entry.body,
      overrides: null,
      pendingBody: null,
      pendingOverrides: null,
      pendingNote: null,
      pendingAt: null,
      pendingById: null,
      editState: null,
      reviewNote: null,
      reviewedAt: null,
      derivedFromId,
      derivedFromSlug: entry.derivedFrom?.slug ?? null,
      createdAt: SEED_EPOCH,
      updatedAt,
      updatedById: null,
      deleted: false,
      revisions: [revision],
      touched: false,
      revision: entry.revision ?? 1,
    });
    bySlug.set(slugKey(entry.kind, entry.slug), id);
    seedBodies.set(id, entry.body);
  }

  // Repo mode publishes nothing: what students see is what is committed and
  // deployed, so there are no releases to seed.
  for (const kind of repo ? [] : kindsFor(mode)) {
    const entries = [...items.values()]
      .filter((item) => item.kind === kind)
      .map((item) => ({ itemId: item.id, slug: item.slug, body: item.body! }))
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    // A kind with no seed (release) has never been published.
    if (entries.length === 0) continue;
    seedReleaseEntries.set(kind, entries);
    const release: StoredRelease = {
      id: `seed-${kind}`,
      kind,
      version: 1,
      status: 'live',
      itemCount: entries.length,
      totalBytes: 0,
      objectKeys: [],
      error: null,
      startedAt: SEED_EPOCH,
      publishedAt: SEED_EPOCH,
      parts: shardIndices(entries.length),
      partsDone: shardIndices(entries.length),
      entries,
      seeded: true,
    };
    seedReleases.set(kind, release);
    releases.push(release);
  }

  /**
   * The first revision of a seeded item, dated when the seed says it last
   * changed. The mock's seed is dated `SEED_EPOCH`, before any decision;
   * repo mode's is its file's mtime, so an accept a file no longer holds,
   * edited since, reads as taken out by hand (`savedSince`).
   */
  function seedRevision(
    id: string,
    kind: string,
    slug: string,
    body: Body,
    at: Date,
  ): StoredRevision {
    return {
      id: `${id}-r1`,
      revision: 1,
      title: project(kind, body, slug).title,
      note: 'Seeded from the repo',
      authorId: null,
      createdAt: at,
    };
  }

  function shardIndices(count: number) {
    return Array.from({ length: Math.ceil(count / SHARD_SIZE) }, (_, i) => i);
  }

  // ── Lookups ──

  const projections = new WeakMap<object, Projection>();
  const projectItem = (item: StoredItem): Projection => {
    const view = item.body ?? item.pendingBody;
    if (!view) return project(item.kind, null, item.slug);
    // A body object belongs to one item and is never mutated, so its
    // projection can be kept for as long as the body is.
    let cached = projections.get(view);
    if (!cached) {
      cached = project(item.kind, view, item.slug);
      projections.set(view, cached);
    }
    return cached;
  };

  const findBySlug = (kind: string, slug: string): StoredItem | undefined => {
    const id = bySlug.get(slugKey(kind, slug));
    return id ? items.get(id) : undefined;
  };

  const liveRelease = (kind: string) =>
    releases.find(
      (release) => release.kind === kind && release.status === 'live',
    );

  const liveIndexes = new WeakMap<StoredRelease, Map<string, ReleaseEntry>>();
  const liveEntry = (kind: string, slug: string) => {
    const release = liveRelease(kind);
    if (!release?.entries) return undefined;
    let index = liveIndexes.get(release);
    if (!index) {
      index = new Map(release.entries.map((entry) => [entry.slug, entry]));
      liveIndexes.set(release, index);
    }
    return index.get(slug);
  };

  // In repo mode what is published is what the files say: an item is live
  // when it is there and published (a song bundled.ts registers).
  const refLookup: RefLookup = {
    statusOf(kind, slug) {
      const item = findBySlug(kind, slug);
      if (!item) return null;
      return item.body === null ? 'pending' : item.status;
    },
    isLive: (kind, slug) => {
      if (!repo) return liveEntry(kind, slug) !== undefined;
      const item = findBySlug(kind, slug);
      return !!item && item.body !== null && item.status === 'published';
    },
    isServed: (kind) => served.has(kind),
    isAuthoritative: (kind) => served.has(kind) && authoritativeIn(kind, mode),
  };

  const isNewProposal = (item: StoredItem) => item.body === null;

  const visibleTo = (item: StoredItem, viewer: MockViewer) =>
    !item.deleted &&
    !(
      isNewProposal(item) &&
      viewer.role === 'editor' &&
      item.pendingById !== viewer.userId
    );

  const getVisible = (id: string, viewer: MockViewer) => {
    const item = items.get(id);
    if (!item || !visibleTo(item, viewer))
      return fail(404, 'NOT_FOUND', 'No such item.');
    return item;
  };

  // ── Shapes ──

  const listItem = (item: StoredItem): ContentListItem => {
    const projection = projectItem(item);
    return {
      id: item.id,
      kind: item.kind,
      slug: item.slug,
      status: item.status,
      title: projection.title,
      subtitle: projection.subtitle,
      sortYear: projection.sortYear,
      tags: projection.tags,
      derivedFromId: item.derivedFromId,
      derivedFromSlug: item.derivedFromSlug,
      updatedAt: item.updatedAt,
      updatedById: item.updatedById,
      editState: item.editState,
      pendingAt: item.pendingAt,
      pendingById: item.pendingById,
      reviewNote: item.reviewNote,
      // Contract 5b; today's API has none.
      ...(mode === 'legacy' ? {} : { revision: item.revision }),
    };
  };

  const detail = (item: StoredItem, viewer: MockViewer): ContentItemDetail => {
    // An editor never sees another editor's proposal, only that one exists.
    const hide =
      viewer.role === 'editor' &&
      item.pendingById !== null &&
      item.pendingById !== viewer.userId;
    return {
      ...listItem(item),
      // A new item that exists only as a proposal has no stored body; the
      // proposal stands in, so a reviewer can open it like any other item.
      body: item.body ?? item.pendingBody ?? {},
      overrides: item.overrides,
      pendingBody: hide ? null : item.pendingBody,
      pendingOverrides: hide ? null : item.pendingOverrides,
      pendingNote: hide ? null : item.pendingNote,
      reviewedAt: item.reviewedAt,
      createdAt: item.createdAt,
      Revisions: [...item.revisions]
        .sort((a, b) => b.revision - a.revision)
        .map((revision) => ({ ...revision })),
    };
  };

  const publicRelease = (release: StoredRelease): ContentRelease => {
    // The seed's releases were never built part by part, so their sizes are
    // measured the first time anyone asks.
    if (release.seeded && release.objectKeys.length === 0 && release.entries) {
      const texts = shardTexts(release);
      release.totalBytes = texts.reduce((sum, text) => sum + text.length, 0);
      release.objectKeys = texts.map((_, part) =>
        bundleKey(BUNDLE[release.kind] ?? release.kind, release.version, part),
      );
    }
    return releaseShape(release);
  };

  const releaseShape = (release: StoredRelease): ContentRelease => ({
    id: release.id,
    kind: release.kind,
    version: release.version,
    status: release.status,
    itemCount: release.itemCount,
    totalBytes: release.totalBytes,
    objectKeys: [...release.objectKeys],
    error: release.error ?? (release.entries === null ? PRUNED_NOTE : null),
    startedAt: release.startedAt,
    publishedAt: release.publishedAt,
  });

  // ── Guards ──

  const requireAdmin = (viewer: MockViewer) => {
    if (viewer.role !== 'admin')
      fail(403, 'FORBIDDEN', 'Only an admin can do that.');
  };

  const requireKind = (raw: unknown): MockKind => {
    if (typeof raw !== 'string' || !raw)
      return fail(400, 'BAD_REQUEST', '`kind` is required.');
    if (!served.has(raw))
      return fail(400, 'BAD_REQUEST', `This API does not serve "${raw}".`);
    return raw as MockKind;
  };

  /** Repo mode: the route is the API's, and a save here goes into the files. */
  const notInRepo = (what: 'proposals' | 'publishing'): never =>
    fail(
      404,
      'REPO_MODE',
      what === 'proposals'
        ? 'Repo mode has no proposals: an admin’s save goes straight into the repo files, and git is the review.'
        : 'Repo mode has no releases: publishing is commit and deploy, and rolling back is git.',
    );

  /** Repo mode: artist locations place the songs' pins, which stay put. */
  const requireWritable = (kind: MockKind) => {
    if (repo && kind === 'artist_location')
      fail(
        403,
        'REPO_READ_ONLY',
        'Artist locations are read-only in repo mode: they place the songs on the globe, and those pins do not move from here.',
      );
  };

  /**
   * Every stored change goes through here, once per change: it is what the
   * revision counts, what the mock persists, and what the repo store writes.
   */
  const touch = (item: StoredItem) => {
    item.touched = true;
    item.revision += 1;
    onTouched?.(item);
  };

  const addRevision = (
    item: StoredItem,
    body: Body,
    note: string | null,
    authorId: string | null,
    at: Date,
  ) => {
    const revision =
      Math.max(0, ...item.revisions.map((entry) => entry.revision)) + 1;
    item.revisions.push({
      id: `${item.id}-r${revision}`,
      revision,
      title: project(item.kind, body, item.slug).title,
      note,
      authorId,
      createdAt: at,
    });
  };

  const rememberUser = (viewer: MockViewer) => {
    if (viewer.name) users.set(viewer.userId, viewer.name);
  };

  // ── The vocabulary's rules (repo mode) ──

  /** Whether an item's body fits its kind's schema, so the rules can read every field. */
  const fitsSchema = (item: {
    kind: MockKind;
    slug: string;
    body: Body | null;
  }) =>
    item.body !== null &&
    !validator.schemaProblems(item.kind, item.slug, item.body).some(isError);

  /** The genre, subgenre and instrument items, as the vocabulary's rules take them. */
  const heldVocabulary = () =>
    vocabularyRecords(items.values(), vocabularySources.tagLists, fitsSchema);

  /**
   * What saving one vocabulary record would add to the rules' problems
   * (`validateWrite`): the save's own rules (an id and `taught` never
   * change; a tag the importer's aliases lead to taken off), then whatever
   * the whole vocabulary would have after it that it does not have now. A
   * problem the files already had is not this save's to fix.
   */
  const vocabularyWriteProblems = (
    kind: VocabularyWrite['kind'],
    slug: string,
    body: Body,
  ): ValidationProblem[] => {
    const existing = findBySlug(kind, slug);
    const before =
      existing && existing.body !== null && fitsSchema(existing)
        ? existing.body
        : undefined;
    return validateWrite(
      { kind, before, after: body } as VocabularyWrite,
      heldVocabulary(),
      vocabularySources.context,
    ).map(asValidationProblem);
  };

  /**
   * What saving a chord progression would break (progressionProblems.ts):
   * held against every other progression's chords, live or proposed, and,
   * for a new one, against the highest id ever handed out. That is the
   * mark (the repo's file, or the bundled one), raised by every id this
   * store has held live, deleted ones included: an id is never reused.
   * What the live progression already got wrong is only a warning.
   */
  const progressionWriteProblems = (
    slug: string,
    body: Body,
  ): ValidationProblem[] => {
    const existing = findBySlug('chord_progression', slug);
    const live = existing && !existing.deleted ? existing.body : null;
    const others: { id: unknown; chords?: unknown }[] = [];
    let highWater = progressionIdMark;
    for (const item of items.values()) {
      if (item.kind !== 'chord_progression') continue;
      const id = Number(item.slug);
      if (item.body !== null && Number.isInteger(id))
        highWater = Math.max(highWater, id);
      if (item.deleted || item.slug === slug) continue;
      for (const held of [item.body, item.pendingBody])
        if (held) others.push({ id: held.id, chords: held.chords });
    }
    return progressionProblems(slug, body, {
      others,
      before: live,
      ...(live ? {} : { highWater }),
    });
  };

  /** Errors reject; the full list (warnings too) is returned either way. */
  const checkWrite = (kind: MockKind, slug: string, body: Body) => {
    const problems = [
      ...validator.identityProblems(kind, slug, body),
      ...validator.schemaProblems(kind, slug, body),
      ...validator.refProblems(kind, slug, body, refLookup, { on: 'put' }),
    ];
    // The vocabulary's rules read every field, so only a body that fits its
    // schema is held to them.
    if (isVocabularyKind(kind) && !problems.some(isError))
      problems.push(...vocabularyWriteProblems(kind, slug, body));
    // A progression's chords, the fields they derive and its id are held
    // to the library's rules (today's server has none of them).
    if (
      kind === 'chord_progression' &&
      mode !== 'legacy' &&
      !problems.some(isError)
    )
      problems.push(...progressionWriteProblems(slug, body));
    if (problems.some(isError))
      fail(
        422,
        'VALIDATION_FAILED',
        failureMessage(
          `Invalid ${kind.replace(/_/g, ' ')} body`,
          problems,
          false,
        ),
        { problems },
      );
    return problems;
  };

  /**
   * Everything /validate reports for a set of bodies of one kind, which is
   * also what blocks their publish: identity, schema and references, shared
   * identities, and today's check on song events whose song is gone.
   */
  const kindProblems = (
    kind: MockKind,
    candidates: { slug: string; body: Body; status: ContentStatus }[],
    building?: { kind: string; slugs: Set<string> },
  ): ValidationProblem[] => {
    const problems: ValidationProblem[] = [];
    const identities = new Map<string, string[]>();
    for (const { slug, body, status } of candidates) {
      problems.push(
        ...validator.identityProblems(kind, slug, body),
        ...validator.schemaProblems(kind, slug, body),
        ...validator.refProblems(kind, slug, body, refLookup, {
          on: 'publish',
          itemStatus: status,
          building,
        }),
      );
      const value = identityValue(kind, body);
      identities.set(value, [...(identities.get(value) ?? []), slug]);
      // A second recording's event names its song (songEventAliases.ts).
      const songSlug = kind === 'globe_event' ? songIdForEvent(slug) : null;
      if (songSlug !== null) {
        const song = findBySlug('song', songSlug);
        if (!song || song.body === null)
          problems.push({
            code: 'DANGLING_REFERENCE',
            slug,
            detail: `Derived from the song "${songSlug}", which does not exist.`,
            severity: 'error',
            target: `song:${songSlug}`,
          });
      }
    }
    for (const [value, slugs] of identities) {
      if (slugs.length < 2) continue;
      for (const slug of slugs)
        problems.push({
          code: 'DUPLICATE_ID',
          slug,
          detail: `${slugs.length} items share the ${identityOf(kind)} "${value}": ${slugs.join(', ')}.`,
          severity: 'error',
          path: identityOf(kind),
        });
    }
    // A vocabulary kind: what the rules find across the whole vocabulary,
    // this kind's records' share of it.
    if (isVocabularyKind(kind))
      problems.push(
        ...validateVocabulary(heldVocabulary(), vocabularySources.context)
          .filter((problem) => problem.kind === kind)
          .map(asValidationProblem),
      );
    return problems;
  };

  /**
   * A new, empty item under (kind, slug), registered in the store. In repo
   * mode its id is the one the seed gives (kind, slug), so it is the same
   * once the store reloads it from its file; an item deleted from that slug
   * before is gone from the files, and makes way. A new song starts as a
   * draft there too, and anything else as published: nothing else has
   * drafts.
   */
  const createItem = (
    kind: MockKind,
    slug: string,
    at: Date,
    userId: string | null,
  ): StoredItem => {
    seq += 1;
    const item: StoredItem = {
      id: repo
        ? seedItemId(kind, slug)
        : `n${seq.toString(36)}-${fnv(slugKey(kind, slug), 0x811c9dc5)}`,
      kind,
      slug,
      status: repo && kind !== 'song' ? 'published' : 'draft',
      body: null,
      overrides: null,
      pendingBody: null,
      pendingOverrides: null,
      pendingNote: null,
      pendingAt: null,
      pendingById: null,
      editState: null,
      reviewNote: null,
      reviewedAt: null,
      derivedFromId: null,
      derivedFromSlug: null,
      createdAt: at,
      updatedAt: at,
      updatedById: userId,
      deleted: false,
      revisions: [],
      touched: true,
      // Its first save (`touch`) makes it 1.
      revision: 0,
    };
    const previous = items.get(item.id);
    if (previous && !previous.deleted)
      throw new Error(`${kind} "${slug}" is already in the store`);
    items.set(item.id, item);
    bySlug.set(slugKey(kind, slug), item.id);
    return item;
  };

  // ── Song → globe event derivation ──
  //
  // The real one lives in music-atlas-api (derive/song-to-globe-event.ts).
  // This copy does what the Globe preview needs from it: an admin's song
  // change reaches `song-<id>` and so, on the next globe_event publish, the
  // map. Placement follows the contract's order.

  /** The lead act: origin, then the first primary credit, then the name. */
  const leadArtistSlug = (song: Body): string => {
    const origin = isPlainObject(song.origin) ? song.origin : {};
    const lead = objects(song.credits).find(
      (credit) => credit.primary && typeof credit.artistGlobeId === 'string',
    );
    return (
      str(origin.artistGlobeId) ??
      str(lead?.artistGlobeId) ??
      artistSlug(String(song.artist ?? ''))
    );
  };

  /** artist_location entries by the artist slug they name. */
  const artistLocations = () => {
    const out = new Map<string, Body>();
    for (const item of items.values()) {
      if (item.kind !== 'artist_location' || item.deleted || !item.body)
        continue;
      out.set(artistSlug(String(item.body.id ?? item.slug)), item.body);
    }
    return out;
  };

  /**
   * Where a song's event is pinned: its lead act's basedInPlaceId (both from
   * live releases), else the act's artist_location, else New York.
   */
  const placeSong = (song: Body, locations: Map<string, Body>) => {
    const artist = leadArtistSlug(song);
    const basedIn = liveEntry('artist', artist)?.body.basedInPlaceId;
    const city =
      typeof basedIn === 'string'
        ? liveEntry('globe_city', basedIn)?.body
        : undefined;
    if (city) {
      const [lat, lng] = Array.isArray(city.coordinates)
        ? (city.coordinates as unknown[])
        : [];
      return {
        artist,
        by: 'basedInPlace' as const,
        location: { lat, lng, city: city.name, country: city.country } as Body,
      };
    }
    const entry = locations.get(artist);
    if (entry)
      return {
        artist,
        by: 'artistLocation' as const,
        location: {
          lat: entry.lat,
          lng: entry.lng,
          city: entry.city,
          country: entry.country,
        } as Body,
      };
    return { artist, by: 'defaulted' as const, location: NEW_YORK };
  };

  const youtubeId = (song: Body): string | undefined => {
    for (const source of objects(song.audioSources)) {
      if (source.provider !== 'youtube' || typeof source.uri !== 'string')
        continue;
      const match = /(?:[?&]v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(
        source.uri,
      );
      if (match) return match[1];
    }
    return undefined;
  };

  const deriveEventBody = (
    songSlug: string,
    song: Body,
    previous: Body | null,
  ): Body => {
    const title = String(song.title ?? '');
    const artist = String(song.artist ?? '');
    const year = typeof song.year === 'number' ? song.year : undefined;
    const genreTags = strings(song.genreTags);
    const genre = genreTags
      .map((tag) => GENRE_NAMES.get(tag))
      .filter((name): name is string => name !== undefined);
    const placed = placeSong(song, artistLocations());
    // The seed's pins came from the retired substring match, which this copy
    // does not repeat; a live basedInPlaceId is the one signal it trusts to
    // move an existing pin.
    const location =
      placed.by === 'basedInPlace' || !isPlainObject(previous?.location)
        ? placed.location
        : previous.location;
    const session = isPlainObject(song.session) ? song.session : {};
    const origin = isPlainObject(song.origin) ? song.origin : {};
    const credits = objects(song.credits);
    const artistIds = [
      ...new Set(
        [
          origin.artistGlobeId,
          ...credits
            .filter((credit) => credit.primary)
            .map((credit) => credit.artistGlobeId),
        ].filter((id): id is string => typeof id === 'string' && id !== ''),
      ),
    ];

    const next: Body = { ...(previous ?? {}) };
    for (const key of DERIVED_FIELDS) delete next[key];
    Object.assign(next, {
      id: `song-${songSlug}`,
      year: year ?? (typeof previous?.year === 'number' ? previous.year : 2000),
      location,
      genre: genre.length ? genre : strings(previous?.genre),
      title: `${title} — ${artist}`,
      description:
        str(song.historicalDescription) ??
        str(previous?.description) ??
        [
          artist,
          year ? `(${year})` : '',
          str(song.key) ? `Key: ${String(song.key)}` : '',
          typeof song.tempo === 'number' ? `${song.tempo} BPM` : '',
        ]
          .filter(Boolean)
          .join('. '),
      tags: [
        artist.toLowerCase(),
        title.toLowerCase(),
        ...genreTags,
        String(location.city ?? '').toLowerCase(),
      ].filter(Boolean),
    });
    const videoId = str(previous?.videoId) ?? youtubeId(song);
    if (videoId) next.videoId = videoId;
    if (str(session.label)) next.label = session.label;
    if (str(session.studio)) next.studio = session.studio;
    if (typeof session.recordedYear === 'number')
      next.recordedYear = session.recordedYear;
    if (credits.length) next.credits = song.credits;
    if (artistIds.length) next.artistIds = artistIds;
    // Song v2: the records, the studio, the label and where it was recorded,
    // by id. A song on a record reaches its label through the record, so
    // then the event names no label. The place is where it was recorded,
    // not the pin: `location` stays where placement put it.
    const releaseIds = [
      ...new Set(
        objects(song.releases)
          .map((release) => str(release.releaseId))
          .filter((id): id is string => id !== undefined),
      ),
    ];
    if (releaseIds.length) next.releaseIds = releaseIds;
    const studioId = str(session.studioId);
    if (studioId) next.studioIds = [studioId];
    const labelId = str(session.labelId);
    if (labelId && !releaseIds.length) next.labelIds = [labelId];
    const placeId = str(session.placeId);
    if (placeId) next.placeId = placeId;
    return next;
  };

  /**
   * Bring `song-<id>` in line with a song whose stored body just changed.
   * A new event starts in the song's status; an existing one keeps its own,
   * and its overrides, which a publish applies on top as always. Never in
   * repo mode (design C.1): there `song-` events are edited only when they
   * are edited themselves, so a song save writes the song's file alone and
   * moves no pin.
   */
  const deriveSongEvent = (
    song: StoredItem,
    at: Date,
    userId: string | null,
    note = `Derived from the song "${song.slug}"`,
  ): boolean => {
    if (
      repo ||
      song.kind !== 'song' ||
      !song.body ||
      !served.has('globe_event')
    )
      return false;
    const slug = `song-${song.slug}`;
    const existing = findBySlug('globe_event', slug);
    const previous = existing?.body ?? null;
    const body = deriveEventBody(song.slug, song.body, previous);
    if (previous && jsonEqual(previous, body)) return false;
    let event = existing;
    if (!event) {
      event = createItem('globe_event', slug, at, userId);
      event.status = song.status;
    }
    event.body = body;
    event.derivedFromId = song.id;
    event.derivedFromSlug = song.slug;
    event.updatedAt = at;
    event.updatedById = userId;
    addRevision(event, body, note, userId, at);
    touch(event);
    return true;
  };

  /**
   * An artist release moved some lead acts' basedInPlaceId: their songs'
   * events are derived again, so the pins follow on the next globe_event
   * publish (contract §5b, proposed; design §5.1 "Pin moves"). Placement
   * reads the live release, which by now is the new one.
   */
  const rederiveLeadActs = (
    before: StoredRelease | undefined,
    after: StoredRelease,
    userId: string,
  ) => {
    if (after.kind !== 'artist' || !served.has('globe_event')) return 0;
    const basedIn = (release: StoredRelease | undefined) =>
      new Map(
        (release?.entries ?? []).map((entry) => [
          entry.slug,
          str(entry.body.basedInPlaceId),
        ]),
      );
    const was = basedIn(before);
    const is = basedIn(after);
    const moved = new Set(
      [...new Set([...was.keys(), ...is.keys()])].filter(
        (slug) => was.get(slug) !== is.get(slug),
      ),
    );
    if (moved.size === 0) return 0;
    const at = now();
    const note = `Derived again: its lead act's basedInPlaceId changed in artist v${after.version}`;
    let count = 0;
    for (const song of [...items.values()]) {
      if (song.kind !== 'song' || song.deleted || !song.body) continue;
      if (!moved.has(leadArtistSlug(song.body))) continue;
      if (deriveSongEvent(song, at, userId, note)) count += 1;
    }
    return count;
  };

  // ── Handlers ──

  /**
   * The contract's capabilities (priority 2). Repo mode (design A.5)
   * reports every kind it serves as authoritative, with no bundle (it
   * publishes nothing), no asset upload, and `store: 'repo'`, a field of its
   * own outside the contract, so the console can say where a save lands.
   */
  const capabilities = () => ({
    kinds: kindsFor(mode).map((kind) => ({
      kind,
      schemaVersion: schemaVersionOf(kind, mode),
      // A new kind reports its bundle from its first live release.
      bundle: releases.some(
        (release) => release.kind === kind && release.publishedAt,
      )
        ? BUNDLE[kind]
        : null,
      identity: identityOf(kind),
      authoritative: authoritativeIn(kind, mode),
    })),
    features: {
      export: true,
      lookup: true,
      create: true,
      rename: false,
      merge: false,
      asset: !repo,
      teachUsage: false,
      suggestions: true,
    },
    // The mock runs the repo's files, which are the open draft when there
    // is one (manifest.json), so it reports that draft's number: artifacts 3
    // beside song and event level 2 would be a server no one can run.
    artifactsVersion:
      (CONTRACT_MANIFEST as { draftVersion?: number }).draftVersion ??
      CONTRACT_MANIFEST.artifactsVersion,
    ...(repo ? { store: 'repo' as const } : {}),
  });

  /**
   * One row per kind. In repo mode nothing is released: what has changed
   * since the last publish is what git has not committed (`uncommitted`),
   * and there is no live version.
   */
  const overview = (): ContentOverviewRow[] =>
    kindsFor(mode).map((kind) => {
      const ofKind = [...items.values()].filter(
        (item) => item.kind === kind && !item.deleted,
      );
      if (repo)
        return {
          kind,
          total: ofKind.length,
          published: ofKind.filter(
            (item) => item.status === 'published' && item.body !== null,
          ).length,
          changedSincePublish: uncommitted?.(kind) ?? 0,
          pendingReview: 0,
          liveVersion: null,
          livePublishedAt: null,
        };
      const live = liveRelease(kind);
      const liveIds = new Set(live?.entries?.map((entry) => entry.itemId));
      let changedSincePublish = 0;
      for (const item of ofKind) {
        const publishable = item.status === 'published' && item.body !== null;
        const entry = live ? liveEntry(kind, item.slug) : undefined;
        if (publishable) {
          if (
            !entry ||
            entry.itemId !== item.id ||
            (entry.body !== item.body &&
              !jsonEqual(entry.body, compile(item.body!, item.overrides)))
          )
            changedSincePublish += 1;
        } else if (liveIds.has(item.id)) {
          changedSincePublish += 1;
        }
      }
      // Items in the live release that have since been deleted also change it.
      for (const entry of live?.entries ?? []) {
        if (items.get(entry.itemId)?.deleted) changedSincePublish += 1;
      }
      return {
        kind,
        total: ofKind.length,
        published: ofKind.filter(
          (item) => item.status === 'published' && item.body !== null,
        ).length,
        changedSincePublish,
        pendingReview: ofKind.filter((item) => item.editState === 'pending')
          .length,
        liveVersion: live?.version ?? null,
        livePublishedAt: live?.publishedAt ?? null,
      };
    });

  /**
   * Where each song would be pinned, by the contract's placement order:
   * lead act → that artist's basedInPlaceId (live) → artist_location → New York.
   */
  const derivationHealth = () => {
    const songs = [...items.values()].filter(
      (item) =>
        item.kind === 'song' &&
        !item.deleted &&
        item.body !== null &&
        item.status !== 'archived',
    );
    const locations = artistLocations();

    const placedBy = { basedInPlace: 0, artistLocation: 0, defaulted: 0 };
    const unmatched = new Map<
      string,
      { slug: string; artist: string; songCount: number; songs: string[] }
    >();

    for (const song of songs) {
      const body = song.body!;
      const artist = String(body.artist ?? '');
      const { artist: slug, by } = placeSong(body, locations);
      placedBy[by] += 1;
      if (by === 'defaulted') {
        const row = unmatched.get(slug) ?? {
          slug,
          artist,
          songCount: 0,
          songs: [],
        };
        row.songCount += 1;
        row.songs.push(song.slug);
        unmatched.set(slug, row);
      }
    }

    const unmatchedArtists = [...unmatched.values()].sort(
      (a, b) => b.songCount - a.songCount || a.slug.localeCompare(b.slug),
    );
    const base = {
      totalSongs: songs.length,
      matched: songs.length - placedBy.defaulted,
      defaultedToNewYork: placedBy.defaulted,
      artistLocationCount: locations.size,
    };
    // Today's response has no placedBy and no slug key per row.
    return mode === 'legacy'
      ? {
          ...base,
          unmatchedArtists: unmatchedArtists.map(
            ({ artist, songCount, songs: ids }) => ({
              artist,
              songCount,
              songs: ids,
            }),
          ),
        }
      : { ...base, placedBy, unmatchedArtists };
  };

  const listItems = (query: Record<string, string>, viewer: MockViewer) => {
    const kind = requireKind(query.kind);
    const status = query.status;
    if (status && !['draft', 'published', 'archived'].includes(status))
      fail(400, 'BAD_REQUEST', `Unknown status "${status}".`);
    const search = (query.search ?? '').trim().toLowerCase();
    // The contract sets no page size for /items and the console's tables do
    // not follow nextCursor yet, so with no `limit` every match comes back.
    const limit =
      query.limit === undefined
        ? Infinity
        : parseLimit(query.limit, LIST_MAX_LIMIT, LIST_MAX_LIMIT);
    const offset = decodeCursor(query.cursor);

    const rows = [...items.values()]
      .filter(
        (item) =>
          item.kind === kind &&
          visibleTo(item, viewer) &&
          (!status || item.status === status),
      )
      .map(listItem)
      .filter((row) => !search || row.title.toLowerCase().includes(search))
      .sort(
        (a, b) =>
          a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) ||
          (a.slug < b.slug ? -1 : 1),
      );
    const page = rows.slice(offset, offset + limit);
    return {
      items: page,
      nextCursor:
        offset + limit < rows.length ? encodeCursor(offset + limit) : null,
    };
  };

  const lookup = (query: Record<string, string>) => {
    if (!query.kind || !query.slug)
      fail(400, 'BAD_REQUEST', 'Both `kind` and `slug` are required.');
    const kind = requireKind(query.kind);
    // Finds everything create:true would refuse, whoever proposed it.
    const item = findBySlug(kind, query.slug);
    if (!item) return fail(404, 'NOT_FOUND', 'No such item.');
    return listItem(item);
  };

  const template = (kind: MockKind, slug: string) => {
    let nextId = 1;
    if (kind === 'chord_progression') {
      for (const item of items.values()) {
        const id = Number((item.body ?? item.pendingBody)?.id);
        if (item.kind === kind && Number.isFinite(id))
          nextId = Math.max(nextId, id + 1);
      }
    }
    const made = templateFor(kind, slug, nextId);
    return { ...made, slug: made.slug || slug };
  };

  /**
   * Repo mode's statuses: a song is published when `bundled.ts` registers
   * it and a draft otherwise, and nothing else has drafts. The status a
   * save asks for, as the files can hold it, with a warning when that is
   * not what was asked.
   */
  const repoStatus = (
    kind: MockKind,
    slug: string,
    asked: ContentStatus | undefined,
  ): {
    status: ContentStatus | undefined;
    warning: ValidationProblem | null;
  } => {
    if (!asked) return { status: undefined, warning: null };
    if (kind === 'song') {
      if (asked !== 'archived') return { status: asked, warning: null };
      return {
        status: 'draft',
        warning: {
          code: 'REPO_NO_DRAFTS',
          slug,
          detail:
            'Repo mode keeps no archive: an archived song is saved as a draft, which bundled.ts does not register, so students do not see it.',
          severity: 'warning',
        },
      };
    }
    if (asked === 'published') return { status: asked, warning: null };
    return {
      status: 'published',
      warning: {
        code: 'REPO_NO_DRAFTS',
        slug,
        // Kind-neutral: students never read a studio, label or release, so
        // the change goes out with the deploy without students seeing it.
        detail: `Repo mode has no drafts for a ${kind.replace(/_/g, ' ')}: it is saved into its file as it is, and the change goes out with the next commit and deploy.`,
        severity: 'warning',
      },
    };
  };

  const putItem = (input: unknown, viewer: MockViewer) => {
    if (!isPlainObject(input))
      return fail(400, 'BAD_REQUEST', 'Expected JSON.');
    const kind = requireKind(input.kind);
    requireWritable(kind);
    const slug = input.slug;
    if (typeof slug !== 'string' || !slug)
      return fail(400, 'BAD_REQUEST', '`slug` is required.');
    const body = input.body;
    if (!isPlainObject(body))
      return fail(400, 'BAD_REQUEST', '`body` must be an object.');
    const asked = input.status as ContentStatus | undefined;
    if (asked && !['draft', 'published', 'archived'].includes(asked))
      fail(400, 'BAD_REQUEST', `Unknown status "${String(asked)}".`);
    const note =
      typeof input.note === 'string' && input.note.trim()
        ? input.note.trim()
        : null;
    const overrides = isPlainObject(input.overrides) ? input.overrides : null;
    if (repo && overrides)
      fail(
        400,
        'BAD_REQUEST',
        'Repo mode saves bodies only: overrides need the content API.',
      );
    // Today's server does not know `expectedRevision`, and drops it.
    const expected = mode === 'legacy' ? undefined : input.expectedRevision;
    if (
      expected !== undefined &&
      (typeof expected !== 'number' ||
        !Number.isInteger(expected) ||
        expected < 0)
    )
      fail(
        400,
        'BAD_REQUEST',
        '`expectedRevision` is the revision the edit started from: a whole number.',
      );
    const { status, warning } = repo
      ? repoStatus(kind, slug, asked)
      : { status: asked, warning: null };

    const existing = findBySlug(kind, slug);
    // Today's server does not know `create` and runs its upsert.
    if (mode !== 'legacy' && input.create === true && existing)
      fail(409, 'SLUG_TAKEN', `A ${kind} with the slug "${slug}" exists.`, {
        kind,
        slug,
        id: existing.id,
      });
    // The item moved since the edit started from it (contract 5b): nothing
    // is written, and the answer says where it is now. One that is gone has
    // no revision to be at.
    if (expected !== undefined && (existing?.revision ?? null) !== expected)
      fail(
        409,
        'REVISION_CONFLICT',
        existing
          ? `This ${kind.replace(/_/g, ' ')} changed since you opened it (revision ${expected}, now ${existing.revision}). Reload it and make the change again.`
          : `This ${kind.replace(/_/g, ' ')} is no longer here. Reload to see where it went.`,
        { revision: existing?.revision ?? null },
      );

    const problems = [
      ...checkWrite(kind, slug, body),
      ...(warning ? [warning] : []),
    ];
    const at = now();
    let item = existing;

    item ??= createItem(kind, slug, at, viewer.userId);

    if (viewer.role === 'admin') {
      item.body = body;
      if ('overrides' in input) item.overrides = overrides;
      item.status = status ?? item.status;
      item.updatedAt = at;
      item.updatedById = viewer.userId;
      addRevision(item, body, note, viewer.userId, at);
      deriveSongEvent(item, at, viewer.userId);
    } else {
      // A proposal: the live body and status stay as they are.
      item.pendingBody = body;
      item.pendingOverrides = overrides;
      item.pendingNote = note;
      item.pendingAt = at;
      item.pendingById = viewer.userId;
      item.editState = 'pending';
      item.reviewNote = null;
      // Accepts saved into this proposal earlier and taken out of it now
      // never happened.
      log.prune(item.id, (decision) => decisionHolds(body, decision));
    }
    touch(item);
    changed();

    const result = detail(item, viewer);
    return mode === 'legacy'
      ? result
      : { item: result, warnings: problems.filter((p) => !isError(p)) };
  };

  /** A checked proposal made the live body, its accepts confirmed. */
  const approveProposal = (item: StoredItem, viewer: MockViewer, at: Date) => {
    const approved = item.pendingBody;
    if (!approved) return;
    item.body = approved;
    item.overrides = item.pendingOverrides ?? item.overrides;
    item.status = 'published';
    addRevision(item, approved, item.pendingNote, item.pendingById, at);
    item.pendingBody = null;
    item.pendingOverrides = null;
    item.pendingNote = null;
    item.pendingAt = null;
    item.pendingById = null;
    item.editState = null;
    item.reviewNote = null;
    item.reviewedAt = at;
    item.updatedAt = at;
    item.updatedById = viewer.userId;
    deriveSongEvent(item, at, viewer.userId);
    // The accepts the proposal carries are the owner's now; one its body no
    // longer holds was taken out again before it was approved.
    log.confirm(item.id, (decision) => decisionHolds(approved, decision));
    touch(item);
    changed();
  };

  /**
   * The records an editor's accepts in this proposal had made first (the
   * release an Album row names), and the ones accepts in those made in turn
   * (the label a Label row put on that release), each still a new proposal
   * of the same editor: approved with it, in publish order, so the item
   * never goes live naming a record that is only a proposal. One that
   * another editor proposed stops the approval: that is theirs to review.
   */
  const recordsMadeFor = (item: StoredItem): StoredItem[] => {
    const wanted = new Map<string, StoredItem>();
    const walk = (proposed: StoredItem) => {
      for (const decision of log.all()) {
        if (decision.proposedIn !== proposed.id) continue;
        if (!decisionHolds(proposed.pendingBody, decision)) continue;
        for (const record of decision.requires ?? []) {
          const held = findBySlug(record.kind, record.slug);
          if (
            !held ||
            held.deleted ||
            held.id === item.id ||
            wanted.has(held.id) ||
            !isNewProposal(held) ||
            held.editState !== 'pending'
          )
            continue;
          if (held.pendingById !== item.pendingById)
            fail(
              409,
              'PENDING_PROPOSAL',
              `The ${held.kind.replace(/_/g, ' ')} "${held.slug}" this proposal's accepts name is another editor's proposal: review that first.`,
            );
          wanted.set(held.id, held);
          walk(held);
        }
      }
    };
    walk(item);
    return [...wanted.values()].sort(
      (a, b) => ALL_KINDS.indexOf(a.kind) - ALL_KINDS.indexOf(b.kind),
    );
  };

  const approve = (id: string, viewer: MockViewer) => {
    requireAdmin(viewer);
    const item = getVisible(id, viewer);
    if (item.editState !== 'pending' || !item.pendingBody)
      return fail(400, 'BAD_REQUEST', 'Nothing is pending on this item.');
    const records = recordsMadeFor(item);
    // The same checks as an admin's PUT, against the store as it is now:
    // every record first, so nothing is approved when one would fail.
    for (const record of records)
      checkWrite(record.kind, record.slug, record.pendingBody!);
    checkWrite(item.kind, item.slug, item.pendingBody);
    const at = now();
    for (const record of records) approveProposal(record, viewer, at);
    approveProposal(item, viewer, at);
    return detail(item, viewer);
  };

  const reject = (id: string, input: unknown, viewer: MockViewer) => {
    requireAdmin(viewer);
    const item = getVisible(id, viewer);
    const note =
      isPlainObject(input) && typeof input.note === 'string'
        ? input.note.trim()
        : '';
    if (!note)
      return fail(400, 'BAD_REQUEST', 'Say why when sending an edit back.');
    if (item.editState !== 'pending')
      return fail(400, 'BAD_REQUEST', 'Nothing is pending on this item.');
    item.editState = 'rejected';
    item.reviewNote = note;
    item.reviewedAt = now();
    touch(item);
    changed();
    return detail(item, viewer);
  };

  const discard = (id: string, viewer: MockViewer) => {
    const item = getVisible(id, viewer);
    if (!item.pendingBody)
      return fail(400, 'BAD_REQUEST', 'There is no proposal to discard.');
    if (viewer.role === 'editor' && item.pendingById !== viewer.userId)
      return fail(403, 'FORBIDDEN', 'Only its author can withdraw a proposal.');
    const result = detail(item, viewer);
    // Accepts saved into the proposal go with it: they never happened.
    log.withdraw(item.id);
    if (isNewProposal(item)) {
      // It never existed outside the proposal, so nothing is left behind.
      item.deleted = true;
      bySlug.delete(slugKey(item.kind, item.slug));
    } else {
      item.pendingBody = null;
      item.pendingOverrides = null;
      item.pendingNote = null;
      item.pendingAt = null;
      item.pendingById = null;
      item.editState = null;
      item.reviewNote = null;
    }
    touch(item);
    changed();
    return { ...result, pendingBody: null, editState: null };
  };

  /**
   * Every other item whose working body or proposal names `target` through
   * a reference path (`refPathsTargeting`), one row per field that does:
   * what a 409 `REFERENCED` lists (contract priority 7, "Delete").
   */
  const referrersOf = (target: StoredItem) => {
    const paths = refPathsTargeting(target.kind);
    const kinds = new Set(paths.map((entry) => entry.kind as string));
    const referrers: {
      kind: MockKind;
      id: string;
      slug: string;
      title: string;
      path: string;
    }[] = [];
    for (const item of items.values()) {
      if (item.deleted || item.id === target.id || !kinds.has(item.kind))
        continue;
      const bodies = [
        item.body && compile(item.body, item.overrides),
        item.pendingBody &&
          compile(item.pendingBody, item.pendingOverrides ?? item.overrides),
      ].filter((body): body is Body => !!body);
      const seen = new Set<string>();
      for (const entry of paths) {
        if (entry.kind !== item.kind) continue;
        for (const body of bodies)
          for (const { path, value } of valuesAt(body, entry.path)) {
            if (value !== target.slug || seen.has(path)) continue;
            seen.add(path);
            referrers.push({
              kind: item.kind,
              id: item.id,
              slug: item.slug,
              title: projectItem(item).title,
              path,
            });
          }
      }
    }
    return referrers;
  };

  const remove = (
    id: string,
    query: Record<string, string>,
    viewer: MockViewer,
  ) => {
    requireAdmin(viewer);
    const item = getVisible(id, viewer);
    requireWritable(item.kind);
    // bundled.ts registers a published song, and code refers to it.
    if (repo && item.kind === 'song' && item.status === 'published')
      fail(
        422,
        'REPO_BAD_CHANGE',
        'Students see this song: bundled.ts registers it, and code refers to it. Make it a draft first, which takes it out of bundled.ts, and then delete it.',
      );
    // A vocabulary record goes only when nothing names it (the vocabulary
    // design, section 4), and `force` does not apply: a code table naming
    // a gone record breaks the app, and no check would catch a field left
    // naming nothing.
    if (isVocabularyKind(item.kind)) {
      const found = references(item.kind, item.slug, {
        records: heldVocabulary(),
        edges: bodyReferences(items.values()),
        codeTables: vocabularySources.codeTables,
      });
      if (found.length) {
        const referrers = referrersFrom(found, (kind, slug) => {
          const held = findBySlug(kind, slug);
          return held
            ? { id: held.id, title: projectItem(held).title }
            : undefined;
        });
        fail(
          409,
          'REFERENCED',
          `${found.length === 1 ? 'One thing still names' : `${found.length} things still name`} this ${item.kind}: ${referrers
            .slice(0, 3)
            .map((referrer) => `${referrer.title} (${referrer.path})`)
            .join(
              '; ',
            )}${found.length > 3 ? ` and ${found.length - 3} more` : ''}. A ${item.kind} is deleted only once nothing names it, so take it off those first.`,
          { referrers },
        );
      }
    }
    // Today's API checks no references; `force` deletes anyway, and what
    // named the item then shows up as validation problems.
    else if (mode !== 'legacy' && query.force !== 'true') {
      const referrers = referrersOf(item);
      if (referrers.length)
        fail(
          409,
          'REFERENCED',
          `${referrers.length === 1 ? 'Another item names' : `${referrers.length} fields of other items name`} this ${item.kind.replace(/_/g, ' ')}: ${referrers
            .slice(0, 3)
            .map((referrer) => `${referrer.title} (${referrer.path})`)
            .join(
              '; ',
            )}${referrers.length > 3 ? ` and ${referrers.length - 3} more` : ''}. Unlink it there first.`,
          { referrers },
        );
    }
    item.deleted = true;
    item.updatedAt = now();
    item.updatedById = viewer.userId;
    bySlug.delete(slugKey(item.kind, item.slug));
    // A proposal deleted with its item takes its accepts with it.
    log.withdraw(item.id);
    touch(item);
    changed();
    return { id: item.id, deleted: true };
  };

  const pending = (viewer: MockViewer): PendingEdit[] => {
    requireAdmin(viewer);
    return [...items.values()]
      .filter(
        (item) =>
          !item.deleted && item.editState === 'pending' && item.pendingBody,
      )
      .sort(
        (a, b) => (b.pendingAt?.getTime() ?? 0) - (a.pendingAt?.getTime() ?? 0),
      )
      .map((item) => {
        const projection = project(item.kind, item.pendingBody, item.slug);
        return {
          id: item.id,
          kind: item.kind,
          slug: item.slug,
          title: projection.title,
          subtitle: projection.subtitle,
          isNew: isNewProposal(item),
          note: item.pendingNote,
          submittedAt: item.pendingAt,
          submittedBy: item.pendingById
            ? {
                id: item.pendingById,
                name: users.get(item.pendingById) ?? item.pendingById,
              }
            : null,
        };
      });
  };

  const validateKind = (kind: MockKind) => {
    const problems = kindProblems(
      kind,
      [...items.values()]
        .filter(
          (item) => item.kind === kind && !item.deleted && item.body !== null,
        )
        .map((item) => ({
          slug: item.slug,
          body: compile(item.body!, item.overrides),
          status: item.status,
        })),
    );
    return { ok: !problems.some(isError), problems };
  };

  const exportItems = (query: Record<string, string>, viewer: MockViewer) => {
    const kind = requireKind(query.kind);
    const view = query.view ?? 'working';
    if (view !== 'working' && view !== 'published')
      fail(400, 'BAD_REQUEST', '`view` is `working` or `published`.');
    const omit = (query.omit ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);
    for (const key of omit)
      if (!EXPORT_OMITTABLE.has(key))
        fail(400, 'BAD_REQUEST', `\`omit\` cannot drop "${key}".`);
    const limit = parseLimit(
      query.limit,
      EXPORT_DEFAULT_LIMIT,
      EXPORT_MAX_LIMIT,
    );
    const offset = decodeCursor(query.cursor);

    const strip = (body: Body | null) => {
      if (!body || omit.length === 0) return body;
      const copy = { ...body };
      for (const key of omit) delete copy[key];
      return copy;
    };

    type ExportRow = {
      id: string;
      slug: string;
      status: ContentStatus;
      editState: ContentEditState;
      updatedAt: Date;
      body: Body | null;
      pendingBody?: Body;
      /** Contract 5b: the item's revision (working view only). */
      revision?: number;
    };
    let rows: ExportRow[];

    // Repo mode releases nothing: the files are what is published.
    if (view === 'published' && !repo) {
      const live = liveRelease(kind);
      rows = (live?.entries ?? []).map((entry) => ({
        id: entry.itemId,
        slug: entry.slug,
        status: 'published',
        editState: null,
        updatedAt: live!.publishedAt ?? live!.startedAt,
        body: strip(entry.body),
      }));
    } else {
      rows = [];
      for (const item of items.values()) {
        if (item.kind !== kind || !visibleTo(item, viewer)) continue;
        const stored = item.body && compile(item.body, item.overrides);
        const proposal =
          item.pendingBody &&
          compile(item.pendingBody, item.pendingOverrides ?? item.overrides);
        const row: ExportRow = {
          id: item.id,
          slug: item.slug,
          status: item.status,
          editState: item.editState,
          updatedAt: item.updatedAt,
          body: stored,
          revision: item.revision,
        };
        if (viewer.role === 'admin') {
          if (proposal) row.pendingBody = strip(proposal)!;
        } else if (proposal && item.pendingById === viewer.userId) {
          // The editor's own view: their proposal is the body.
          row.body = proposal;
        }
        row.body = strip(row.body);
        rows.push(row);
      }
    }
    rows.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    return {
      items: rows.slice(offset, offset + limit),
      nextCursor:
        offset + limit < rows.length ? encodeCursor(offset + limit) : null,
    };
  };

  // ── Releases ──

  const findRelease = (id: string) => {
    const release = releases.find((entry) => entry.id === id);
    if (!release) return fail(404, 'NOT_FOUND', 'No such release.');
    return release;
  };

  const createRelease = (input: unknown, viewer: MockViewer) => {
    requireAdmin(viewer);
    const kind = requireKind(isPlainObject(input) ? input.kind : undefined);
    if (
      releases.some(
        (release) => release.kind === kind && release.status === 'building',
      )
    )
      fail(
        409,
        'RELEASE_IN_PROGRESS',
        `A ${kind} release is already building.`,
      );

    const entries: ReleaseEntry[] = [...items.values()]
      .filter(
        (item) =>
          item.kind === kind &&
          !item.deleted &&
          item.status === 'published' &&
          item.body !== null,
      )
      .map((item) => ({
        itemId: item.id,
        slug: item.slug,
        body: compile(item.body!, item.overrides),
      }))
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

    // Every error /validate would report for these items blocks, so the
    // console's "would block a publish" is true: today's codes as well as the
    // contract's reference errors.
    const building = { kind, slugs: new Set(entries.map((e) => e.slug)) };
    const blocking = kindProblems(
      kind,
      entries.map((entry) => ({
        slug: entry.slug,
        body: entry.body,
        status: 'published' as const,
      })),
      building,
    ).filter(isError);
    if (blocking.length > 0)
      fail(
        422,
        'VALIDATION_FAILED',
        failureMessage(
          `${blocking.length} problem${blocking.length === 1 ? ' blocks' : 's block'} this ${kind.replace(/_/g, ' ')} publish`,
          blocking,
          true,
        ),
        { problems: blocking },
      );

    seq += 1;
    const version =
      Math.max(
        0,
        ...releases
          .filter((release) => release.kind === kind)
          .map((release) => release.version),
      ) + 1;
    const release: StoredRelease = {
      id: `rel-${seq.toString(36)}-${kind}-v${version}`,
      kind,
      version,
      status: 'building',
      itemCount: entries.length,
      totalBytes: 0,
      objectKeys: [],
      error: null,
      startedAt: now(),
      publishedAt: null,
      parts: shardIndices(entries.length),
      partsDone: [],
      entries,
      seeded: false,
    };
    releases.push(release);
    changed();
    return {
      releaseId: release.id,
      version,
      itemCount: entries.length,
      parts: [...release.parts],
    };
  };

  const buildPart = (id: string, rawPart: string, viewer: MockViewer) => {
    requireAdmin(viewer);
    const release = findRelease(id);
    if (release.status !== 'building')
      fail(409, 'RELEASE_NOT_BUILDING', `This release is ${release.status}.`);
    const part = Number(rawPart);
    if (!release.parts.includes(part))
      fail(400, 'BAD_REQUEST', `This release has no part ${rawPart}.`);
    if (!release.partsDone.includes(part)) release.partsDone.push(part);
    const text = shardTexts(release)[part];
    changed();
    return {
      ok: true,
      part,
      objectKey: bundleKey(
        BUNDLE[release.kind] ?? release.kind,
        release.version,
        part,
      ),
      bytes: text.length,
    };
  };

  const activate = (id: string, viewer: MockViewer) => {
    requireAdmin(viewer);
    const release = findRelease(id);
    if (release.status !== 'building')
      fail(409, 'RELEASE_NOT_BUILDING', `This release is ${release.status}.`);
    const missing = release.parts.filter(
      (part) => !release.partsDone.includes(part),
    );
    if (missing.length > 0)
      fail(409, 'PARTS_MISSING', `Parts ${missing.join(', ')} are not built.`);
    const previous = liveRelease(release.kind);
    if (previous) previous.status = 'superseded';
    const texts = shardTexts(release);
    release.status = 'live';
    release.publishedAt = now();
    release.totalBytes = texts.reduce((sum, text) => sum + text.length, 0);
    release.objectKeys = texts.map((_, part) =>
      bundleKey(BUNDLE[release.kind] ?? release.kind, release.version, part),
    );
    rederiveLeadActs(previous, release, viewer.userId);
    changed();
    return publicRelease(release);
  };

  const cancel = (id: string, viewer: MockViewer) => {
    requireAdmin(viewer);
    const release = findRelease(id);
    if (release.status !== 'building')
      fail(409, 'RELEASE_NOT_BUILDING', `This release is ${release.status}.`);
    release.status = 'failed';
    release.error = 'Cancelled by an admin.';
    changed();
    return publicRelease(release);
  };

  const rollback = (input: unknown, viewer: MockViewer) => {
    requireAdmin(viewer);
    const kind = requireKind(isPlainObject(input) ? input.kind : undefined);
    const version = isPlainObject(input) ? Number(input.version) : NaN;
    const target = releases.find(
      (release) => release.kind === kind && release.version === version,
    );
    if (!target) return fail(404, 'NOT_FOUND', 'No such release.');
    if (target.status !== 'superseded' && target.status !== 'rolled_back')
      fail(409, 'NOT_ROLLBACKABLE', `v${version} is ${target.status}.`);
    if (!target.entries)
      fail(
        409,
        'SNAPSHOT_PRUNED',
        `The offline mock no longer keeps v${version}’s items, so it cannot be restored.`,
      );
    const current = liveRelease(kind);
    if (current) current.status = 'rolled_back';
    target.status = 'live';
    rederiveLeadActs(current, target, viewer.userId);
    changed();
    return publicRelease(target);
  };

  // ── Mock CDN ──

  const shardCache = new WeakMap<StoredRelease, string[]>();
  function shardTexts(release: StoredRelease): string[] {
    let texts = shardCache.get(release);
    if (!texts) {
      const entries = release.entries ?? [];
      texts = release.parts.map((part) =>
        JSON.stringify(
          entries
            .slice(part * SHARD_SIZE, (part + 1) * SHARD_SIZE)
            .map((entry) => entry.body),
        ),
      );
      shardCache.set(release, texts);
    }
    return texts;
  }

  /** The CDN manifest.json, built from each kind's live release. */
  const cdnManifest = (): ContentManifest => {
    const kinds: ContentManifest['kinds'] = {};
    for (const kind of kindsFor(mode)) {
      const bundle = BUNDLE[kind];
      const live = liveRelease(kind);
      if (!bundle || !live?.entries) continue;
      const texts = shardTexts(live);
      kinds[bundle] = {
        version: live.version,
        itemCount: live.itemCount,
        objects: texts.map(
          (text, part): BundleObject => ({
            key: bundleKey(bundle, live.version, part),
            bytes: text.length,
            sha256: fnv(text, 0x811c9dc5) + fnv(text, 0x5bd1e995),
          }),
        ),
        publishedAt: live.publishedAt?.toISOString() ?? null,
      };
    }
    return { schemaVersion: 1, generatedAt: now().toISOString(), kinds };
  };

  /** One bundle object, as the JSON text the CDN would serve. */
  const cdnObjectText = (key: string): string | null => {
    const match = /^content\/([^/]+)\/v(\d+)\/part-(\d+)\.json$/.exec(key);
    if (!match) return null;
    const [, bundle, version, part] = match;
    const release = releases.find(
      (entry) =>
        BUNDLE[entry.kind] === bundle &&
        entry.version === Number(version) &&
        entry.entries !== null &&
        entry.publishedAt !== null,
    );
    return release ? (shardTexts(release)[Number(part)] ?? null) : null;
  };

  // ── Suggestions (contract §10; design decisions 9–10, §5.3) ──

  /**
   * When a person last saved an item's live body, for a decision to compare
   * with; null while it is the seed's, which came before every decision
   * whatever date the seed gives it. A replay's saves are left out
   * (`isReplayNote`): they write back what was decided, so a store replayed
   * from one `decisions.json` still takes a fuller one's accepts.
   */
  const savedSince = (item: StoredItem): Date | null => {
    let saved: Date | null = item.revisions.length ? null : item.updatedAt;
    for (let at = item.revisions.length - 1; at >= 0 && !saved; at -= 1)
      if (!isReplayNote(item.revisions[at].note))
        saved = item.revisions[at].createdAt;
    return !saved || saved.getTime() === SEED_EPOCH.getTime() ? null : saved;
  };

  const catalog = createSuggestionCatalog({
    imported: suggestionSources.imported,
    app: suggestionSources.app,
    input: () =>
      plannerInput(
        items.values(),
        suggestionSources.imported ?? [],
        now().getUTCFullYear(),
      ),
    generation: () => generation,
  });

  const decisionHost: DecisionHost = {
    item(kind, slug) {
      const item = findBySlug(kind, slug);
      if (!item || item.deleted) return null;
      return {
        id: item.id,
        body: item.body,
        pendingBody: item.pendingBody,
        editState: item.editState,
        pendingById: item.pendingById,
        pendingByName: item.pendingById
          ? (users.get(item.pendingById) ?? null)
          : null,
        savedAt: savedSince(item),
      };
    },
    // The same path an item PUT takes: validated, revisioned, a proposal for
    // an editor, derived onward for a song.
    put: (body, viewer) =>
      handle({ method: 'PUT', path: '/items', body, viewer }),
    validate(kind, slug, body) {
      try {
        checkWrite(requireKind(kind), slug, body);
        return { status: 200, body: null };
      } catch (caught) {
        if (caught instanceof HttpError)
          return { status: caught.status, body: caught.body };
        throw caught;
      }
    },
    findPlace(body) {
      const wanted = placeSpotOf(body);
      if (!wanted) return null;
      for (const item of items.values()) {
        if (item.kind !== 'globe_city' || item.deleted) continue;
        const held = item.body ?? item.pendingBody;
        const spot = held ? placeSpotOf(held) : null;
        if (spot && samePlace(spot, wanted)) return item.slug;
      }
      return null;
    },
    suggestion: (id) => catalog.get(id),
    isCalibrated: (batch) =>
      (suggestionSources.batches ?? []).some(
        (entry) => entry.batch === batch && entry.calibrated,
      ),
    schemaLevel: (kind) =>
      served.has(kind) ? schemaVersionOf(kind as MockKind, mode) : 1,
    now,
    log,
  };

  /** Each suggestion's body for one viewer, as its status is read against. */
  const viewFor =
    (viewer: MockViewer): ViewOf =>
    (kind, slug) => {
      const item = findBySlug(kind, slug);
      if (!item || !visibleTo(item, viewer)) return null;
      if (
        viewer.role === 'editor' &&
        item.pendingBody &&
        item.pendingById === viewer.userId
      )
        return { body: item.pendingBody, context: { savedAt: item.pendingAt } };
      return {
        body: item.body,
        context: {
          savedAt: savedSince(item),
          pending: !!item.pendingBody,
        },
      };
    };

  /** A comma-separated query value, each checked against what it may be. */
  const listOf = <T extends string>(
    raw: string | undefined,
    allowed: readonly T[] | null,
    name: string,
  ): Set<T> | undefined => {
    if (raw === undefined || raw === '') return undefined;
    const values = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    for (const value of values)
      if (allowed && !allowed.includes(value as T))
        fail(
          400,
          'BAD_REQUEST',
          `\`${name}\` is one or more of ${allowed.join(', ')}; got "${value}".`,
        );
    return new Set(values as T[]);
  };

  const oneOf = <T extends string>(
    raw: string | undefined,
    allowed: readonly T[],
    name: string,
  ): T | undefined => {
    if (raw === undefined || raw === '') return undefined;
    if (!allowed.includes(raw as T))
      fail(
        400,
        'BAD_REQUEST',
        `\`${name}\` is one of ${allowed.join(', ')}; got "${raw}".`,
      );
    return raw as T;
  };

  const listSuggestions = (
    query: Record<string, string>,
    viewer: MockViewer,
  ) => {
    const filter: SuggestionFilter = {
      kind: query.kind ? requireKind(query.kind) : undefined,
      slugs: listOf(query.slug, null, 'slug'),
      ids: listOf(query.id, null, 'id'),
      path: query.path || undefined,
      provider: oneOf(query.provider, PROVIDERS, 'provider'),
      tier: oneOf(query.tier, TIERS, 'tier'),
      batch: query.batch || undefined,
      statuses: listOf(query.status, SUGGESTION_STATUSES, 'status'),
      decisions: listOf(query.decision, DECISION_STATES, 'decision'),
      unreviewed: query.unreviewed === '1' || query.unreviewed === 'true',
    };
    const limit = parseLimit(
      query.limit,
      SUGGESTIONS_DEFAULT_LIMIT,
      SUGGESTIONS_MAX_LIMIT,
    );
    const offset = decodeCursor(query.cursor);
    const all = catalog.all();
    const rows = selectSuggestions(
      all,
      filter,
      viewFor(viewer),
      log.bySuggestion(),
      {
        suggestion: (id) => catalog.get(id),
        liveOf: (kind, slug) => decisionHost.item(kind, slug)?.body ?? null,
      },
    );
    return {
      items: rows.slice(offset, offset + limit),
      nextCursor:
        offset + limit < rows.length ? encodeCursor(offset + limit) : null,
      total: rows.length,
      batches: summarizeBatches(all, suggestionSources.batches ?? []),
      decisions: log.counts(),
      replay: replayReport,
      /** What the mock could not serve, and why: for the console to say so. */
      notServed: {
        artifacts: [...(suggestionSources.refused ?? [])],
        planners: suggestionSources.app
          ? catalog.appError()
          : 'The Stage-1 planners (src/content/linking) are not loaded.',
      },
    };
  };

  const postDecisions = (input: unknown, viewer: MockViewer) => {
    const list = isPlainObject(input) ? input.decisions : undefined;
    if (!Array.isArray(list) || list.length === 0)
      fail(400, 'BAD_REQUEST', '`decisions` must be a list of decisions.');
    // The bulk dialog's threshold: taken as sent, and never below the floor
    // (`whyNotBulk`), so 0.5 asks for 0.7.
    const threshold = isPlainObject(input) ? input.threshold : undefined;
    if (
      threshold !== undefined &&
      (typeof threshold !== 'number' ||
        !Number.isFinite(threshold) ||
        threshold < 0 ||
        threshold > 1)
    )
      fail(
        400,
        'BAD_REQUEST',
        '`threshold` is the lowest confidence a bulk accept takes, from 0 to 1 (never below 0.7, whatever is sent).',
      );
    const entries = list as unknown[];
    if (entries.length > DECISIONS_MAX)
      fail(
        400,
        'BAD_REQUEST',
        `At most ${DECISIONS_MAX} decisions go in one request.`,
      );
    const requests = entries.map((entry, index): DecisionRequest => {
      const at = `decisions[${index}]`;
      if (!isPlainObject(entry))
        return fail(400, 'BAD_REQUEST', `${at} must be an object.`);
      if (typeof entry.suggestionId !== 'string' || !entry.suggestionId)
        fail(400, 'BAD_REQUEST', `${at}.suggestionId is required.`);
      if (!DECISION_OPS.includes(entry.op as DecisionRequest['op']))
        fail(
          400,
          'BAD_REQUEST',
          `${at}.op is one of ${DECISION_OPS.join(', ')}.`,
        );
      // `import` is the bulk import's own, which calls `decide` in-process
      // and never comes this way.
      if (entry.method === 'import')
        fail(
          400,
          'BAD_REQUEST',
          `${at}.method is single or bulk: import is the bulk import’s own, run from the command line.`,
        );
      if (
        entry.method !== undefined &&
        entry.method !== 'single' &&
        entry.method !== 'bulk'
      )
        fail(400, 'BAD_REQUEST', `${at}.method is single or bulk.`);
      return {
        suggestionId: entry.suggestionId as string,
        op: entry.op as DecisionRequest['op'],
        ...(entry.method ? { method: entry.method as 'single' | 'bulk' } : {}),
        ...('value' in entry ? { value: entry.value } : {}),
        ...('seen' in entry ? { seen: entry.seen } : {}),
      };
    });
    const results = decide(requests, viewer, decisionHost, {
      ...(threshold !== undefined ? { threshold: threshold as number } : {}),
    });
    // A logged reject writes no item, but the log is part of what is saved.
    if (results.some((result) => result.outcome !== 'refused')) changed();
    // One decision alone answers with its own status, as an item PUT does.
    const [only] = results;
    if (results.length === 1 && only.outcome === 'refused')
      fail(only.status, only.code, only.error, {
        suggestionId: only.suggestionId,
        ...(only.current !== undefined ? { current: only.current } : {}),
      });
    return { results, decisions: log.counts() };
  };

  /**
   * Write the committed decisions.json's accepts again where the store has
   * lost them (decisions.ts `replayDecisions`). The browser adapter runs it
   * once the saved state is restored, and again after a Reset.
   */
  const replayCommittedDecisions = (): ReplayReport | null => {
    // Repo mode's store is the files: a replay there would write into them
    // on load, and whatever a file lacks now was taken out of it on purpose.
    if (mode === 'legacy' || repo || !committedDecisions) return null;
    replayReport = replayDecisions(committedDecisions, decisionHost);
    return replayReport;
  };

  // ── Router ──

  const route = (request: MockRequest): unknown => {
    const { viewer } = request;
    const method = request.method.toUpperCase();
    const query = request.query ?? {};
    const parts = request.path.split('/').filter(Boolean);
    const [head, second, third, fourth] = parts;
    const is = (verb: string, length: number) =>
      method === verb && parts.length === length;

    // Repo mode writes the files as it is asked: an editor's edit would be a
    // proposal, and there are none here (design A.6).
    if (repo && viewer.role !== 'admin')
      fail(
        403,
        'REPO_ADMIN_ONLY',
        'Repo mode is admin-only: a save here goes straight into the repo files. Proposals need the content API.',
      );
    if (repo) {
      const proposals =
        (head === 'pending' && parts.length === 1) ||
        (head === 'items' &&
          parts.length === 3 &&
          ['approve', 'reject', 'discard-edit'].includes(third));
      if (proposals) notInRepo('proposals');
      if (head === 'releases' || head === 'rollback') notInRepo('publishing');
    }

    if (head === 'capabilities' && is('GET', 1)) {
      if (mode === 'legacy') fail(404, 'NOT_FOUND', 'Not found.');
      return capabilities();
    }
    if (head === 'overview' && is('GET', 1)) return overview();
    if (head === 'derivation-health' && is('GET', 1)) return derivationHealth();
    if (head === 'pending' && is('GET', 1)) return pending(viewer);
    if (head === 'export' && is('GET', 1)) {
      if (mode === 'legacy') fail(404, 'NOT_FOUND', 'Not found.');
      return exportItems(query, viewer);
    }
    if (head === 'template' && is('GET', 2))
      return template(requireKind(second), query.slug ?? '');
    if (head === 'validate' && is('GET', 2))
      return validateKind(requireKind(second));

    if (head === 'items') {
      if (is('GET', 1)) return listItems(query, viewer);
      if (is('PUT', 1)) return putItem(request.body, viewer);
      // Before /items/:id, or `lookup` would be read as an id.
      if (second === 'lookup' && is('GET', 2)) {
        if (mode === 'legacy') fail(404, 'NOT_FOUND', 'No such item.');
        return lookup(query);
      }
      if (is('GET', 2)) return detail(getVisible(second, viewer), viewer);
      if (is('DELETE', 2)) return remove(second, query, viewer);
      if (third === 'approve' && is('POST', 3)) return approve(second, viewer);
      if (third === 'reject' && is('POST', 3))
        return reject(second, request.body, viewer);
      if (third === 'discard-edit' && is('POST', 3))
        return discard(second, viewer);
    }

    if (head === 'releases') {
      if (is('GET', 1))
        return [...releases]
          .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
          .map(publicRelease);
      if (is('POST', 1)) return createRelease(request.body, viewer);
      if (third === 'parts' && is('POST', 4))
        return buildPart(second, fourth, viewer);
      if (third === 'activate' && is('POST', 3))
        return activate(second, viewer);
      if (third === 'cancel' && is('POST', 3)) return cancel(second, viewer);
    }
    if (head === 'rollback' && is('POST', 1))
      return rollback(request.body, viewer);

    if (head === 'suggestions') {
      // Today's API has no suggestions (contract §10).
      if (mode === 'legacy') fail(404, 'NOT_FOUND', 'Not found.');
      if (is('GET', 1)) return listSuggestions(query, viewer);
      if (second === 'decisions' && is('GET', 2)) return log.file();
      if (second === 'decisions' && is('POST', 2))
        return postDecisions(request.body, viewer);
    }

    return fail(404, 'NOT_FOUND', `No route for ${method} ${request.path}.`);
  };

  const handle = (request: MockRequest): MockResponse => {
    rememberUser(request.viewer);
    try {
      return { status: 200, body: route(request) };
    } catch (caught) {
      if (caught instanceof HttpError)
        return { status: caught.status, body: caught.body };
      throw caught;
    }
  };

  // ── Persistence seam (persist.ts) ──

  const snapshot = (): MockStoreSnapshot => ({
    seq,
    items: [...items.values()].filter((item) => item.touched),
    releases: [...releases],
    users: Object.fromEntries(users),
    decisions: [...log.all()],
  });

  /** Lay persisted state over the seed. */
  const restore = (state: MockStoreSnapshot) => {
    seq = Math.max(seq, state.seq);
    for (const [id, name] of Object.entries(state.users ?? {}))
      if (!users.has(id)) users.set(id, name);
    for (const item of state.items) {
      if (!served.has(item.kind)) continue;
      const previous = items.get(item.id);
      if (previous) bySlug.delete(slugKey(previous.kind, previous.slug));
      items.set(item.id, item);
      if (!item.deleted) bySlug.set(slugKey(item.kind, item.slug), item.id);
    }
    const byId = new Map(releases.map((release) => [release.id, release]));
    for (const release of state.releases) {
      if (served.has(release.kind)) byId.set(release.id, release);
    }
    releases = [...byId.values()];
    log.restore(state.decisions ?? []);
  };

  return {
    mode,
    handle,
    replayCommittedDecisions,
    /**
     * The bulk import's way in (design E.1): `decide` with the import's
     * policy, as `viewer`, in-process and never over HTTP, where
     * `POST /suggestions/decisions` refuses `method: 'import'`. Every save
     * it makes is an ordinary `PUT /items`, so `onTouched` hears of it.
     */
    importDecisions(requests: readonly DecisionRequest[], viewer: MockViewer) {
      rememberUser(viewer);
      const results = decide(requests, viewer, decisionHost, {
        policy: 'import',
      });
      if (results.some((result) => result.outcome !== 'refused')) changed();
      return results;
    },
    /** What `decisions.json` should hold now: every confirmed decision. */
    decisionsFile: () => log.file(),
    /** How many decisions there are, and how many the committed file lacks. */
    decisionCounts: () => log.counts(),
    /**
     * `decisions.json` now holds `decisionsFile()`: the repo store has just
     * written it (design A.4, flush step 7).
     */
    markDecisionsCommitted: () => log.markCommitted(),
    /**
     * Every suggestion `/suggestions` serves, as the catalog holds them now
     * (the app's planned again once the store has moved), for the bulk
     * import to rank; their statuses come from `GET /suggestions`.
     */
    suggestions: () => catalog.all(),
    /**
     * The item stored under (kind, slug), deleted or not, as the store
     * holds it now; undefined when there is none. For the repo store, which
     * reads each item's revision and body to carry them over a reload.
     * Read it, never change it: the store owns it.
     */
    storedItem: (
      kind: MockKind,
      slug: string,
    ): Readonly<StoredItem> | undefined => {
      const id = seedItemId(kind, slug);
      return findBySlug(kind, slug) ?? items.get(id);
    },
    cdnManifest,
    cdnObjectText,
    snapshot,
    restore,
    seedBodyOf: (id: string) => seedBodies.get(id) ?? null,
    seedRevisionOf: (id: string) => seedRevisions.get(id),
    seedReleaseEntriesOf: (kind: MockKind) =>
      seedReleaseEntries.get(kind) ?? [],
    /** The release the seed starts each kind with, as it was seeded. */
    seedRelease: (kind: MockKind) => seedReleases.get(kind),
    /** Bumped on every change; the adapter persists when it moves. */
    generation: () => generation,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type ContentMockServer = ReturnType<typeof createContentMockServer>;
