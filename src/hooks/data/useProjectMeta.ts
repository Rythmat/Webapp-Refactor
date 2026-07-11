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

// ── localStorage mirror — canonical is the serverless store (api/project-meta/*,
// Redis); this is the dev/offline fallback so saving works in plain Vite dev
// (no /api backend), same pattern as the streak/bio features. Keyed by project id.
const LS_KEY = 'music-atlas-project-meta';

function loadLocalMetas(): Record<string, ProjectMeta> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, ProjectMeta> = {};
    for (const [id, m] of Object.entries(parsed)) {
      if (isProjectMeta(m)) out[id] = m;
    }
    return out;
  } catch {
    return {};
  }
}
function saveLocalMetas(map: Record<string, ProjectMeta>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // non-critical (private mode / quota)
  }
}
function getLocal(id: string): ProjectMeta | null {
  return loadLocalMetas()[id] ?? null;
}
function setLocal(id: string, meta: ProjectMeta) {
  const map = loadLocalMetas();
  map[id] = meta;
  saveLocalMetas(map);
}
function removeLocal(id: string) {
  const map = loadLocalMetas();
  if (id in map) {
    delete map[id];
    saveLocalMetas(map);
  }
}
function batchLocal(ids: string[]): Record<string, ProjectMeta> {
  const map = loadLocalMetas();
  const out: Record<string, ProjectMeta> = {};
  for (const id of ids) {
    if (map[id]) out[id] = map[id];
  }
  return out;
}

/**
 * Thrown when the /api route isn't reachable — plain Vite dev has no serverless
 * backend, so writes land on the static server and 404/405. Callers catch this
 * and fall back to the localStorage mirror instead of surfacing an error toast.
 * Genuine API errors (400/401/403/500) are NOT wrapped and still propagate.
 */
class RouteUnavailableError extends Error {}

async function metaFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    // Network-level failure (no backend at all) → treat as route-absent.
    throw new RouteUnavailableError(path);
  }
  // No serverless function present (plain Vite dev, or a mis-scoped rewrite) →
  // fall back to the local mirror rather than erroring.
  if (res.status === 404 || res.status === 405) {
    throw new RouteUnavailableError(path);
  }
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res;
}

export const projectMetaApi = {
  get: async (token: string, id: string): Promise<ProjectMeta | null> => {
    try {
      const res = await metaFetch(
        `/api/project-meta/${encodeURIComponent(id)}`,
        token,
      );
      const data = (await res.json()) as { meta: unknown };
      return isProjectMeta(data.meta) ? data.meta : null;
    } catch (e) {
      if (e instanceof RouteUnavailableError) return getLocal(id);
      throw e;
    }
  },

  put: async (token: string, id: string, meta: ProjectMeta): Promise<void> => {
    try {
      await metaFetch(`/api/project-meta/${encodeURIComponent(id)}`, token, {
        method: 'PUT',
        body: JSON.stringify(meta),
      });
    } catch (e) {
      if (e instanceof RouteUnavailableError) {
        setLocal(id, meta); // dev/offline: persist locally instead of erroring
        return;
      }
      throw e;
    }
  },

  remove: async (token: string, id: string): Promise<void> => {
    try {
      await metaFetch(`/api/project-meta/${encodeURIComponent(id)}`, token, {
        method: 'DELETE',
      });
    } catch (e) {
      if (e instanceof RouteUnavailableError) {
        removeLocal(id);
        return;
      }
      throw e;
    }
  },

  batch: async (
    token: string,
    ids: string[],
  ): Promise<Record<string, ProjectMeta>> => {
    if (ids.length === 0) return {};
    try {
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
    } catch (e) {
      if (e instanceof RouteUnavailableError) return batchLocal(ids);
      throw e;
    }
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
