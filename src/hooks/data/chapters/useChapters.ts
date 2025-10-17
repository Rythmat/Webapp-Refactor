import { useQuery } from '@tanstack/react-query';
import { GetChaptersData, useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch all chapters for dropdown or list
 */
export const useChapters = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['chapters'],
    queryFn: async () => {
      return musicAtlas.chapters.getChapters({});
    },
  });
};

export type Chapter = GetChaptersData[number];
