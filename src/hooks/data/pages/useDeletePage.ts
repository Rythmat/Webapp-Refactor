import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to delete a page
 */
export const useDeletePage = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return musicAtlas.pages.deletePagesById(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chapter'],
      });
      queryClient.invalidateQueries({
        queryKey: ['pages'],
      });
    },
  });
};
