import type { Graph, GraphSnapshot } from '@/content/graph/deriveGraph';
import { resolveGenreTag, SUBGENRE_PARENT } from '@/content/graph/genreTags';
import { GENRES } from '@/content/graph/genres';
import { canonicalId, toEntityId } from '@/content/graph/ids';
import { placeSlugFor } from '@/content/graph/places';
import { normalizeArtistName, toSlug } from '@/content/graph/slugs';
import { yearOf } from '@/content/graph/time';
import type {
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import type {
  ContentEditState,
  ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import type { TableId } from '../tableIds';
import {
  connectionsOf,
  forEachStep,
  kindOf,
  labelOf,
  type Neighbour,
  slugOf,
  walkContext,
  type WalkContext,
  yearSpan,
  yearsOf,
} from './aggregate';
import { storedColumns, TABLES } from './categories';
import { PEOPLE } from './edges';
import { type GhostValue, withGhosts } from './ghosts';
import {
  CHIP_LIMIT,
  CHIP_STYLES,
  type CellValue,
  type Chip,
  type ChipStyle,
  type ColumnDef,
  type ColumnSource,
  type RowFlag,
  type RowStatus,
  type Sublabel,
  type TableDef,
  type TableModel,
  type TableRow,
  type VocabularyId,
} from './types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Building a table: a graph and its bodies → rows and cells
 * ══════════════════════════════════════════════════════════════════════════
 *
 * One pass per (graph, table): resolve the rows — the graph's nodes of the
 * table's kind, every entry of its code vocabulary (so the 59 instruments
 * are all listed, linked or not), and archived items the graph leaves out —
 * join each with the body that states it, and precompute every column's
 * cell, the flags the filters read and the text the search box matches.
 * The grid then only sorts and filters numbers and strings.
 *
 * Every column is built, the opt-in ones too: showing a column must not wait
 * for a rebuild, and the budget allows it (≤ 60 ms a table on the repo
 * graph, held by buildTableModel.test.ts). `getTableModel` caches a build per
 * graph, so switching tables back and forth builds each once, and a save's
 * rebuilt graph starts afresh.
 *
 * Pure: no React, no store (the purity test holds this). The caller hands in
 * the graph, the snapshot it was built from and, in working mode, the API's
 * items; nothing here knows where they came from.
 */

/* ── Input ───────────────────────────────────────────────────────────── */

/**
 * An API item as a row needs it: its id to save by, its state, and its body.
 * The working graph's items (`useWorkingGraph`) fit it as they are.
 */
export interface TableItem {
  id: string;
  status: ContentStatus;
  editState: ContentEditState;
  body: Readonly<Record<string, unknown>> | null;
  /** An editor's proposal, which is the body until it is approved. */
  pendingBody?: Readonly<Record<string, unknown>>;
  /**
   * The item list's title: on a row with no body (the `/items` list, which
   * is all today's API gives), the only name the row has.
   */
  title?: string;
}

/** Open suggestions per row, from the suggestions sidecar. */
export interface TableSuggestions {
  /** Changes whenever any count does, so a cached table is rebuilt. */
  version: string;
  count(node: EntityId): number;
  /** A value on it was accepted in bulk and nobody has marked it reviewed. */
  bulkUnreviewed?(node: EntityId): boolean;
  /**
   * Its suggestions for fields it has nothing in yet: the ghost chips in
   * those fields' cells (`ghosts.ts`).
   */
  ghosts?(node: EntityId): readonly GhostValue[];
}

export interface TableInput {
  graph: Graph;
  /** What the graph was built from: the rows' bodies. */
  snapshot?: GraphSnapshot;
  /** The API's items by canonical node id (working mode). */
  items?: ReadonlyMap<EntityId, TableItem>;
  suggestions?: TableSuggestions;
}

export interface BuildOptions {
  /** The `narrow` node chosen (Key: `mode:minor`); see `TableDef.narrow`. */
  narrow?: EntityId;
}

/* ── Caching ─────────────────────────────────────────────────────────── */

interface CacheEntry {
  snapshot?: GraphSnapshot;
  items?: ReadonlyMap<EntityId, TableItem>;
  model: TableModel;
}

const cache = new WeakMap<Graph, Map<string, CacheEntry>>();

/**
 * A table's model, built once per graph (and per narrowing and suggestions
 * version). A rebuilt graph is a new object, so nothing is ever stale; the
 * old graph's tables go with it.
 */
export function getTableModel(
  input: TableInput,
  table: TableId,
  options: BuildOptions = {},
): TableModel {
  const key = `${table}|${options.narrow ?? ''}|${input.suggestions?.version ?? ''}`;
  let byKey = cache.get(input.graph);
  if (!byKey) {
    byKey = new Map();
    cache.set(input.graph, byKey);
  }
  const hit = byKey.get(key);
  if (hit && hit.snapshot === input.snapshot && hit.items === input.items) {
    return hit.model;
  }
  const model = buildTableModel(input, TABLES[table], options);
  byKey.set(key, { snapshot: input.snapshot, items: input.items, model });
  return model;
}

/* ── Bodies ──────────────────────────────────────────────────────────── */

type Body = Readonly<Record<string, unknown>>;

/** Where each snapshot list keeps its items' identity. */
const SNAPSHOT_LISTS: readonly [keyof GraphSnapshot, EntityKind, string][] = [
  ['songs', 'song', 'id'],
  ['progressions', 'progression', 'id'],
  ['artists', 'artist', 'slug'],
  ['releases', 'release', 'slug'],
  ['studios', 'studio', 'slug'],
  ['labels', 'label', 'slug'],
  ['places', 'place', 'id'],
  // Last, so a song's own globe event never stands in for the song.
  ['events', 'event', 'id'],
];

const bodyIndexes = new WeakMap<GraphSnapshot, ReadonlyMap<EntityId, Body>>();

/** Every snapshot body by its canonical node id; the first definition wins. */
function bodiesOf(snapshot: GraphSnapshot): ReadonlyMap<EntityId, Body> {
  const cached = bodyIndexes.get(snapshot);
  if (cached) return cached;
  const index = new Map<EntityId, Body>();
  for (const [list, kind, field] of SNAPSHOT_LISTS) {
    const items = snapshot[list];
    if (!Array.isArray(items)) continue;
    for (const item of items as readonly unknown[]) {
      if (!item || typeof item !== 'object') continue;
      const value = (item as Body)[field];
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const id = canonicalId(`${kind}:${String(value).trim()}`);
      if (!index.has(id)) index.set(id, item as Body);
    }
  }
  bodyIndexes.set(snapshot, index);
  return index;
}

const segmentsCache = new Map<string, { name: string; each: boolean }[]>();

/**
 * The values at a body path, arrays flattened: `aliases[]` is each alias,
 * `credits[].name` each credit's name, `location.city` the one city.
 */
export function valuesAt(body: unknown, path: string): unknown[] {
  let segments = segmentsCache.get(path);
  if (!segments) {
    segments = path
      .split('.')
      .map((part) =>
        part.endsWith('[]')
          ? { name: part.slice(0, -2), each: true }
          : { name: part, each: false },
      );
    segmentsCache.set(path, segments);
  }
  let at: unknown[] = [body];
  for (const { name, each } of segments) {
    const next: unknown[] = [];
    for (const value of at) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const field = (value as Body)[name];
      if (field === undefined || field === null) continue;
      if (each) {
        if (Array.isArray(field)) next.push(...(field as unknown[]));
      } else {
        next.push(field);
      }
    }
    at = next;
  }
  return at;
}

