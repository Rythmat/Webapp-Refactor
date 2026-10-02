import {
  hashKey,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  plainDependency,
  plainSuggestion,
} from '@/content/suggestions/plainText';
import {
  canReopen,
  type DecisionState,
  isExternalIdPath,
  type SuggestionDependency,
  type SuggestionStatus,
} from '@/content/suggestions/status';
import type {
  DecisionMethod,
  DecisionOp,
  Suggestion,
  SuggestionDecision,
  SuggestionProvider,
  SuggestionTarget,
  SuggestionTier,
} from '@/content/suggestions/types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  ContentApiError,
  contentRequest,
} from './useAdminContent';
import { useCapabilities } from './useCapabilities';

/**
 * Suggested facts to review, and what the owner decided about them
 * (contract §10; design decisions 9–10, §5.3): `GET /suggestions`,
 * `POST /suggestions/decisions` and `GET /suggestions/decisions`.
 *
 * A suggestion is a sidecar, never a body field, so reading one changes
 * nothing. Deciding does: an accept is the server's ordinary save — a direct
 * save for an admin, a proposal for an editor — made after it has re-read
 * the item, checked the suggestion still fits it, and made any record it
 * needs first; a bulk accept is refused for anything `whyNotBulk` would not
 * allow. Every decision is logged, and the log downloads as the committed
 * `decisions.json`.
 *
 * The queries live under CONTENT_KEY: a suggestion's status is read against
 * the body a save would build on, so any write can move it, and every write
 * invalidates that key already. A decision refreshes them as well, but waits
 * only for what shows it (`refreshAfterDecisions`): a table's whole list is
 * thousands of rows, and a button that waited on it would take a second a
 * click. Off (and never requested) until the server says it has them
 * (`features.suggestions`); the offline mock does.
 */

/** Where the suggestions queries live. */
export const SUGGESTIONS_KEY = [...CONTENT_KEY, 'suggestions'] as const;

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
   * The suggestion `suggestion.dependsOn` names, and how it stands — often
   * another item's (a song's rows rest on its lead act's identity, a Label
   * row on a song's Album row), which a row's or a kind's list never holds.
   * Absent when it rests on none, or on one the server does not serve.
   */
  dependency?: SuggestionDependency;
}

/** One import run (or the app's planners), and whether it is calibrated. */
export interface SuggestionBatch {
  batch: string;
  providers: SuggestionProvider[];
  count: number;
  /**
   * Whether the owner's labelled sample has measured the run's sure tier
   * (the importer's manifest `calibrated`). Null for the app's runs, which
   * nothing measures.
   */
  calibrated: boolean | null;
  measuredPrecision: number | null;
}

/** The decisions log, counted. */
export interface DecisionCounts {
  /** Every decision the server holds. */
  total: number;
  /** Confirmed, and not in the committed `decisions.json` yet. */
  notDownloaded: number;
  /** Editors' accepts still waiting in proposals. */
  proposed: number;
}

/** A committed accept the server could not write again, and why (§5.3). */
export interface ReplayConflict {
  suggestionId: string;
  target: SuggestionTarget;
  path: string;
  reason: string;
}

/** What replaying the committed `decisions.json` did when the store loaded. */
export interface ReplaySummary {
  considered: number;
  applied: number;
  already: number;
  removedSince: number;
  created: number;
  conflicts: ReplayConflict[];
  refused: string[];
  error: string | null;
}

/** One page of `GET /suggestions`. */
export interface SuggestionsPage {
  items: SuggestionRow[];
  nextCursor: string | null;
  total: number;
  batches: SuggestionBatch[];
  decisions: DecisionCounts;
  replay?: ReplaySummary | null;
  /** What the server could not serve, and why. */
  notServed?: { artifacts: string[]; planners: string | null };
}

/** Every page of a query, as one: the rows, and what the last page said. */
export interface Suggestions
  extends Omit<SuggestionsPage, 'items' | 'nextCursor'> {
  rows: SuggestionRow[];
}

/** What a request narrows the list to; every field is optional. */
export interface SuggestionQuery {
  /** The content kind: the table's. */
  kind?: string;
  /** The items, by slug: a row. */
  slugs?: readonly string[];
  ids?: readonly string[];
  /** The field, spelled as the suggestion spells it: 'placeId', 'artistIds'. */
  path?: string;
  provider?: SuggestionProvider;
  tier?: SuggestionTier;
  batch?: string;
  status?: readonly SuggestionStatus[];
  decision?: readonly DecisionState[];
  /** Only bulk accepts no one has marked reviewed. */
  unreviewed?: boolean;
}

/** The most rows one page may hold (the server's own ceiling). */
export const SUGGESTIONS_PAGE = 1000;

/**
 * The statuses a row's "open suggestions" count: nothing decided yet, the
 * path empty (the ghost in the cell) or holding something else (Replace).
 */
export const OPEN_STATUSES: readonly SuggestionStatus[] = ['open', 'conflict'];

