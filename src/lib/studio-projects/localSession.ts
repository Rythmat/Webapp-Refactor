import {
  deserializeSession,
  serializeSession,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { canUndo } from '@/daw/store/undoMiddleware';

// Single-slot autosave. Crash recovery only — cloud is always the source of
// truth for explicitly-saved projects. Cleared when the user starts a new
// project so a refresh after "New Project" doesn't restore the old one.
const LOCAL_AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

export function writeLocalSession(): void {
  try {
    const data = serializeSession();
    localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(data));
  } catch (err) {
    // Quota errors are common when project size grows; log and move on.
    console.warn('[autosave] Local write failed', err);
  }
}

export function readLocalSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch (err) {
    console.warn('[autosave] Local read failed', err);
    return null;
  }
}

export function clearLocalSession(): void {
  try {
    localStorage.removeItem(LOCAL_AUTOSAVE_KEY);
  } catch (err) {
    console.warn('[autosave] Local clear failed', err);
  }
}

export function restoreLocalSessionIfPresent(): boolean {
  const session = readLocalSession();
  if (!session) return false;
  deserializeSession(session);
  return true;
}

/**
 * The name of the Studio session that starting fresh would throw away, or null
 * when there is nothing worth asking about.
 *
 * Two places can be holding one. The store survives SPA navigation, so a player
 * who walked from the Studio to the song library still has their session in
 * memory — but only an *edited* one is worth a prompt, and undo history is what
 * tells the two apart: it is reset whenever a project is loaded or a song is
 * seeded, so anything on the stack is the player's own work. The autosave is
 * the other place: a session from an earlier visit that nothing has restored
 * yet, whose only copy this is.
 */
export function unsavedStudioSession(): string | null {
  const live = useStore.getState();
  if (live.tracks.length > 0 || live.chordRegions.length > 0)
    return canUndo() ? live.projectName || 'Untitled Project' : null;

  const saved = readLocalSession()?.data;
  if (!saved) return null;
  const hasContent =
    saved.tracks.length > 0 || (saved.chordRegions?.length ?? 0) > 0;
  return hasContent ? saved.projectName || 'Untitled Project' : null;
}
