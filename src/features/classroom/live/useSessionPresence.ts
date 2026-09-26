/**
 * useSessionPresence — teacher-side reader for the live presence side-map
 * (enrollmentId → 'joined' | 'active' | 'idle'). Reads `presence` the same way
 * `useSessionPositions` reads `positions`.
 *
 * Identified → TEACHER ONLY. The party restricts the identified presence
 * stream to teacher sockets and `sessionSocketController` drops a presence body
 * arriving on any other role, so on a student or projector client this map is
 * always empty by construction.
 *
 * This is what lets the roster say "N joined" and mean it. Before the side-map
 * existed the panel counted ENROLLMENTS, so it read "28 joined" in a room where
 * nobody had opened the link.
 */
import { useMe } from '@/hooks/data';
import {
  readSessionsStoreForUser,
  type PresenceStateValue,
} from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

export const useSessionPresence = (
  sessionId: string,
): Record<string, PresenceStateValue> => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const { store } = useLocalSessionStore();
  return (
    store.presence[sessionId] ??
    readSessionsStoreForUser(userId).presence[sessionId] ??
    {}
  );
};
