import { useCallback, useRef, useState } from 'react';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';
import { reportChallengeEvent } from '@/lib/challenges/eventBus';

const STREAK_TARGET = 5;

/** A completed streak, for the game to celebrate. */
export interface StreakWin {
  /** Counts up with every win, so a new one can be told from the last. */
  id: number;
  /**
   * The XP it earned: 'pending' while the award is on its way, 'granted' with
   * `xp`, 'capped' when today's Arcade XP is all earned, 'failed' when the
   * award couldn't be made (signed out, offline).
   */
  status: 'pending' | 'granted' | 'capped' | 'failed';
  xp: number;
}

/**
 * A game's streak: `target` answers in a row (five unless the game says)
 * earns arcade XP. Major Arcanum counts phrases played without a miss.
 */
export function useArcadeStreakReward(game?: string, target = STREAK_TARGET) {
  const { mutateAsync: awardXP } = useAwardArcadeExperience();
  const [streak, setStreak] = useState(0);
  const [win, setWin] = useState<StreakWin | null>(null);
  // XP earned by this visit's streaks.
  const [sessionXp, setSessionXp] = useState(0);
  // The count lives in a ref too: the award is a side effect, and a state
  // updater (run twice in development) mustn't make it.
  const streakRef = useRef(0);
  const winIdRef = useRef(0);

  const registerCorrect = useCallback(() => {
    const next = streakRef.current + 1;
    if (next < target) {
      streakRef.current = next;
      setStreak(next);
      return;
    }
    streakRef.current = 0;
    setStreak(0);
    const id = ++winIdRef.current;
    setWin({ id, status: 'pending', xp: 0 });
    awardXP()
      .then((res) => {
        const granted = res.awarded && res.awardedExperience > 0;
        if (granted) setSessionXp((xp) => xp + res.awardedExperience);
        setWin((w) =>
          w?.id === id
            ? {
                id,
                status: granted ? 'granted' : 'capped',
                xp: granted ? res.awardedExperience : 0,
              }
            : w,
        );
      })
      .catch(() => {
        setWin((w) => (w?.id === id ? { ...w, status: 'failed' } : w));
      });
    if (game) {
      reportChallengeEvent({ kind: 'arcade_streak', game, count: next });
    }
  }, [awardXP, game, target]);

  const registerWrong = useCallback(() => {
    streakRef.current = 0;
    setStreak(0);
  }, []);

  const reset = useCallback(() => {
    streakRef.current = 0;
    setStreak(0);
  }, []);

  return {
    streak,
    target,
    registerCorrect,
    registerWrong,
    reset,
    win,
    sessionXp,
  };
}
