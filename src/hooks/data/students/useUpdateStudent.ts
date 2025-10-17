import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

export const useUpdateStudent = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        nickname?: string;
        fullName?: string | null;
        birthDate?: Date | null;
        username?: string | null;
        school?: string | null;
      };
    }) => musicAtlas.students.patchStudentsById(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};
