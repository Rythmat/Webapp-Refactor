/**
 * useSessionSync — React shim that composes `createSessionSocketController`
 * with the app's live deps (auth token, MusicAtlas client, local session
 * cache). The heavy lifting — socket lifecycle, REST calls, MSP fan-out,
 * heartbeat, race-guarded seeding — lives in `sessionSocketController.ts`
 * so it's testable without React.
 */
import PartySocket from 'partysocket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Env } from '@/constants/env';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import { recordMspResponseForUser } from '../msp/mspResponseInbox';
import type { PhaseKey } from '../phases';
import type { InteractionResponsePayload } from '../types';
import {
  createSessionSocketController,
  type ConnectionStatus,
  type SendEndResult,
  type SessionSocketController,
  type SocketEventPayload,
  type SocketLike,
} from './sessionSocketController';
import {
  applyMessageForUser,
  endSessionForUser,
  type ServerSessionSnapshot,
  type SessionMessageBody,
  type SessionMode,
  type SessionPair,
  type SessionRole,
  type SessionShowcase,
  type SessionState,
  type SessionTimer,
} from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

export type { ConnectionStatus };

/** Sessions started by the offline/dev mock (`startSessionForUser`) never
 *  exist on the server — route their sends through the local envelope. */
const isLocalSession = (sessionId: string): boolean =>
  sessionId.startsWith('local-sess-');

export interface UseSessionSync {
  state: SessionState | null;
  connectionStatus: ConnectionStatus;
  sendNav: (phase: PhaseKey, slideIndex?: number) => void;
  sendLock: (locked: boolean) => void;
  sendShare: (interactionId: string, on: boolean) => void;
  sendMode: (mode: SessionMode) => void;
  /**
   * Ends the session. Returns a Promise callers CAN await to know if the
   * PATCH landed on the server (result.ok). Fire-and-forget callers get
   * the same optimistic-end behavior as before — no need to await, but
   * any transient network failure now silently retries with backoff.
   */
  sendEnd: () => Promise<SendEndResult>;
  sendResponse: (
    interactionId: string,
    payload: InteractionResponsePayload,
  ) => void;
  /** Phase 3 — set the Studio pairing (teacher only). */
  sendPairs: (pairs: SessionPair[] | null) => void;
  /** Phase 3 — set / clear the featured project (teacher only). */
  sendShowcase: (showcase: SessionShowcase | null) => void;
  /** Phase 4 — start / clear the slide timer (teacher only). */
  sendTimer: (timer: SessionTimer | null) => void;
  /** Phase 4 — remote play/pause a media slide's video (teacher only). */
  sendMedia: (
    slideId: string,
    action: 'play' | 'pause',
    atSec?: number,
  ) => void;
  /** Phase 4 — broadcast this student's local slide position (student-paced). */
  sendPosition: (slideIndex: number) => void;
}

const isBrowser = typeof window !== 'undefined';

const partyKitHost = (): string =>
  Env.get('VITE_PARTYKIT_HOST', { nullable: true }) ?? 'localhost:1999';

/** Adapt a PartySocket instance to the controller's SocketLike shape. */
const asSocketLike = (ps: PartySocket): SocketLike => ({
  addEventListener(type, listener) {
    ps.addEventListener(type, (event: Event) => {
      if (type === 'open') {
        listener({ type: 'open' });
      } else if (type === 'message') {
        const me = event as MessageEvent<string>;
        listener({ type: 'message', data: me.data });
      } else if (type === 'close') {
        const ce = event as CloseEvent;
        listener({
          type: 'close',
          code: ce.code,
          reason: ce.reason,
        } satisfies SocketEventPayload);
      } else {
        listener({ type: 'error' });
      }
    });
  },
  send: (data) => ps.send(data),
  close: (code, reason) => ps.close(code, reason),
});

