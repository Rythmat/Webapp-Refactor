import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to delete a collection
 */
export const useDeleteCollection = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return musicAtlas.collections.deleteCollectionsById(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collections'],
      });
      queryClient.invalidateQueries({
        queryKey: ['collectionChapters'],
      });
    },
  });
};
