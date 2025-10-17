import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Hook to fetch a single chapter by ID
 */
export const useChapter = (chapterId?: string) => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      if (!chapterId) throw new Error('Chapter ID is required');
      return musicAtlas.chapters.getChaptersById(chapterId);
    },
    enabled: !!chapterId,
  });
};
