import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to reorder pages within a chapter
 * Note: This is a placeholder implementation as the actual API endpoint may not exist
 */
export const useReorderPages = () => {
  const queryClient = useQueryClient();
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: async ({
      chapterId,
      pageOrders,
    }: {
      chapterId: string;
      pageOrders: { id: string; order: number }[];
    }) => {
      return musicAtlas.pages.postPagesReorder({
        chapterId,
        pageOrders,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['pages', variables.chapterId],
      });
    },
  });
};
