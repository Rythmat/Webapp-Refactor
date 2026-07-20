/**
 * useSessionSync — the socket abstraction. Public API frozen against Ryan's
 * PartyKit swap in Sprint 5; only the body inside this file changes.
 *
 * Sprint 4 body reads state via useLocalSessionStore and broadcasts through
 * the same EVENT_CHANNEL that the store dispatches on write. Cross-tab sync
 * arrives via the underlying storage event.
 */
import { useCallback, useEffect, useState } from 'react';
import { useMe } from '@/hooks/data';
import type { PhaseKey } from '../phases';
import type { InteractionResponsePayload } from '../types';
import {
  EVENT_CHANNEL,
  type SessionMessage,
  type SessionMode,
  type SessionRole,
  type SessionState,
} from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface UseSessionSync {
  state: SessionState | null;
  connectionStatus: ConnectionStatus;
  sendNav: (phase: PhaseKey) => void;
  sendLock: (locked: boolean) => void;
  sendShare: (interactionId: string, on: boolean) => void;
  sendMode: (mode: SessionMode) => void;
  sendEnd: () => void;
  sendResponse: (
    interactionId: string,
    payload: InteractionResponsePayload,
  ) => void;
}

const isBrowser = typeof window !== 'undefined';

export const useSessionSync = (
  sessionId: string,
  role: SessionRole,
  enrollmentId?: string,
): UseSessionSync => {
  const { data: me } = useMe();
  const { getSession, dispatch } = useLocalSessionStore();
  const state = getSession(sessionId) ?? null;

  const [lastMessage, setLastMessage] = useState<SessionMessage | null>(null);

  useEffect(() => {
    if (!isBrowser) return;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<SessionMessage>).detail;
      if (detail?.sessionId === sessionId) setLastMessage(detail);
    };
    window.addEventListener(EVENT_CHANNEL, onEvent);
    return () => window.removeEventListener(EVENT_CHANNEL, onEvent);
  }, [sessionId]);

  const connectionStatus: ConnectionStatus = !state
    ? 'error'
    : state.status === 'ended'
      ? 'disconnected'
      : 'connected';

  const fromEnrollmentId = enrollmentId ?? me?.id ?? undefined;

  const sendNav = useCallback(
    (phase: PhaseKey) => {
      dispatch({
        sessionId,
        from: role,
        fromEnrollmentId,
        body: { kind: 'nav', phase },
      });
    },
    [dispatch, sessionId, role, fromEnrollmentId],
  );

  const sendLock = useCallback(
    (locked: boolean) => {
      dispatch({
        sessionId,
        from: role,
        fromEnrollmentId,
        body: { kind: 'lock', locked },
      });
    },
    [dispatch, sessionId, role, fromEnrollmentId],
  );

  const sendShare = useCallback(
    (interactionId: string, on: boolean) => {
      dispatch({
        sessionId,
        from: role,
        fromEnrollmentId,
        body: { kind: 'share', interactionId, on },
      });
    },
    [dispatch, sessionId, role, fromEnrollmentId],
  );

  const sendMode = useCallback(
    (mode: SessionMode) => {
      dispatch({
        sessionId,
        from: role,
        fromEnrollmentId,
        body: { kind: 'mode', mode },
      });
    },
    [dispatch, sessionId, role, fromEnrollmentId],
  );

  const sendEnd = useCallback(() => {
    dispatch({
      sessionId,
      from: role,
      fromEnrollmentId,
      body: { kind: 'end' },
    });
  }, [dispatch, sessionId, role, fromEnrollmentId]);

  const sendResponse = useCallback(
    (interactionId: string, payload: InteractionResponsePayload) => {
      const enrollment = fromEnrollmentId ?? 'local-preview';
      dispatch({
        sessionId,
        from: role,
        fromEnrollmentId: enrollment,
        body: {
          kind: 'response',
          interactionId,
          enrollmentId: enrollment,
          payload,
        },
      });
    },
    [dispatch, sessionId, role, fromEnrollmentId],
  );

  // Touch lastMessage so React re-renders when a same-tab CustomEvent arrives
  // even if the store poll would otherwise batch it out. No behavior change.
  void lastMessage;

  return {
    state,
    connectionStatus,
    sendNav,
    sendLock,
    sendShare,
    sendMode,
    sendEnd,
    sendResponse,
  };
};
