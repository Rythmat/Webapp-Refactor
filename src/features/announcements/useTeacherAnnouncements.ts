import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { SERVER_CLASSROOM_ANNOUNCEMENTS_ENABLED } from '@/constants/serverEndpoints';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useClassrooms } from '@/hooks/data/classrooms';
import { announcementsApi } from '@/lib/announcements/api';
import type { Announcement } from './types';

/**
 * Teacher-authored announcements for the classroom(s) the current user is
 * enrolled in. Reads the user's classrooms, then fetches announcements for each.
 * The endpoint doesn't exist yet — the API layer degrades to `[]` so this is a
 * no-op until the backend ships (see docs/classroom-announcements-contract.md).
 */
export function useTeacherAnnouncements(): Announcement[] {
  const token = useAuthToken();
  const { data: classrooms } = useClassrooms();

  const classroomIds = useMemo(
    () => (classrooms ?? []).map((c) => c.id),
    [classrooms],
  );

  const { data } = useQuery({
    queryKey: ['classroom-announcements', classroomIds],
    enabled:
      SERVER_CLASSROOM_ANNOUNCEMENTS_ENABLED &&
      !!token &&
      classroomIds.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
    queryFn: () => announcementsApi.listForClassrooms(token!, classroomIds),
  });

  return useMemo(
    () =>
      (data ?? []).map<Announcement>((a) => ({
        id: `teacher:${a.id}`,
        source: 'teacher',
        title: a.teacherName ? `${a.teacherName}: ${a.title}` : a.title,
        body: a.body,
        createdAt: Date.parse(a.createdAt) || 0,
        priority: a.priority,
      })),
    [data],
  );
}
