import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_MOCK,
  CONTENT_REPO,
  REPO_CONTENT_BASE,
} from '@/features/admin/content/mock/mockSwitch';
import { artifactsVersion as CLIENT_ARTIFACTS_VERSION } from '@/scripts/apiContract/manifest.json';

/**
 * Data hooks for the content back office.
 *
 * Follows the shape of the sibling admin hooks (hand-rolled fetchWithAuth +
 * SuperJSON) rather than the generated client, because those endpoints are
 * admin-only and change with the console rather than with the public contract.
 */

/** The six kinds today's API serves. */
export type LegacyContentKind =
  | 'globe_event'
  | 'globe_city'
  | 'song'
  | 'artist_location'
  | 'activity_flow'
  | 'fundamentals_flow';

/**
 * Kinds docs/console-content-api-contract.md adds. The console registers a
 * kind only when `/capabilities` lists it (useCapabilities.ts), so being in
 * this union says a kind can exist, not that the server has it.
 */
export type RecordContentKind =
  | 'artist'
  | 'release'
  | 'studio'
  | 'label'
  | 'chord_progression';

/**
 * The Atlas's own vocabularies: genres, subgenres and session instruments,
 * the repo's data in src/content/vocabulary/. Only the dev repo content
 * server serves them (the contract has no kind for them: the API's copy is
 * vocabulary.generated.json), with `id` as the identity, which never
 * changes.
 */
export type VocabularyContentKind = 'genre' | 'subgenre' | 'instrument';

export type ContentKind =
  | LegacyContentKind
  | RecordContentKind
  | VocabularyContentKind;

export type ContentStatus = 'draft' | 'published' | 'archived';

/**
 * Where an editor's proposed edit sits in review. Null when nothing is pending.
 *
 * Deliberately separate from ContentStatus: `status` decides what a publish
 * compiles, so a proposal must not be able to move it — an edit to a live item
 * that flipped its status would pull it out of the next bundle.
 */
export type ContentEditState = 'pending' | 'rejected' | null;

export type ContentReleaseStatus =
  | 'building'
  | 'live'
  | 'failed'
  | 'superseded'
  | 'rolled_back';

export interface ContentListItem {
  id: string;
  kind: ContentKind;
  slug: string;
  status: ContentStatus;
  title: string;
  subtitle: string | null;
  sortYear: number | null;
  tags: string[];
  derivedFromId: string | null;
  derivedFromSlug: string | null;
  updatedAt: Date;
  updatedById: string | null;
  editState: ContentEditState;
  pendingAt: Date | null;
  pendingById: string | null;
  reviewNote: string | null;
  /**
   * Bumped on every stored change to the item (contract 5b, requested): a
   * save sends it back as `expectedRevision`, and the server answers 409
   * `REVISION_CONFLICT` when the item has moved since. Absent on today's
   * API; the offline mock and the dev repo server send it.
   */
  revision?: number;
}

export interface ContentItemDetail extends ContentListItem {
  /**
   * The stored body. A new item that exists only as a proposal (`isNew` in
   * `/pending`) has none yet, and its proposal stands in here as well as in
   * `pendingBody`, so the editor can open it for review like any other item.
   */
  body: Record<string, unknown>;
  overrides: Record<string, unknown> | null;
  /** The proposed body, when an edit is awaiting or was sent back from review. */
  pendingBody: Record<string, unknown> | null;
  pendingOverrides: Record<string, unknown> | null;
  pendingNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  Revisions: {
    id: string;
    revision: number;
    title: string;
    note: string | null;
    authorId: string | null;
    createdAt: Date;
  }[];
}

export interface ContentOverviewRow {
  kind: ContentKind;
  total: number;
  published: number;
  changedSincePublish: number;
  /** Editors' proposals waiting on an admin. */
  pendingReview: number;
  liveVersion: number | null;
  livePublishedAt: Date | null;
}

/** One row of the admin's review queue. Never carries a body. */
export interface PendingEdit {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  subtitle: string | null;
  isNew: boolean;
  note: string | null;
  submittedAt: Date | null;
  submittedBy: { id: string; name: string } | null;
}

export interface ContentRelease {
  id: string;
  kind: ContentKind;
  version: number;
  status: ContentReleaseStatus;
  itemCount: number;
  totalBytes: number;
  objectKeys: string[];
  error: string | null;
  startedAt: Date;
  publishedAt: Date | null;
}

