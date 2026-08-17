import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import type {
  ClassroomInvitationListItem,
  ClassroomInvitationStatus,
} from './classroomInvitations.types';

/**
 * Pending co-teacher invitations for a classroom.
 *
 * Resilient by design: the backend endpoint does not exist yet, so a 404 (or
 * any error) is treated as "no invitations" by callers — the dialog still works
 * for creating/sharing invites. `retry: false` avoids hammering a missing route.
 *
 * TODO: swap to a typed `musicAtlas.classrooms.getClassroomsInvitations` method
 * once the backend spec is regenerated. See classroomInvitations.types.ts.
 */
export const useClassroomInvitations = (
  classroomId?: string,
  options?: { status?: ClassroomInvitationStatus; enabled?: boolean },
) => {
  const musicAtlas = useMusicAtlas();
  const status = options?.status ?? 'active';

  return useQuery({
    queryKey: ['classroomInvitations', classroomId, status],
    queryFn: () =>
      musicAtlas.http.request<ClassroomInvitationListItem[]>({
        path: `/classrooms/${classroomId}/invitations`,
        method: 'GET',
        query: { status },
        format: 'json',
      }),
    enabled: (options?.enabled ?? true) && !!classroomId,
    retry: false,
  });
};
