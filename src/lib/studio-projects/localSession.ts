import {
  deserializeSession,
  serializeSession,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';

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