export type ValidationProblemCode =
  | 'INVALID_BODY'
  | 'SLUG_ID_MISMATCH'
  | 'DUPLICATE_ID'
  | 'DANGLING_REFERENCE'
  // Added by the contract (priority 7); older servers never send them.
  | 'INVALID_REFERENCE'
  | 'UNPUBLISHED_REFERENCE'
  | 'REFERENCE_CYCLE'
  | 'UNKNOWN_VOCAB_ID'
  | 'UNKNOWN_CODE_ID'
  // The dev repo content server only, as a warning: a status the repo files
  // cannot hold (a draft of anything but a song) was saved as they can.
  | 'REPO_NO_DRAFTS'
  // The dev repo content server's vocabulary rules
  // (src/content/vocabulary/validate.ts). Errors: a genre's `taught` changed
  // (IMMUTABLE_ID), a globe tag on two records or on a list that says it is
  // no genre (DUPLICATE_TAG). Warnings: a genre named like a registered
  // artist, two records' tags the importer reads as one, a tag the
  // importer's aliases lead to taken off.
  | 'IMMUTABLE_ID'
  | 'DUPLICATE_TAG'
  | 'NAME_COLLISION'
  | 'TAG_FOLDS_TOGETHER'
  | 'ALIAS_TAG_REMOVED'
  // The offline mock and the dev repo content server: a chord progression
  // with the same chords as another (src/curriculum/engine/
  // progressionValidation.ts). Its other rules are INVALID_BODY.
  | 'DUPLICATE_PROGRESSION';

export interface ValidationProblem {
  code: ValidationProblemCode;
  slug: string;
  detail: string;
  /** Absent means 'error', which is what every problem meant before. */
  severity?: 'error' | 'warning';
  /** The body path with indices: 'credits[2].artistGlobeId'. */
  path?: string;
  /** What the value names, as '<kind>:<slug>'. */
  target?: string;
}

/** The body of a non-2xx response: `{ error, code?, ...details }`. */
export interface ContentApiErrorBody {
  error?: string;
  code?: string;
  [detail: string]: unknown;
}

/**
 * A non-2xx answer from the content API, with its status and body intact.
 *
 * The message is the body's `error`, which is written to be shown to the user
 * as it is, so existing `error.message` readers keep working; callers that
 * need to branch (a 404 from /capabilities, a 409 SLUG_TAKEN) read `status`
 * and `code`.
 */
export class ContentApiError extends Error {
  readonly status: number;
  readonly body: ContentApiErrorBody;

  constructor(
    status: number,
    body: ContentApiErrorBody,
    fallbackMessage = `Request failed: ${status}`,
  ) {
    super(
      typeof body.error === 'string' && body.error
        ? body.error
        : fallbackMessage,
    );
    this.name = 'ContentApiError';
    this.status = status;
    this.body = body;
  }

  get code(): string | undefined {
    return typeof this.body.code === 'string' ? this.body.code : undefined;
  }
}

/** Build the error from a failed response; the body may not be JSON at all. */
export const contentApiErrorFrom = async (
  res: Response,
  fallbackMessage?: string,
): Promise<ContentApiError> => {
  const parsed: unknown = await res.json().catch(() => ({}));
  const body =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ContentApiErrorBody)
      : {};
  return new ContentApiError(res.status, body, fallbackMessage);
};

/**
 * The same authed fetch the hooks use, for the one caller that cannot be a
 * hook: the song importer walks six hundred items and React has no way to
 * call `useContentItem` in a loop.
 */
export const contentRequest = <T = unknown>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> => fetchWithAuth<T>(contentPath(path), token, options);

function contentPath(path: string) {
  // DEV only: repo mode's server, same origin on the dev server
  // (mockSwitch.ts). The literal `import.meta.env.DEV` folds the branch,
  // and its path, out of a production build.
  const apiBase =
    import.meta.env.DEV && CONTENT_REPO
      ? (REPO_CONTENT_BASE ?? '')
      : (Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '');
  return `${apiBase}/api/admin/content${path}`;
}

/**
 * The artifacts version the server reported in `/capabilities`, or null when
 * it reported none (or has no such endpoint). The contract says to send ours
 * only to a server that reported one: the API is cross-origin, and a header
 * its CORS allow-list does not name would fail every request's preflight.
 */
let serverArtifactsVersion: number | null = null;

/** Set by useCapabilities from what `/capabilities` said. */
export const noteServerArtifactsVersion = (version: number | null) => {
  serverArtifactsVersion = version;
};

async function fetchWithAuth<T = unknown>(
  url: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const appSessionId = getCurrentAppSessionId();
  const init: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      ...(serverArtifactsVersion !== null
        ? { 'X-Content-Artifacts': String(CLIENT_ARTIFACTS_VERSION) }
        : {}),
      ...options?.headers,
    },
  };

  // DEV only: the offline mock answers instead of the network. The literal
  // `import.meta.env.DEV` has to be here, at the import, and not only inside
  // CONTENT_MOCK: the bundler drops a dead import() call either way, but it
  // still emits the imported chunk unless the branch is dead in this module.
  const res =
    import.meta.env.DEV && CONTENT_MOCK
      ? await (
          await import('@/features/admin/content/mock/handleMockRequest')
        ).handleMockRequest(url, init)
      : await fetch(url, init);

  if (!res.ok) throw await contentApiErrorFrom(res);

  const text = await res.text();
  return text ? (SuperJSON.parse(text) as T) : (undefined as T);
}

