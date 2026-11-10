import { useMe } from '@/hooks/data';
import { readSessionsStoreForUser, type ActivityDone } from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

/**
 * Who finished which step of the activity the class does together, by
 * enrollment. Teacher-only, like positions: identified (Rule 2).
 */
export const useSessionActivityDone = (
  sessionId: string,
): Record<string, ActivityDone> => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const { store } = useLocalSessionStore();
  return (
    store.activityDone[sessionId] ??
    readSessionsStoreForUser(userId).activityDone[sessionId] ??
    {}
  );
};