/** A value that says something: text with text in it, a number, a non-empty list or object. */
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(isPresent);
  if (typeof value === 'object') return Object.values(value).some(isPresent);
  return true;
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/* ── Code vocabularies ───────────────────────────────────────────────── */

interface VocabularyRow {
  id: EntityId;
  label: string;
  body: Body;
}

const humanize = (slug: string): string =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const genreName = (id: string): string =>
  GENRES.find((g) => g.id === id)?.name ?? humanize(id);

let vocabularies: Record<VocabularyId, readonly VocabularyRow[]> | null = null;

/** The code lists a table shows in full, with the entry each row reads. */
function vocabulary(id: VocabularyId): readonly VocabularyRow[] {
  vocabularies ??= {
    genres: GENRES.map((g) => ({
      id: `genre:${g.id}` as EntityId,
      label: g.name,
      body: g as unknown as Body,
    })),
    subgenres: Object.entries(SUBGENRE_PARENT).map(([slug, parent]) => ({
      id: `subgenre:${slug}` as EntityId,
      // As the graph names a subgenre it has (deriveGraph's vocabulary).
      label: humanize(slug),
      body: { id: slug, name: humanize(slug), parent },
    })),
    instruments: SESSION_INSTRUMENTS.map((i) => ({
      id: `instrument:${i.id}` as EntityId,
      label: i.name,
      body: i as unknown as Body,
    })),
  };
  return vocabularies[id];
}

const nodesByKind = new WeakMap<Graph, ReadonlyMap<EntityKind, GraphNode[]>>();

function nodesOfKind(graph: Graph, kind: EntityKind): readonly GraphNode[] {
  let index = nodesByKind.get(graph);
  if (!index) {
    const map = new Map<EntityKind, GraphNode[]>();
    for (const node of graph.nodes.values()) {
      const list = map.get(node.kind);
      if (list) list.push(node);
      else map.set(node.kind, [node]);
    }
    nodesByKind.set(graph, map);
    index = map;
  }
  return index.get(kind) ?? [];
}

/* ── Rows ────────────────────────────────────────────────────────────── */

interface RowSeed {
  id: EntityId;
  node?: GraphNode;
  vocab?: VocabularyRow;
}

/**
 * The table's rows: its code vocabulary in its own order, then the graph's
 * nodes of the kind the vocabulary does not list (a genre nobody defined is
 * a missing row), then the API's items the graph does not have — archived
 * ones, which the graph leaves out, and, in repo mode, everything the API
 * holds that the repo does not (a draft song made in the console): the old
 * per-kind lists redirect here, so an item they listed must not vanish.
 */
