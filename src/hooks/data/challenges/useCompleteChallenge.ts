import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { challengesApi } from '@/lib/challenges/api';
import { experienceApi } from '@/lib/experience/api';
import { trackChallengeCompleted } from '@/telemetry/hooks/useTelemetryProduct';

interface CompleteChallengeArgs {
  id: string;
  evidence?: Record<string, unknown>;
}

export const useCompleteChallenge = () => {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, evidence }: CompleteChallengeArgs) => {
      if (!token) throw new Error('Not authenticated');
      return challengesApi.complete(token, id, evidence);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      const challenge = response?.challenge;
      if (challenge) {
        // Grant the real XP reward via the external experience backend. This
        // endpoint doesn't exist yet — no-op gracefully until it ships (the
        // completion itself is already recorded server-side).
        if (token) {
          void experienceApi
            .awardChallenge(
              token,
              challenge.xpReward,
              `challenge:${challenge.id}`,
            )
            .then(() =>
              queryClient.invalidateQueries({
                queryKey: ['experienceSummary'],
              }),
            )
            .catch(() => {});
        }
        trackChallengeCompleted(challenge.id, {
          name: challenge.name,
          xpReward: challenge.xpReward,
          criteriaKind: challenge.criteria?.kind,
        });
      }
    },
  });
};
