import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ClassroomRoutes } from '@/constants/routes';
import { SERVER_LIVE_SESSIONS_ENABLED } from '@/constants/serverEndpoints';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { useClassrooms } from '@/hooks/data/classrooms';
import { classroomSessionsApi } from '@/lib/classroom-sessions/api';
import type { Announcement } from './types';

/** Poll cadence for the server path — a session banner may lag by up to this. */
const REFETCH_MS = 30_000;

/**
 * "Your class is live" announcements for the Home banner. Two sources, merged:
 *  - Server: `GET /classrooms/:id/sessions?status=live` (degrades to [] until
 *    the endpoint ships — same pattern as useTeacherAnnouncements).
 *  - Local mock store: sessions started offline/dev via `startSessionForUser`
 *    (reactive through useLocalSessionStore's storage subscription), so the
 *    dev three-tab demo shows the banner without a backend.
 * Non-dismissible + top priority: joining class beats every other banner item.
 */
export function useLiveSessionAnnouncements(): Announcement[] {
  const token = useAuthToken();
  const { data: classrooms } = useClassrooms();
  const { getActiveSessionForClassroom } = useLocalSessionStore();

  const classroomIds = useMemo(
    () => (classrooms ?? []).map((c) => c.id),
    [classrooms],
  );

  const { data: serverSessions } = useQuery({
    queryKey: ['live-classroom-sessions', classroomIds],
    enabled: SERVER_LIVE_SESSIONS_ENABLED && !!token && classroomIds.length > 0,
    refetchInterval: SERVER_LIVE_SESSIONS_ENABLED ? REFETCH_MS : false,
    staleTime: REFETCH_MS,
    retry: false,
    queryFn: () =>
      classroomSessionsApi.listLiveForClassrooms(token!, classroomIds),
  });

  return useMemo(() => {
    const nameFor = (classroomId: string) =>
      (classrooms ?? []).find((c) => c.id === classroomId)?.name;

    const byId = new Map<
      string,
      { sessionId: string; classroomId: string; startedAt: number }
    >();
    for (const s of serverSessions ?? []) {
      byId.set(s.id, {
        sessionId: s.id,
        classroomId: s.classroomId,
        startedAt: Date.parse(s.startedAt) || 0,
      });
    }
    for (const id of classroomIds) {
      const local = getActiveSessionForClassroom(id);
      if (local && !byId.has(local.sessionId)) {
        byId.set(local.sessionId, {
          sessionId: local.sessionId,
          classroomId: local.classroomId,
          startedAt: Date.parse(local.startedAt) || 0,
        });
      }
    }

    return [...byId.values()].map<Announcement>((s) => {
      const classroomName = nameFor(s.classroomId);
      return {
        id: `live_session:${s.sessionId}`,
        source: 'live_session',
        title: '🔴 Your class is live',
        body: classroomName
          ? `${classroomName} — tap to join`
          : 'Tap to join the session',
        createdAt: s.startedAt,
        priority: 200,
        dismissible: false,
        cta: {
          label: 'Join',
          to: ClassroomRoutes.live({
            classroomId: s.classroomId,
            sessionId: s.sessionId,
          }),
        },
      };
    });
  }, [serverSessions, classroomIds, classrooms, getActiveSessionForClassroom]);
}
