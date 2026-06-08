import { useStore } from '@/daw/store';
import { clearLocalSession } from './localSession';

/**
 * Reset the studio to a blank, unsaved solo project: drop the local autosave so
 * the reload doesn't restore the project we're leaving, clear the cloud project
 * id/name, and reload into a fresh session.
 *
 * Shared by File ▸ New Project and the collaborative "Leave Session" flow.
 */
export function resetToNewProject(): void {
  clearLocalSession();
  const state = useStore.getState();
  state.setProjectId(null);
  state.setProjectName('Untitled Project');
  window.location.reload();
}
