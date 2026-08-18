import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

/**
 * Data hooks for the content back office.
 *
 * Follows the shape of the sibling admin hooks (hand-rolled fetchWithAuth +
 * SuperJSON) rather than the generated client, because those endpoints are
 * admin-only and change with the console rather than with the public contract.
 */

export type ContentKind =
  | 'globe_event'
  | 'globe_city'
  | 'song'
  | 'artist_location'
  | 'activity_flow'
  | 'fundamentals_flow';

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
}

export interface ContentItemDetail extends ContentListItem {
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

export interface ValidationProblem {
  code:
    | 'INVALID_BODY'
    | 'SLUG_ID_MISMATCH'
    | 'DUPLICATE_ID'
    | 'DANGLING_REFERENCE';
  slug: string;
  detail: string;
}

function contentPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}/api/admin/content${path}`;
}

async function fetchWithAuth<T = unknown>(
  url: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const appSessionId = getCurrentAppSessionId();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }

  const text = await res.text();
  return text ? (SuperJSON.parse(text) as T) : (undefined as T);
}

const CONTENT_KEY = ['admin', 'content'] as const;

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
  unmatchedArtists: { artist: string; songCount: number; songs: string[] }[];
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

export const useSaveContentItem = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<
    ContentItemDetail,
    Error,
    {
      kind: ContentKind;
      slug: string;
      body: unknown;
      status?: ContentStatus;
      note?: string;
    }
  >({
    mutationFn: (input) =>
      fetchWithAuth(contentPath('/items'), token!, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
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
