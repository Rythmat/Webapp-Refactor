import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to delete a chapter
 */
export const useDeleteChapter = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return musicAtlas.chapters.deleteChaptersById(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chapters'],
      });
    },
  });
};
