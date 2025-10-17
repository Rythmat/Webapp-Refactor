import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas, Chapters } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch chapters associated with a collection
 */
export const useCollectionChapters = (collectionId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['collectionChapters', collectionId],
    queryFn: () =>
      musicAtlas.chapters.getChapters({
        collectionId,
      }),
    enabled: !!collectionId,
  });
};

export type CollectionChapter = Chapters.GetChapters.ResponseBody[number];
