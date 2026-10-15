import { useSyncExternalStore } from 'react';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';

/**
 * The session generation (sessionGeneration.ts), as a component sees it: it
 * re-renders when a load or reset of the project starts.
 *
 * A view that copies a track's data into its own state as it mounts (a pedal
 * chain, a selection of the clip's notes) keys itself by the track id and
 * this. A new project can reuse a track id (kept work restored, a project
 * reopened, a Save-As copy opened next to its original), and a view keyed by
 * the id alone stays mounted over it with the old project's copy: it plays
 * that copy through the new project's engine and saves it over the loaded
 * data on the next edit. Keyed by both, it mounts again on every load and
 * reads the new project.
 */
export function useSessionGeneration(): number {
  return useSyncExternalStore(onSessionGeneration, getSessionGeneration);
}
