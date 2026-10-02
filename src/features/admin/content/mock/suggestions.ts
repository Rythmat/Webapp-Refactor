import type { GraphSnapshot } from '@/content/graph/deriveGraph';
import { musicBrainzIdOf } from '@/content/suggestions/apply';
import { mergeSuggestions } from '@/content/suggestions/merge';
import {
  decisionState,
  dependencyStands,
  identityTaken,
  isExternalIdPath,
  suggestionStatus,
  type DecisionState,
  type StatusContext,
  type SuggestionDependency,
  type SuggestionStatus,
} from '@/content/suggestions/status';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionDecision,
  SuggestionProvider,
  SuggestionTier,
} from '@/content/suggestions/types';
import { suggestionSchema } from '@/scripts/apiContract/suggestionSchema';
import type { Body } from './mockKinds';

/**
 * The suggestions the offline mock serves (design decision 9, §5.1–5.2):
 * the importer's, read from its committed artifacts, and the app's own,
 * from the Stage-1 planners in src/content/linking run over the store.
 *
 * A suggestion is a sidecar: nothing here writes a body. The store only
 * answers what a suggestion's status is against the body a viewer's next
 * save would build on, and the decisions log (decisions.ts) answers what the
 * owner did with it.
 *
 * Pure: the artifacts and the planner are loaded by seed.ts and handed in.
 */

// ── Sources ─────────────────────────────────────────────────────────────────

/**
 * What the Stage-1 planners read: the store's live bodies, list by list, in
 * the graph snapshot's names (a planner reads the app's data as the graph
 * does), and the importer's suggestions, which a planner may defer to (an
 * artist's song-pin city equal to their imported birthplace is offered as
 * the birthplace).
 */
export interface PlannerInput
  extends Pick<
    GraphSnapshot,
    | 'songs'
    | 'progressions'
    | 'artists'
    | 'releases'
    | 'studios'
    | 'labels'
    | 'places'
    | 'events'
    | 'artistLocations'
    | 'asOfYear'
  > {
  imported: readonly Suggestion[];
}

/** Every Stage-1 planner at once: the app's own suggestions. */
export type AppPlanner = (input: PlannerInput) => readonly Suggestion[];

/** One import run, as its manifest describes it. */
export interface ImportBatch {
  batch: string;
  /**
   * Whether the owner's labelled sample has measured this run's sure tier
   * (the importer's manifest `calibrated`). Until then none of its
   * suggestions is accepted in bulk (`status.ts` `whyNotBulk`).
   */
  calibrated: boolean;
  measuredPrecision: number | null;
}

