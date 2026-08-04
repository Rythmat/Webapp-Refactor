/**
 * useClassroomLiveSession — the active live session for ONE classroom, merged
 * from the server (`GET /classrooms/:id/sessions?status=live`, degrades to [])
 * and the local mock store (offline/dev same-user). Used by the student's
 * classroom page to surface the "your class is live" banner + Join button.
 * Returns null when nothing is live.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { SERVER_LIVE_SESSIONS_ENABLED } from '@/constants/serverEndpoints';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { classroomSessionsApi } from '@/lib/classroom-sessions/api';
import { useLocalSessionStore } from './useLocalSessionStore';

export interface ClassroomLiveSession {
  sessionId: string;
  classroomId: string;
  startedAt: string;
}

const REFETCH_MS = 20_000;

export function useClassroomLiveSession(
  classroomId: string | undefined,
): ClassroomLiveSession | null {
  const token = useAuthToken();
  const { getActiveSessionForClassroom } = useLocalSessionStore();

  const { data: serverSessions } = useQuery({
    queryKey: ['classroom-live-session', classroomId],
    enabled: SERVER_LIVE_SESSIONS_ENABLED && !!token && !!classroomId,
    refetchInterval: SERVER_LIVE_SESSIONS_ENABLED ? REFETCH_MS : false,
    staleTime: REFETCH_MS,
    retry: false,
    queryFn: () =>
      classroomSessionsApi.listLiveForClassrooms(token!, [classroomId!]),
  });

  return useMemo(() => {
    if (!classroomId) return null;

    const server = (serverSessions ?? []).find(
      (s) => s.classroomId === classroomId && s.status === 'live',
    );
    if (server) {
      return {
        sessionId: server.id,
        classroomId: server.classroomId,
        startedAt: server.startedAt,
      };
    }

    const local = getActiveSessionForClassroom(classroomId);
    if (local) {
      return {
        sessionId: local.sessionId,
        classroomId: local.classroomId,
        startedAt: local.startedAt,
      };
    }
    return null;
  }, [classroomId, serverSessions, getActiveSessionForClassroom]);
}
