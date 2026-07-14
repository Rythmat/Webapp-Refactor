import { useMemo } from 'react';
import type { Announcement, AnnouncementSource } from './types';
import { useAppUpdateAnnouncements } from './useAppUpdateAnnouncements';
import { useChallengeAnnouncements } from './useChallengeAnnouncements';
import { useDismissedAnnouncementsStore } from './useDismissedAnnouncementsStore';
import { useFallbackAnnouncements } from './useFallbackAnnouncements';
import { useTeacherAnnouncements } from './useTeacherAnnouncements';

/** Default ordering weight when an announcement doesn't set its own priority. */
const SOURCE_PRIORITY: Record<AnnouncementSource, number> = {
  teacher: 100,
  challenge: 50,
  app_update: 10,
  welcome: 5,
};

/** Keep the rotation short. */
const MAX = 6;

/**
 * The merged, de-duplicated, ordered announcement feed for the Home dashboard.
 * Combines teacher posts, new challenges and app updates; drops anything the
 * user has dismissed; sorts by priority then recency; caps the total.
 */
export function useAnnouncements(): Announcement[] {
  const teacher = useTeacherAnnouncements();
  const challenge = useChallengeAnnouncements();
  const appUpdate = useAppUpdateAnnouncements();
  const fallback = useFallbackAnnouncements();
  const dismissedAt = useDismissedAnnouncementsStore((s) => s.dismissedAt);

  return useMemo(() => {
    const real = [...teacher, ...challenge, ...appUpdate]
      .filter((a) => dismissedAt[a.id] == null)
      .sort((a, b) => {
        const pa = a.priority ?? SOURCE_PRIORITY[a.source];
        const pb = b.priority ?? SOURCE_PRIORITY[b.source];
        return pb !== pa ? pb - pa : b.createdAt - a.createdAt;
      })
      .slice(0, MAX);
    if (real.length > 0) return real;

    // Nothing real to show → the welcome + challenges resting state (still
    // dismissible; dismissing both returns the row to its reserved empty gap).
    return fallback.filter((a) => dismissedAt[a.id] == null);
  }, [teacher, challenge, appUpdate, fallback, dismissedAt]);
}