/**
 * Every content query lives under this key, the exports the Table, the mind
 * map and Integrity build their working graph from included
 * (`useContentExport.ts`). So every write here — save, delete, approve,
 * reject, discard, publish — invalidates the whole of it rather than guessing
 * which queries a write can move: a save can move another item's row (a song
 * and its globe event), and the working graph's fingerprint makes an
 * unchanged refetch rebuild nothing.
 */
export const CONTENT_KEY = ['admin', 'content'] as const;

export const useContentOverview = () => {
  const { token } = useAuthContext();
  return useQuery<ContentOverviewRow[]>({
    queryKey: [...CONTENT_KEY, 'overview'],
    queryFn: () =>
      fetchWithAuth<ContentOverviewRow[]>(contentPath('/overview'), token!),
    enabled: !!token,
  });
};

export interface DerivationHealth {
  totalSongs: number;
  matched: number;
  defaultedToNewYork: number;
  artistLocationCount: number;
  /** How the placed songs were placed; from servers on the contract. */
  placedBy?: {
    basedInPlace: number;
    artistLocation: number;
    defaulted: number;
  };
  unmatchedArtists: {
    /** The artist slug each row groups by; from servers on the contract. */
    slug?: string;
    artist: string;
    songCount: number;
    songs: string[];
  }[];
}

/**
 * Which artists have no globe location and are therefore silently placed in
 * New York. Never previously visible — the generator counted them and threw the
 * number away.
 */
export const useDerivationHealth = () => {
  const { token } = useAuthContext();
  return useQuery<DerivationHealth>({
    queryKey: [...CONTENT_KEY, 'derivation-health'],
    queryFn: () =>
      fetchWithAuth<DerivationHealth>(
        contentPath('/derivation-health'),
        token!,
      ),
    enabled: !!token,
  });
};

export const useContentItems = (params: {
  kind: ContentKind;
  status?: ContentStatus;
  search?: string;
}) => {
  const { token } = useAuthContext();
  const query = new URLSearchParams({ kind: params.kind });
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  return useQuery<{ items: ContentListItem[]; nextCursor: string | null }>({
    queryKey: [...CONTENT_KEY, 'items', params],
    queryFn: () => fetchWithAuth(contentPath(`/items?${query}`), token!),
    enabled: !!token,
  });
};

export interface NewItemTemplate {
  kind: ContentKind;
  slug: string;
  body: Record<string, unknown>;
  hint: string;
}

/**
 * A valid skeleton to start a new item from.
 *
 * Comes from the API rather than being hardcoded here so the starting body is
 * validated by the same zod schema that will accept the save — an editor-side
 * template would silently drift from it.
 */
export const useContentTemplate = (kind: ContentKind | undefined) => {
  const { token } = useAuthContext();
  return useQuery<NewItemTemplate>({
    queryKey: [...CONTENT_KEY, 'template', kind],
    queryFn: () =>
      fetchWithAuth<NewItemTemplate>(contentPath(`/template/${kind}`), token!),
    enabled: !!token && !!kind,
    // Templates are static per deploy.
    staleTime: Infinity,
  });
};

export const useContentItem = (id: string | undefined) => {
  const { token } = useAuthContext();
  return useQuery<ContentItemDetail>({
    queryKey: [...CONTENT_KEY, 'item', id],
    queryFn: () => fetchWithAuth(contentPath(`/items/${id}`), token!),
    enabled: !!token && !!id,
  });
};

export interface SaveContentInput {
  kind: ContentKind;
  /** Equals `body[identity]`: `id` for today's kinds, `slug` for the records. */
  slug: string;
  body: unknown;
  status?: ContentStatus;
  note?: string;
  overrides?: unknown;
  /**
   * Create only: the server answers 409 SLUG_TAKEN instead of overwriting.
   * Send it only when `/capabilities` reports `features.create`; a server
   * that drops the unknown key would run its upsert.
   */
  create?: true;
  /**
   * The item's `revision` the edit started from (contract 5b): the server
   * writes nothing, and answers 409 `REVISION_CONFLICT` with its current
   * `revision`, when the item has moved since. Left out, today's upsert.
   */
  expectedRevision?: number;
}

