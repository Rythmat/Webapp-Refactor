import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to create a new collection chapter
 */
export const useCreateCollectionChapter = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      chapterId,
      order,
    }: {
      collectionId: string;
      chapterId: string;
      order?: number;
    }) => {
      return musicAtlas.collections.postCollectionsByIdChapters(collectionId, {
        chapterId,
        order,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['collection', variables.collectionId],
      });
    },
  });
};
