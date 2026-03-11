import { useCallback, useState } from 'react';
import type { AvatarConfig } from '@/lib/avatarHexGrid';

const STORAGE_PREFIX = 'avatar_config_';

function loadConfig(userId: string): AvatarConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw) as AvatarConfig;
  } catch {
    return null;
  }
}

export function useAvatarConfig(userId: string | undefined) {
  const [config, setConfig] = useState<AvatarConfig | null>(() =>
    userId ? loadConfig(userId) : null,
  );

  const saveConfig = useCallback(
    (newConfig: AvatarConfig) => {
      if (!userId) return;
      localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(newConfig));
      setConfig(newConfig);
    },
    [userId],
  );

  return { config, saveConfig };
}
