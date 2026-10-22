import { useCallback, useMemo, useState } from 'react';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';

// ── What the player has seen of the Learn tours, on their account ──────────
// "Only their first time" (Peter, 2026-10-21): each prompt shows once per
// player, on any device. Kept with the arcade's game options (PATCH
// /api/game-options/learnTours), which shallow-merge, so each mark sends only
// its own key. A mark shows at once; a slow or failed save never brings a
// prompt back this visit. Until the account answers, nothing is offered: a
// player is never prompted on a guess.
//
// A dev session signed in by the auth bypass has no real account to save to,
// so it keeps the marks in this browser instead.

export const LEARN_TOURS_GAME_ID = 'learnTours';

export type LearnTourFlags = {
  /** Asked "Is this your first time in Music Atlas Learn?". */
  lessonPrompted?: boolean;
  /** Pointed at the compass on their first visit to the dashboard. */
  compassPrompted?: boolean;
  lessonDone?: boolean;
  navigateDone?: boolean;
};

export interface LearnTourAccount {
  /** The account has answered; until then nothing is offered. */
  ready: boolean;
  flags: LearnTourFlags;
  mark: (patch: LearnTourFlags) => void;
}

function useServerAccount(): LearnTourAccount {
  const { data, isSuccess } =
    useGameOptions<LearnTourFlags>(LEARN_TOURS_GAME_ID);
  const { mutate } = useSaveGameOptions(LEARN_TOURS_GAME_ID);
  const [local, setLocal] = useState<LearnTourFlags>({});
  const flags = useMemo(() => ({ ...(data ?? {}), ...local }), [data, local]);
  const mark = useCallback(
    (patch: LearnTourFlags) => {
      setLocal((was) => ({ ...was, ...patch }));
      mutate(patch as Record<string, unknown>);
    },
    [mutate],
  );
  return { ready: isSuccess, flags, mark };
}

const DEV_KEY = 'music-atlas-learn-tours-dev';

function readDev(): LearnTourFlags {
  try {
    return JSON.parse(localStorage.getItem(DEV_KEY) ?? '{}') as LearnTourFlags;
  } catch {
    return {};
  }
}

function useDevAccount(): LearnTourAccount {
  const [flags, setFlags] = useState<LearnTourFlags>(readDev);
  const mark = useCallback((patch: LearnTourFlags) => {
    // Merged into what's kept, as the server merges: the layer and the
    // prompts each hold their own copy.
    setFlags((was) => {
      const next = { ...was, ...readDev(), ...patch };
      try {
        localStorage.setItem(DEV_KEY, JSON.stringify(next));
      } catch {
        // Private mode: this visit only.
      }
      return next;
    });
  }, []);
  return { ready: true, flags, mark };
}

export const useLearnTourAccount: () => LearnTourAccount = DEV_AUTH_BYPASS
  ? useDevAccount
  : useServerAccount;

/** Dev only: forget the marks, to see the first-time prompts again. */
export function resetDevLearnTourFlags() {
  try {
    localStorage.removeItem(DEV_KEY);
  } catch {
    // Nothing kept.
  }
}
