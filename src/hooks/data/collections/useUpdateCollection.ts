import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to update a collection
 */
export const useUpdateCollection = () => {
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
      return musicAtlas.collections.patchCollectionsById(id, {
        name,
        description,
        color,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['collection', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['collections'],
      });
    },
  });
};
