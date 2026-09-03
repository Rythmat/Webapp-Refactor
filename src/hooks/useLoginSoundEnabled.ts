import { useCallback, useEffect, useState } from 'react';

// Whether the welcome jingle plays on sign-in. Persisted in localStorage and ON
// by default (absent key → enabled), so existing users keep hearing it without a
// migration.
//
// The jingle is a first-run welcome: it plays once per account and then stays
// silent, tracked by a per-user "played" key. Turning the preference back on
// clears that key, re-arming the jingle for the next sign-in — otherwise the
// toggle would be inert once the first-run play was spent.
const ENABLED_KEY = 'musicAtlas:loginSound';
const PLAYED_KEY_PREFIX = 'musicAtlas:loginSoundPlayed:';
const EVENT = 'login-sound-pref-change';

const playedKey = (userId: string) => `${PLAYED_KEY_PREFIX}${userId}`;

export function getLoginSoundEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== '0';
  } catch {
    return true;
  }
}

export function hasPlayedLoginSound(userId: string): boolean {
  try {
    return localStorage.getItem(playedKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markLoginSoundPlayed(userId: string): void {
  try {
    localStorage.setItem(playedKey(userId), '1');
  } catch {
    // Ignore write failures (private mode / quota).
  }
}

export function clearLoginSoundPlayed(userId: string): void {
  try {
    localStorage.removeItem(playedKey(userId));
  } catch {
    // Ignore write failures (private mode / quota).
  }
}

export function setLoginSoundEnabled(
  enabled: boolean,
  userId?: string | null,
): void {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore write failures (private mode / quota).
  }

  // Re-arm: switching back on gives the user one more play on the next sign-in.
  if (enabled && userId) {
    clearLoginSoundPlayed(userId);
  }

  // Notify same-tab listeners immediately (storage event only fires cross-tab).
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Reactive accessor for the login-sound preference. Re-renders when it changes
 * in this tab (via the custom event) or another tab (via the storage event).
 *
 * Pass the signed-in account id so enabling the preference can also re-arm the
 * per-user first-run play.
 */
export function useLoginSoundEnabled(
  userId?: string | null,
): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(getLoginSoundEnabled);

  useEffect(() => {
    const sync = () => setEnabled(getLoginSoundEnabled());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const set = useCallback(
    (next: boolean) => setLoginSoundEnabled(next, userId),
    [userId],
  );
  return [enabled, set];
}
