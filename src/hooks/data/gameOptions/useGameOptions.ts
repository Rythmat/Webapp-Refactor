import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { gameOptionsApi, type GameOptions } from '@/lib/gameOptions/api';

export const gameOptionsQueryKey = ['gameOptions'] as const;

/**
 * The signed-in user's saved options for one arcade game. Disabled (and so
 * `data === undefined`) when logged out — games fall back to their defaults.
 */
export const useGameOptions = <T extends GameOptions = GameOptions>(
  game: string,
  enabled = true,
) => {
  const token = useAuthToken();

  // Stable per game id: an inline select would hand callers a fresh object on
  // every render and retrigger their effects.
  const select = useCallback(
    (data: { options: Record<string, GameOptions> }) =>
      (data.options?.[game] ?? {}) as T,
    [game],
  );

  return useQuery({
    queryKey: gameOptionsQueryKey,
    queryFn: () => gameOptionsApi.fetchAll(token!),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 10,
    select,
  });
};