function seedsOf(input: TableInput, def: TableDef): RowSeed[] {
  const seeds: RowSeed[] = [];
  const seen = new Set<EntityId>();
  const add = (seed: RowSeed) => {
    if (seen.has(seed.id)) return;
    seen.add(seed.id);
    seeds.push(seed);
  };
  const levels = [def.rows, ...(def.rows.more ? [def.rows.more] : [])];
  for (const { kind, vocabulary: vocab } of levels) {
    for (const entry of vocab ? vocabulary(vocab) : []) {
      add({
        id: entry.id,
        node: input.graph.nodes.get(entry.id),
        vocab: entry,
      });
    }
    for (const node of nodesOfKind(input.graph, kind)) {
      add({ id: node.id, node });
    }
  }
  const kinds = new Set(levels.map((l) => l.kind));
  for (const id of input.items?.keys() ?? []) {
    if (kinds.has(kindOf(id))) add({ id });
  }
  return seeds;
}

/**
 * The nodes a row stands on: its own, and the ones its table expands it
 * over — a genre's subgenres, a decade's years.
 */
function expansionOf(graph: Graph, def: TableDef, id: EntityId): EntityId[] {
  const expand = def.rows.expand;
  const kind = kindOf(id);
  const [edge, from]: [string, EntityKind] | [null, null] =
    expand === 'subgenres' && kind === 'genre'
      ? ['in_genre', 'subgenre']
      : expand === 'decadeYears' && kind === 'decade'
        ? ['in_decade', 'year']
        : [null, null];
  if (!edge) return [id];
  const nodes = [id];
  for (const e of graph.adjacency.get(id) ?? []) {
    if (e.kind === edge && e.to === id && kindOf(e.from) === from) {
      nodes.push(e.from);
    }
  }
  return nodes;
}

/* ── Building ────────────────────────────────────────────────────────── */

/** Build one table's model from a graph (uncached; see `getTableModel`). */
export function buildTableModel(
  input: TableInput,
  def: TableDef,
  options: BuildOptions = {},
): TableModel {
  const { graph } = input;
  const bodies = input.snapshot ? bodiesOf(input.snapshot) : new Map();
  const ctx = walkContext(
    graph,
    options.narrow && def.narrow
      ? { hop: def.narrow.hop, node: options.narrow }
      : undefined,
  );
  const stored = new Set(storedColumns(def).map((c) => c.id));

  const rows: TableRow[] = [];
  for (const seed of seedsOf(input, def)) {
    rows.push(buildRow(ctx, input, def, seed, bodies, stored));
  }

  const byKey = new Map<string, number>();
  rows.forEach((row, i) => byKey.set(row.key, i));

  const coverage: Record<string, { filled: number; total: number }> = {};
  for (const id of stored) coverage[id] = { filled: 0, total: 0 };
  for (const row of rows) {
    // A missing row has no body to fill, an archived one is not in play.
    if (row.status === 'missing' || row.status === 'archived') continue;
    for (const id of stored) {
      coverage[id].total += 1;
      if (row.cells[id].filled) coverage[id].filled += 1;
    }
  }
  return { def, rows, byKey, coverage };
}

