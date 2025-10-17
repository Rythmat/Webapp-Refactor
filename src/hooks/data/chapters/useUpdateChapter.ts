import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to update a chapter
 */
export const useUpdateChapter = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      color,
    }: {
      id: string;
      name?: string;
      description?: string;
      color?: string;
    }) => {
      return musicAtlas.chapters.patchChaptersById(id, {
        id,
        name,
        description,
        color,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['chapter', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['chapters'],
      });
    },
  });
};
