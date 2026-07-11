import { useMemo } from 'react';
import { useChallenges } from '@/hooks/data/challenges';
import type { Announcement } from './types';

/**
 * The "resting state" announcement shown when there are no real ones (teacher /
 * new-challenge / app-update): a live Challenges update, when there are active
 * challenges to report. When there's nothing at all the row shows a transient
 * "No new notifications" empty state instead (handled in AnnouncementsRow).
 */
export function useFallbackAnnouncements(): Announcement[] {
  const { data: challengeData } = useChallenges();

  return useMemo(() => {
    const active = (challengeData?.challenges ?? []).filter(
      (c) => c.status === 'active',
    );
    if (active.length === 0) return [];

    const totalXp = active.reduce((sum, c) => sum + c.xpReward, 0);
    return [
      {
        id: 'welcome:challenges',
        source: 'challenge',
        title: `${active.length} challenge${active.length === 1 ? '' : 's'} today`,
        body: totalXp > 0 ? `Earn up to ${totalXp} XP` : undefined,
        createdAt: 0,
        dismissible: true,
      },
    ];
  }, [challengeData]);
}