function buildRow(
  ctx: WalkContext,
  input: TableInput,
  def: TableDef,
  seed: RowSeed,
  bodies: ReadonlyMap<EntityId, Body>,
  stored: ReadonlySet<string>,
): TableRow {
  const { graph } = ctx;
  const { id, node, vocab } = seed;
  const kind = kindOf(id);
  const item = input.items?.get(id);
  const body: Body | undefined =
    item?.body ?? item?.pendingBody ?? bodies.get(id) ?? vocab?.body;
  // The repo graph states no statuses (every record is `code`); in repo
  // mode the `/items` list still says which rows the API holds and in what
  // state, as the working merge would (a proposal awaiting review first).
  // An item the graph does not have at all is the API's alone: its state
  // is the list's too.
  const status: RowStatus =
    item?.status === 'archived'
      ? 'archived'
      : item && (!node || node.status === 'code')
        ? item.editState === 'pending'
          ? 'pending'
          : item.status
        : (node?.status ?? (vocab ? 'code' : 'missing'));
  // Held by the API, drawn nowhere: no node, so no connections, and in repo
  // mode no body either — only its name and state (see `seedsOf`).
  const apiOnly = !node && !vocab && status !== 'archived';
  const unverified = Boolean(node?.unverified || body?.unverified === true);
  // An archived item has no node: its body names it.
  const label =
    node?.label ??
    vocab?.label ??
    text(body?.name) ??
    text(body?.title) ??
    text(item?.title) ??
    slugOf(id);

  const own = [id];
  const expanded = expansionOf(graph, def, id);
  const cells: Record<string, CellValue> = {};
  const columnLabels = new Map<string, readonly Neighbour[]>();
  let guessed = false;
  let unconfirmed = unverified;

  for (const column of def.columns) {
    const { source } = column;
    const options = { stored: stored.has(column.id), empty: column.empty };
    const starts = 'noExpand' in source && source.noExpand ? own : expanded;
    switch (source.type) {
      case 'title':
        cells[column.id] = {
          type: 'title',
          label,
          ...sublabelOf(graph, source.sublabel, id, body),
          sort: label,
          filled: true,
        };
        break;
      case 'connections': {
        const result = connectionsOf(ctx, starts, source.parts, options);
        const unlinked = source.unlinkedText
          ? unlinkedTexts(body, source.unlinkedText, result.neighbours)
          : [];
        // Text no chip came from is something to show, so no empty note.
        cells[column.id] = unlinked.length
          ? { ...result.cell, unlinked, note: undefined }
          : result.cell;
        columnLabels.set(column.id, result.neighbours);
        guessed ||= result.guessed;
        unconfirmed ||= result.unconfirmed;
        break;
      }
      case 'years':
        cells[column.id] = yearsOf(ctx, starts, source.parts, options).cell;
        break;
      case 'field': {
        const cell = fieldCell(ctx, column, source, body, expanded, options);
        cells[column.id] = cell;
        if (cell.type === 'field' && cell.unverified) unconfirmed = true;
        break;
      }
      case 'credits': {
        const cell = creditsCell(graph, source, body, options);
        cells[column.id] = cell;
        if (cell.type === 'credits') {
          if (cell.chips.some((c) => c.style === 'dotted')) guessed = true;
          if (cell.chips.some((c) => c.style === 'dashed')) unconfirmed = true;
        }
        break;
      }
    }
  }

  // What is suggested for the row's own empty fields, as ghosts in them.
  const ghosts = input.suggestions?.ghosts?.(id);
  if (ghosts?.length) withGhosts(graph, def, cells, ghosts);

  // Every cell of such a row is empty for one reason, the row's, not the
  // column's: say that instead of where the column's data will come from.
  if (apiOnly) {
    for (const column of def.columns) {
      const cell = cells[column.id];
      if (cell.note !== undefined) {
        cells[column.id] = { ...cell, note: API_ONLY_NOTE };
      }
    }
  }

  const flags = flagsOf(graph, input, id, kind, status, body, vocab, !!node);
  if (unverified) flags.add('unverified');
  if (unconfirmed) flags.add('unconfirmed');
  if (guessed) flags.add('guesses');
  const suggestions = input.suggestions?.count(id) ?? 0;
  if (suggestions > 0) flags.add('suggestions');

  const edges = graph.adjacency.get(id) ?? [];
  const title = cells.title;
  return {
    key: slugOf(id),
    node: id,
    kind,
    label,
    ...(title?.type === 'title' && title.sublabel
      ? { sublabel: title.sublabel }
      : {}),
    status,
    editState:
      item?.editState ?? (node?.status === 'pending' ? 'pending' : null),
    unverified,
    ...(body ? { body } : {}),
    ...(item ? { itemId: item.id } : {}),
    cells,
    flags,
    haystack: haystackOf(def, id, label, body, columnLabels),
    suggestions,
    degree: {
      solid: graph.solidDegree(id),
      guessed: edges.filter((e) => e.inferred).length,
    },
  };
}

/**
 * What an empty cell of a row the graph does not have says: the API holds
 * the item, but what the Table draws is the repo's snapshot, which does not.
 */
export const API_ONLY_NOTE =
  'Not in the repo snapshot: open the full editor to see its fields';

/* ── Flags ───────────────────────────────────────────────────────────── */

const PEOPLE_KINDS: ReadonlySet<string> = new Set(PEOPLE);

/**
 * The flags a row's record, node and connections give it (the ones the
 * cells give — guesses, unconfirmed — are added by the caller).
 */
function flagsOf(
  graph: Graph,
  input: TableInput,
  id: EntityId,
  kind: EntityKind,
  status: RowStatus,
  body: Body | undefined,
  vocab: VocabularyRow | undefined,
  inGraph: boolean,
): Set<RowFlag> {
  const flags = new Set<RowFlag>();
  const edges = graph.adjacency.get(id) ?? [];
  // Orphan is what the graph says of a node; a row it does not draw at all
  // (archived, or the API's alone) is not known to be one.
  if (inGraph && edges.length === 0) flags.add('orphan');
  if (status === 'missing') flags.add('missing');
  if (input.suggestions?.bulkUnreviewed?.(id)) flags.add('bulk-unreviewed');

  if (kind === 'artist') {
    const group = body?.group === true;
    if (body) flags.add(group ? 'group' : 'person');
    // A name on a credit with no record yet is a credited person too: the
    // session players the credits name must not crowd the acts.
    if (
      !group &&
      !billedActs(input.snapshot).has(id) &&
      isCreditedOnly(id, edges)
    ) {
      flags.add('credited');
    }
  }
  if (kind === 'place') {
    if (slugOf(id).startsWith('region-')) flags.add('region');
    else if (body?.pin === false) flags.add('hometown');
    else if (body) flags.add('city');
  }
  if (kind === 'subgenre') flags.add('subgenre');
  if (kind === 'genre' && vocab?.body.taught === true) flags.add('taught');
  return flags;
}

const billedIndexes = new WeakMap<GraphSnapshot, ReadonlySet<EntityId>>();
const NO_ACTS: ReadonlySet<EntityId> = new Set();

