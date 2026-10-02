import {
  keepPreviousData,
  type Query,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  buildGraph,
  type Graph,
  type GraphSnapshot,
} from '@/content/graph/deriveGraph';
import type { EntityId } from '@/content/graph/types';
import {
  CONTENT_KEY,
  type ContentKind,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import {
  type ContentExport,
  type ExportRow,
  useContentExports,
} from '@/hooks/data/admin/useContentExport';
import type { AtlasGraph } from './repoSnapshot';
import { type GraphMode, REPO_GRAPH_KEY, useAtlasGraph } from './useAtlasGraph';
import {
  mergeSnapshot,
  type MergeRules,
  WORKING_CONTENT_KINDS,
  type WorkingItem,
  workingItems,
} from './workingSnapshot';

/**
 * The Atlas as the content API has it now: the repo's graph with every
 * exported item laid over it (`workingSnapshot.ts`), rebuilt when the content
 * changes and not otherwise. One hook for every reader, so the Table, the
 * mind map and Integrity show the same graph, and a save in any of them
 * refreshes all three (Table design §3.2).
 *
 * How a save reaches the screen: the save invalidates CONTENT_KEY; the
 * exports refetch; if what they say changed, their fingerprint changes; the
 * build's query key carries the fingerprint, so a new graph is built while
 * the previous one stays on screen (`keepPreviousData`, `isRefreshing`). A
 * refetch that brought back the same content keeps the same key, and nothing
 * is rebuilt.
 *
 * Without `/export` (today's production API) there are no bodies to merge,
 * so the graph is the repo's, read-only (`mode: 'repo'`). The `/items` list
 * still says which rows the API holds and in what state (`items`) — for the
 * Table, whose rows show it; a page that shows no items passes
 * `{ items: false }` and reads only the song pins' list. The repo graph is
 * also what shows while the first working build is on its way.
 */

export type WorkingGraphMode = GraphMode;

export interface WorkingGraphState {
  graph?: Graph;
  snapshot?: GraphSnapshot;
  /**
   * The snapshot and the graph built from it, together: what the mind map
   * walks and Integrity checks (`checkIntegrity` reads both), the repo's in
   * repo mode and the working copy's otherwise.
   */
  atlas?: AtlasGraph;
  /** Canonical node id → the API item that stores it, archived ones included. */
  items: ReadonlyMap<EntityId, WorkingItem>;
  /**
   * A song pin's key (`EdgeVia.statedBy.id`, the act's name in lowercase) →
   * its `artist_location` item's id, for the links that open the pin itself.
   * Absent until the pins have loaded, and on an API that serves none.
   */
  pins?: ReadonlyMap<string, string>;
  /** `working` once a build over the API's items is showing; else `repo`. */
  mode: WorkingGraphMode;
  /** The content the showing graph was built from; null in repo mode. */
  fingerprint: string | null;
  /** Nothing to show yet. */
  isLoading: boolean;
  /**
   * What shows is not the latest: a rebuild is under way, or the working
   * copy is still loading behind the repo graph.
   */
  isRefreshing: boolean;
  error: unknown;
}

/** The build's key: the content and the rule that decides what merges. */
const workingGraphKey = (fingerprint: string, authoritative: string) =>
  ['console', 'atlas-graph', 'working', authoritative, fingerprint] as const;

const NO_ITEMS: ReadonlyMap<EntityId, WorkingItem> = new Map();

/**
 * What a page without items reads in repo mode: the song pins' list alone,
 * which the links to a pin go by (`pins`).
 */
const PIN_KINDS: readonly ContentKind[] = ['artist_location'];

export interface WorkingGraphOptions {
  /**
   * Read every kind's `/items` list in repo mode, for `items` (default
   * true). The Table's rows show each item's state; the mind map and
   * Integrity show none, and pass false to spare the requests. With
   * `/export` every kind is read either way: the working copy is built from
   * them.
   */
  items?: boolean;
}

/** A song pin's key → its item's id, from the pins' rows. */
function pinsOf(
  byKind: ReadonlyMap<ContentKind, ContentExport>,
): ReadonlyMap<string, string> | undefined {
  const rows = byKind.get('artist_location')?.rows;
  if (!rows) return undefined;
  const pins = new Map<string, string>();
  for (const row of rows) {
    if (row.status !== 'archived' && !pins.has(row.slug)) {
      pins.set(row.slug, row.id);
    }
  }
  return pins;
}

/** The exported rows by kind, as the merge takes them. */
const rowsByKind = (byKind: ReadonlyMap<ContentKind, ContentExport>) => {
  const out = new Map<ContentKind, readonly ExportRow[]>();
  for (const [kind, data] of byKind) out.set(kind, data.rows);
  return out;
};

interface WorkingBuild {
  atlas: AtlasGraph;
  items: ReadonlyMap<EntityId, WorkingItem>;
  fingerprint: string;
}

function buildWorking(
  repo: AtlasGraph,
  byKind: ReadonlyMap<ContentKind, ContentExport>,
  rules: MergeRules,
  fingerprint: string,
): WorkingBuild {
  const { snapshot, items } = mergeSnapshot(
    repo.snapshot,
    rowsByKind(byKind),
    rules,
  );
  return {
    atlas: { ...repo, snapshot, graph: buildGraph(snapshot) },
    items,
    fingerprint,
  };
}

export function useWorkingGraph({
  items: withItems = true,
}: WorkingGraphOptions = {}): WorkingGraphState {
  const caps = useCapabilities();
  const repo = useAtlasGraph();
  // Only bodies can be merged: a server without `/export` stays in repo mode.
  const capsKnown = caps.capabilities != null;
  const wantsWorking = caps.feature('export');
  const exports = useContentExports(
    wantsWorking || withItems ? WORKING_CONTENT_KINDS : PIN_KINDS,
  );
  const exported = [...exports.byKind.values()].every(
    (data) => data.source === 'export',
  );
  const authoritative = WORKING_CONTENT_KINDS.filter((kind) =>
    caps.isAuthoritative(kind),
  ).join(',');

  const build = useQuery({
    queryKey: workingGraphKey(exports.fingerprint, authoritative),
    queryFn: () =>
      buildWorking(repo.data!, exports.byKind, caps, exports.fingerprint),
    // After a save every export refetches, and a change can land in two
    // kinds (a song and its globe event); building once they have all come
    // back makes that one rebuild, not two.
    enabled:
      !!repo.data &&
      wantsWorking &&
      exported &&
      exports.ready &&
      !exports.fetching,
    // The key is the content, so a build never goes stale. An old one is
    // dropped soon after the content moves on: a build holds some 20 MB, and
    // the one showing needs no cache entry to stay on screen (the observer
    // keeps it as the placeholder). The half minute keeps the current one
    // for the next graph page opened.
    staleTime: Infinity,
    gcTime: 30_000,
    placeholderData: keepPreviousData,
    structuralSharing: false,
    retry: false,
  });

  const working = wantsWorking ? build.data : undefined;

  // Repo mode's items come from the `/items` list, bodies or not; the
  // working build has its own.
  const listedItems = useMemo(
    () => (working ? NO_ITEMS : workingItems(rowsByKind(exports.byKind))),
    [working, exports.byKind],
  );
  const pins = useMemo(() => pinsOf(exports.byKind), [exports.byKind]);

  if (working) {
    return {
      graph: working.atlas.graph,
      snapshot: working.atlas.snapshot,
      atlas: working.atlas,
      items: working.items,
      pins,
      mode: 'working',
      fingerprint: working.fingerprint,
      isLoading: false,
      isRefreshing:
        build.isPlaceholderData || build.isFetching || exports.fetching,
      error: build.error ?? exports.error,
    };
  }

  // Still deciding, or the working copy is on its way behind the repo graph
  // (not when an export failed with nothing to build from).
  const workingPending =
    !capsKnown ||
    (wantsWorking && !build.error && (exports.ready || !exports.error));
  // A `/capabilities` that failed (not a 404) leaves the console on the kinds
  // every API has, `/export` not among them: say so, rather than let it read
  // as an API without `/export`.
  const capsError = caps.isError ? caps.error : null;
  return {
    graph: repo.data?.graph,
    snapshot: repo.data?.snapshot,
    atlas: repo.data,
    items: listedItems,
    pins,
    mode: 'repo',
    fingerprint: null,
    // A repo graph that failed will not arrive: that is the error, not a wait.
    isLoading: !repo.data && !repo.error,
    isRefreshing: !!repo.data && workingPending,
    error: repo.error ?? capsError ?? build.error ?? exports.error,
  };
}

const failed = (query: Query) => query.state.status === 'error';

/**
 * Try again after a failure: whatever the working graph reads that failed —
 * the repo graph (a chunk that did not load), `/capabilities`, an export or
 * list. What loaded is left alone, the builds included: a build is only ever
 * of what the exports say, and rebuilding the same content would give the
 * same graph.
 */
export function useRetryWorkingGraph(): () => void {
  const client = useQueryClient();
  return useCallback(() => {
    for (const queryKey of [
      REPO_GRAPH_KEY,
      [...CONTENT_KEY, 'capabilities'],
      [...CONTENT_KEY, 'export'],
    ]) {
      void client.refetchQueries({ queryKey, predicate: failed });
    }
  }, [client]);
}
