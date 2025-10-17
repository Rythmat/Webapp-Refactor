import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch a single collection by ID
 */
export const useCollection = (collectionId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!collectionId) throw new Error('Collection ID is required');
      return musicAtlas.collections.getCollectionsById(collectionId);
    },
    enabled: !!collectionId,
  });
};
