import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  type ContentKind,
  contentRequest,
} from './useAdminContent';

/**
 * Repo mode's own routes (the dev repo content server, where a save goes
 * straight into the repo's data files on this machine): what git has not
 * committed yet, and the globe roster. Only a server that says
 * `store: 'repo'` in `/capabilities` has them, so every hook here is off
 * unless its caller turns it on for that store.
 *
 * Under `CONTENT_KEY`, so every save's invalidation refreshes them: the
 * "Commit and deploy" list moves as the files do.
 */

/** How a data file differs from the last commit. */
export type RepoFileChange =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflicted';

export interface RepoStatusFile {
  /** Repo-relative. */
  path: string;
  /** Git's two status letters, e.g. ` M` or `??`. */
  code: string;
  change: RepoFileChange;
  /** The content kinds it holds; none for `decisions.json`. */
  kinds: ContentKind[];
}

/** `GET /repo/status`. */
export interface RepoStatus {
  /** The folder the server reads and writes. */
  root: string;
  /** Whether git answered for it. */
  git: boolean;
  branch: string | null;
  /** The data files git has not committed. */
  files: RepoStatusFile[];
  byKind: Partial<Record<ContentKind, number>>;
  /** Whether `decisions.json` is among them. */
  decisions: boolean;
  /** Why git did not answer; null when it did. */
  error: string | null;
  checkedAt: string;
}

/** `POST /repo/roster`'s answer. */
export interface RosterMove {
  slug: string;
  on: boolean;
  /** False when the artist already was where it was asked to be. */
  changed: boolean;
  /** The files written. */
  files: string[];
}

export const REPO_KEY = [...CONTENT_KEY, 'repo'] as const;

/** The data files git has not committed, for the "Commit and deploy" view. */
export const useRepoStatus = (enabled: boolean) => {
  const { token } = useAuthContext();
  return useQuery({
    queryKey: [...REPO_KEY, 'status'],
    queryFn: () => contentRequest<RepoStatus>('/repo/status', token!),
    enabled: enabled && !!token,
  });
};

/** The slugs on the globe roster (`artistRegistry.ts`). */
export const useRepoRoster = (enabled: boolean) => {
  const { token } = useAuthContext();
  return useQuery({
    queryKey: [...REPO_KEY, 'roster'],
    queryFn: () => contentRequest<{ slugs: string[] }>('/repo/roster', token!),
    enabled: enabled && !!token,
    select: (data) => new Set(data.slugs),
  });
};

/** Puts an artist on the globe roster, or takes it off. */
export const useSetRoster = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, on }: { slug: string; on: boolean }) =>
      contentRequest<RosterMove>('/repo/roster', token!, {
        method: 'POST',
        body: JSON.stringify({ slug, on }),
      }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [...CONTENT_KEY] }),
  });
};