export const useSessionSync = (
  sessionId: string,
  role: SessionRole,
  classroomId: string,
  enrollmentId?: string,
): UseSessionSync => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const token = useAuthToken();
  const musicAtlas = useMusicAtlas();
  const { getSession } = useLocalSessionStore();

  // State comes from the localStorage mirror so cross-tab reads work + the
  // report page keeps reading the same store post-session.
  const state = getSession(sessionId) ?? null;

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
  const controllerRef = useRef<SessionSocketController | null>(null);

  // For server sessions the backend derives the authoritative enrollment
  // from the auth token; `enrollmentId` is only consumed by the local-mock
  // dispatcher below.

  useEffect(() => {
    if (!isBrowser || !sessionId || !classroomId || !token) return;
    // Local mock sessions have no server/socket — sends go through the
    // Sprint-4 envelope below; state already flows from the local store.
    if (isLocalSession(sessionId)) {
      setConnectionStatus('connected');
      return;
    }

    const controller = createSessionSocketController({
      sessionId,
      role,
      userId,
      restClient: {
        get: () =>
          musicAtlas.classrooms.getClassroomsByIdSessionsBySessionId(
            classroomId,
            sessionId,
          ) as unknown as Promise<ServerSessionSnapshot>,
        patch: (payload) =>
          musicAtlas.classrooms.patchClassroomsByIdSessionsBySessionId(
            classroomId,
            sessionId,
            payload as never,
          ),
        postResponse: (payload) =>
          musicAtlas.classrooms.postClassroomsByIdSessionsBySessionIdResponses(
            classroomId,
            sessionId,
            {
              interactionId: payload.interactionId,
              payload: payload.payload as unknown as never,
            },
          ),
      },
      socketFactory: () =>
        asSocketLike(
          new PartySocket({
            host: partyKitHost(),
            party: 'classroom_session',
            room: sessionId,
            query: { token, role, classroomId },
          }),
        ),
      onStatusChange: setConnectionStatus,
      onResponse: (msg) =>
        recordMspResponseForUser(userId, {
          token: `session:${sessionId}:${msg.enrollmentId}:${msg.interactionId}`,
          interactionId: msg.interactionId,
          participant: { enrollmentId: msg.enrollmentId },
          // Socket delivers InteractionResponsePayload (the classroom union);
          // MSP inbox stores MspResultPayload (completion|score|artifact).
          // Only atlas-typed interactions actually produce MSP results, and
          // their payload shape is not narrowable at this boundary — the
          // inbox re-dispatches it opaquely through the msp:inbox event.
          payload: msg.payload as unknown as Parameters<
            typeof recordMspResponseForUser
          >[1]['payload'],
        }),
    });
    controllerRef.current = controller;
    controller.open();
    return () => {
      controller.close();
      controllerRef.current = null;
    };
  }, [sessionId, classroomId, role, userId, token, musicAtlas]);

  // Local-mock dispatcher: routes a body through the same envelope the
  // Sprint-4 mock uses (role gating included), so the localStorage store +
  // EVENT_CHANNEL broadcast update exactly as a socket echo would.
  const dispatchLocal = useCallback(
    (body: SessionMessageBody) => {
      applyMessageForUser(userId, {
        sessionId,
        from: role,
        ...(role === 'student' && enrollmentId
          ? { fromEnrollmentId: enrollmentId }
          : {}),
        body,
      });
    },
    [userId, sessionId, role, enrollmentId],
  );
  const local = isLocalSession(sessionId);

  const sendNav = useCallback(
    (phase: PhaseKey, slideIndex?: number) => {
      if (local) {
        dispatchLocal({
          kind: 'nav',
          phase,
          ...(slideIndex !== undefined ? { slideIndex } : {}),
        });
        return;
      }
      controllerRef.current?.sendNav(phase, slideIndex);
    },
    [local, dispatchLocal],
  );
  const sendLock = useCallback(
    (locked: boolean) => {
      if (local) {
        dispatchLocal({ kind: 'lock', locked });
        return;
      }
      controllerRef.current?.sendLock(locked);
    },
    [local, dispatchLocal],
  );
  const sendShare = useCallback(
    (interactionId: string, on: boolean) => {
      if (local) {
        dispatchLocal({ kind: 'share', interactionId, on });
        return;
      }
      controllerRef.current?.sendShare(interactionId, on);
    },
    [local, dispatchLocal],
  );
  const sendMode = useCallback(
    (mode: SessionMode) => {
      if (local) {
        dispatchLocal({ kind: 'mode', mode });
        return;
      }
      controllerRef.current?.sendMode(mode);
    },
    [local, dispatchLocal],
  );
  const sendPairs = useCallback(
    (pairs: SessionPair[] | null) => {
      if (local) {
        dispatchLocal({ kind: 'pairs', pairs });
        return;
      }
      controllerRef.current?.sendPairs(pairs);
    },
    [local, dispatchLocal],
  );
  const sendShowcase = useCallback(
    (showcase: SessionShowcase | null) => {
      if (local) {
        dispatchLocal({ kind: 'showcase', showcase });
        return;
      }
      controllerRef.current?.sendShowcase(showcase);
    },
    [local, dispatchLocal],
  );
  const sendTimer = useCallback(
    (timer: SessionTimer | null) => {
      if (local) {
        dispatchLocal({ kind: 'timer', timer });
        return;
      }
      controllerRef.current?.sendTimer(timer);
    },
    [local, dispatchLocal],
  );
  const sendMedia = useCallback(
    (slideId: string, action: 'play' | 'pause', atSec?: number) => {
      if (local) {
        dispatchLocal({
          kind: 'media',
          slideId,
          action,
          ...(atSec !== undefined ? { atSec } : {}),
        });
        return;
      }
      controllerRef.current?.sendMedia(slideId, action, atSec);
    },
    [local, dispatchLocal],
  );
  const sendEnd = useCallback((): Promise<SendEndResult> => {
    if (local) {
      endSessionForUser(userId, sessionId);
      return Promise.resolve({ ok: true });
    }
    return (
      controllerRef.current?.sendEnd() ??
      Promise.resolve({ ok: false, error: new Error('controller not open') })
    );
  }, [local, userId, sessionId]);
  const sendResponse = useCallback(
    (interactionId: string, payload: InteractionResponsePayload) => {
      if (local) {
        applyMessageForUser(userId, {
          sessionId,
          from: 'student',
          fromEnrollmentId: enrollmentId ?? 'local-student',
          body: { kind: 'response', interactionId, enrollmentId: enrollmentId ?? 'local-student', payload },
        });
        return;
      }
      controllerRef.current?.sendResponse(interactionId, payload);
    },
    [local, userId, sessionId, enrollmentId],
  );
  const sendPosition = useCallback(
    (slideIndex: number) => {
      if (local) {
        applyMessageForUser(userId, {
          sessionId,
          from: 'student',
          fromEnrollmentId: enrollmentId ?? 'local-student',
          body: {
            kind: 'position',
            enrollmentId: enrollmentId ?? 'local-student',
            slideIndex,
          },
        });
        return;
      }
      controllerRef.current?.sendPosition(slideIndex);
    },
    [local, userId, sessionId, enrollmentId],
  );

  return useMemo(
    () => ({
      state,
      connectionStatus,
      sendNav,
      sendLock,
      sendShare,
      sendMode,
      sendEnd,
      sendResponse,
      sendPairs,
      sendShowcase,
      sendTimer,
      sendMedia,
      sendPosition,
    }),
    [
      state,
      connectionStatus,
      sendNav,
      sendLock,
      sendShare,
      sendMode,
      sendEnd,
      sendResponse,
      sendPairs,
      sendShowcase,
      sendTimer,
      sendMedia,
      sendPosition,
    ],
  );
};
