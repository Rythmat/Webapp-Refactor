import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useCancelTeacherInvitation = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      musicAtlas.teachers.deleteTeachersInvitationsById(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherInvitations'] });
    },
  });
};
