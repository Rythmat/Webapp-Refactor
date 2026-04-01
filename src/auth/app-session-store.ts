/**
 * Module-level store for the current app session ID.
 * Used by raw fetch-based API modules (progressApi, experienceApi) that
 * don't go through the Axios-based generated client.
 *
 * Persisted to localStorage so all tabs in the same browser share the same
 * session. This prevents a second tab from creating a new session and
 * revoking the first tab's session. Different browsers have separate
 * localStorage, so the cross-browser single-session security is preserved.
 */

const STORAGE_KEY = 'ma_app_session_id';

let currentAppSessionId: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

export const setCurrentAppSessionId = (id: string | null) => {
  currentAppSessionId = id;
  if (typeof window !== 'undefined') {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
};

export const getCurrentAppSessionId = () => currentAppSessionId;
