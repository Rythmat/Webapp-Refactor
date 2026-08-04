import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

interface CancelClassroomInvitationInput {
  classroomId: string;
  invitationId: string;
}

/**
 * Revoke a pending co-teacher invitation.
 *
 * TODO: swap to a typed `musicAtlas.classrooms.deleteClassroomsInvitationsById`
 * method once the backend spec is regenerated. See classroomInvitations.types.ts.
 */
export const useCancelClassroomInvitation = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classroomId,
      invitationId,
    }: CancelClassroomInvitationInput) =>
      musicAtlas.http.request<{ id: string; revoked: boolean }>({
        path: `/classrooms/${classroomId}/invitations/${invitationId}`,
        method: 'DELETE',
        format: 'json',
      }),
    onSuccess: (_data, { classroomId }) => {
      queryClient.invalidateQueries({
        queryKey: ['classroomInvitations', classroomId],
      });
    },
  });
};
