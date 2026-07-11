import { useEffect, useMemo } from 'react';
import { useChallenges } from '@/hooks/data/challenges';
import type { Announcement } from './types';
import { useSeenChallengesStore } from './useSeenChallengesStore';

/** How long after a challenge first appears we surface it as "new". */
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Turns newly-issued challenges into gentle "New challenge" announcements.
 * Deliberately no "expiring soon"/urgency variant — the dashboard avoids
 * manufactured urgency (see ChallengesCard). A local seen-set seeds the
 * pre-existing challenge set so nothing spams at launch.
 */
export function useChallengeAnnouncements(): Announcement[] {
  const { data } = useChallenges();
  const firstSeenAt = useSeenChallengesStore((s) => s.firstSeenAt);
  const observe = useSeenChallengesStore((s) => s.observe);

  const active = useMemo(
    () => (data?.challenges ?? []).filter((c) => c.status === 'active'),
    [data],
  );

  // Record newly-appeared challenge ids (and seed the existing set on first run).
  useEffect(() => {
    if (active.length) observe(active.map((c) => c.id));
  }, [active, observe]);

  return useMemo(() => {
    const now = Date.now();
    return active
      .filter((c) => {
        const seen = firstSeenAt[c.id];
        return seen != null && seen > 0 && now - seen < NEW_WINDOW_MS;
      })
      .map<Announcement>((c) => ({
        id: `challenge:${c.id}`,
        source: 'challenge',
        title: `New challenge: ${c.name}`,
        body: `Earn +${c.xpReward} XP`,
        createdAt: firstSeenAt[c.id] ?? now,
        cta: c.route ? { label: 'View', to: c.route } : undefined,
      }));
  }, [active, firstSeenAt]);
}
