import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMe } from '@/hooks/data';
import { useStudents } from '@/hooks/data/students/useStudents';
import { useAvatarConfigs } from '@/hooks/data/useAvatarConfigs';
import type { AvatarConfig } from '@/lib/avatarHexGrid';
import { showError } from '@/util/toast';

/**
 * The mutual user-connection graph, backed by the api/connections/* serverless
 * endpoints (Upstash Redis). `connections` are accepted (mutual); `incoming` are
 * requests others sent me (I can accept/decline); `outgoing` are requests I sent
 * (awaiting their response). All are arrays of app user ids.
 */
export interface ConnectionSets {
  connections: string[];
  incoming: string[];
  outgoing: string[];
}

export type ConnectionStatus = 'connected' | 'incoming' | 'outgoing' | 'none';

/** A connection resolved to display info (name + avatar) via the students API. */
export interface ConnectionUser {
  id: string;
  nickname: string;
  avatarConfig?: AvatarConfig;
}

export function connectionStatusFor(
  id: string,
  sets: ConnectionSets | undefined,
): ConnectionStatus {
  if (!sets) return 'none';
  if (sets.connections.includes(id)) return 'connected';
  if (sets.incoming.includes(id)) return 'incoming';
  if (sets.outgoing.includes(id)) return 'outgoing';
  return 'none';
}

async function connectionsFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

/** GET /api/connections — the current user's connection graph. */
export function useConnections() {
  const token = useAuthToken();
  const { data: me } = useMe();
  return useQuery({
    queryKey: ['connections', me?.id],
    enabled: !!token && !!me?.id,
    queryFn: () =>
      connectionsFetch('/api/connections', token!) as Promise<ConnectionSets>,
    staleTime: 30_000,
  });
}

/** Send/accept/decline/remove mutations; each invalidates the connections query. */
export function useConnectionMutations() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  const onError = (err: unknown) =>
    showError(err instanceof Error ? err.message : 'Something went wrong');
  const post = (path: string, body: unknown) => {
    if (!token) throw new Error('Not authenticated');
    return connectionsFetch(path, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  const requestConnection = useMutation({
    mutationFn: (targetUserId: string) =>
      post('/api/connections/request', { targetUserId }),
    onSuccess: invalidate,
    onError,
  });

  const respondConnection = useMutation({
    mutationFn: (vars: { requesterId: string; accept: boolean }) =>
      post('/api/connections/respond', vars),
    onSuccess: invalidate,
    onError,
  });

  const removeConnection = useMutation({
    mutationFn: (userId: string) => post('/api/connections/remove', { userId }),
    onSuccess: invalidate,
    onError,
  });

  return { requestConnection, respondConnection, removeConnection };
}

/**
 * Connections + incoming requests hydrated to display info (nickname + avatar),
 * plus the raw `outgoing` id set. Ids not resolvable from the students list fall
 * back to a placeholder so nothing silently disappears.
 */
export function useConnectionUsers() {
  const { data: sets, isLoading: setsLoading } = useConnections();
  // Active students (shared cache with the search surfaces) resolve ids → names.
  const { data: students, isLoading: studentsLoading } = useStudents({
    status: 'active',
  });
  // Real saved avatars for the people we'll display (connections + requests).
  const relevantIds = useMemo(
    () => [...(sets?.connections ?? []), ...(sets?.incoming ?? [])],
    [sets],
  );
  const { data: avatarConfigs } = useAvatarConfigs(relevantIds);

  return useMemo(() => {
    const nameById = new Map<string, string>();
    for (const s of students ?? []) nameById.set(s.id, s.nickname);
    const hydrate = (ids: string[]): ConnectionUser[] =>
      ids.map((id) => ({
        id,
        nickname: nameById.get(id) ?? 'Unknown',
        avatarConfig: avatarConfigs?.[id],
      }));

    return {
      connections: hydrate(sets?.connections ?? []),
      incoming: hydrate(sets?.incoming ?? []),
      outgoing: new Set(sets?.outgoing ?? []),
      sets,
      isLoading: setsLoading || studentsLoading,
    };
  }, [sets, students, avatarConfigs, setsLoading, studentsLoading]);
}
