/**
 * useStartClassroomSession — the go-live entry point. Creates a SERVER session
 * (`POST /classrooms/:id/sessions`) so enrolled students can discover it via
 * `GET …/sessions?status=live` (the Home banner + in-classroom join button).
 * The server is the source of truth; the PartyKit party fans out realtime.
 *
 * Degrades to the local-mock (`startSessionForUser`) when the endpoint is
 * unavailable (offline / dev auth-bypass), so the same-user three-tab dev loop
 * keeps working. On a server create, the result is seeded into the local mirror
 * (`applySocketMessageForUser` 'hello') so the teacher dashboard has immediate
 * state before the socket connects.
 *
 * NO SILENT MOCKS. The degrade is never invisible: this hook returns a
 * DISCRIMINATED result naming the transport and, for a local session, WHY it
 * fell back. Callers must confirm with the teacher before starting a practice
 * session, and every surface then badges it (`ConnectionBadge`). The previous
 * version swallowed the failure in a bare `catch {}` and returned a session id
 * indistinguishable from a real one — a teacher could run a whole lesson
 * against a session no student could join.
 *
 * There is deliberately no `flag-off` reason: `POST /classrooms/:id/sessions`
 * IS registered server-side, so there is no feature flag gating it. Inventing
 * one would misreport a network failure as a disabled capability.
 */
import { useCallback } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import type { PhaseKey } from '../phases';
import { applySocketMessageForUser, type SessionMode } from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

export interface StartClassroomSessionInput {
  classroomId: string;
  publishedDayId: string;
  mode?: SessionMode;
  /** Local-fallback seeds (the server initializes its own state). */
  initialPhase?: PhaseKey;
  initialSlideIndex?: number;
}

/** Why a start fell back to the local mock. Never 'flag-off' — see the note
 *  in the module doc block. */
export type LocalSessionReason =
  /** Not signed in, or the token had not resolved yet. */
  | 'no-token'
  /** Request never completed — offline, DNS, CORS, timeout. */
  | 'network'
  /** Server answered with a non-2xx; the status is carried inline. */
  | `http-${number}`
  /** 2xx but the body carried no session id — a contract violation. */
  | 'no-session-id';

export type StartedClassroomSession =
  | {
      transport: 'server';
      sessionId: string;
      /** @deprecated Read `transport` instead. Kept for one cycle. */
      isServer: true;
    }
  | {
      transport: 'local';
      sessionId: string;
      reason: LocalSessionReason;
      /** @deprecated Read `transport` instead. Kept for one cycle. */
      isServer: false;
    };

/** Teacher-facing copy for each fallback reason, used by the confirm dialog. */
export const LOCAL_SESSION_REASON_COPY: Record<LocalSessionReason, string> = {
  'no-token': 'You are not signed in, so no session could be created.',
  network: 'The server could not be reached.',
  'no-session-id': 'The server accepted the request but returned no session.',
} as Record<LocalSessionReason, string>;

/** Human-readable cause for any reason, including the templated http-NNN. */
export const describeLocalSessionReason = (
  reason: LocalSessionReason,
): string =>
  LOCAL_SESSION_REASON_COPY[reason] ??
  (reason.startsWith('http-')
    ? `The server rejected the request (${reason.slice(5)}).`
    : 'The server could not be reached.');

/** Extract an HTTP status from whatever the generated client threw. */
const httpStatusOf = (err: unknown): number | null => {
  const e = err as {
    status?: unknown;
    response?: { status?: unknown };
    cause?: { status?: unknown };
  };
  for (const v of [e?.status, e?.response?.status, e?.cause?.status]) {
    if (typeof v === 'number' && v >= 100 && v < 600) return v;
  }
  return null;
};

const toIso = (v: unknown): string =>
  typeof v === 'string' ? v : v ? new Date(v as never).toISOString() : '';
const toIsoOrNull = (v: unknown): string | null =>
  v == null ? null : toIso(v);

export const useStartClassroomSession = () => {
  const musicAtlas = useMusicAtlas();
  const token = useAuthToken();
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const { startSession: startLocal } = useLocalSessionStore();

  return useCallback(
    async (
      input: StartClassroomSessionInput,
    ): Promise<StartedClassroomSession> => {
      let reason: LocalSessionReason = 'no-token';

      if (token) {
        try {
          const server = await musicAtlas.classrooms.postClassroomsByIdSessions(
            input.classroomId,
            {
              publishedDayId: input.publishedDayId,
              mode: input.mode ?? 'teacher_paced',
            },
          );
          if (server?.id) {
            // Seed the local mirror so the teacher dashboard renders state
            // immediately; the socket `hello` reconciles once connected.
            applySocketMessageForUser(userId, server.id, {
              type: 'hello',
              role: 'teacher',
              session: {
                id: server.id,
                classroomId: server.classroomId,
                teacherId: server.teacherId,
                publishedDayId: server.publishedDayId,
                code: server.code,
                status: server.status,
                state: server.state,
                startedAt: toIso(server.startedAt),
                endedAt: toIsoOrNull(server.endedAt),
              },
            });
            return {
              transport: 'server',
              sessionId: server.id,
              isServer: true,
            };
          }
          reason = 'no-session-id';
        } catch (err) {
          // Endpoint unavailable / offline — fall through to the local mock,
          // but RECORD WHY so the caller can tell the teacher.
          const status = httpStatusOf(err);
          reason = status === null ? 'network' : `http-${status}`;
        }
      }

      const local = startLocal({
        classroomId: input.classroomId,
        publishedDayId: input.publishedDayId,
        initialPhase: input.initialPhase,
        initialSlideIndex: input.initialSlideIndex,
      });
      return {
        transport: 'local',
        sessionId: local.sessionId,
        reason,
        isServer: false,
      };
    },
    [musicAtlas, token, userId, startLocal],
  );
};

/**
 * The hard stop before a teacher drives a lesson no student can join.
 *
 * Returns true when the teacher chose to continue in practice mode. Callers
 * that get `false` MUST tear the local session down again (`endSession`) —
 * otherwise a declined practice session lingers in the classroom looking live.
 *
 * Native `confirm` on purpose: this is a blocking, unmissable decision made
 * seconds before class starts, and PlanPage already uses the same idiom for
 * its destructive confirm. It is also the one dialog that must work even if
 * the app's own UI is in a degraded state.
 */
export const confirmPracticeSession = (reason: LocalSessionReason): boolean => {
  if (typeof window === 'undefined') return false;
  return window.confirm(
    [
      'Practice mode — this device only. Students cannot join.',
      '',
      describeLocalSessionReason(reason),
      '',
      'Start a practice session anyway?',
    ].join('\n'),
  );
};
