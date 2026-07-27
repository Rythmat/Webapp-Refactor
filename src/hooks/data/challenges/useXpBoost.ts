import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { challengesApi } from '@/lib/challenges/api';
import { experienceApi } from '@/lib/experience/api';
import { useChallenges } from './useChallenges';

/**
 * The challenge XP-boost state: a 2× boost is earned by completing all of a
 * day's challenges and becomes claimable the next day. Reads the pending state
 * from `useChallenges` (backend-owned) and the active window from
 * `experienceApi.getBoost`. Claiming activates the boost directly on the
 * backend (no separate follow-up call).
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
      // claimBoost now activates the window directly on the backend and
      // returns the active `{ multiplier, expiresAt }`. React-query refetch
      // below reads the same shape from GET /experience/boost so the two
      // stay in sync automatically.
      return challengesApi.claimBoost(token);
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
  // Show the ACTIVE window's multiplier only when a boost is actually active.
  // When there's no active window, GET /experience/boost returns the no-boost
  // sentinel `{ multiplier: 1, expiresAt: null }`, so gating on `isActive`
  // is required — a nullish-coalescing chain would incorrectly latch onto
  // the `1` and render "Claim your 1× XP" for pending/claimable states.
  const multiplier = isActive
    ? (active?.multiplier ?? 2)
    : (pending?.multiplier ?? 2);

  return { isActive, claimable, pendingSoon, multiplier, claim };
}
