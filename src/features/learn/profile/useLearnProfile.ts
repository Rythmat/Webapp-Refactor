import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
} from '@/lib/local-store/userScope';
import {
  LEARN_PROFILE_GAME_ID,
  MAX_DISMISSED,
  mergeLearnProfiles,
  normalizeLearnProfile,
  type LearnProfile,
} from './learnProfile';

// ── The student's Learn profile, on their account and this device ──────────
// The device copy is per user (shared Chromebooks) and answers at once; the
// account's copy wins once it arrives. `answered` is true only once the
// account has said, so nothing is decided on a guess (the /welcome redirect
// waits for it). Under the dev auth bypass there's no account: the device
// copy is the answer.

export interface LearnProfileAccount {
  profile: LearnProfile;
  /** The account has answered (or there is no account to ask). */
  answered: boolean;
  /** The account has answered or failed to: the device copy is all there is. */
  settled: boolean;
  save: (patch: LearnProfile) => void;
  /** "Not interested" on a course or item. */
  dismiss: (id: string) => void;
}

const storageKey = (userKey: string) => `music-atlas-learn-profile:${userKey}`;

let version = 0;
const listeners = new Set<() => void>();
const bump = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const off = onLocalStoreUserChange(bump);
  return () => {
    listeners.delete(listener);
    off();
  };
};

/** This user's copy on the device; empty while nobody is known. */
export function readDeviceProfile(): LearnProfile {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return {};
  try {
    return normalizeLearnProfile(
      JSON.parse(localStorage.getItem(storageKey(userKey)) ?? '{}'),
    );
  } catch {
    return {};
  }
}

function writeDeviceProfile(patch: LearnProfile) {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return;
  try {
    localStorage.setItem(
      storageKey(userKey),
      JSON.stringify({ ...readDeviceProfile(), ...patch }),
    );
  } catch {
    // Private mode: the account still has it.
  }
  bump();
}

/** Dev only: forget the answers, to see /welcome again. */
export function resetDeviceLearnProfile() {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return;
  try {
    localStorage.removeItem(storageKey(userKey));
  } catch {
    // Nothing kept.
  }
  bump();
}

function useDeviceProfile(): LearnProfile {
  const tick = useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  // Re-read whenever the store ticks or the user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(readDeviceProfile, [tick]);
}

function withDismissed(was: LearnProfile, id: string): string[] {
  const list = (was.dismissed ?? []).filter((d) => d !== id);
  return [...list, id].slice(-MAX_DISMISSED);
}

function useServerProfile(): LearnProfileAccount {
  const device = useDeviceProfile();
  const { data, isSuccess, isError } = useGameOptions(LEARN_PROFILE_GAME_ID);
  const { mutate } = useSaveGameOptions(LEARN_PROFILE_GAME_ID);
  const profile = useMemo(
    () => mergeLearnProfiles(device, normalizeLearnProfile(data)),
    [device, data],
  );
  const save = useCallback(
    (patch: LearnProfile) => {
      writeDeviceProfile(patch);
      mutate(patch as Record<string, unknown>);
    },
    [mutate],
  );
  const dismiss = useCallback(
    (id: string) => save({ dismissed: withDismissed(profile, id) }),
    [profile, save],
  );
  return {
    profile,
    answered: isSuccess,
    settled: isSuccess || isError,
    save,
    dismiss,
  };
}

function useDevProfile(): LearnProfileAccount {
  const profile = useDeviceProfile();
  const save = useCallback((patch: LearnProfile) => {
    writeDeviceProfile(patch);
  }, []);
  const dismiss = useCallback(
    (id: string) =>
      writeDeviceProfile({
        dismissed: withDismissed(readDeviceProfile(), id),
      }),
    [],
  );
  return { profile, answered: true, settled: true, save, dismiss };
}

export const useLearnProfile: () => LearnProfileAccount = DEV_AUTH_BYPASS
  ? useDevProfile
  : useServerProfile;
