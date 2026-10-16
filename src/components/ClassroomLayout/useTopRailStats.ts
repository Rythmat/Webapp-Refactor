import { useMe } from '@/hooks/data';
import { useExperienceSummary } from '@/hooks/data/experience';
import { useAwards } from '@/hooks/data/useAwards';
import { useStreak } from '@/hooks/data/useStreak';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';

/** The credits counter is a stub until credits ship. */
export const CREDITS_PLACEHOLDER = 12;
// Notifications are not yet backed by a real feed: zero keeps the badge dot
// hidden until a notification stream ships.
const NOTIFICATION_COUNT = 0;

export interface TopRailStats {
  totalXp: number;
  level: number;
  streakDays: number;
  /** Awards earned. */
  unlockedCount: number;
  notificationCount: number;
  userName: string;
  avatarConfig: ReturnType<typeof useAvatarConfig>['config'];
}

/**
 * What the app's top rail shows of the student (XP, level, streak, awards,
 * notifications, the avatar), from one place: the TopRail and the Studio
 * editor's avatar menu (focus mode, owner decision 7) read the same data.
 */
export function useTopRailStats(): TopRailStats {
  const { data: xp } = useExperienceSummary();
  const { data: streak } = useStreak();
  const { unlockedCount } = useAwards();
  const { data: user } = useMe();
  const { config: avatarConfig } = useAvatarConfig(
    user?.id,
    (user as Record<string, unknown> | undefined)?.avatarConfig,
  );
  return {
    totalXp: xp?.totalExperience ?? 0,
    level: xp?.level ?? 1,
    streakDays: streak?.currentStreak ?? 0,
    unlockedCount,
    notificationCount: NOTIFICATION_COUNT,
    userName: user?.nickname || user?.username || 'friend',
    avatarConfig,
  };
}
