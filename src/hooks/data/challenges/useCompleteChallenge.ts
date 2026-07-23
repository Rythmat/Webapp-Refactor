import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { challengesApi } from '@/lib/challenges/api';
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
      // The complete endpoint grants XP + advances the boost pointer directly
      // on the backend and echoes the fresh experience summary. Invalidate
      // both queries so the XP tile and the Challenges card refresh.
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['experienceSummary'] });
      const challenge = response?.challenge;
      if (challenge) {
        trackChallengeCompleted(challenge.id, {
          name: challenge.name,
          xpReward: challenge.xpReward,
          criteriaKind: challenge.criteria?.kind,
        });
      }
    },
  });
};
