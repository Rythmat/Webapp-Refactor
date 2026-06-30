import { useCallback, useState } from 'react';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';
import { reportChallengeEvent } from '@/lib/challenges/eventBus';

const STREAK_TARGET = 5;

export function useArcadeStreakReward(game?: string) {
  const awardXP = useAwardArcadeExperience();
  const [streak, setStreak] = useState(0);

  const registerCorrect = useCallback(() => {
    setStreak((prev) => {
      const next = prev + 1;
      if (next >= STREAK_TARGET) {
        awardXP.mutateAsync().catch(() => {});
        if (game) {
          reportChallengeEvent({ kind: 'arcade_streak', game, count: next });
        }
        return 0;
      }
      return next;
    });
  }, [awardXP, game]);

  const registerWrong = useCallback(() => {
    setStreak(0);
  }, []);

  const reset = useCallback(() => {
    setStreak(0);
  }, []);

  return {
    streak,
    target: STREAK_TARGET,
    registerCorrect,
    registerWrong,
    reset,
  };
}
