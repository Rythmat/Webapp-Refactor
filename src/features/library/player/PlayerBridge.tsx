import { useEffect } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { onLocalStoreUserChange } from '@/lib/local-store/userScope';
import { playerActions, usePlayer } from './libraryPlayer';

/**
 * What the player takes from the page (ClassroomDashboard mounts it): the
 * signed-in token for the account's projects; a pause on the pages that
 * make their own sound (the Studio editor, the lesson players); and a full
 * stop when the user changes, so nobody hears another student's work.
 */
export function PlayerBridge({ quiet }: { quiet: boolean }) {
  const token = useAuthToken();
  useEffect(() => {
    playerActions.setToken(token ?? null);
  }, [token]);

  useEffect(() => {
    if (!quiet) return;
    const { status } = usePlayer.getState();
    if (status === 'playing' || status === 'preparing') playerActions.pause();
    playerActions.setQueueOpen(false);
  }, [quiet]);

  useEffect(() => onLocalStoreUserChange(() => playerActions.stop()), []);
  return null;
}
