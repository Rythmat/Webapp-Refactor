import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { clearLocalSession } from './localSession';

/**
 * Reset the studio to a blank, unsaved solo project: drop the local autosave so
 * the reload doesn't restore the project we're leaving, start a new project in
 * the store, and reload into a fresh session.
 *
 * The reset goes through the registry's one door (resetProjectState), which
 * never reaches a collaboration room: whatever runs before the reload sees a
 * new project, with no cloud link to save over, and nothing of it is sent to
 * a room still attached while it reconnects.
 *
 * Shared by File ▸ New Project and the collaborative "Leave Session" flow.
 */
export function resetToNewProject(): void {
  clearLocalSession();
  resetProjectState('new');
  window.location.reload();
}
