import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentType, useMusicAtlas } from '@/contexts/MusicAtlasContext';
import type {
  ClassroomInvitation,
  ClassroomInvitationRole,
} from './classroomInvitations.types';

interface CreateClassroomInvitationInput {
  classroomId: string;
  email: string;
  role?: ClassroomInvitationRole;
}

/**
 * Invite a Teacher User to join a specific classroom as a co-teacher.
 *
 * TODO: swap to a typed `musicAtlas.classrooms.postClassroomsInvitations`
 * method once the backend OpenAPI spec adds `POST /classrooms/:id/invitations`
 * and the client is regenerated. See classroomInvitations.types.ts.
 */
export const useCreateClassroomInvitation = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classroomId,
      email,
      role,
    }: CreateClassroomInvitationInput) =>
      musicAtlas.http.request<ClassroomInvitation>({
        path: `/classrooms/${classroomId}/invitations`,
        method: 'POST',
        body: { email, role: role ?? 'co_teacher' },
        type: ContentType.Json,
        format: 'json',
      }),
    onSuccess: (_data, { classroomId }) => {
      queryClient.invalidateQueries({
        queryKey: ['classroomInvitations', classroomId],
      });
    },
  });
};
