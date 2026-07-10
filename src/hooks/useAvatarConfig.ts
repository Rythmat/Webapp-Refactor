import { useCallback, useEffect, useRef, useState } from 'react';
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
  const { data: storeConfig } = useSelfAvatarConfig();
  const didSyncRef = useRef(false);

  const [config, setConfig] = useState<AvatarConfig | null>(() => {
    if (isAvatarConfig(serverConfig)) return serverConfig;
    return userId ? loadLocalConfig(userId) : null;
  });

  // Adopt the stored config once it arrives, unless the user already made a
  // local edit (didSyncRef) that should win over a late server response. Does
  // NOT write localStorage here — the cache is only ever written by an explicit
  // save, so a mid-edit adopt can't leave a stale value on disk.
  useEffect(() => {
    if (didSyncRef.current) return;
    const incoming = isAvatarConfig(storeConfig)
      ? storeConfig
      : isAvatarConfig(serverConfig)
        ? serverConfig
        : null;
    if (incoming) {
      didSyncRef.current = true;
      setConfig(incoming);
    }
  }, [storeConfig, serverConfig, userId]);

  const saveConfig = useCallback(
    (newConfig: AvatarConfig) => {
      if (!userId) return;
      // A local edit is now authoritative; don't let a late GET overwrite it.
      didSyncRef.current = true;
      setConfig(newConfig);
      cacheLocalConfig(userId, newConfig);
      if (token) {
        void avatarConfigApi.putSelf(token, newConfig).catch(() => {
          // Persisted to localStorage regardless; ignore transient API errors.
        });
      }
    },
    [userId, token],
  );

  return { config, saveConfig };
}
