/**
 * useMspModuleCompletion — the module-side half of the app-route bridge.
 *
 * When a real app module (Learn, Genre lesson, Studio tutorial) is opened from
 * a classroom app-route slide, its URL carries MSP launch params (see
 * `mspLaunchParams`). This hook reads and stashes them on mount (modules like
 * ActivityFlow `navigate()` and drop the query), and returns `reportCompletion`
 * to call from the module's EXISTING completion event. It writes the MSP inbox
 * once; the student's live tab drains it and sends the classroom response.
 *
 * The hook is inert unless launch params are present, so standalone module use
 * is unaffected.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useMe } from '@/hooks/data';
import {
  fallbackInboxToken,
  readMspLaunchParams,
  readStashedMspLaunchParams,
  stashMspLaunchParams,
  type MspLaunchParams,
} from './mspLaunchParams';
import { recordMspResponseForUser } from './mspResponseInbox';

const isBrowser = typeof window !== 'undefined';

export interface UseMspModuleCompletion {
  /** True when this module view was opened from a classroom app-route slide. */
  armed: boolean;
  /** Report completion back to the classroom (idempotent per launch). */
  reportCompletion: (result?: { score?: number; max?: number }) => void;
}

export const useMspModuleCompletion = (): UseMspModuleCompletion => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const paramsRef = useRef<MspLaunchParams | null>(null);
  const firedRef = useRef(false);

  // Capture launch params on mount: the URL still carries them on first render,
  // but an internal navigate() may strip them later — so stash to sessionStorage
  // and fall back to the stash on subsequent mounts.
  useEffect(() => {
    if (!isBrowser || paramsRef.current) return;
    const fromUrl = readMspLaunchParams(window.location.search);
    if (fromUrl) {
      stashMspLaunchParams(fromUrl);
      paramsRef.current = fromUrl;
    } else {
      paramsRef.current = readStashedMspLaunchParams();
    }
  }, []);

  const reportCompletion = useCallback(
    (result?: { score?: number; max?: number }) => {
      const p = paramsRef.current;
      if (!p || firedRef.current) return;
      firedRef.current = true;
      const token =
        p.token ?? fallbackInboxToken(p.interactionId, p.enrollmentId);
      recordMspResponseForUser(userId, {
        token,
        interactionId: p.interactionId,
        participant: { enrollmentId: p.enrollmentId },
        module: p.module,
        activityRef: p.activityRef,
        payload:
          typeof result?.score === 'number' && typeof result?.max === 'number'
            ? { kind: 'score', score: result.score, max: result.max }
            : { kind: 'completion', completed: true },
      });
    },
    [userId],
  );

  return { armed: paramsRef.current !== null, reportCompletion };
};
