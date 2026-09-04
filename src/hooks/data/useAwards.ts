import { useEffect, useMemo } from 'react';
import {
  selectTotalPlays,
  useArcadeActivityStore,
} from '@/features/arcade/useArcadeActivityStore';
import { useAwardEarnedStore } from '@/features/awards/useAwardEarnedStore';
import { useExperienceSummary } from '@/hooks/data/experience';
import { useProgressSummary } from '@/hooks/data/progress/useProgressSummary';
import { useStreak } from '@/hooks/data/useStreak';
import {
  AWARDS_CATALOG,
  type AwardDef,
  type AwardStats,
} from '@/lib/awards/catalog';

export type EvaluatedAward = Omit<AwardDef, 'value'> & {
  current: number;
  unlocked: boolean;
  progress: number; // 0..1
};

export interface AwardsResult {
  awards: EvaluatedAward[];
  unlockedCount: number;
  total: number;
}

/**
 * Real achievement badges evaluated from the user's live progress — XP/level,
 * learning streak, lessons completed and Arcade plays. Fully client-derived (no
 * awards backend); all sub-queries are react-query-cached.
 */
export function useAwards(): AwardsResult {
  const { data: xp } = useExperienceSummary();
  const { data: streak } = useStreak();
  const { data: progress } = useProgressSummary(true);
  const arcadePlays = useArcadeActivityStore(selectTotalPlays);

  return useMemo(() => {
    const stats: AwardStats = {
      level: xp?.level ?? 1,
      totalXp: xp?.totalExperience ?? 0,
      // Historical best so a broken streak never un-earns a streak badge.
      longestStreak: Math.max(streak?.currentStreak ?? 0, streak?.longest ?? 0),
      lessonsCompleted: (progress?.lessons ?? []).reduce(
        (sum, l) => sum + (l.completedCount ?? 0),
        0,
      ),
      arcadePlays,
    };

    const awards: EvaluatedAward[] = AWARDS_CATALOG.map(({ value, ...def }) => {
      const current = value(stats);
      return {
        ...def,
        current,
        unlocked: current >= def.target,
        progress: def.target > 0 ? Math.min(1, current / def.target) : 0,
      };
    });

    return {
      awards,
      unlockedCount: awards.filter((a) => a.unlocked).length,
      total: awards.length,
    };
  }, [xp, streak, progress, arcadePlays]);
}

/**
 * Mount once, globally (see ClassroomDashboard) — records the first time each
 * award becomes unlocked so "Recent Awards" can order by recency. Awards are
 * otherwise pure derived state with no timestamp; this is the only place we
 * capture "when". `useAwards`' sub-queries are shared, so this is nearly free.
 */
export function useStampEarnedAwards(): void {
  const { awards } = useAwards();
  const stamp = useAwardEarnedStore((s) => s.stamp);
  const unlockedIds = awards
    .filter((a) => a.unlocked)
    .map((a) => a.id)
    .join(',');

  useEffect(() => {
    if (unlockedIds) stamp(unlockedIds.split(','));
  }, [unlockedIds, stamp]);
}

/** Unlocked awards, most-recently-earned first — for the User-page card. */
export function useRecentAwards(limit = 4): EvaluatedAward[] {
  const { awards } = useAwards();
  const earnedAt = useAwardEarnedStore((s) => s.earnedAt);

  return useMemo(
    () =>
      awards
        .filter((a) => a.unlocked)
        .sort((a, b) => (earnedAt[b.id] ?? 0) - (earnedAt[a.id] ?? 0))
        .slice(0, limit),
    [awards, earnedAt, limit],
  );
}
