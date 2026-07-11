import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  avatarConfigApi,
  useSelfAvatarConfig,
} from '@/hooks/data/useAvatarConfigs';
import { type AvatarConfig, isAvatarConfig } from '@/lib/avatarHexGrid';

const STORAGE_PREFIX = 'avatar_config_';

function loadLocalConfig(userId: string): AvatarConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw) as AvatarConfig;
  } catch {
    return null;
  }
}

function cacheLocalConfig(userId: string, config: AvatarConfig) {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(config));
  } catch {
    // localStorage may be full or unavailable — non-critical.
  }
}

/**
 * The current user's avatar config. Source of truth is our serverless store
 * (loads on login, any device); localStorage is a first-paint cache. Saving
 * persists to the store + cache. `serverConfig` (from /auth/me) is accepted as a
 * legacy hint but is effectively null there.
 */
export function useAvatarConfig(
  userId: string | undefined,
  serverConfig?: unknown,
) {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: storeConfig } = useSelfAvatarConfig();

  // No-flash first paint when userId is already known; otherwise the resolve
  // effect below fills it in once userId / the store GET arrive.
  const [config, setConfig] = useState<AvatarConfig | null>(() =>
    userId ? loadLocalConfig(userId) : null,
  );

  // Resolve reactively (userId from useMe and the store GET both settle async).
  // localStorage is authoritative for THIS device — it's written on every save,
  // so it wins over the server; the server store only fills in when the cache is
  // empty (a fresh device). This can't clobber a locally-saved config, and it
  // restores the cache as soon as userId resolves (fixes reload → default).
  useEffect(() => {
    const local = userId ? loadLocalConfig(userId) : null;
    if (local) setConfig(local);
    else if (isAvatarConfig(storeConfig)) setConfig(storeConfig);
    else if (isAvatarConfig(serverConfig)) setConfig(serverConfig);
  }, [userId, storeConfig, serverConfig]);

  // Returns whether it persisted — false means no userId yet, so the caller can
  // avoid claiming success. Writes localStorage now; the serverless PUT is
  // best-effort (works once /api is reachable; ignored otherwise).
  const saveConfig = useCallback(
    (newConfig: AvatarConfig): boolean => {
      if (!userId) return false;
      setConfig(newConfig);
      cacheLocalConfig(userId, newConfig);
      // Push into the shared self-avatar query so every OTHER useAvatarConfig
      // consumer (TopRail icon, UserWidget, …) re-resolves and updates instantly.
      queryClient.setQueryData(['avatar-config', 'self', userId], newConfig);
      if (token) {
        void avatarConfigApi.putSelf(token, newConfig).catch(() => {
          // Persisted to localStorage regardless; ignore transient API errors.
        });
      }
      return true;
    },
    [userId, token, queryClient],
  );

  return { config, saveConfig };
}
