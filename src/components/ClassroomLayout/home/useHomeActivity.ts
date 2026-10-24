import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRecentActivity, type ActivityItem } from '@/hooks/data';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
} from '@/lib/local-store/userScope';
import { studioTileAccent } from '@/lib/studioProjectTile';

const MAX_ITEMS = 8;

/**
 * Home's activity rail feed: the recent-activity feed (lessons, cloud
 * Studio projects, saved and viewed songs) plus the Studio session on this
 * device, the one Studio › Continue last session opens — most students'
 * Studio work lives there before it is ever saved. Newest first.
 *
 * The session lookup reads the editor's session store and the draft store,
 * so it loads on demand and stays out of Home's first bundle.
 */
export function useHomeActivity(): ActivityItem[] {
  const recent = useRecentActivity();
  const userKey = useSyncExternalStore(
    onLocalStoreUserChange,
    getLocalStoreUserKey,
  );
  const [session, setSession] = useState<ActivityItem | null>(null);

  useEffect(() => {
    setSession(null);
    if (userKey === null) return;
    let live = true;
    void (async () => {
      const [{ findContinueTarget }, { useSessionStore }] = await Promise.all([
        import('@/components/ClassroomLayout/studio/StudioNewProject'),
        import('@/daw/session/sessionStore'),
      ]);
      const { draftId, userKey: sessionUser } = useSessionStore.getState();
      const target = await findContinueTarget(userKey, {
        draftId,
        userKey: sessionUser,
      });
      if (!live || !target) return;
      setSession({
        id: `session:${target.href}`,
        kind: 'project',
        category: 'Studio session',
        title: target.name,
        subtitle: 'On this device',
        accentColor: studioTileAccent(`session:${target.href}`),
        route: target.href,
        touchedAt: target.updatedAt ?? 0,
      });
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [userKey]);

  const items = session ? [session, ...recent] : recent;
  return items.sort((a, b) => b.touchedAt - a.touchedAt).slice(0, MAX_ITEMS);
}