export interface SuggestionArtifacts {
  suggestions: Suggestion[];
  batches: ImportBatch[];
  /**
   * What was left out, and why: rows the contract does not describe, files
   * that are not JSON. Never fatal; the rest is served.
   */
  refused: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** A path's file name: '/src/…/suggestions/artists.json' → 'artists.json'. */
const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** The importer's own files that hold no suggestions. */
const NOT_SUGGESTIONS = new Set(['decisions.json']);

/**
 * The importer's lists of records its rows need made first, by the list's
 * name in its file, and the kind each record is: `places` in `places.json`
 * (the artist half's birthplaces and cities) and `record-places.json` (the
 * towns labels and studios are in), `releases`, `labels`, `studios`, and
 * `artists` in `artists-created.json` (C30's credited people). Each record
 * lists the rows that need it (`neededBy`).
 */
const RECORD_LISTS: Readonly<Record<string, string>> = {
  places: 'globe_city',
  releases: 'release',
  labels: 'label',
  studios: 'studio',
  artists: 'artist',
};

/** The record kinds `record-slugs.json` keeps a slug per MusicBrainz id for. */
const LEDGER_KINDS: readonly string[] = [
  'release',
  'label',
  'studio',
  'artist',
];

/** A kind's slugs in `record-slugs.json`, both ways. */
interface LedgerKind {
  slugOf: Map<string, string>;
  idOf: Map<string, string>;
}

/** `record-slugs.json`'s `slugs`, read; kinds it has no list for are left out. */
function readLedger(slugs: Record<string, unknown>): Map<string, LedgerKind> {
  const ledger = new Map<string, LedgerKind>();
  for (const kind of LEDGER_KINDS) {
    const entries = slugs[kind];
    if (!isObject(entries)) continue;
    const slugOf = new Map<string, string>();
    const idOf = new Map<string, string>();
    for (const [mbid, slug] of Object.entries(entries)) {
      if (typeof slug !== 'string' || !slug) continue;
      slugOf.set(mbid.toLowerCase(), slug);
      idOf.set(slug, mbid.toLowerCase());
    }
    ledger.set(kind, { slugOf, idOf });
  }
  return ledger;
}

/**
 * Whether a record a row needs is under the slug the ledger gave its
 * MusicBrainz id, and the ledger gives that slug no other id. The ledger is
 * what keeps a record's slug, and so every id made from it, the same from
 * one import to the next; a row out of step with it would make its record
 * under a slug the next import hands to someone else, or twice.
 */
const agreesWithLedger = (
  record: RequiredRecord,
  ledger: ReadonlyMap<string, LedgerKind>,
): boolean => {
  const slugs = ledger.get(record.kind);
  if (!slugs) return true;
  const mbid = musicBrainzIdOf(record.kind, record.body);
  const listed = slugs.idOf.get(record.slug);
  if (!mbid) return listed === undefined;
  const slug = slugs.slugOf.get(mbid);
  return (
    (slug === undefined || slug === record.slug) &&
    (listed === undefined || listed === mbid)
  );
};

const recordKey = (record: Pick<RequiredRecord, 'kind' | 'slug'>) =>
  `${record.kind}\u0000${record.slug}`;

/** One run's calibration, from its part of the manifest; null when it names no run. */
const batchIn = (part: Record<string, unknown>): ImportBatch | null =>
  typeof part.batch === 'string'
    ? {
        batch: part.batch,
        calibrated: part.calibrated === true,
        measuredPrecision:
          typeof part.measuredPrecision === 'number'
            ? part.measuredPrecision
            : null,
      }
    : null;

/**
 * The importer's committed artifacts, by path, as text: rows checked against
 * the contract's generated schema, the records they need made first attached
 * to them, and each run's calibration from its manifest.
 *
 * Reads what it finds rather than a fixed list of files, by shape:
 *  - `suggestions` lists are rows: `artists.json`, and `songs.json` (Album,
 *    Studio, Credits and Year rows on songs, and Label rows on the releases
 *    the Album rows make — a Label row's release exists once an Album row
 *    naming it is accepted, which is why the Label row rests on one);
 *  - the record lists (`RECORD_LISTS`) are the records those rows need.
 *    A row carries its records itself today; one it lists no copy of is
 *    given the file's. They are made first, places and people before what
 *    names them (decisions.ts);
 *  - `slugs` is `record-slugs.json`, the ledger each record's slug comes
 *    from. A row needing a record under another slug than the ledger gives
 *    it is not served, and is reported;
 *  - the manifest has a part per run: the artist half at its top, the song
 *    half under `songs`. A run is calibrated only when its own part says so,
 *    and none of its rows is accepted in bulk until then (`whyNotBulk`).
 * Anything else (`matches.json`, what each song was matched to) is passed
 * over.
 */
export function readSuggestionArtifacts(
  files: Readonly<Record<string, string>>,
): SuggestionArtifacts {
  const rows: { suggestion: Suggestion; file: string }[] = [];
  const refused: string[] = [];
  const batches = new Map<string, ImportBatch>();
  /** Suggestion id → the records it needs, by the record files' `neededBy`. */
  const recordsFor = new Map<string, RequiredRecord[]>();
  let ledger: Map<string, LedgerKind> | null = null;

  for (const [path, text] of Object.entries(files).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const name = fileName(path);
    if (NOT_SUGGESTIONS.has(name)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      refused.push(`${name}: not JSON`);
      continue;
    }
    if (!isObject(parsed)) continue;

    if (name === 'manifest.json') {
      for (const part of [parsed, ...Object.values(parsed)]) {
        const batch = isObject(part) ? batchIn(part) : null;
        if (batch) batches.set(batch.batch, batch);
      }
      continue;
    }

    if (isObject(parsed.slugs)) ledger = readLedger(parsed.slugs);

    if (Array.isArray(parsed.suggestions)) {
      let bad = 0;
      for (const row of parsed.suggestions) {
        if (suggestionSchema.safeParse(row).success)
          rows.push({ suggestion: row as Suggestion, file: name });
        else bad += 1;
      }
      if (bad)
        refused.push(`${name}: ${bad} rows the contract does not describe`);
    }

    for (const [list, kind] of Object.entries(RECORD_LISTS)) {
      const records = parsed[list];
      if (!Array.isArray(records)) continue;
      for (const entry of records) {
        if (
          !isObject(entry) ||
          typeof entry.slug !== 'string' ||
          !isObject(entry.body) ||
          !Array.isArray(entry.neededBy)
        )
          continue;
        const record: RequiredRecord = {
          kind,
          slug: entry.slug,
          body: entry.body,
        };
        for (const id of entry.neededBy)
          if (typeof id === 'string')
            recordsFor.set(id, [...(recordsFor.get(id) ?? []), record]);
      }
    }
  }

  // A row that needs a record and carries no copy of it is given the
  // file's; one out of step with the ledger is left out.
  const outOfStep = new Map<string, number>();
  const served: Suggestion[] = [];
  for (const { suggestion, file } of rows) {
    const needed = recordsFor.get(suggestion.id) ?? [];
    const named = new Set((suggestion.requires ?? []).map(recordKey));
    const missing = needed.filter((record) => !named.has(recordKey(record)));
    const row = missing.length
      ? {
          ...suggestion,
          requires: [...(suggestion.requires ?? []), ...missing],
        }
      : suggestion;
    if (
      ledger &&
      (row.requires ?? []).some((record) => !agreesWithLedger(record, ledger!))
    ) {
      outOfStep.set(file, (outOfStep.get(file) ?? 0) + 1);
      continue;
    }
    served.push(row);
  }
  for (const [file, count] of outOfStep)
    refused.push(
      `${file}: ${count} rows need a record under another slug than record-slugs.json gives it`,
    );

  for (const suggestion of served)
    if (!batches.has(suggestion.batch))
      batches.set(suggestion.batch, {
        batch: suggestion.batch,
        calibrated: false,
        measuredPrecision: null,
      });

  return {
    suggestions: mergeSuggestions(served),
    batches: [...batches.values()],
    refused,
  };
}

/**
 * One suggestion per id: the importer's and the app's offers of one fact
 * are one row with both sources, the surer tier and the importer's batch
 * and identity dependency, whichever is read first (`suggestions/merge.ts`,
 * the same merge the planners use).
 */
export { mergeSuggestions };

/**
 * The app's planners from the Stage-1 index (src/content/linking/index.ts),
 * loaded lazily by seed.ts: its `planStageOne`, handed the store's lists and
 * the importer's suggestions, and read back as the suggestions it planned.
 * Null for a module without it. The module is read by name at run time, so
 * what it returns is checked against the contract rather than trusted: a
 * row that fails is a planner's bug, and throws (the catalog reports it and
 * keeps serving the importer's).
 */
export function appPlannerFrom(module: unknown): AppPlanner | null {
  const plan = isObject(module) ? module.planStageOne : undefined;
  if (typeof plan !== 'function') return null;
  return ({ imported, ...lists }) => {
    const result: unknown = plan(lists, { imported });
    const planned = isObject(result) ? result.planned : undefined;
    if (!Array.isArray(planned))
      throw new Error('planStageOne returned no `planned` list.');
    return planned.map((entry: unknown) => {
      const suggestion = isObject(entry) ? entry.suggestion : undefined;
      if (!suggestionSchema.safeParse(suggestion).success)
        throw new Error(
          `planStageOne planned a suggestion the contract does not describe: ${JSON.stringify(suggestion)?.slice(0, 200)}`,
        );
      return suggestion as Suggestion;
    });
  };
}

// ── The catalog ─────────────────────────────────────────────────────────────

/** Store kind → the planner input list its live bodies go into. */
export const PLANNER_LISTS: Readonly<
  Record<string, Exclude<keyof PlannerInput, 'imported' | 'asOfYear'>>
> = {
  song: 'songs',
  chord_progression: 'progressions',
  artist: 'artists',
  release: 'releases',
  studio: 'studios',
  label: 'labels',
  globe_city: 'places',
  globe_event: 'events',
  artist_location: 'artistLocations',
};

/**
 * The live bodies the planners read, list by list. Built from the store's
 * items (`kind`, `body`, and whether deleted) and the year it runs in.
 */
export function plannerInput(
  items: Iterable<{ kind: string; body: Body | null; deleted: boolean }>,
  imported: readonly Suggestion[],
  asOfYear: number,
): PlannerInput {
  const lists: Record<string, Body[]> = {};
  for (const item of items) {
    const list = PLANNER_LISTS[item.kind];
    if (!list || item.deleted || !item.body) continue;
    (lists[list] ??= []).push(item.body);
  }
  return {
    ...(lists as unknown as Omit<PlannerInput, 'imported' | 'asOfYear'>),
    asOfYear,
    imported,
  };
}

export interface SuggestionCatalogOptions {
  imported?: readonly Suggestion[];
  app?: AppPlanner | null;
  /** The planners' input as the store is now. */
  input: () => PlannerInput;
  /** Moves whenever the store changes; the app's suggestions follow it. */
  generation: () => number;
}

/**
 * Everything the store offers: the importer's suggestions, fixed at load,
 * and the app's, planned from the store as it is and planned again only
 * once it has changed and someone asks.
 */
export function createSuggestionCatalog(options: SuggestionCatalogOptions) {
  const imported = options.imported ?? [];
  let planned: {
    generation: number;
    all: Suggestion[];
    error: string | null;
  } | null = null;
  let byId: Map<string, Suggestion> | null = null;

  const current = () => {
    const generation = options.generation();
    if (planned?.generation === generation) return planned;
    let app: readonly Suggestion[] = [];
    let error: string | null = null;
    if (options.app) {
      try {
        app = options.app(options.input());
      } catch (caught) {
        // A planner that throws leaves the importer's suggestions standing.
        error = caught instanceof Error ? caught.message : String(caught);
      }
    }
    planned = {
      generation,
      all: app.length ? mergeSuggestions([...imported, ...app]) : [...imported],
      error,
    };
    byId = null;
    return planned;
  };

  return {
    /**
     * Every suggestion. `withApp: false` skips planning, for a request that
     * asks for the importer's alone.
     */
    all(withApp = true): readonly Suggestion[] {
      if (!withApp || !options.app) return imported;
      return current().all;
    },
    get(id: string): Suggestion | undefined {
      const { all } = current();
      byId ??= new Map(all.map((suggestion) => [suggestion.id, suggestion]));
      return byId.get(id);
    },
    /** Why the planners failed the last time they ran; null when they did not. */
    appError: () => (options.app ? current().error : null),
  };
}

export type SuggestionCatalog = ReturnType<typeof createSuggestionCatalog>;

// ── GET /suggestions ────────────────────────────────────────────────────────

/** What a request narrows the list to. Every field is optional. */
export interface SuggestionFilter {
  kind?: string;
  slugs?: ReadonlySet<string>;
  ids?: ReadonlySet<string>;
  path?: string;
  provider?: SuggestionProvider;
  tier?: SuggestionTier;
  batch?: string;
  statuses?: ReadonlySet<SuggestionStatus>;
  decisions?: ReadonlySet<DecisionState>;
  /** Only bulk accepts no one has marked reviewed (C29). */
  unreviewed?: boolean;
}

export const SUGGESTION_STATUSES: readonly SuggestionStatus[] = [
  'open',
  'accepted',
  'applied',
  'conflict',
  'unreachable',
  'removed',
  'rejected',
  'dropped',
];

export const DECISION_STATES: readonly DecisionState[] = [
  'open',
  'accepted',
  'rejected',
  'dropped',
];

/** A suggestion as `GET /suggestions` serves it. */
export interface SuggestionRow {
  suggestion: Suggestion;
  /** Against the body the viewer's next save builds on (`status.ts`). */
  status: SuggestionStatus;
  /** The decision that stands; null while open. */
  decision: SuggestionDecision | null;
  /** Accepted in bulk and not marked reviewed since (C29). */
  unreviewed: boolean;
  /**
   * The suggestion it rests on (`dependsOn`), and how that stands: absent
   * when it rests on none, or on one not served here.
   */
  dependency?: SuggestionDependency;
}

/**
 * Where a row's dependency is looked up: the suggestion by id, and the live
 * body of the item it is for (whether it stands is read there, whoever
 * looks).
 */
export interface DependencyLookup {
  suggestion(id: string): Suggestion | undefined;
  liveOf(kind: string, slug: string): Body | null;
}

/**
 * The body a suggestion's status is read against, for one viewer: an
 * editor's own proposal, else the live body; with when it was saved and
 * whether a proposal waits beside it. Null when there is no such item.
 */
export type ViewOf = (
  kind: string,
  slug: string,
) => { body: Body | null; context: StatusContext } | null;

const bySuggestionOrder = (a: Suggestion, b: Suggestion) =>
  a.target.kind < b.target.kind
    ? -1
    : a.target.kind > b.target.kind
      ? 1
      : a.target.slug < b.target.slug
        ? -1
        : a.target.slug > b.target.slug
          ? 1
          : a.path < b.path
            ? -1
            : a.path > b.path
              ? 1
              : a.id < b.id
                ? -1
                : a.id > b.id
                  ? 1
                  : 0;

/**
 * The rows a filter selects, in a stable order (kind, slug, path, id), each
 * with its status, and — for one that rests on another (`dependsOn`) — how
 * that one stands: often another item's (a song's rows rest on its lead
 * act's identity), which the list itself would not hold. What the filter
 * can decide without a body is decided first, so a Table row's request
 * reads one body, and the one each dependency is for.
 */
export function selectSuggestions(
  suggestions: readonly Suggestion[],
  filter: SuggestionFilter,
  viewOf: ViewOf,
  decisions: Map<string, SuggestionDecision[]>,
  dependencies?: DependencyLookup,
): SuggestionRow[] {
  const rows: SuggestionRow[] = [];
  /** A status as its row says it, for the viewer. */
  const statusOf = (
    suggestion: Suggestion,
    decided: ReturnType<typeof decisionState>,
  ): SuggestionStatus => {
    const view = viewOf(suggestion.target.kind, suggestion.target.slug);
    // Nothing to write it into: the item is gone, or never was.
    return view
      ? suggestionStatus(suggestion, view.body, decisions, view.context)
      : decided.state === 'rejected' || decided.state === 'dropped'
        ? decided.state
        : 'unreachable';
  };
  // Hundreds of a song kind's rows rest on one act's identity: each once.
  const known = new Map<string, SuggestionDependency | null>();
  const dependencyOf = (id: string): SuggestionDependency | null => {
    const had = known.get(id);
    if (had !== undefined) return had;
    const rested = dependencies?.suggestion(id);
    const status = rested
      ? statusOf(rested, decisionState(rested, decisions))
      : null;
    // An identity row (another catalogue's id) is never written and is not
    // shown, so it stands when the import would take it (`identityTaken`).
    const out: SuggestionDependency | null =
      rested && status
        ? {
            id,
            target: rested.target,
            path: rested.path,
            display: rested.display,
            status,
            stands:
              dependencyStands(
                rested,
                dependencies!.liveOf(rested.target.kind, rested.target.slug),
              ) ||
              (isExternalIdPath(rested.path) && identityTaken(rested, status)),
          }
        : null;
    known.set(id, out);
    return out;
  };
  for (const suggestion of suggestions) {
    if (filter.kind && suggestion.target.kind !== filter.kind) continue;
    if (filter.slugs && !filter.slugs.has(suggestion.target.slug)) continue;
    if (filter.ids && !filter.ids.has(suggestion.id)) continue;
    if (filter.path && suggestion.path !== filter.path) continue;
    if (filter.tier && suggestion.tier !== filter.tier) continue;
    if (filter.batch && suggestion.batch !== filter.batch) continue;
    if (
      filter.provider &&
      !suggestion.sources.some((source) => source.provider === filter.provider)
    )
      continue;
    const decided = decisionState(suggestion, decisions);
    if (filter.decisions && !filter.decisions.has(decided.state)) continue;
    if (filter.unreviewed && !decided.unreviewed) continue;

    const status = statusOf(suggestion, decided);
    if (filter.statuses && !filter.statuses.has(status)) continue;
    const dependency = suggestion.dependsOn
      ? dependencyOf(suggestion.dependsOn)
      : null;
    rows.push({
      suggestion,
      status,
      decision: decided.decision ?? null,
      unreviewed: decided.unreviewed,
      ...(dependency ? { dependency } : {}),
    });
  }
  return rows.sort((a, b) => bySuggestionOrder(a.suggestion, b.suggestion));
}

/** Per run: what it offers, and for the importer's, whether it is calibrated. */
export interface BatchSummary {
  batch: string;
  providers: SuggestionProvider[];
  count: number;
  /** Null for the app's runs, which nothing measures. */
  calibrated: boolean | null;
  measuredPrecision: number | null;
}

export function summarizeBatches(
  suggestions: readonly Suggestion[],
  imports: readonly ImportBatch[],
): BatchSummary[] {
  const byBatch = new Map<
    string,
    { providers: Set<SuggestionProvider>; count: number }
  >();
  for (const suggestion of suggestions) {
    const entry = byBatch.get(suggestion.batch) ?? {
      providers: new Set<SuggestionProvider>(),
      count: 0,
    };
    entry.count += 1;
    for (const source of suggestion.sources)
      entry.providers.add(source.provider);
    byBatch.set(suggestion.batch, entry);
  }
  const known = new Map(imports.map((entry) => [entry.batch, entry]));
  return [...byBatch]
    .map(([batch, { providers, count }]) => {
      const imported = known.get(batch);
      return {
        batch,
        providers: [...providers].sort(),
        count,
        calibrated: imported ? imported.calibrated : null,
        measuredPrecision: imported?.measuredPrecision ?? null,
      };
    })
    .sort((a, b) => (a.batch < b.batch ? -1 : a.batch > b.batch ? 1 : 0));
}
