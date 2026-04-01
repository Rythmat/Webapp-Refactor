import { useCallback, useRef } from 'react';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';
import { type GameScoreReport, type GameScoreState } from './scoringTypes';

/**
 * Hook that manages in-round scoring and submits XP on completion.
 *
 * Usage:
 *   const { state, hit, miss, resetScore, completeRound } = useGameScore('majorArcanum');
 *   // On correct input: hit()
 *   // On missed note: miss()
 *   // On round end: const report = await completeRound(difficulty, skillTags)
 */
export function useGameScore(gameId: string) {
  const awardXP = useAwardArcadeExperience();

  const stateRef = useRef<GameScoreState>({
    score: 0,
    streak: 0,
    maxStreak: 0,
    multiplier: 1,
    hits: 0,
    misses: 0,
    startTime: Date.now(),
  });

  const resetScore = useCallback(() => {
    stateRef.current = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      hits: 0,
      misses: 0,
      startTime: Date.now(),
    };
  }, []);

  const hit = useCallback((points = 10) => {
    const s = stateRef.current;
    s.hits += 1;
    s.streak += 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.multiplier = Math.min(Math.floor(s.streak / 10) + 1, 3);
    s.score += points * s.multiplier;
    return { ...s };
  }, []);

  const miss = useCallback(() => {
    const s = stateRef.current;
    s.misses += 1;
    s.streak = 0;
    s.multiplier = 1;
    return { ...s };
  }, []);

  const addScore = useCallback((points: number) => {
    const s = stateRef.current;
    s.score += points * s.multiplier;
    return { ...s };
  }, []);

  const completeRound = useCallback(
    async (
      difficulty = 1,
      skillTags: string[] = [],
    ): Promise<GameScoreReport> => {
      const s = stateRef.current;
      const total = s.hits + s.misses;
      const accuracy = total > 0 ? s.hits / total : 0;
      const timeSpent = (Date.now() - s.startTime) / 1000;

      const report: GameScoreReport = {
        gameId,
        score: s.score,
        accuracy,
        streak: s.streak,
        maxStreak: s.maxStreak,
        timeSpent,
        difficulty,
        skillTags,
      };

      // Award server-side XP (server enforces daily cap)
      try {
        await awardXP.mutateAsync();
      } catch {
        // XP award is best-effort; don't block game flow
      }

      return report;
    },
    [gameId, awardXP],
  );

  return {
    stateRef,
    hit,
    miss,
    addScore,
    resetScore,
    completeRound,
  };
}
