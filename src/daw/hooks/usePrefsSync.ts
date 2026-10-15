import { useEffect } from 'react';
import { startPrefsSync } from '@/daw/persistence/prefsStore';

/**
 * Keeps the student's editor prefs (metronome, count-in, snap, grid,
 * triplets, chord-ruler note names) while the editor is mounted: puts theirs
 * into the store and saves their changes, per user (prefsStore). When the
 * user changes, as on a shared Chromebook, the last one's waiting change is
 * saved and the new one's prefs replace theirs. `userId` null is signed out.
 *
 * `ready` false holds the sync off until auth knows who the student is (the
 * editor shell's ownerKnown), so nothing is applied or saved under 'anon'
 * for a student who is still signing in. Mount it once, in the editor shell.
 */
export function usePrefsSync(userId: string | null, ready = true): void {
  useEffect(
    () => (ready ? startPrefsSync(userId) : undefined),
    [userId, ready],
  );
}
