import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useCreateTeacherInvitation = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; expiresAt?: Date }) =>
      musicAtlas.teachers.postTeachersInvitations({
        email: data.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherInvitations'] });
    },
  });
};