export interface SaveContentResult {
  item: ContentItemDetail;
  /** Problems that did not block the save, such as a link to a draft. */
  warnings: ValidationProblem[];
}

/**
 * A PUT's 2xx body. Servers on the contract answer `{ item, warnings }`;
 * today's answer with the bare item. A detail never has an `item` key, so its
 * presence tells the two apart.
 */
export const unwrapSaveResponse = (raw: unknown): SaveContentResult => {
  if (raw && typeof raw === 'object' && 'item' in raw) {
    const { item, warnings } = raw as {
      item: ContentItemDetail;
      warnings?: unknown;
    };
    return {
      item,
      warnings: Array.isArray(warnings)
        ? (warnings as ValidationProblem[])
        : [],
    };
  }
  return { item: raw as ContentItemDetail, warnings: [] };
};

export const useSaveContentItem = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<SaveContentResult, Error, SaveContentInput>({
    mutationFn: async (input) =>
      unwrapSaveResponse(
        await fetchWithAuth(contentPath('/items'), token!, {
          method: 'PUT',
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

export const useDeleteContentItem = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      fetchWithAuth(contentPath(`/items/${id}`), token!, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

// ── Review queue ───────────────────────────────────────────────────────────
//
// An editor's save lands as a proposal beside the live body rather than
// replacing it (the API decides that from the session role, not from anything
// the client sends). These are the admin's side of that: the queue, and the two
// verdicts. Approving applies the proposal and marks the item published —
// pressing Publish for the kind is still what moves the CDN bundle.

/** Admin only; an editor calling this gets a 403. */
export const usePendingEdits = (enabled = true) => {
  const { token } = useAuthContext();
  return useQuery<PendingEdit[]>({
    queryKey: [...CONTENT_KEY, 'pending'],
    queryFn: () =>
      fetchWithAuth<PendingEdit[]>(contentPath('/pending'), token!),
    enabled: !!token && enabled,
  });
};

export const useApproveContentEdit = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<ContentItemDetail, Error, string>({
    mutationFn: (id) =>
      fetchWithAuth(contentPath(`/items/${id}/approve`), token!, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

export const useRejectContentEdit = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<ContentItemDetail, Error, { id: string; note: string }>({
    mutationFn: ({ id, note }) =>
      fetchWithAuth(contentPath(`/items/${id}/reject`), token!, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

/** Withdraw a proposal, leaving the live body untouched. Open to both roles. */
export const useDiscardContentEdit = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<ContentItemDetail, Error, string>({
    mutationFn: (id) =>
      fetchWithAuth(contentPath(`/items/${id}/discard-edit`), token!, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

export const useValidateContent = (kind: ContentKind) => {
  const { token } = useAuthContext();
  return useQuery<{ ok: boolean; problems: ValidationProblem[] }>({
    queryKey: [...CONTENT_KEY, 'validate', kind],
    queryFn: () => fetchWithAuth(contentPath(`/validate/${kind}`), token!),
    enabled: !!token,
  });
};

export const useContentReleases = () => {
  const { token } = useAuthContext();
  return useQuery<ContentRelease[]>({
    queryKey: [...CONTENT_KEY, 'releases'],
    queryFn: () => fetchWithAuth(contentPath('/releases'), token!),
    enabled: !!token,
  });
};

/**
 * Run a full publish: open a release, build every shard, then activate.
 *
 * The shard loop lives on the client on purpose. Each part is a bounded,
 * retryable request, which is what keeps publishing inside the serverless time
 * limit without introducing a queue or a background worker — and it gives the
 * UI a real progress signal instead of one long opaque request.
 */
export const usePublishContent = (
  onProgress?: (done: number, total: number) => void,
) => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<ContentRelease, Error, ContentKind>({
    mutationFn: async (kind) => {
      const created = await fetchWithAuth<{
        releaseId: string;
        version: number;
        itemCount: number;
        parts: number[];
      }>(contentPath('/releases'), token!, {
        method: 'POST',
        body: JSON.stringify({ kind }),
      });

      onProgress?.(0, created.parts.length);

      for (const [index, part] of created.parts.entries()) {
        await fetchWithAuth(
          contentPath(`/releases/${created.releaseId}/parts/${part}`),
          token!,
          { method: 'POST' },
        );
        onProgress?.(index + 1, created.parts.length);
      }

      return fetchWithAuth<ContentRelease>(
        contentPath(`/releases/${created.releaseId}/activate`),
        token!,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

export const useCancelRelease = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      fetchWithAuth(contentPath(`/releases/${id}/cancel`), token!, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};

export const useRollbackContent = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { kind: ContentKind; version: number }>({
    mutationFn: (input) =>
      fetchWithAuth(contentPath('/rollback'), token!, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
  });
};
