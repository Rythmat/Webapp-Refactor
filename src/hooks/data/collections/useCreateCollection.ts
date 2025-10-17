import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to create a new collection
 */
export const useCreateCollection = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      color,
    }: {
      name: string;
      description?: string;
      color?: string;
    }) => {
      return musicAtlas.collections.postCollections({
        name,
        description,
        color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collections'],
      });
    },
  });
};
