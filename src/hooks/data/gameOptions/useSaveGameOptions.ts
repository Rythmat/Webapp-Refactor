import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  gameOptionsApi,
  type GameOptions,
  type GameOptionsMap,
} from '@/lib/gameOptions/api';
import { gameOptionsQueryKey } from './useGameOptions';

/**
 * Persist one game's options to the user profile. The API shallow-merges into
 * that game's entry, so callers only send the keys they changed.
 */
export const useSaveGameOptions = (game: string) => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: GameOptions) => {
      if (!token) throw new Error('Not authenticated');
      return gameOptionsApi.patchGame(token, game, options);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<{ options: GameOptionsMap }>(
        gameOptionsQueryKey,
        response,
      );
    },
  });
};
