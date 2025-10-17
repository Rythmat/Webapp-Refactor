import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to reorder chapters
 * Note: This is a placeholder implementation as the actual API endpoint may not exist
 */
export const useReorderChapters = () => {
  const queryClient = useQueryClient();
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: async ({
      chapterOrders,
    }: {
      chapterOrders: { id: string; order: number }[];
    }) => {
      return musicAtlas.chapters.postChaptersReorder({
        chapterOrders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chapters'],
      });
    },
  });
};
