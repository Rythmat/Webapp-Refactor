import {
  type GraphSnapshot,
  type ItemStatus,
  matchSnapshotEvents,
  type SnapshotList,
} from '@/content/graph/deriveGraph';
import { canonicalId } from '@/content/graph/ids';
import type { EntityId, EntityKind } from '@/content/graph/types';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { ExportRow } from '@/hooks/data/admin/useContentExport';

/**
 * The working copy of the Atlas: the repo's snapshot with the content API's
 * items laid over it (design decision 15; Table design §3.2). Pure — no
 * React, no store — so it can be tested on fixtures and moved into a worker
 * with the graph build if a rebuild ever gets slow.
 *
 * Per kind:
 *  - a kind the API does not export keeps the repo's list as it is;
 *  - an exported kind is the repo's list with the API's items laid over it,
 *    the API winning per id, and its new items added;
 *  - an exported kind the server marks `authoritative` is the API's items
 *    alone: the store holds the whole set, so a record deleted or merged
 *    there must not come back from the repo.
 *
 * An archived item is left out of the graph, and its repo copy with it — the
 * API has the last word on that id too — but it stays in `items`, so the
 * Table can list it under "Archived". A row that came without a body (the
 * `/items` fallback) cannot stand in for the repo's copy, so it joins
 * `items` and the repo's copy stays, even for an authoritative kind.
 *
 * Everything else in the snapshot (Teach days, pathways, influence arcs, the
 * instrument table, the year it was taken) passes through as the repo has
 * it — except who each globe event is about (`eventMatches`), which depends
 * on every artist, song, place and event at once: once the API has any of
 * those, the repo's answer is stale, so it is asked again of the working
 * lists.
 */

/** An API item, with the content kind it was exported under. */
export interface WorkingItem extends ExportRow {
  contentKind: ContentKind;
}

/** What the merge needs to know of the server: `useCapabilities()` fits. */
export interface MergeRules {
  /** The store holds the whole set, so no repo copy is merged in. */
  isAuthoritative(kind: ContentKind): boolean;
}

/** Where a content kind's items go in the snapshot, and what node they are. */
interface KindList {
  /** The snapshot list. */
  list: SnapshotList;
  /**
   * The field the graph reads each item's identity from — the same as
   * deriveGraph's own IDENTITY table, which the export's `slug` equals.
   */
  field: string;
  /** The node an item defines; null for items that state things about others. */
  node: EntityKind | null;
}

/**
 * The content kinds the working graph reads, in the order their items claim
 * a node: a song's globe event (`song-africa`) folds onto the song, so the
 * song is read first and keeps its own status.
 */
export const WORKING_KINDS = {
  song: { list: 'songs', field: 'id', node: 'song' },
  chord_progression: { list: 'progressions', field: 'id', node: 'progression' },
  artist: { list: 'artists', field: 'slug', node: 'artist' },
  release: { list: 'releases', field: 'slug', node: 'release' },
  studio: { list: 'studios', field: 'slug', node: 'studio' },
  label: { list: 'labels', field: 'slug', node: 'label' },
  globe_city: { list: 'places', field: 'id', node: 'place' },
  globe_event: { list: 'events', field: 'id', node: 'event' },
  // Where an artist's songs are pinned (design C24): a statement about an
  // artist, not a node of its own.
  artist_location: { list: 'artistLocations', field: 'id', node: null },
} as const satisfies Partial<Record<ContentKind, KindList>>;

export type WorkingContentKind = keyof typeof WORKING_KINDS;

export const WORKING_CONTENT_KINDS = Object.keys(
  WORKING_KINDS,
) as readonly WorkingContentKind[];

type Body = Record<string, unknown>;

/** The kinds `matchSnapshotEvents` reads: a change to any of them can move a match. */
const MATCH_SOURCES: readonly ContentKind[] = [
  'song',
  'artist',
  'globe_city',
  'globe_event',
];

/**
 * The body the graph draws for a row: the stored one, or — for a new item
 * that exists only as a proposal — the proposal. An editor's export already
 * puts their own proposal in `body`.
 */
export const drawnBody = (row: ExportRow): Body | null =>
  row.body ?? row.pendingBody ?? null;

/** The node's status for a row: a proposal awaiting review outranks the item's. */
export const itemStatusOf = (row: ExportRow): ItemStatus | null => {
  if (row.status === 'archived') return null;
  return row.editState === 'pending' ? 'pending' : row.status;
};

