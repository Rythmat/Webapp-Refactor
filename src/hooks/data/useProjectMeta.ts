import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { showError } from '@/util/toast';

/**
 * Client for our serverless project-meta store (api/project-meta/*, backed by
 * Upstash Redis). Holds the per-project library metadata the external projects
 * backend can't — tags (genre / status / instruments) and a collaborator roster
 * — keyed by project id.
 */
export interface ProjectMeta {
  genre: string;
  status: string;
  instruments: string[];
  collaborators: string[];
}

export const EMPTY_PROJECT_META: ProjectMeta = {
  genre: '',
  status: '',
  instruments: [],
  collaborators: [],
};

function isProjectMeta(value: unknown): value is ProjectMeta {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  const isStringArray = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((s) => typeof s === 'string');
  return (
    typeof m.genre === 'string' &&
    typeof m.status === 'string' &&
    isStringArray(m.instruments) &&
    isStringArray(m.collaborators)
  );
}

async function metaFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res;
}

export const projectMetaApi = {
  get: async (token: string, id: string): Promise<ProjectMeta | null> => {
    const res = await metaFetch(
      `/api/project-meta/${encodeURIComponent(id)}`,
      token,
    );
    const data = (await res.json()) as { meta: unknown };
    return isProjectMeta(data.meta) ? data.meta : null;
  },

  put: async (token: string, id: string, meta: ProjectMeta): Promise<void> => {
    await metaFetch(`/api/project-meta/${encodeURIComponent(id)}`, token, {
      method: 'PUT',
      body: JSON.stringify(meta),
    });
  },

  remove: async (token: string, id: string): Promise<void> => {
    await metaFetch(`/api/project-meta/${encodeURIComponent(id)}`, token, {
      method: 'DELETE',
    });
  },

  batch: async (
    token: string,
    ids: string[],
  ): Promise<Record<string, ProjectMeta>> => {
    if (ids.length === 0) return {};
    const res = await metaFetch('/api/project-meta/batch', token, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    const data = (await res.json()) as { metas?: Record<string, unknown> };
    const out: Record<string, ProjectMeta> = {};
    for (const [id, m] of Object.entries(data.metas ?? {})) {
      if (isProjectMeta(m)) out[id] = m;
    }
    return out;
  },
};

/** Resolve many projects' library metadata → `{ [projectId]: ProjectMeta }`. */
export function useProjectMetaBatch(ids: string[]) {
  const token = useAuthToken();
  // Stable, deduped key so identical id sets share one request.
  const key = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ['project-meta', 'batch', key],
    enabled: !!token && key.length > 0,
    queryFn: () => projectMetaApi.batch(token!, key),
    staleTime: 30_000,
  });
}

/** Save / delete a project's metadata; each invalidates the batch query. */
export function useProjectMetaMutations() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['project-meta'] });
  const onError = (err: unknown) =>
    showError(err instanceof Error ? err.message : 'Something went wrong');

  const put = useMutation({
    mutationFn: (vars: { id: string; meta: ProjectMeta }) => {
      if (!token) throw new Error('Not authenticated');
      return projectMetaApi.put(token, vars.id, vars.meta);
    },
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Not authenticated');
      return projectMetaApi.remove(token, id);
    },
    onSuccess: invalidate,
    onError,
  });

  return { put, remove };
}
