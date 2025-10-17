import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch all collections with pagination
 */
export const useCollections = (params?: { includeEmpty?: boolean }) => {
  const musicAtlas = useMusicAtlas();
  const includeEmpty = params?.includeEmpty || false;

  return useQuery({
    queryKey: ['collections', params],
    queryFn: () =>
      musicAtlas.collections.getCollections({
        includeEmpty,
      }),
  });
};