/** The canonical node an item defines, when it is the node's own record. */
function ownNode(spec: KindList, slug: string): EntityId | null {
  if (!spec.node) return null;
  const raw = `${spec.node}:${slug.trim()}` as EntityId;
  const id = canonicalId(raw);
  // A song's globe event folds onto the song: it describes that node but is
  // not its record, so it neither claims the node's status nor its item.
  return id === raw ? id : null;
}

export interface WorkingSnapshot {
  /** What `buildGraph` reads; `statuses` holds each API item's state. */
  snapshot: GraphSnapshot;
  /** Canonical node id → the API item that stores it, archived ones included. */
  items: ReadonlyMap<EntityId, WorkingItem>;
}

/**
 * The repo snapshot with the API's exported items over it (see the header).
 * `exported` holds the kinds the API exported — a kind absent from it is
 * left as the repo has it, however the server marks it.
 */
export function mergeSnapshot(
  repo: GraphSnapshot,
  exported: ReadonlyMap<ContentKind, readonly ExportRow[]>,
  rules: MergeRules,
): WorkingSnapshot {
  const lists: Record<string, unknown> = { ...repo };
  const statuses = new Map<EntityId, ItemStatus>();
  const items = new Map<EntityId, WorkingItem>();

  for (const kind of WORKING_CONTENT_KINDS) {
    const rows = exported.get(kind);
    if (!rows) continue;
    const spec: KindList = WORKING_KINDS[kind];

    // Every slug the API holds, the bodies it draws, and the archived ones.
    const held = new Set<string>();
    const drawn = new Map<string, Body>();
    const archived = new Set<string>();
    for (const row of rows) {
      held.add(row.slug);
      const node = ownNode(spec, row.slug);
      if (node && !items.has(node)) {
        items.set(node, { ...row, contentKind: kind });
      }
      if (row.status === 'archived') {
        archived.add(row.slug);
        continue;
      }
      const body = drawnBody(row);
      if (!body || drawn.has(row.slug)) continue;
      // A partial body may lack its identity; the export's slug is it.
      drawn.set(
        row.slug,
        spec.field in body ? body : { ...body, [spec.field]: row.slug },
      );
      const status = itemStatusOf(row);
      if (node && status && !statuses.has(node)) statuses.set(node, status);
    }

    const authoritative = rules.isAuthoritative(kind);
    const repoList = lists[spec.list];
    const merged: unknown[] = [];
    const placed = new Set<string>();
    for (const item of Array.isArray(repoList) ? repoList : []) {
      const id = identityOf(item, spec.field);
      const body = id === undefined ? undefined : drawn.get(id);
      if (id === undefined || !held.has(id)) {
        // Only the repo has it (or it has no id the API could match, which
        // the graph reports as unreadable): kept unless the store has the
        // whole set.
        if (!authoritative) merged.push(item);
      } else if (body) {
        // The API's copy, in the repo's place; a repeat of the id is dropped.
        if (!placed.has(id)) merged.push(body);
        placed.add(id);
      } else if (!archived.has(id)) {
        // The API holds it but sent no body (the `/items` fallback): the
        // repo's copy is the only one there is to draw. An archived one is
        // gone from the graph, repo copy and all.
        merged.push(item);
      }
    }
    for (const [id, body] of drawn) {
      if (!placed.has(id)) merged.push(body);
    }
    lists[spec.list] = merged;
  }

  // Code-owned nodes have no API state; the repo snapshot carries none.
  const snapshot = { ...lists, statuses } as GraphSnapshot;
  // A snapshot without matches did not want them (a fixture, a test).
  if (repo.eventMatches && MATCH_SOURCES.some((kind) => exported.has(kind))) {
    snapshot.eventMatches = matchSnapshotEvents(snapshot);
  }
  return { snapshot, items };
}

/** An item's identity value as the export spells it (a number as its digits). */
function identityOf(item: unknown, field: string): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const value = (item as Record<string, unknown>)[field];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Just the items, for when there is no graph to merge them into: the repo
 * mode's Table still needs each row's API id and state, from the `/items`
 * list. Same keys and the same first-claim rule as `mergeSnapshot`.
 */
export function workingItems(
  exported: ReadonlyMap<ContentKind, readonly ExportRow[]>,
): ReadonlyMap<EntityId, WorkingItem> {
  const items = new Map<EntityId, WorkingItem>();
  for (const kind of WORKING_CONTENT_KINDS) {
    for (const row of exported.get(kind) ?? []) {
      const node = ownNode(WORKING_KINDS[kind], row.slug);
      if (node && !items.has(node))
        items.set(node, { ...row, contentKind: kind });
    }
  }
  return items;
}
