import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMe } from '@/hooks/data';
import { type AvatarConfig, isAvatarConfig } from '@/lib/avatarHexGrid';

/**
 * Client for our serverless avatar-config store (api/avatar-config/*, backed by
 * Upstash Redis). Persists the full AvatarConfig (incl. custom palette colours)
 * per user, loadable on login and readable for other users (Connect avatars).
 */
async function avatarFetch(
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

export const avatarConfigApi = {
  getSelf: async (token: string): Promise<AvatarConfig | null> => {
    const res = await avatarFetch('/api/avatar-config', token);
    const data = (await res.json()) as { config: unknown };
    return isAvatarConfig(data.config) ? data.config : null;
  },

  putSelf: async (token: string, config: AvatarConfig): Promise<void> => {
    await avatarFetch('/api/avatar-config', token, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  batch: async (
    token: string,
    ids: string[],
  ): Promise<Record<string, AvatarConfig>> => {
    if (ids.length === 0) return {};
    const res = await avatarFetch('/api/avatar-config/batch', token, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    const data = (await res.json()) as { configs?: Record<string, unknown> };
    const out: Record<string, AvatarConfig> = {};
    for (const [id, cfg] of Object.entries(data.configs ?? {})) {
      if (isAvatarConfig(cfg)) out[id] = cfg;
    }
    return out;
  },
};

/** The current user's saved avatar config from the store (load-on-login). */
export function useSelfAvatarConfig() {
  const token = useAuthToken();
  const { data: me } = useMe();
  return useQuery({
    queryKey: ['avatar-config', 'self', me?.id],
    enabled: !!token && !!me?.id,
    queryFn: () => avatarConfigApi.getSelf(token!),
    staleTime: 60_000,
  });
}

/** Resolve many users' avatar configs → `{ [userId]: AvatarConfig }`. */
export function useAvatarConfigs(ids: string[]) {
  const token = useAuthToken();
  // Stable, deduped key so identical id sets share one request.
  const key = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ['avatar-config', 'batch', key],
    enabled: !!token && key.length > 0,
    queryFn: () => avatarConfigApi.batch(token!, key),
    staleTime: 60_000,
  });
}