/**
 * The artists the songs name as acts beyond what the graph draws as
 * `performed_by`: the act a song is billed to (`artist`, the line the
 * Songs table's lead act shows), and every ensemble a credit names — an
 * ensemble is a group, and a group is an act.
 *
 * The graph draws the billing text only as a fallback, when no credit is
 * billed, so a song whose billed credits name its singers (Africa: Bobby
 * Kimball and David Paich) never draws Toto as its performer; and Toto's
 * own credit there is the ensemble's production. Neither may make Toto a
 * credited person.
 */
function billedActs(
  snapshot: GraphSnapshot | undefined,
): ReadonlySet<EntityId> {
  if (!snapshot || !Array.isArray(snapshot.songs)) return NO_ACTS;
  const cached = billedIndexes.get(snapshot);
  if (cached) return cached;
  const acts = new Set<EntityId>();
  // As the graph names them (deriveEdges): a stored id first, else the name.
  const add = (name: string | undefined) => {
    if (name) acts.add(toEntityId('artist', name));
  };
  for (const song of snapshot.songs as readonly unknown[]) {
    if (!song || typeof song !== 'object') continue;
    add(text((song as Body).artist));
    for (const credit of valuesAt(song, 'credits[]')) {
      if (!credit || typeof credit !== 'object') continue;
      const { ensemble, artistGlobeId, name } = credit as Body;
      if (ensemble === true) add(text(artistGlobeId) ?? text(name));
    }
  }
  billedIndexes.set(snapshot, acts);
  return acts;
}

/**
 * An artist only credited — who wrote, produced or played on songs — and
 * never billed on a song or a record, nor the subject of an event: the
 * Artist table's "Credited people" (C30). Everyone else is an act, the
 * registry's artists with no songs yet included.
 *
 * Playing on a record (`features`) is a credit, not billing: the graph draws
 * every performer a song does not bill that way — its session players and
 * sidemen (Africa's Steve Lukather) — while a billed performer is
 * `performed_by`. What the graph cannot see, a song's billing text and its
 * ensembles, `billedActs` adds.
 */
function isCreditedOnly(id: EntityId, edges: readonly GraphEdge[]): boolean {
  let credited = false;
  for (const edge of edges) {
    if (edge.to !== id) continue;
    if (edge.kind === 'performed_by' || edge.kind === 'about') return false;
    if (PEOPLE_KINDS.has(edge.kind)) credited = true;
  }
  return credited;
}

/* ── Search ──────────────────────────────────────────────────────────── */

/**
 * Each text folded once: a big table folds the same labels (a genre, a
 * song title) for row after row, and a fold is a Unicode normalization and
 * four replaces. The texts are the data's own, so the memo is bounded by it.
 */
const folded = new Map<string, string>();

/** Text as the search box compares it: `normalizeArtistName`'s folding. */
export const foldText = (value: string): string => {
  let fold = folded.get(value);
  if (fold === undefined) {
    fold = normalizeArtistName(value);
    folded.set(value, fold);
  }
  return fold;
};

function haystackOf(
  def: TableDef,
  id: EntityId,
  label: string,
  body: Body | undefined,
  columnLabels: ReadonlyMap<string, readonly Neighbour[]>,
): string {
  const words: string[] = [];
  for (const key of def.search) {
    if (key.from === 'label') words.push(label);
    else if (key.from === 'key') words.push(slugOf(id));
    else if (key.from === 'field') {
      for (const value of valuesAt(body, key.path)) {
        if (typeof value === 'string' || typeof value === 'number') {
          words.push(String(value));
        }
      }
    } else {
      for (const n of columnLabels.get(key.column) ?? []) words.push(n.label);
    }
  }
  return words.map(foldText).filter(Boolean).join(' ');
}

/* ── Text no chip came from ──────────────────────────────────────────── */

/**
 * The ids a text field's value turns into, for the fields the graph resolves
 * through a table: an event's genre strings through the genre table, its
 * city through the place registry (as `placeSlugFor` names it, so a city the
 * registry cannot place still matches the missing node it made).
 */
const RESOLVERS: Readonly<
  Record<string, (value: string, body: Body) => readonly EntityId[]>
> = {
  'genre[]': (value) => {
    const genre = resolveGenreTag(value);
    if (!genre) return [];
    return genre.subgenre
      ? [`subgenre:${genre.subgenre}`, `genre:${genre.genre}`]
      : [`genre:${genre.genre}`];
  },
  'location.city': (value, body) => {
    const country = text(valuesAt(body, 'location.country')[0]);
    return [`place:${placeSlugFor(value, country)}`];
  },
};

/**
 * The texts at `path` no chip came from, shown muted ("Gary, US?"). For a
 * field the graph resolves, each text is checked against what it resolves
 * to; for legacy text the graph does not read (a progression's `song`), it
 * is shown only while nothing is linked, as the thing to link.
 */
function unlinkedTexts(
  body: Body | undefined,
  path: string,
  neighbours: readonly Neighbour[],
): string[] {
  const texts = [
    ...new Set(valuesAt(body, path).map(text).filter(Boolean)),
  ] as string[];
  if (texts.length === 0) return [];
  const shown = neighbours.filter((n) => !n.muted);
  const resolve = RESOLVERS[path];
  if (!resolve) return shown.length ? [] : texts;
  const nodes = new Set(shown.map((n) => n.node));
  const labels = new Set(shown.map((n) => foldText(n.label)));
  const slugs = new Set(shown.map((n) => slugOf(n.node)));
  return texts.filter(
    (value) =>
      !resolve(value, body!).some((node) => nodes.has(node)) &&
      !labels.has(foldText(value)) &&
      !slugs.has(toSlug(value)),
  );
}

