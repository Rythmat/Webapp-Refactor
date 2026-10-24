import { useRecentActivity, type ActivityItem } from '@/hooks/data';
import { useStudioSession } from './useStudioSession';

const MAX_ITEMS = 8;

/**
 * Home's activity rail feed: the recent-activity feed (lessons, cloud
 * Studio projects, saved and viewed songs) plus the Studio session on this
 * device (useStudioSession). Newest first.
 */
export function useHomeActivity(): ActivityItem[] {
  const recent = useRecentActivity();
  const session = useStudioSession();

  const items = session ? [session, ...recent] : recent;
  return items.sort((a, b) => b.touchedAt - a.touchedAt).slice(0, MAX_ITEMS);
}
