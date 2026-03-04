import type { SessionData } from './SessionSerializer';

const STORAGE_PREFIX = 'prism-daw-session-';
const DEFAULT_SESSION = 'default';

export function saveToLocalStorage(
  data: SessionData,
  name: string = DEFAULT_SESSION,
): void {
  try {
    const key = STORAGE_PREFIX + name;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save session:', err);
  }
}

export function loadFromLocalStorage(
  name: string = DEFAULT_SESSION,
): SessionData | null {
  try {
    const key = STORAGE_PREFIX + name;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch (err) {
    console.warn('Failed to load session:', err);
    return null;
  }
}

export function listSessions(): string[] {
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      names.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return names;
}

export function deleteSession(name: string): void {
  localStorage.removeItem(STORAGE_PREFIX + name);
}