/* ── Titles ──────────────────────────────────────────────────────────── */

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const join = (parts: readonly (string | undefined | false)[], sep: string) =>
  parts.filter(Boolean).join(sep);

/** The first node `edge` leads to from `id`, going out. */
function outNeighbour(
  graph: Graph,
  id: EntityId,
  edge: string,
): EntityId | undefined {
  return graph.adjacency.get(id)?.find((e) => e.kind === edge && e.from === id)
    ?.to;
}

/** The line under a row's title (types.ts, `Sublabel`). */
function sublabelOf(
  graph: Graph,
  sublabel: Sublabel | undefined,
  id: EntityId,
  body: Body | undefined,
): { sublabel?: string } {
  const value = sublabelText(graph, sublabel, id, body);
  return value ? { sublabel: value } : {};
}

function sublabelText(
  graph: Graph,
  sublabel: Sublabel | undefined,
  id: EntityId,
  body: Body | undefined,
): string | undefined {
  switch (sublabel) {
    case undefined:
      return undefined;
    case 'artist': {
      const aliases = valuesAt(body, 'aliases[]').map(text).filter(Boolean);
      return join([body?.group === true && 'Group', aliases.join(', ')], ' · ');
    }
    case 'lead-act': {
      const billed = text(body?.artist);
      if (billed) return billed;
      const acts = (graph.adjacency.get(id) ?? []).filter(
        (e) => e.kind === 'performed_by' && e.from === id,
      );
      return acts.map((e) => labelOf(graph, e.to)).join(', ') || undefined;
    }
    case 'genre':
      if (kindOf(id) === 'subgenre') {
        const parent = SUBGENRE_PARENT[slugOf(id)];
        return parent ? genreName(parent) : undefined;
      }
      return body?.taught === true ? 'Taught' : undefined;
    case 'place': {
      if (slugOf(id).startsWith('region-')) return 'Region';
      const region = text(body?.region);
      return join(
        [
          join([text(body?.subdivision), text(body?.country)], ', '),
          region && labelOf(graph, `place:region-${region}`),
          body?.pin === false && 'No pin',
        ],
        ' · ',
      );
    }
    case 'section': {
      const section = text(body?.section);
      return section && capitalize(section);
    }
    case 'event': {
      const year = yearOf(body?.year);
      const where = join(
        [
          text(valuesAt(body, 'location.city')[0]),
          text(valuesAt(body, 'location.country')[0]),
        ],
        ', ',
      );
      return join([year !== null && String(year), where], ' · ');
    }
    case 'format': {
      const format = text(body?.format);
      return format && capitalize(format);
    }
    case 'years': {
      const [from, to] =
        kindOf(id) === 'studio'
          ? [num(body?.openedYear), num(body?.closedYear)]
          : [num(body?.foundedYear), num(body?.defunctYear)];
      return rangeText(from, to);
    }
    case 'calendar': {
      if (kindOf(id) === 'decade') {
        const start = parseInt(slugOf(id), 10);
        return Number.isFinite(start) ? `${start}–${start + 9}` : undefined;
      }
      const decade = outNeighbour(graph, id, 'in_decade');
      const era = outNeighbour(graph, id, 'from_era');
      return join(
        [decade && labelOf(graph, decade), era && labelOf(graph, era)],
        ' · ',
      );
    }
    case 'shape': {
      const complexity = text(body?.complexity);
      const list = body?.chords;
      const chords =
        num(body?.chordCount) ??
        (Array.isArray(list) ? list.length : undefined);
      return join(
        [
          complexity && capitalize(complexity),
          chords !== undefined && `${chords} chord${chords === 1 ? '' : 's'}`,
        ],
        ' · ',
      );
    }
  }
}

/* ── Fields ──────────────────────────────────────────────────────────── */

/** "1961–1984", "1970–" while open, "–1984" when only the end is known. */
function rangeText(from?: number, to?: number): string | undefined {
  if (from === undefined && to === undefined) return undefined;
  return `${from ?? ''}–${to ?? ''}`;
}

export type FieldValue = { text?: string; sort: number | string | null };

/**
 * A field's value as a cell writes it (types.ts, `FieldFormat`). Exported so
 * a value written in place can show as the next model will write it
 * (the grid's overlays). The graph names a birthplace; without one, a Born
 * shows the place's id.
 */
