import { useCallback, useState } from 'react';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';

const STREAK_TARGET = 5;

export function useArcadeStreakReward() {
  const awardXP = useAwardArcadeExperience();
  const [streak, setStreak] = useState(0);

  const registerCorrect = useCallback(() => {
    setStreak((prev) => {
      const next = prev + 1;
      if (next >= STREAK_TARGET) {
        awardXP.mutateAsync().catch(() => {});
        return 0;
      }
      return next;
    });
  }, [awardXP]);

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
