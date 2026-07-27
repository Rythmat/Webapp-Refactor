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

export interface StartedClassroomSession {
  sessionId: string;
  /** True when a server session was created (discoverable cross-user). */
  isServer: boolean;
}

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
            return { sessionId: server.id, isServer: true };
          }
        } catch {
          // Endpoint unavailable / offline — fall through to the local mock.
        }
      }

      const local = startLocal({
        classroomId: input.classroomId,
        publishedDayId: input.publishedDayId,
        initialPhase: input.initialPhase,
        initialSlideIndex: input.initialSlideIndex,
      });
      return { sessionId: local.sessionId, isServer: false };
    },
    [musicAtlas, token, userId, startLocal],
  );
};
