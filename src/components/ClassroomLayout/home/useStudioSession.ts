import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ActivityItem } from '@/hooks/data';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
} from '@/lib/local-store/userScope';
import { studioTileAccent } from '@/lib/studioProjectTile';

/**
 * The Studio session on this device, the one Studio › Continue last session
 * opens, as an activity item; null when there is none (or until auth has
 * said whose device storage this is). Most students' Studio work lives there
 * before it is ever saved.
 *
 * The lookup reads the editor's session store and the draft store, so it
 * loads on demand and stays out of Home's first bundle.
 */
export function useStudioSession(): ActivityItem | null {
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

  return session;
}
