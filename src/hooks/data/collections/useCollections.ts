import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch all collections with pagination
 */
export const useCollections = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['collections'],
    queryFn: () => musicAtlas.collections.getCollections(),
  });
};
