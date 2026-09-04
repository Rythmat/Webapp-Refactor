import { useCallback, useEffect, useState } from 'react';
import {
  useSaveAvatarConfig,
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
 * The current user's avatar config. Source of truth is the `avatar_config`
 * column on `user` (read through `/auth/me`, written through
 * `PUT /auth/me/avatar-config`); localStorage is a first-paint cache. Saving
 * persists to both.
 *
 * `serverConfig` is still accepted so existing callers that pass `me.avatarConfig`
 * keep working — it is now the same value `useSelfAvatarConfig` reads.
 */
export function useAvatarConfig(
  userId: string | undefined,
  serverConfig?: unknown,
) {
  const { data: storeConfig } = useSelfAvatarConfig();
  const saveMutation = useSaveAvatarConfig();

  // No-flash first paint when userId is already known; otherwise the resolve
  // effect below fills it in once userId / the /auth/me query arrive.
  const [config, setConfig] = useState<AvatarConfig | null>(() =>
    userId ? loadLocalConfig(userId) : null,
  );

  // Resolve reactively (userId from useMe and the profile query both settle
  // async). localStorage is authoritative for THIS device — it's written on
  // every save, so it wins over the server; the server value only fills in when
  // the cache is empty (a fresh device). This can't clobber a locally-saved
  // config, and it restores the cache as soon as userId resolves.
  useEffect(() => {
    const local = userId ? loadLocalConfig(userId) : null;
    if (local) setConfig(local);
    else if (isAvatarConfig(storeConfig)) setConfig(storeConfig);
    else if (isAvatarConfig(serverConfig)) setConfig(serverConfig);
  }, [userId, storeConfig, serverConfig]);

  // Returns whether it persisted — false means no userId yet, so the caller can
  // avoid claiming success. Writes localStorage now; the PUT is best-effort.
  const { mutate: saveToServer } = saveMutation;
  const saveConfig = useCallback(
    (newConfig: AvatarConfig): boolean => {
      if (!userId) return false;
      setConfig(newConfig);
      cacheLocalConfig(userId, newConfig);
      // Patches the shared /auth/me cache on success, so every OTHER
      // useAvatarConfig consumer (TopRail icon, UserWidget, …) re-resolves.
      saveToServer(newConfig, {
        onError: () => {
          // Persisted to localStorage regardless; ignore transient API errors.
        },
      });
      return true;
    },
    [userId, saveToServer],
  );

  return { config, saveConfig };
}
