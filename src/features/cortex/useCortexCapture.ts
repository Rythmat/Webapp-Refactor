import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useLearnTourStore } from '@/features/learnTour/learnTourStore';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { gameOptionsApi } from '@/lib/gameOptions/api';
import { PROJECT_SAVED_EVENT } from '@/lib/studio-projects/projectEvents';
import type { CortexId } from './ids';
import {
  CORTEX_GAME_ID,
  mergeRemoteRecords,
  recordDone,
  recordVisit,
  setCortexSink,
  setCurrentActivity,
} from './ledger';
import { activityForLocation } from './routeTable';

/** How long on something before it counts (owner, 2026-11-01). */
export const DWELL_MS = 20_000;
const TICK_MS = 1000;

// Module-level: the dashboard around this hook remounts per route group.
let dwellTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Time the activity on screen: only while the tab shows it, and not while a
 * Learn tour is driving the page. Exported for tests.
 */
export const trackDwell = (id: CortexId | null): void => {
  if (dwellTimer !== null) clearInterval(dwellTimer);
  dwellTimer = null;
  setCurrentActivity(id);
  if (!id) return;
  let spent = 0;
  dwellTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (useLearnTourStore.getState().tour) return;
    spent += TICK_MS;
    if (spent < DWELL_MS) return;
    recordVisit(id);
    if (dwellTimer !== null) clearInterval(dwellTimer);
    dwellTimer = null;
  }, TICK_MS);
};

/**
 * Feeds the student's Cortex from wherever they are in the app, and keeps it
 * on their account. Mounted once in the signed-in dashboard, whether or not
 * the map is showing yet.
 */
export const useCortexCapture = (): void => {
  const { pathname, search } = useLocation();
  const token = useAuthToken();
  const id = useMemo(
    () => activityForLocation(pathname, search),
    [pathname, search],
  );

  useEffect(() => {
    trackDwell(id);
    return () => trackDwell(null);
  }, [id]);

  useEffect(() => {
    // The dev bypass has no real account to save to: the device only.
    setCortexSink(
      token && !DEV_AUTH_BYPASS
        ? (patch, options) =>
            gameOptionsApi.patchGame(token, CORTEX_GAME_ID, patch, options)
        : null,
    );
  }, [token]);

  const { data: remote } = useGameOptions(CORTEX_GAME_ID, !DEV_AUTH_BYPASS);
  useEffect(() => {
    if (remote) mergeRemoteRecords(remote);
  }, [remote]);

  useEffect(() => {
    const onSaved = (event: Event) => {
      const { projectId } = (event as CustomEvent<{ projectId?: string }>)
        .detail;
      if (projectId) recordDone(`project:${projectId}`);
    };
    window.addEventListener(PROJECT_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(PROJECT_SAVED_EVENT, onSaved);
  }, []);
};