export function formatField(
  graph: Graph | undefined,
  source: Extract<ColumnSource, { type: 'field' }>,
  body: Body | undefined,
): FieldValue {
  const value = valuesAt(body, source.path)[0];
  switch (source.format) {
    case 'text': {
      const t =
        text(value) ?? (num(value) !== undefined ? String(value) : undefined);
      return { text: t, sort: t ?? null };
    }
    case 'list': {
      const items = valuesAt(body, `${source.path}[]`)
        .map((v) => text(v) ?? (num(v) !== undefined ? String(v) : undefined))
        .filter(Boolean) as string[];
      return items.length
        ? { text: items.join(', '), sort: items[0] }
        : { sort: null };
    }
    case 'year': {
      const year = yearOf(value);
      return year === null
        ? { sort: null }
        : { text: String(year), sort: year };
    }
    case 'number': {
      const n = num(value);
      return n === undefined ? { sort: null } : { text: String(n), sort: n };
    }
    case 'born': {
      if (!value || typeof value !== 'object') return { sort: null };
      const born = value as Body;
      const date =
        text(born.date) ?? (num(born.year) ? String(born.year) : undefined);
      const placeId = text(born.placeId);
      const place =
        placeId && (graph ? labelOf(graph, `place:${placeId}`) : placeId);
      const group = body?.group === true;
      const shown = join(
        [date && (group ? `Formed ${date}` : date), place],
        ' · ',
      );
      return { text: shown || undefined, sort: date ?? null };
    }
    case 'yearRange': {
      const from = num(value);
      const to = source.to ? num(valuesAt(body, source.to)[0]) : undefined;
      const range = rangeText(from, to);
      return { text: range, sort: from ?? to ?? null };
    }
    case 'songKey': {
      const key = text(value);
      const mode = source.to ? text(valuesAt(body, source.to)[0]) : undefined;
      // The library writes the mode into the key ('C major'); a bare tonic
      // takes it from `mode`.
      const shown = key && mode && !/\s/.test(key) ? `${key} ${mode}` : key;
      return { text: shown, sort: shown ?? null };
    }
    case 'coordinates': {
      if (!Array.isArray(value) || value.length < 2) return { sort: null };
      const [lat, lng] = value as unknown[];
      if (num(lat) === undefined || num(lng) === undefined)
        return { sort: null };
      return {
        text: `${(lat as number).toFixed(2)}, ${(lng as number).toFixed(2)}`,
        sort: lat as number,
      };
    }
    case 'flag':
      return typeof value === 'boolean'
        ? { text: value ? 'Yes' : 'No', sort: value ? 1 : 0 }
        : { sort: null };
    case 'ids': {
      if (!value || typeof value !== 'object') return { sort: null };
      // How many ids it holds, never whose: the site names no outside
      // catalogue (owner decision of 30 September 2026).
      const known = Object.values(value as Body).filter((id) => text(id));
      return known.length
        ? {
            text: `${known.length} outside id${known.length === 1 ? '' : 's'}`,
            sort: known.length,
          }
        : { sort: null };
    }
  }
}

function fieldCell(
  ctx: WalkContext,
  column: ColumnDef,
  source: Extract<ColumnSource, { type: 'field' }>,
  body: Body | undefined,
  starts: readonly EntityId[],
  options: { stored: boolean; empty: string },
): CellValue {
  const { text: shown, sort } = formatField(ctx.graph, source, body);
  const raw = valuesAt(body, source.path)[0];
  const unverified =
    shown !== undefined &&
    ((raw && typeof raw === 'object' && (raw as Body).unverified === true) ||
      body?.unverified === true);
  const hint = source.hint ? hintText(ctx, source.hint, starts) : undefined;
  return {
    type: 'field',
    ...(shown !== undefined ? { text: shown } : {}),
    ...(unverified ? { unverified: true as const } : {}),
    ...(hint ? { hint } : {}),
    sort,
    // A yes or no says something either way; `isPresent` reads false as
    // nothing, which it is for every other field.
    filled:
      !options.stored ||
      (source.format === 'flag' ? typeof raw === 'boolean' : isPresent(raw)),
    ...(shown === undefined ? { note: column.empty } : {}),
  };
}

/** The muted line beside a field: "events 1964–1983". */
function hintText(
  ctx: WalkContext,
  hint: NonNullable<Extract<ColumnSource, { type: 'field' }>['hint']>,
  starts: readonly EntityId[],
): string | undefined {
  const toYears = hint.parts.every((p) =>
    p.hops[p.hops.length - 1].to.every((k) => k === 'year'),
  );
  const options = { stored: false, empty: '' };
  if (toYears) {
    const { cell } = yearsOf(ctx, starts, hint.parts, options);
    return cell.first === undefined
      ? undefined
      : `${hint.label} ${yearSpan(cell.first, cell.last)}`;
  }
  const { cell } = connectionsOf(ctx, starts, hint.parts, options);
  return cell.total ? `${hint.label} ${cell.total}` : undefined;
}

/* ── Credits ─────────────────────────────────────────────────────────── */

const ROLE_WORDS: Readonly<Record<string, readonly [string, string]>> = {
  performer: ['performer', 'performers'],
  vocals: ['vocal', 'vocals'],
  songwriter: ['songwriter', 'songwriters'],
  producer: ['producer', 'producers'],
  engineer: ['engineer', 'engineers'],
  arranger: ['arranger', 'arrangers'],
  conductor: ['conductor', 'conductors'],
};

const ROLE_ORDER = Object.keys(ROLE_WORDS);

