/**
 * useSessionPositions — teacher-side reader for per-student slide position in a
 * student-paced deck. Reads the `positions` side-map (enrollmentId → slideIndex)
 * the same way useLiveResponses reads `responses`. Identified → teacher-only;
 * never reaches the projector.
 */
import { useMe } from '@/hooks/data';
import { readSessionsStoreForUser } from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

export const useSessionPositions = (
  sessionId: string,
): Record<string, number> => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const { store } = useLocalSessionStore();
  return (
    store.positions[sessionId] ??
    readSessionsStoreForUser(userId).positions[sessionId] ??
    {}
  );
};
