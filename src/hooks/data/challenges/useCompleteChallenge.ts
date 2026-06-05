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
