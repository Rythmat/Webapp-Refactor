import { useCallback, useEffect, useRef, useState } from 'react';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { AvatarConfig } from '@/lib/avatarHexGrid';

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

function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.seed === 'number' && typeof v.noiseType === 'string';
}

async function persistToApi(token: string, config: AvatarConfig) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';

  await fetch(`${apiBase}/auth/me/avatar-config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(config),
  });
}

export function useAvatarConfig(
  userId: string | undefined,
  serverConfig?: unknown,
) {
  const { token } = useAuthContext();
  const didSyncRef = useRef(false);

  const [config, setConfig] = useState<AvatarConfig | null>(() => {
    // Prefer server config, fall back to localStorage cache.
    if (isAvatarConfig(serverConfig)) return serverConfig;
    return userId ? loadLocalConfig(userId) : null;
  });

  // When server config arrives (e.g. after /auth/me loads), adopt it if we
  // don't already have a local override.
  useEffect(() => {
    if (didSyncRef.current) return;
    if (isAvatarConfig(serverConfig)) {
      didSyncRef.current = true;
      setConfig(serverConfig);
      if (userId) cacheLocalConfig(userId, serverConfig);
    }
  }, [serverConfig, userId]);

  const saveConfig = useCallback(
    (newConfig: AvatarConfig) => {
      if (!userId) return;

      setConfig(newConfig);
      cacheLocalConfig(userId, newConfig);

      if (token) {
        void persistToApi(token, newConfig);
      }
    },
    [userId, token],
  );

  return { config, saveConfig };
}