/** `/suggestions?…` for a query and a page. */
export function suggestionsPath(
  query: SuggestionQuery,
  page: { cursor?: string | null; limit?: number } = {},
): string {
  const params = new URLSearchParams();
  const list = (name: string, values: readonly string[] | undefined) => {
    if (values?.length) params.set(name, values.join(','));
  };
  if (query.kind) params.set('kind', query.kind);
  list('slug', query.slugs);
  list('id', query.ids);
  if (query.path) params.set('path', query.path);
  if (query.provider) params.set('provider', query.provider);
  if (query.tier) params.set('tier', query.tier);
  if (query.batch) params.set('batch', query.batch);
  list('status', query.status);
  list('decision', query.decision);
  if (query.unreviewed) params.set('unreviewed', '1');
  params.set('limit', String(page.limit ?? SUGGESTIONS_PAGE));
  if (page.cursor) params.set('cursor', page.cursor);
  return `/suggestions?${params.toString()}`;
}

/**
 * A row as the console shows it (`plainText.ts`): in the site's own words,
 * with no outside catalogue named, linked or quoted by id. A row that only
 * holds another catalogue's id for its item is never shown: the site keeps
 * no such ids, so there is nothing to accept (owner decision of 30
 * September 2026).
 */
export function plainRows(rows: readonly SuggestionRow[]): SuggestionRow[] {
  return rows
    .filter((row) => !isExternalIdPath(row.suggestion.path))
    .map((row) => ({
      ...row,
      suggestion: plainSuggestion(row.suggestion),
      ...(row.dependency
        ? { dependency: plainDependency(row.dependency) }
        : {}),
    }));
}

/** Every row a query selects, page after page, as the console shows them. */
export async function loadSuggestions(
  token: string,
  query: SuggestionQuery,
): Promise<Suggestions> {
  const rows: SuggestionRow[] = [];
  let cursor: string | null = null;
  let last: SuggestionsPage;
  do {
    last = await contentRequest<SuggestionsPage>(
      suggestionsPath(query, { cursor }),
      token,
    );
    rows.push(...plainRows(last.items));
    cursor = last.nextCursor;
  } while (cursor);
  return {
    rows,
    total: last.total,
    batches: last.batches,
    decisions: last.decisions,
    replay: last.replay,
    notServed: last.notServed,
  };
}

/**
 * The suggestions a query selects, while the server serves them. `served`
 * is false on a server without them (today's API), and nothing is asked.
 */
export function useSuggestions(
  query: SuggestionQuery,
  options: { enabled?: boolean } = {},
) {
  const { token } = useAuthContext();
  const caps = useCapabilities();
  const served = caps.feature('suggestions');
  const result = useQuery<Suggestions>({
    queryKey: [...SUGGESTIONS_KEY, query],
    queryFn: () => loadSuggestions(token!, query),
    enabled: !!token && served && options.enabled !== false,
  });
  return { ...result, served };
}

/* ── Decisions ───────────────────────────────────────────────────────── */

/** One decision, as `POST /suggestions/decisions` takes it. */
export interface DecisionInput {
  suggestionId: string;
  /**
   * `reopen` takes back a reject or a drop: the suggestion is offered
   * again (`reopenable`, `useReopenSuggestion`).
   */
  op: DecisionOp;
  /**
   * Default `single`. A bulk accept is an admin's, of sure suggestions only.
   * Never `import`: that is the bulk import's own, made in-process, and the
   * server refuses it over HTTP.
   */
  method?: Exclude<DecisionMethod, 'import'>;
  /** For an accept: the value to write, when the owner changed it first. */
  value?: unknown;
  /**
   * For a replace: what the path held when the owner chose to write over it
   * (the check's `current`). The write happens only while it still does.
   */
  seen?: unknown;
}

/** What became of one decision. */
export type DecisionResult =
  | {
      suggestionId: string;
      /**
       * `saved`: written (an admin); `proposed`: written into the editor's
       * proposal; `already`: the item said it already, and it is logged;
       * `recorded`: a reject, drop, review or reopen, logged.
       */
      outcome: 'saved' | 'proposed' | 'already' | 'recorded';
      decision: SuggestionDecision;
      itemId?: string;
    }
  | {
      suggestionId: string;
      outcome: 'refused';
      /** The HTTP status this refusal would have on its own. */
      status: number;
      code: string;
      error: string;
      /** For a conflict: what the path holds now. */
      current?: unknown;
    };

export interface DecisionsAnswer {
  results: DecisionResult[];
  decisions?: DecisionCounts;
}

/** What a request says about all its decisions at once. */
export interface DecisionsOptions {
  /**
   * For a bulk accept: the lowest confidence it takes, the owner's choice in
   * the bulk dialog. Left out, the server's 0.85; it never goes below 0.7,
   * whatever is sent.
   */
  threshold?: number;
}

/**
 * Send decisions, one result per decision, in order. A lone decision the
 * server refuses comes back as its own error (as an item PUT would); it is
 * read back into a refused result, so a caller handles one and many alike.
 */
