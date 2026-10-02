import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  type ContentEditState,
  type ContentKind,
  type ContentStatus,
  contentRequest,
} from './useAdminContent';
import { useCapabilities } from './useCapabilities';

/**
 * Every item of a kind, with its body: the one loader the console's readers
 * share (Table design §3.1) — the pickers, the Table, and the working graph
 * the mind map and Integrity will read. One request per 500 items, instead
 * of one `/items/:id` per item.
 *
 * `GET /export` (contract §3) has the bodies. A server without it (today's
 * production) gets the `/items` list instead, which has each item's id,
 * slug, title and state but no body: enough for a picker's names and for the
 * Table to know which rows the API holds, not enough to build a graph from,
 * and `source` says which of the two a caller got.
 *
 * The queries live under CONTENT_KEY, so every save, approval, rejection,
 * publish and rollback (they all invalidate it) refetches them. What changed
 * is then told by `fingerprint`, which is computed from the content itself:
 * `dataUpdatedAt` moves on every refetch, and the SuperJSON-revived Dates in
 * each row defeat react-query's structural sharing, so neither can say
 * "nothing changed" and spare a rebuild of everything that reads the rows.
 */

/** One item as `/export` (or, bodiless, the `/items` list) returns it. */
export interface ExportRow {
  /** The item's id in the store: what a save or a re-read goes by. */
  id: string;
  /** The body's identity value (`id` or `slug`, per kind). */
  slug: string;
  status: ContentStatus;
  editState: ContentEditState;
  updatedAt: Date | null;
  /**
   * The stored body — for an editor, their own proposal where they have one
   * (the server swaps it in). Null for a new item that exists only as a
   * proposal (an admin finds it in `pendingBody`), and on every row of the
   * `/items` fallback.
   */
  body: Record<string, unknown> | null;
  /** An admin's view of a proposal awaiting review, or sent back. */
  pendingBody?: Record<string, unknown>;
  /** The list's title: only on rows from the `/items` fallback. */
  title?: string;
  /**
   * Bumped on every stored change to the item (contract 5b, requested),
   * where the server sends it: the offline mock and the dev repo server do.
   * The fingerprint still hashes the bodies, so a server without it is
   * read the same way.
   */
  revision?: number;
}

/** Where a kind's rows came from: `export` has bodies, `list` has none. */
export type ExportSource = 'export' | 'list';

export interface ContentExport {
  kind: ContentKind;
  source: ExportSource;
  rows: readonly ExportRow[];
  /** Changes when, and only when, what the rows say changes (see above). */
  fingerprint: string;
}

export interface ExportOptions {
  /** `working` (drafts and archived items included) or `published`. */
  view?: 'working' | 'published';
  /**
   * Leave out songs' `sections` and `audioSources` (default true): the bulk
   * of the corpus, and read by nothing that walks every item — the graph,
   * the Table and the pickers never touch them. A caller that writes a whole
   * body back must ask for the full one, or its save would drop the chart.
   */
  lean?: boolean;
}

/* ── The fingerprint ─────────────────────────────────────────────────── */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * 32-bit FNV-1a over a string's UTF-16 code units. Fast and well spread, and
 * all a change detector needs; not a checksum anyone should trust with
 * security. Pass a previous hash as `seed` to extend it.
 */
