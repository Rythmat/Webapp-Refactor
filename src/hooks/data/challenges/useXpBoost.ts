import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { challengesApi } from '@/lib/challenges/api';
import { experienceApi } from '@/lib/experience/api';
import { useChallenges } from './useChallenges';

/**
 * The challenge XP-boost state: a 2× boost is earned by completing all of a
 * day's challenges and becomes claimable the next day. Reads the pending state
 * from our challenge store and the active window from the external experience
 * backend (graceful: until that backend ships, the boost is display-only).
 */
export function useXpBoost() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { data } = useChallenges();
  const pending = data?.boost ?? null;

  const { data: active } = useQuery({
    queryKey: ['xpBoost'],
    enabled: !!token,
    staleTime: 60_000,
    retry: false,
    queryFn: () => experienceApi.getBoost(token!),
  });

  const claim = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not authenticated');
      const { multiplier, durationMs } = await challengesApi.claimBoost(token);
      // Activate the real multiplier on the external backend (graceful no-op
      // until that endpoint exists).
      await experienceApi
        .startBoost(token, multiplier, durationMs)
        .catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['xpBoost'] });
    },
    onError: () => {},
  });

  const now = Date.now();
  const claimable = !!pending?.pending && now >= pending.claimableAt;
  const pendingSoon = !!pending?.pending && now < pending.claimableAt;
  const activeUntil = active?.expiresAt ? Date.parse(active.expiresAt) : null;
  const isActive = !!activeUntil && activeUntil > now;
  const multiplier = active?.multiplier ?? pending?.multiplier ?? 2;

  return { isActive, claimable, pendingSoon, multiplier, claim };
}