/**
 * The credits a credits column shows: every one, or only those in its
 * `roles` (the Engineer column's engineers). A credit naming no role is a
 * performer's, as the summary counts it.
 */
export function creditsIn(
  source: Extract<ColumnSource, { type: 'credits' }>,
  body: unknown,
): Body[] {
  const credits = valuesAt(body, `${source.path}[]`).filter(
    (c): c is Body => Boolean(c) && typeof c === 'object',
  );
  const { roles } = source;
  return roles
    ? credits.filter((c) =>
        (roles as readonly string[]).includes(text(c.role) ?? 'performer'),
      )
    : credits;
}

/**
 * A song's credits summarised — "7 · 3 performers, 2 vocals" — with a chip
 * per person: linked solid, unconfirmed dashed, a name alone dotted, as the
 * graph draws the edges the same credits make. A column of one role's
 * credits has the chips alone: its summary would only repeat its header.
 */
/**
 * The node a credit's name alone makes, read once per name: a song has a
 * credits column per role, and each reads every credit.
 */
const creditedIds = new Map<string, EntityId>();
const creditedId = (name: string): EntityId => {
  let id = creditedIds.get(name);
  if (id === undefined) {
    id = toEntityId('artist', name);
    creditedIds.set(name, id);
  }
  return id;
};

function creditsCell(
  graph: Graph,
  source: Extract<ColumnSource, { type: 'credits' }>,
  body: Body | undefined,
  options: { stored: boolean; empty: string },
): CellValue {
  const credits = creditsIn(source, body);
  const roles = new Map<string, number>();
  const people = new Map<
    EntityId,
    { chip: Chip; tags: Set<string>; style: ChipStyle }
  >();
  for (const credit of credits) {
    const name = text(credit.name);
    if (!name) continue;
    const role = text(credit.role) ?? 'performer';
    roles.set(role, (roles.get(role) ?? 0) + 1);
    const linked = text(credit.artistGlobeId);
    const node: EntityId = linked
      ? (`artist:${linked}` as EntityId)
      : creditedId(name);
    const style: ChipStyle = !linked
      ? 'dotted'
      : credit.unverified === true
        ? 'dashed'
        : 'solid';
    const instrument = text(credit.instrument);
    const tag = instrument ? labelOf(graph, `instrument:${instrument}`) : role;
    const known = people.get(node);
    if (known) {
      known.chip.weight += 1;
      known.tags.add(tag);
      if (CHIP_STYLES.indexOf(style) < CHIP_STYLES.indexOf(known.style)) {
        known.style = style;
      }
    } else {
      people.set(node, {
        chip: {
          node,
          label: linked ? labelOf(graph, node) : name,
          style,
          part: 'credits',
          weight: 1,
          title: linked ? 'credits[].artistGlobeId' : 'credits[].name',
        },
        tags: new Set([tag]),
        style,
      });
    }
  }
  const chips = [...people.values()].map(({ chip, tags, style }) => ({
    ...chip,
    style:
      graph.nodes.get(chip.node)?.status === 'missing'
        ? ('hollow' as const)
        : style,
    tag: [...tags].join(' · '),
  }));
  const counted = [...roles].sort(
    (a, b) =>
      b[1] - a[1] || ROLE_ORDER.indexOf(a[0]) - ROLE_ORDER.indexOf(b[0]),
  );
  const total = [...roles.values()].reduce((a, b) => a + b, 0);
  const summary =
    total && !source.roles
      ? `${total} · ${counted
          .map(([role, n]) => {
            const [one, many] = ROLE_WORDS[role] ?? [role, role];
            return `${n} ${n === 1 ? one : many}`;
          })
          .join(', ')}`
      : undefined;
  return {
    type: 'credits',
    ...(summary ? { summary } : {}),
    chips: chips.slice(0, CHIP_LIMIT),
    sort: total,
    filled: !options.stored || total > 0,
    ...(total === 0 ? { note: options.empty } : {}),
  };
}

/* ── Narrowing ───────────────────────────────────────────────────────── */

/**
 * What a table can be narrowed to (Key: the modes), each with how many of
 * the rows' first-step neighbours reach it — "minor 38". Empty for a table
 * with no `narrow`.
 */
export function narrowChoices(
  input: TableInput,
  table: TableId,
): readonly { node: EntityId; label: string; count: number }[] {
  const def = TABLES[table];
  if (!def.narrow) return [];
  const ctx = walkContext(input.graph);
  const firstHops = def.columns.flatMap((column) =>
    column.source.type === 'connections' || column.source.type === 'years'
      ? column.source.parts.map((part) => part.hops[0])
      : [],
  );
  const landings = new Set<EntityId>();
  for (const node of nodesOfKind(input.graph, def.rows.kind)) {
    for (const hop of firstHops) {
      forEachStep(ctx, node.id, hop, (next) => landings.add(next));
    }
  }
  const counts = new Map<EntityId, number>();
  for (const landing of landings) {
    forEachStep(ctx, landing, def.narrow.hop, (choice) =>
      counts.set(choice, (counts.get(choice) ?? 0) + 1),
    );
  }
  return [...counts]
    .map(([node, count]) => ({
      node,
      label: labelOf(input.graph, node),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
