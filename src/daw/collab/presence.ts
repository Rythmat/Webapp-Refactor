// ── Presence Helpers ──────────────────────────────────────────────────────
// Utilities for working with the Yjs awareness protocol and the
// UserPresence data stored in the CollabSlice.

import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/daw/store/index';
import type { UserPresence } from './types';

/**
 * Get an array of remote users from the store.
 * The store holds a Map<clientId, UserPresence>; this returns just the values.
 * Uses useShallow to avoid infinite re-renders from new array references.
 */
export function useRemoteUsers(): UserPresence[] {
  return useStore(useShallow((s) => [...s.remoteUsers.values()]));
}

/**
 * Get remote users whose selected track matches the given track ID.
 * Uses useShallow to avoid infinite re-renders from new array references.
 */
export function useTrackPresence(trackId: string): UserPresence[] {
  return useStore(useShallow((s) => {
    const result: UserPresence[] = [];
    s.remoteUsers.forEach((user) => {
      if (user.selectedTrackId === trackId) result.push(user);
    });
    return result;
  }));
}

/**
 * Get the total number of collaborators (including self).
 */
export function useCollaboratorCount(): number {
  return useStore((s) => (s.isCollabActive ? s.remoteUsers.size + 1 : 0));
}

/**
 * Check if collab is active.
 */
export function useIsCollabActive(): boolean {
  return useStore((s) => s.isCollabActive);
}