export async function postDecisions(
  token: string,
  decisions: readonly DecisionInput[],
  options: DecisionsOptions = {},
): Promise<DecisionsAnswer> {
  try {
    return await contentRequest<DecisionsAnswer>(
      '/suggestions/decisions',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          decisions,
          ...(options.threshold !== undefined
            ? { threshold: options.threshold }
            : {}),
        }),
      },
    );
  } catch (error) {
    if (
      decisions.length === 1 &&
      error instanceof ContentApiError &&
      error.body.suggestionId === decisions[0].suggestionId
    )
      return {
        results: [
          {
            suggestionId: decisions[0].suggestionId,
            outcome: 'refused',
            status: error.status,
            code: error.code ?? 'FAILED',
            error: error.message,
            ...('current' in error.body ? { current: error.body.current } : {}),
          },
        ],
      };
    throw error;
  }
}

/**
 * After a decision, or a write that makes one: every content query
 * refetches, as after any save, but the caller waits only for the items
 * (the row panel's session) and `waitFor`'s suggestions (the row's own list,
 * which moves the card it acted on). The exports, the table-wide suggestion
 * lists and the decisions file — thousands of rows, megabytes on a big
 * table — refresh behind it: the grid's counts follow a moment later, and
 * no button waits for them.
 */
export async function refreshAfterDecisions(
  queryClient: QueryClient,
  waitFor?: SuggestionQuery,
): Promise<void> {
  const waitHash = waitFor ? hashKey([...SUGGESTIONS_KEY, waitFor]) : null;
  const waited = (key: readonly unknown[]) =>
    key[2] === 'item' ||
    (waitHash !== null && hashKey(key as unknown[]) === waitHash);
  // One invalidation, as after any save; what is on screen refetches, the
  // rest when next shown.
  await queryClient.invalidateQueries({
    queryKey: CONTENT_KEY,
    refetchType: 'none',
  });
  void queryClient.refetchQueries({
    queryKey: CONTENT_KEY,
    type: 'active',
    predicate: (query) => !waited(query.queryKey),
  });
  await queryClient.refetchQueries({
    queryKey: CONTENT_KEY,
    type: 'active',
    predicate: (query) => waited(query.queryKey),
  });
}

/**
 * Decide one or more suggestions from a page (the row panel's Accept,
 * Replace, Reject, Mark reviewed). Every content query refetches after, as
 * after any save; the decision resolves once the item and `waitFor` (the
 * row's own suggestions) have (`refreshAfterDecisions`).
 */
export function useDecideSuggestions(
  options: { waitFor?: SuggestionQuery } = {},
) {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation<DecisionsAnswer, Error, readonly DecisionInput[]>({
    mutationFn: (decisions) => postDecisions(token!, decisions),
    onSettled: () => refreshAfterDecisions(queryClient, options.waitFor),
  });
}

/**
 * Whether a row's decision can be taken back: it was rejected or dropped.
 * An accept is not reopened; it is taken back by editing the item.
 */
export const reopenable = (row: Pick<SuggestionRow, 'status'>): boolean =>
  canReopen(row.status);

/**
 * Undo a reject or a drop (the row panel's Undo, the Rejected list's
 * Reopen): the suggestion is open again, offered as before, and the reopen
 * is logged like any decision — the reject stays in the log beneath it.
 * Admins only, as rejects are; the server answers 409 `NOT_REOPENABLE` for a
 * suggestion that is not rejected or dropped. Refreshes as a decision does.
 */
export function useReopenSuggestion(
  options: { waitFor?: SuggestionQuery } = {},
) {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation<DecisionsAnswer, Error, string>({
    mutationFn: (suggestionId) =>
      postDecisions(token!, [{ suggestionId, op: 'reopen' }]),
    onSettled: () => refreshAfterDecisions(queryClient, options.waitFor),
  });
}

/* ── The decisions file ──────────────────────────────────────────────── */

/** What `GET /suggestions/decisions` answers, and `decisions.json` holds. */
export interface DecisionsFile {
  artifactsVersion: number;
  /** Oldest first; confirmed decisions only (an editor's wait in proposals). */
  decisions: SuggestionDecision[];
}

/** Where the owner commits the file, beside the importer's artifacts. */
export const DECISIONS_PATH =
  'src/scripts/enrichment/suggestions/decisions.json';

export const loadDecisionsFile = (token: string) =>
  contentRequest<DecisionsFile>('/suggestions/decisions', token);

/**
 * The file's text as the repo commits it: one decision per line, oldest
 * first, so each review session reads as the lines it added.
 */
export function decisionsFileText(file: DecisionsFile): string {
  const rows = file.decisions.map((row) => `    ${JSON.stringify(row)}`);
  return `{\n  "artifactsVersion": ${file.artifactsVersion},\n  "decisions": [${
    rows.length ? `\n${rows.join(',\n')}\n  ` : ''
  }]\n}\n`;
}

/** The decisions file as the server holds it now, while the server serves one. */
export function useDecisionsFile(options: { enabled?: boolean } = {}) {
  const { token } = useAuthContext();
  const caps = useCapabilities();
  return useQuery<DecisionsFile>({
    queryKey: [...SUGGESTIONS_KEY, 'decisions-file'],
    queryFn: () => loadDecisionsFile(token!),
    enabled:
      !!token && caps.feature('suggestions') && options.enabled !== false,
  });
}