export function fnv1a(text: string, seed: number = FNV_OFFSET): number {
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

const bodyHash = (body: Record<string, unknown> | null | undefined) =>
  body ? fnv1a(JSON.stringify(body)).toString(36) : '-';

/**
 * What one row contributes: its slug, status and review state, and a hash of
 * each body. `updatedAt` is left out on purpose — the content is what the
 * readers draw, and a save that changed nothing should not rebuild them. The
 * list's title stands in for the body on a bodiless row.
 */
export const rowSignature = (row: ExportRow): string =>
  [
    row.slug,
    row.status,
    row.editState ?? '',
    bodyHash(row.body),
    bodyHash(row.pendingBody),
    row.title ?? '',
  ].join('|');

/**
 * One kind's rows as a short string that changes whenever any row's slug,
 * status, review state or body does, and stays put across a refetch that
 * brought back the same content. The row count is spelled out, so a row
 * appearing or going can never hash to the same value by accident. The
 * export is ordered by slug, so the same content always hashes the same.
 */
export function exportFingerprint(rows: readonly ExportRow[]): string {
  let hash = FNV_OFFSET;
  for (const row of rows) hash = fnv1a(`${rowSignature(row)}\n`, hash);
  return `${rows.length}.${hash.toString(36)}`;
}

/* ── Loading ─────────────────────────────────────────────────────────── */

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

interface ListRow {
  id: string;
  slug: string;
  title: string;
  status: ContentStatus;
  editState: ContentEditState;
  updatedAt?: Date | null;
}

/** Every page of one listing, following `nextCursor` to the end. */
async function allPages<T>(
  path: (after: string) => string,
  token: string,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  do {
    const after: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<T> = await contentRequest<Page<T>>(path(after), token);
    out.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

/**
 * One kind, whole: `/export` when the server has it, else the `/items` list.
 * Outside React, for callers that load in a loop or re-read before a write.
 */
export async function loadContentExport(
  kind: ContentKind,
  source: ExportSource,
  token: string,
  { view = 'working', lean = true }: ExportOptions = {},
): Promise<ContentExport> {
  let rows: ExportRow[];
  if (source === 'export') {
    const params = [
      view === 'published' ? '&view=published' : '',
      lean ? '&omit=sections,audioSources' : '',
    ].join('');
    rows = await allPages<ExportRow>(
      (after) => `/export?kind=${kind}${params}&limit=500${after}`,
      token,
    );
  } else {
    // The list has no bodies; its title is what a picker shows.
    const listed = await allPages<ListRow>(
      (after) => `/items?kind=${kind}&limit=200${after}`,
      token,
    );
    rows = listed.map((item) => ({
      id: item.id,
      slug: item.slug,
      status: item.status,
      editState: item.editState ?? null,
      updatedAt: item.updatedAt ?? null,
      body: null,
      title: item.title,
    }));
  }
  return { kind, source, rows, fingerprint: exportFingerprint(rows) };
}

/**
 * The cache key. The source and the body's shape are part of it, so a lean
 * export, a full one and a bodiless list never share an entry.
 */
export const exportQueryKey = (
  kind: ContentKind,
  source: ExportSource,
  { view = 'working', lean = true }: ExportOptions = {},
) =>
  [
    ...CONTENT_KEY,
    'export',
    kind,
    view,
    source === 'list' ? 'list' : lean ? 'lean' : 'full',
  ] as const;

/** The query for one kind, for `useQuery`/`useQueries` or a prefetch. */
export const contentExportQuery = (
  kind: ContentKind,
  source: ExportSource,
  token: string | null | undefined,
  options: ExportOptions = {},
) => ({
  queryKey: exportQueryKey(kind, source, options),
  queryFn: () => loadContentExport(kind, source, token!, options),
  // This console's own writes arrive at once, through the CONTENT_KEY
  // invalidation. Other people's arrive only with a refetch: the next write
  // here, or a reader mounting once this is a minute old — nothing polls, and
  // a window regaining focus does not refetch.
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  // Revived Dates make structural sharing a slow deep compare that finds
  // nothing to share; the fingerprint is what tells callers what changed.
  structuralSharing: false,
});

/* ── The hook ────────────────────────────────────────────────────────── */

export interface ContentExports {
  /** The kinds whose rows have arrived; a kind the server lacks is absent. */
  byKind: ReadonlyMap<ContentKind, ContentExport>;
  /** Every served kind's rows are here (vacuously true when none is served). */
  ready: boolean;
  /** A served kind's first load is in flight. */
  loading: boolean;
  /** Some kind is fetching, a refetch included. */
  fetching: boolean;
  /** The first failure among the served kinds, if any. */
  error: unknown;
  /**
   * Every kind's fingerprint in one string, with a placeholder for a kind
   * still loading: a memo or query key over it changes exactly when some
   * kind's content does.
   */
  fingerprint: string;
}

/**
 * The exports of several kinds, each loaded once however many components
 * ask. A kind is fetched only when `/capabilities` says the server serves
 * it; the `export` feature picks `/export` over the `/items` list.
 */
export function useContentExports(
  kinds: readonly ContentKind[],
  options: ExportOptions = {},
): ContentExports {
  const { token } = useAuthContext();
  const caps = useCapabilities();
  const source: ExportSource = caps.feature('export') ? 'export' : 'list';
  const enabled = kinds.map((kind) => !!token && caps.isServed(kind));

  const results = useQueries({
    queries: kinds.map((kind, i) => ({
      ...contentExportQuery(kind, source, token, options),
      enabled: enabled[i],
    })),
  });

  const fingerprint = kinds
    .map((kind, i) => {
      if (!enabled[i]) return `${kind}:off`;
      const data = results[i].data;
      return data ? `${kind}:${data.source}:${data.fingerprint}` : `${kind}:-`;
    })
    .join(',');

  // useQueries hands back new arrays every render, and a refetch that brought
  // back the same content is a new data object with nothing new in it; the
  // fingerprint names the kinds, their state and their content, so the map
  // is rebuilt exactly when one of those changes.
  const byKind = useMemo(() => {
    const map = new Map<ContentKind, ContentExport>();
    results.forEach((result, i) => {
      if (result.data && enabled[i]) map.set(kinds[i], result.data);
    });
    return map;
    // Keyed on the fingerprint (see above), not on the fresh arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  const served = results.filter((_, i) => enabled[i]);
  return {
    byKind,
    ready: served.every((result) => result.data !== undefined),
    loading: served.some((result) => result.isLoading),
    fetching: served.some((result) => result.isFetching),
    error: served.find((result) => result.error)?.error ?? null,
    fingerprint,
  };
}

/**
 * One kind's export: its rows as `data` (undefined until they arrive, or
 * when the server does not serve the kind), with the same state as above.
 */
export function useContentExport(
  kind: ContentKind,
  options?: ExportOptions,
): ContentExports & { data: ContentExport | undefined } {
  const kinds = useMemo(() => [kind], [kind]);
  const all = useContentExports(kinds, options);
  return { ...all, data: all.byKind.get(kind) };
}
