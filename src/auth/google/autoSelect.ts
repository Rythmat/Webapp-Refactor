import { disableGisAutoSelect } from './gis';

/**
 * Keeps Google auto sign-in from undoing a sign-out.
 *
 * The sign-in page lets GIS auto-select a returning user's account. Right after
 * signing out, that would sign them straight back in, so sign-out sets a flag
 * that turns auto-select off until the next explicit Google sign-in, and
 * quiets the marketing-page prompt for the rest of the tab session. GIS's own
 * `disableAutoSelect` only works where GIS is loaded, which the app pages
 * aren't, hence our own flags (plus FedCM's `preventSilentAccess`).
 *
 * A loop breaker covers the other way round: if an automatic pick comes back
 * to the sign-in page (an Auth0 error, say), the next one within two minutes
 * is not followed.
 */

const AUTO_SELECT_OFF_KEY = 'musicAtlas:googleAutoSelectOff';
const QUIET_KEY = 'musicAtlas:googleOneTapQuiet';
const LAST_AUTO_KEY = 'musicAtlas:googleLastAutoAt';

export const AUTO_RETRY_WINDOW_MS = 120_000;
const PREVENT_SILENT_ACCESS_WAIT_MS = 300;

const localStore = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const sessionStore = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const read = (storage: Storage | null, key: string) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (storage: Storage | null, key: string, value: string) => {
  try {
    storage?.setItem(key, value);
  } catch {
    // Private mode / quota: auto-select just stays on.
  }
};

const remove = (storage: Storage | null, key: string) => {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to clear.
  }
};

export const isGoogleAutoSelectSuppressed = (storage = localStore()) =>
  read(storage, AUTO_SELECT_OFF_KEY) === '1';

/** After an explicit Google sign-in: auto-select may resume next time. */
export const clearGoogleAutoSelectSuppression = (
  storage = localStore(),
  session = sessionStore(),
) => {
  remove(storage, AUTO_SELECT_OFF_KEY);
  remove(session, QUIET_KEY);
};

/** No marketing-page prompt in this tab (set on sign-out). */
export const isOneTapQuiet = (session = sessionStore()) =>
  read(session, QUIET_KEY) === '1';

/** On sign-out, before leaving for Auth0's logout. */
export const suppressGoogleAutoSelect = async (
  storage = localStore(),
  session = sessionStore(),
) => {
  write(storage, AUTO_SELECT_OFF_KEY, '1');
  write(session, QUIET_KEY, '1');
  disableGisAutoSelect();

  const credentials =
    typeof navigator === 'undefined' ? undefined : navigator.credentials;
  if (!credentials?.preventSilentAccess) return;
  try {
    await Promise.race([
      credentials.preventSilentAccess().catch(() => undefined),
      new Promise((resolve) =>
        setTimeout(resolve, PREVENT_SILENT_ACCESS_WAIT_MS),
      ),
    ]);
  } catch {
    // Never let this hold up signing out.
  }
};

/** Whether GIS picked the account without the user doing anything. */
export const isAutoSelection = (selectBy?: string) =>
  selectBy === 'auto' || selectBy === 'fedcm_auto';

/** True if an automatic pick was already followed in the last two minutes. */
export const shouldBlockAutoRetry = (
  now = Date.now(),
  session = sessionStore(),
) => {
  const last = Number(read(session, LAST_AUTO_KEY));
  return last > 0 && now - last < AUTO_RETRY_WINDOW_MS;
};

export const markAutoAttempt = (now = Date.now(), session = sessionStore()) => {
  write(session, LAST_AUTO_KEY, String(now));
};
