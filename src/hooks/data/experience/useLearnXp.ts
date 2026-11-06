import { QueryClientContext } from '@tanstack/react-query';
import { useCallback, useContext } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  awardLearnXp,
  type LearnXpAction,
  type LearnXpReply,
} from '@/lib/experience/learnXp';

/**
 * Award a little XP from a Learn activity. The top counter follows the reply, so
 * that small awards don't each fetch the whole 400-day summary again.
 */
export function useLearnXp() {
  const token = useAuthToken();
  const queryClient = useContext(QueryClientContext);
  return useCallback(
    (action: LearnXpAction, scope: string) =>
      awardLearnXp(token, action, scope, (reply: LearnXpReply) => {
        if (typeof reply.totalExperience !== 'number') return;
        const { totalExperience, level } = reply;
        queryClient?.setQueryData(
          ['experienceSummary'],
          (summary: object | undefined) =>
            summary && {
              ...summary,
              totalExperience,
              ...(typeof level === 'number' ? { level } : {}),
            },
        );
      }),
    [queryClient, token],
  );
}
